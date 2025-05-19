import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, addDays, startOfMonth, endOfMonth } from "date-fns";
import { vi } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Download, Clock } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type EmployeeWorkHoursProps = {
    employeeId: number;
};

type WorkHoursData = {
    regularHours: number;
    overtimeHours: number;
    regularHoursFormatted: string;     // Định dạng "giờ:phút"
    overtimeHoursFormatted: string;    // Định dạng "giờ:phút"
    totalHoursFormatted: string;       // Định dạng "giờ:phút"
    checkinTime: string | null;
    checkoutTime: string | null;
    status: string;
};

export function EmployeeWorkHours({ employeeId }: EmployeeWorkHoursProps) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [date, setDate] = useState<Date>(new Date());
    const formattedDate = format(date, "yyyy-MM-dd");

    // Fetch work hours for the employee on the selected date
    const { data: workHours, isLoading, isError } = useQuery<WorkHoursData>({
        queryKey: [`/api/work-hours/employee/${employeeId}`, formattedDate],
        queryFn: async () => {
            try {
                console.log(`Fetching work hours for date: ${formattedDate}`);
                const res = await fetch(`/api/work-hours/employee/${employeeId}?date=${formattedDate}`);

                if (!res.ok) {
                    console.error(`Error fetching work hours: ${res.status} ${res.statusText}`);

                    // If server error, return a default data structure
                    return {
                        regularHours: 0,
                        overtimeHours: 0,
                        regularHoursFormatted: "0:00",
                        overtimeHoursFormatted: "0:00",
                        totalHoursFormatted: "0:00",
                        checkinTime: null,
                        checkoutTime: null,
                        status: "unknown"
                    };
                }

                const data = await res.json();
                console.log("Received work hours data:", data);
                return data;
            } catch (error) {
                console.error("Error in work hours query:", error);
                // Return default values on error
                return {
                    regularHours: 0,
                    overtimeHours: 0,
                    regularHoursFormatted: "0:00",
                    overtimeHoursFormatted: "0:00",
                    totalHoursFormatted: "0:00",
                    checkinTime: null,
                    checkoutTime: null,
                    status: "unknown"
                };
            }
        },
        retry: 1, // Only retry once on failure
        retryDelay: 1000, // Wait 1 second before retrying
    });

    const handleDateChange = (newDate: Date) => {
        setDate(newDate);
    };

    // Export work hours data as CSV
    const exportWorkHours = async () => {
        try {
            // Get the month range
            const monthStart = startOfMonth(date);
            const monthEnd = endOfMonth(date);
            const daysInMonth = Array.from(
                { length: endOfMonth(date).getDate() },
                (_, i) => new Date(date.getFullYear(), date.getMonth(), i + 1)
            );

            // Prepare to collect data for each day
            const allData = [];

            // Show loading toast
            toast({
                title: t('common.exporting'),
                description: t('common.preparingData'),
            });

            // Fetch data for each day in the month
            for (const day of daysInMonth) {
                try {
                    const formattedDay = format(day, "yyyy-MM-dd");
                    const res = await fetch(`/api/work-hours/employee/${employeeId}?date=${formattedDay}`);

                    if (res.ok) {
                        const dayData = await res.json();
                        allData.push({
                            date: day,
                            regularHours: dayData.regularHours || 0,
                            overtimeHours: dayData.overtimeHours || 0,
                            regularHoursFormatted: dayData.regularHoursFormatted || "0:00",
                            overtimeHoursFormatted: dayData.overtimeHoursFormatted || "0:00",
                            totalHoursFormatted: dayData.totalHoursFormatted || "0:00",
                            checkinTime: dayData.checkinTime,
                            checkoutTime: dayData.checkoutTime,
                            status: dayData.status || "unknown"
                        });
                    } else {
                        console.warn(`Failed to get data for day ${formattedDay}: ${res.status} ${res.statusText}`);
                        // If we can't get data for a day, add it with zeros
                        allData.push({
                            date: day,
                            regularHours: 0,
                            overtimeHours: 0,
                            regularHoursFormatted: "0:00",
                            overtimeHoursFormatted: "0:00",
                            totalHoursFormatted: "0:00",
                            checkinTime: null,
                            checkoutTime: null,
                            status: "unknown"
                        });
                    }
                } catch (error) {
                    console.error(`Error processing day ${format(day, "yyyy-MM-dd")}:`, error);
                    // Add default data for this day
                    allData.push({
                        date: day,
                        regularHours: 0,
                        overtimeHours: 0,
                        regularHoursFormatted: "0:00",
                        overtimeHoursFormatted: "0:00",
                        totalHoursFormatted: "0:00",
                        checkinTime: null,
                        checkoutTime: null,
                        status: "error"
                    });
                }
            }

            // Create CSV content
            const headers = ["Date", "Regular Hours", "Overtime Hours", "Total Hours", "Clock In", "Clock Out", "Status"];
            const rows = allData.map(day => {
                let clockInFormatted = "--:--:--";
                let clockOutFormatted = "--:--:--";

                if (day.checkinTime) {
                    try {
                        clockInFormatted = format(new Date(day.checkinTime), "HH:mm:ss");
                    } catch (error) {
                        console.error("Error formatting checkin time for CSV:", error);
                    }
                }

                if (day.checkoutTime) {
                    try {
                        clockOutFormatted = format(new Date(day.checkoutTime), "HH:mm:ss");
                    } catch (error) {
                        console.error("Error formatting checkout time for CSV:", error);
                    }
                }

                return [
                    format(day.date, "yyyy-MM-dd"),
                    day.regularHoursFormatted,
                    day.overtimeHoursFormatted,
                    day.totalHoursFormatted,
                    clockInFormatted,
                    clockOutFormatted,
                    day.status
                ];
            });

            const csvContent = [
                headers.join(","),
                ...rows.map(row => row.join(","))
            ].join("\n");

            // Create a download link
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `work-hours-${employeeId}-${format(date, "yyyy-MM")}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast({
                title: t('common.exportSuccess'),
                description: t('common.fileDownloaded'),
            });
        } catch (error) {
            console.error("Export error:", error);
            toast({
                title: t('common.error'),
                description: t('common.exportFailed'),
                variant: "destructive",
            });
        }
    };

    // Helper to convert UTC date string to local time
    const formatLocalTime = (utcDateString: string | null | undefined) => {
        if (!utcDateString) return "--:--";
        try {
            const date = new Date(utcDateString);
            return format(date, "HH:mm");
        } catch (error) {
            console.error("Error formatting date:", error);
            return "--:--";
        }
    };

    // Get status display information
    const getStatusInfo = (status: string | undefined) => {
        if (!status) return { label: t('status.unknown'), color: 'bg-gray-200' };

        switch (status) {
            case 'normal':
                return { label: t('status.normal'), color: 'bg-green-100 text-green-800 hover:bg-green-200' };
            case 'late':
                return { label: t('status.late'), color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' };
            case 'early_leave':
                return { label: t('status.earlyLeave'), color: 'bg-orange-100 text-orange-800 hover:bg-orange-200' };
            case 'absent':
                return { label: t('status.absent'), color: 'bg-red-100 text-red-800 hover:bg-red-200' };
            case 'leave':
                return { label: t('attendance.leave'), color: 'bg-blue-100 text-blue-800 hover:bg-blue-200' };
            default:
                return { label: status, color: 'bg-gray-200' };
        }
    };

    const statusInfo = getStatusInfo(workHours?.status);

    return (
        <Card className="flex flex-col w-full overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>
                    <div className="flex items-center space-x-2">
                        <Clock className="w-5 h-5" />
                        <span>{t('employee.workHours')}</span>
                    </div>
                </CardTitle>

                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDateChange(subDays(date, 1))}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="min-w-[240px] justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {format(date, "PPP", { locale: vi })}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={(date) => date && handleDateChange(date)}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDateChange(addDays(date, 1))}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={exportWorkHours}
                        disabled={isLoading}
                    >
                        <Download className="w-4 h-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="bg-stone-50 px-6 py-4 border-y">
                    <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-green-600 flex items-center gap-2">
                            <span>{workHours?.checkinTime ? formatLocalTime(workHours.checkinTime) : "--:--"}</span>
                            <span className="text-muted-foreground">→</span>
                            <span>{workHours?.checkoutTime ? formatLocalTime(workHours.checkoutTime) : "--:--"}</span>
                        </div>
                        <Badge className={cn("text-xs", statusInfo.color)}>
                            {statusInfo.label}
                        </Badge>
                    </div>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('employee.regularHours')}</TableHead>
                            <TableHead>{t('employee.overtimeHours')}</TableHead>
                            <TableHead>{t('employee.totalHours')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell>{workHours?.regularHoursFormatted || "0:00"}</TableCell>
                            <TableCell>{workHours?.overtimeHoursFormatted || "0:00"}</TableCell>
                            <TableCell className="font-medium">
                                {workHours?.totalHoursFormatted || "0:00"}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
} 