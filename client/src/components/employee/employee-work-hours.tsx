import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, addDays, startOfMonth, endOfMonth } from "date-fns";
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

type EmployeeWorkHoursProps = {
    employeeId: number;
};

type WorkHoursData = {
    regularHours: number;
    overtimeHours: number;
    checkinTime: string | null;
    checkoutTime: string | null;
};

export function EmployeeWorkHours({ employeeId }: EmployeeWorkHoursProps) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [date, setDate] = useState<Date>(new Date());
    const formattedDate = format(date, "yyyy-MM-dd");

    // Fetch work hours for the employee on the selected date
    const { data: workHours, isLoading } = useQuery<WorkHoursData>({
        queryKey: [`/api/work-hours/employee/${employeeId}`, formattedDate],
        queryFn: async () => {
            const res = await fetch(`/api/work-hours/employee/${employeeId}?date=${formattedDate}`);
            if (!res.ok) throw new Error("Failed to fetch work hours");
            return await res.json();
        }
    });

    const handlePreviousDay = () => {
        setDate(subDays(date, 1));
    };

    const handleNextDay = () => {
        setDate(addDays(date, 1));
    };

    // Export work hours data as CSV
    const exportWorkHours = async () => {
        try {
            // Get the month range
            const monthStart = startOfMonth(date);
            const monthEnd = endOfMonth(date);
            const monthStartFormatted = format(monthStart, "yyyy-MM-dd");
            const monthEndFormatted = format(monthEnd, "yyyy-MM-dd");

            // Fetch the month's data
            const res = await fetch(`/api/work-hours/employee/${employeeId}?startDate=${monthStartFormatted}&endDate=${monthEndFormatted}`);

            if (!res.ok) {
                throw new Error("Failed to fetch work hours data");
            }

            const data = await res.json();

            // Create CSV content
            const headers = ["Date", "Regular Hours", "Overtime Hours", "Total Hours", "Clock In", "Clock Out"];
            const rows = data.map((day: any) => [
                format(new Date(day.date), "yyyy-MM-dd"),
                day.regularHours.toFixed(2),
                day.overtimeHours.toFixed(2),
                (day.regularHours + day.overtimeHours).toFixed(2),
                day.checkinTime ? format(new Date(day.checkinTime), "HH:mm:ss") : "--:--:--",
                day.checkoutTime ? format(new Date(day.checkoutTime), "HH:mm:ss") : "--:--:--",
            ]);

            const csvContent = [
                headers.join(","),
                ...rows.map((row: any) => row.join(","))
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
            toast({
                title: t('common.error'),
                description: t('common.exportFailed'),
                variant: "destructive",
            });
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-md font-medium">
                    {t('attendance.workHours')}
                </CardTitle>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handlePreviousDay}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-[180px] justify-start text-left font-normal",
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {format(date, "PPP")}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={(newDate) => newDate && setDate(newDate)}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleNextDay}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={exportWorkHours}
                        title={t('common.export')}
                    >
                        <Download className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center items-center h-40">
                        <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('attendance.date')}</TableHead>
                                    <TableHead>{t('attendance.clockIn')}</TableHead>
                                    <TableHead>{t('attendance.clockOut')}</TableHead>
                                    <TableHead>{t('attendance.regularHours')}</TableHead>
                                    <TableHead>{t('attendance.overtimeHours')}</TableHead>
                                    <TableHead>{t('attendance.totalHours')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell>{format(date, "MMM d, yyyy")}</TableCell>
                                    <TableCell>
                                        {workHours?.checkinTime
                                            ? format(new Date(workHours.checkinTime), "HH:mm")
                                            : "--:--"}
                                    </TableCell>
                                    <TableCell>
                                        {workHours?.checkoutTime
                                            ? format(new Date(workHours.checkoutTime), "HH:mm")
                                            : "--:--"}
                                    </TableCell>
                                    <TableCell>{workHours?.regularHours.toFixed(2) || "0.00"}</TableCell>
                                    <TableCell>{workHours?.overtimeHours.toFixed(2) || "0.00"}</TableCell>
                                    <TableCell className="font-medium">
                                        {workHours
                                            ? (workHours.regularHours + workHours.overtimeHours).toFixed(2)
                                            : "0.00"}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-muted/50 p-4 rounded-lg">
                                <div className="text-sm text-muted-foreground mb-1">{t('attendance.regularHours')}</div>
                                <div className="text-2xl font-semibold">
                                    {workHours?.regularHours.toFixed(2) || "0.00"}
                                </div>
                            </div>

                            <div className="bg-muted/50 p-4 rounded-lg">
                                <div className="text-sm text-muted-foreground mb-1">{t('attendance.overtimeHours')}</div>
                                <div className="text-2xl font-semibold">
                                    {workHours?.overtimeHours.toFixed(2) || "0.00"}
                                </div>
                            </div>

                            <div className="bg-primary/10 p-4 rounded-lg">
                                <div className="text-sm text-muted-foreground mb-1">{t('attendance.totalHours')}</div>
                                <div className="text-2xl font-semibold text-primary">
                                    {workHours
                                        ? (workHours.regularHours + workHours.overtimeHours).toFixed(2)
                                        : "0.00"}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
} 