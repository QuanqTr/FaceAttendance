import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Download, Loader2, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

type WorkHoursRecord = {
    employeeId: number;
    employeeName: string;
    regularHours: number;
    overtimeHours: number;
    checkinTime: string | null;
    checkoutTime: string | null;
};

type WorkHoursLogProps = {
    records: WorkHoursRecord[];
    isLoading: boolean;
    date: Date;
    showSearch?: boolean;
};

export function WorkHoursLog({ records, isLoading, date, showSearch = true }: WorkHoursLogProps) {
    const { toast } = useToast();
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState("");

    // Filter records based on search query
    const filteredRecords = records.filter((record) =>
        record.employeeName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Export work hours data as CSV
    const exportWorkHours = () => {
        // Create CSV content
        const headers = ["Employee ID", "Employee Name", "Date", "Regular Hours", "Overtime Hours", "Clock In", "Clock Out"];
        const rows = filteredRecords.map((record) => [
            record.employeeId,
            record.employeeName,
            format(date, 'yyyy-MM-dd'),
            record.regularHours,
            record.overtimeHours,
            record.checkinTime ? format(new Date(record.checkinTime), 'HH:mm:ss') : '--:--',
            record.checkoutTime ? format(new Date(record.checkoutTime), 'HH:mm:ss') : '--:--',
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.join(","))
        ].join("\n");

        // Create a download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `work-hours-${format(date, 'yyyy-MM-dd')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
            title: t('common.exportSuccess'),
            description: t('common.fileDownloaded'),
        });
    };

    return (
        <div className="space-y-4">
            {showSearch && (
                <div className="flex justify-between items-center">
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t('attendance.searchEmployees')}
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <Button variant="outline" size="sm" onClick={exportWorkHours}>
                        <Download className="mr-2 h-4 w-4" />
                        {t('common.export')}
                    </Button>
                </div>
            )}

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('employee.employee')}</TableHead>
                            <TableHead>{t('attendance.date')}</TableHead>
                            <TableHead>{t('attendance.clockIn')}</TableHead>
                            <TableHead>{t('attendance.clockOut')}</TableHead>
                            <TableHead>{t('attendance.regularHours')}</TableHead>
                            <TableHead>{t('attendance.overtimeHours')}</TableHead>
                            <TableHead>{t('attendance.totalHours')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    <div className="flex justify-center">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredRecords.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    {t('attendance.noRecords')}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredRecords.map((record, index) => (
                                <TableRow key={`${record.employeeId}-${index}`}>
                                    <TableCell className="font-medium">{record.employeeName}</TableCell>
                                    <TableCell>{format(date, 'MMM d, yyyy')}</TableCell>
                                    <TableCell>
                                        {record.checkinTime
                                            ? format(new Date(record.checkinTime), 'HH:mm')
                                            : '--:--'}
                                    </TableCell>
                                    <TableCell>
                                        {record.checkoutTime
                                            ? format(new Date(record.checkoutTime), 'HH:mm')
                                            : '--:--'}
                                    </TableCell>
                                    <TableCell>{record.regularHours.toFixed(2)}</TableCell>
                                    <TableCell>{record.overtimeHours.toFixed(2)}</TableCell>
                                    <TableCell className="font-medium">
                                        {(record.regularHours + record.overtimeHours).toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
} 