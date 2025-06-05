import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Filter, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { format } from "date-fns";

export function AttendanceTable({
    data,
    isLoading,
    error,
    onExport,
    searchTerm,
    onSearchChange,
    date,
    onDateChange,
    statusFilter,
    onStatusFilterChange,
    onClearFilters,
    page,
    totalPages,
    onPageChange,
    t
}: any) {
    // Helper function to format time from UTC to Vietnam timezone
    const formatTimeVN = (timeString: string | null) => {
        if (!timeString) return "-";
        try {
            const date = new Date(timeString);
            if (isNaN(date.getTime())) return "-";

            // Format time in Vietnam timezone using toLocaleString
            return date.toLocaleTimeString('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch (error) {
            console.error('Error formatting time:', error);
            return "-";
        }
    };
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>{t("user.attendanceHistory.cardTitle")}</CardTitle>
                    <Button onClick={onExport} variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        {t("common.export")}
                    </Button>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 mt-4">
                    <div className="relative flex-1">
                        <Input
                            type="search"
                            placeholder={t("user.attendanceHistory.searchPlaceholder")}
                            className="pl-8"
                            value={searchTerm}
                            onChange={onSearchChange}
                        />
                    </div>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="justify-start text-left font-normal w-full sm:w-auto">
                                {date ? format(date, "PPP") : t("common.pickDate")}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={date} onSelect={onDateChange} initialFocus />
                        </PopoverContent>
                    </Popover>
                    <Select value={statusFilter} onValueChange={onStatusFilterChange}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder={t("common.status")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t("common.all")}</SelectItem>
                            <SelectItem value="present">{t("attendance.present")}</SelectItem>
                            <SelectItem value="late">{t("attendance.late")}</SelectItem>
                            <SelectItem value="absent">{t("attendance.absent")}</SelectItem>
                            <SelectItem value="leave">{t("attendance.leave")}</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="ghost" onClick={onClearFilters}>
                        <Filter className="h-4 w-4 mr-2" />
                        {t("common.clearFilters")}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, index) => (
                            <Skeleton key={index} className="h-12 w-full" />
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-center py-4 text-destructive">{error}</div>
                ) : data?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">{t("user.attendanceHistory.noRecords")}</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("attendance.date")}</TableHead>
                                <TableHead>{t("attendance.checkIn")}</TableHead>
                                <TableHead>{t("attendance.checkOut")}</TableHead>
                                <TableHead>{t("attendance.regularHours")}</TableHead>
                                <TableHead>{t("attendance.overtimeHours")}</TableHead>
                                <TableHead>{t("attendance.totalHours")}</TableHead>
                                <TableHead>{t("common.status")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data?.map((record: any) => (
                                <TableRow key={record.id}>
                                    <TableCell>{format(new Date(record.date), "dd/MM/yyyy")}</TableCell>
                                    <TableCell>{formatTimeVN(record.checkinTime)}</TableCell>
                                    <TableCell>{formatTimeVN(record.checkoutTime)}</TableCell>
                                    <TableCell>{record.regularHours ? `${record.regularHours} giờ` : "-"}</TableCell>
                                    <TableCell>{record.overtimeHours ? `${record.overtimeHours} giờ` : "-"}</TableCell>
                                    <TableCell>{record.regularHours && record.overtimeHours ? `${record.regularHours + record.overtimeHours} giờ` : record.regularHours ? `${record.regularHours} giờ` : "-"}</TableCell>
                                    <TableCell>
                                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${record.status === 'normal' ? 'bg-green-300 text-green-900 border-green-600' : record.status === 'absent' ? 'bg-red-300 text-red-900 border-red-600' : record.status === 'late' ? 'bg-yellow-300 text-yellow-900 border-yellow-600' : record.status === 'leave' ? 'bg-blue-300 text-blue-900 border-blue-600' : 'bg-gray-100 text-gray-800 border-gray-300'}`}>
                                            {record.status === 'normal' ? 'Đi làm' : record.status === 'absent' ? t('attendance.absent') : record.status === 'late' ? t('attendance.late') : record.status === 'leave' ? t('attendance.leave') : t(`attendance.${record.status}`)}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
} 