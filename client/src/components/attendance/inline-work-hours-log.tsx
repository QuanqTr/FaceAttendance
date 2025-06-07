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
import { Calendar as CalendarIcon, Download, Loader2, Search, Filter, Calendar, ChevronLeft, ChevronRight, Edit, Save, X, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as DateCalendar } from "@/components/ui/calendar";
import { DeleteWorkHoursDialog } from "./delete-work-hours-dialog";

export type WorkHoursRecord = {
    id?: number;
    employeeId: number;
    employeeName: string;
    regularHours: number;
    overtimeHours: number;
    checkinTime: string | null;
    checkoutTime: string | null;
    status: string;
};

type InlineWorkHoursLogProps = {
    records: WorkHoursRecord[];
    isLoading: boolean;
    date: Date;
    showSearch?: boolean;
    onDateChange?: (date: Date) => void;
    onRefresh?: () => void;
};

export function InlineWorkHoursLog({ records, isLoading, date, showSearch = true, onDateChange, onRefresh }: InlineWorkHoursLogProps) {
    const { toast } = useToast();
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    
    // Editing states
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingData, setEditingData] = useState<Partial<WorkHoursRecord>>({});
    const [isUpdating, setIsUpdating] = useState(false);
    
    // Delete dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<WorkHoursRecord | null>(null);

    // Filter records based on search query and status
    const filteredRecords = records.filter((record) => {
        const nameMatch = record.employeeName &&
            record.employeeName.toLowerCase().includes(searchQuery.toLowerCase());

        const statusMatch = statusFilter === "all" ||
            (record.status && record.status === statusFilter);

        return nameMatch && statusMatch;
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

    // Reset to first page when filters change
    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        setCurrentPage(1);
    };

    const handleStatusFilterChange = (value: string) => {
        setStatusFilter(value);
        setCurrentPage(1);
    };

    // Helper function to safely format dates
    const safeFormatDate = (dateString: string | null | undefined, formatStr: string = 'HH:mm') => {
        if (!dateString) return '--:--';

        try {
            // Nếu là chuỗi đã format sẵn (HH:mm), trả về luôn
            if (typeof dateString === 'string' && /^\d{2}:\d{2}$/.test(dateString)) {
                return dateString;
            }

            // Lấy thời gian từ chuỗi ISO trực tiếp để tránh vấn đề múi giờ
            const timeMatch = dateString.match(/T(\d{2}):(\d{2})/);
            if (timeMatch) {
                const hours = timeMatch[1];
                const minutes = timeMatch[2];
                return `${hours}:${minutes}`;
            }

            // Thử parse và format bằng Date object
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                return date.toLocaleTimeString('vi-VN', {
                    timeZone: 'Asia/Ho_Chi_Minh',
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }

            return '--:--';
        } catch (error) {
            console.error("Error formatting date:", error, dateString);
            return '--:--';
        }
    };

    // Format time for input (HH:MM)
    const formatTimeForInput = (timeString: string | null) => {
        if (!timeString) return "";
        try {
            const date = new Date(timeString);
            return date.toLocaleTimeString('en-GB', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } catch {
            return "";
        }
    };

    // Start editing a record
    const startEditing = (record: WorkHoursRecord) => {
        setEditingId(record.id || null);
        setEditingData({
            regularHours: record.regularHours,
            overtimeHours: record.overtimeHours,
            checkinTime: formatTimeForInput(record.checkinTime), // Convert to HH:MM format for input
            checkoutTime: formatTimeForInput(record.checkoutTime), // Convert to HH:MM format for input
            status: record.status
        });
    };

    // Cancel editing
    const cancelEditing = () => {
        setEditingId(null);
        setEditingData({});
    };

    // Save changes
    const saveChanges = async () => {
        if (!editingId) return;

        setIsUpdating(true);
        try {
            // Convert time inputs back to full datetime strings, preserving the original date
            const formatTimeForAPI = (timeString: string, originalDateTime: string | null) => {
                if (!timeString) return null;

                // Use the original date if available, otherwise use the selected date
                let baseDate = date; // Use the date from props (the selected date in the calendar)
                if (originalDateTime) {
                    const originalDate = new Date(originalDateTime);
                    if (!isNaN(originalDate.getTime())) {
                        baseDate = originalDate;
                    }
                }

                const [hours, minutes] = timeString.split(':');
                const newDate = new Date(baseDate);
                newDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                return newDate.toISOString();
            };

            // Find the original record to get the original datetime
            const originalRecord = records.find(r => r.id === editingId);

            const updateData = {
                regularHours: editingData.regularHours,
                overtimeHours: editingData.overtimeHours,
                checkinTime: editingData.checkinTime ? formatTimeForAPI(editingData.checkinTime as string, originalRecord?.checkinTime) : null,
                checkoutTime: editingData.checkoutTime ? formatTimeForAPI(editingData.checkoutTime as string, originalRecord?.checkoutTime) : null,
                status: editingData.status
            };

            const response = await fetch(`/api/work-hours/${editingId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update work hours');
            }

            toast({
                title: t('common.success'),
                description: "Cập nhật thông tin chấm công thành công",
            });

            setEditingId(null);
            setEditingData({});
            
            if (onRefresh) {
                onRefresh();
            }
        } catch (error) {
            console.error('Error updating work hours:', error);
            toast({
                title: t('common.error'),
                description: error instanceof Error ? error.message : "Có lỗi xảy ra khi cập nhật",
                variant: "destructive"
            });
        } finally {
            setIsUpdating(false);
        }
    };

    // Handle delete action
    const handleDelete = (record: WorkHoursRecord) => {
        setSelectedRecord(record);
        setDeleteDialogOpen(true);
    };

    // Handle success callback from delete dialog
    const handleDeleteSuccess = () => {
        if (onRefresh) {
            onRefresh();
        }
    };

    // Export work hours data as CSV
    const exportWorkHours = () => {
        try {
            // Create CSV content
            const headers = [
                t('employees.id'),
                t('attendance.employee'),
                t('attendance.date'),
                t('attendance.regularHours'),
                t('attendance.overtimeHours'),
                t('attendance.clockIn'),
                t('attendance.clockOut'),
                t('status.status')
            ];
            const rows = filteredRecords.map((record) => {
                return [
                    record.employeeId,
                    record.employeeName,
                    format(date, 'yyyy-MM-dd'),
                    record.regularHours,
                    record.overtimeHours,
                    safeFormatDate(record.checkinTime, 'HH:mm:ss'),
                    safeFormatDate(record.checkoutTime, 'HH:mm:ss'),
                    record.status || 'unknown'
                ];
            });

            // Escape CSV values and handle Vietnamese characters
            const escapeCSVValue = (value: any) => {
                if (value === null || value === undefined) return '';
                const stringValue = String(value);
                if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
                    return `"${stringValue.replace(/"/g, '""')}"`;
                }
                return stringValue;
            };

            const csvContent = [
                headers.map(escapeCSVValue).join(","),
                ...rows.map(row => row.map(escapeCSVValue).join(","))
            ].join("\n");

            // Add BOM for UTF-8 to ensure proper Vietnamese character display in Excel
            const BOM = '\uFEFF';
            const csvWithBOM = BOM + csvContent;

            // Create a download link
            const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
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
                description: t('attendance.fileDownloaded'),
            });
        } catch (error) {
            console.error("Error exporting work hours data:", error);
            toast({
                title: t('common.error'),
                description: t('common.exportFailed'),
                variant: "destructive"
            });
        }
    };

    // Helper function to get status display information
    const getStatusInfo = (status: string) => {
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
                return { label: status || t('status.unknown'), color: 'bg-gray-200' };
        }
    };

    // Handle date change if provided
    const handleDateChange = (newDate: Date | undefined) => {
        if (newDate && onDateChange) {
            onDateChange(newDate);
        }
    };

    return (
        <div className="space-y-6">
            {showSearch && (
                <div className="flex flex-col space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1 flex flex-col md:flex-row gap-3">
                            <div className="relative w-full md:w-72">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={t('attendance.searchEmployees')}
                                    className="pl-8"
                                    value={searchQuery}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "justify-start text-left font-normal",
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {format(date, "dd/MM/yyyy")}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <DateCalendar
                                            mode="single"
                                            selected={date}
                                            onSelect={handleDateChange}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="flex items-center">
                                <Select
                                    value={statusFilter}
                                    onValueChange={handleStatusFilterChange}
                                >
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder={t('common.filter')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('common.all')}</SelectItem>
                                        <SelectItem value="normal">{t('status.normal')}</SelectItem>
                                        <SelectItem value="late">{t('status.late')}</SelectItem>
                                        <SelectItem value="early_leave">{t('status.earlyLeave')}</SelectItem>
                                        <SelectItem value="absent">{t('status.absent')}</SelectItem>
                                        <SelectItem value="leave">{t('attendance.leave')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Button variant="outline" size="sm" onClick={exportWorkHours} className="shrink-0">
                            <Download className="mr-2 h-4 w-4" />
                            {t('attendance.export')}
                        </Button>
                    </div>
                </div>
            )}

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[200px]">{t('attendance.employee')}</TableHead>
                            <TableHead>{t('attendance.date')}</TableHead>
                            <TableHead>{t('attendance.clockIn')}</TableHead>
                            <TableHead>{t('attendance.clockOut')}</TableHead>
                            <TableHead>{t('attendance.regularHours')}</TableHead>
                            <TableHead>{t('attendance.overtimeHours')}</TableHead>
                            <TableHead>{t('attendance.totalHours')}</TableHead>
                            <TableHead>{t('status.status')}</TableHead>
                            <TableHead className="w-[120px]">Thao tác</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={9} className="h-24 text-center">
                                    <div className="flex justify-center">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredRecords.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="h-24 text-center">
                                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                                        <Calendar className="h-10 w-10 mb-2" />
                                        <p className="mb-1 font-medium">{t('attendance.noAttendanceRecordsFound')}</p>
                                        <p className="text-sm">{t('attendance.noAttendanceRecordsForDay')}</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedRecords.map((record, index) => {
                                const statusInfo = getStatusInfo(record.status);
                                const isEditing = editingId === record.id;

                                return (
                                    <TableRow key={`${record.employeeId}-${index}`}>
                                        <TableCell className="font-medium">{record.employeeName || 'N/A'}</TableCell>
                                        <TableCell>
                                            {format(new Date(date), 'dd/MM/yyyy')}
                                        </TableCell>
                                        <TableCell>
                                            {isEditing ? (
                                                <Input
                                                    type="time"
                                                    value={editingData.checkinTime as string || ""}
                                                    onChange={(e) => setEditingData(prev => ({
                                                        ...prev,
                                                        checkinTime: e.target.value
                                                    }))}
                                                    className="w-24"
                                                />
                                            ) : (
                                                safeFormatDate(record.checkinTime)
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {isEditing ? (
                                                <Input
                                                    type="time"
                                                    value={editingData.checkoutTime as string || ""}
                                                    onChange={(e) => setEditingData(prev => ({
                                                        ...prev,
                                                        checkoutTime: e.target.value
                                                    }))}
                                                    className="w-24"
                                                />
                                            ) : (
                                                safeFormatDate(record.checkoutTime)
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {isEditing ? (
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max="24"
                                                    value={editingData.regularHours?.toString() || ""}
                                                    onChange={(e) => setEditingData(prev => ({
                                                        ...prev,
                                                        regularHours: parseFloat(e.target.value) || 0
                                                    }))}
                                                    className="w-20"
                                                />
                                            ) : (
                                                Number(record.regularHours || 0).toFixed(2)
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {isEditing ? (
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max="12"
                                                    value={editingData.overtimeHours?.toString() || ""}
                                                    onChange={(e) => setEditingData(prev => ({
                                                        ...prev,
                                                        overtimeHours: parseFloat(e.target.value) || 0
                                                    }))}
                                                    className="w-20"
                                                />
                                            ) : (
                                                Number(record.overtimeHours || 0).toFixed(2)
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {isEditing ? (
                                                ((editingData.regularHours || 0) + (editingData.overtimeHours || 0)).toFixed(2)
                                            ) : (
                                                (Number(record.regularHours || 0) + Number(record.overtimeHours || 0)).toFixed(2)
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {isEditing ? (
                                                <Select
                                                    value={editingData.status || ""}
                                                    onValueChange={(value) => setEditingData(prev => ({
                                                        ...prev,
                                                        status: value
                                                    }))}
                                                >
                                                    <SelectTrigger className="w-32">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="normal">Bình thường</SelectItem>
                                                        <SelectItem value="late">Đi muộn</SelectItem>
                                                        <SelectItem value="early_leave">Về sớm</SelectItem>
                                                        <SelectItem value="absent">Vắng mặt</SelectItem>
                                                        <SelectItem value="leave">Nghỉ phép</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Badge className={cn("text-xs", statusInfo.color)}>
                                                    {statusInfo.label}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {isEditing ? (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={saveChanges}
                                                            disabled={isUpdating}
                                                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                        >
                                                            {isUpdating ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Save className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={cancelEditing}
                                                            disabled={isUpdating}
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => startEditing(record)}
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDelete(record)}
                                                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 px-2">
                    <div className="text-sm text-muted-foreground">
                        {t('common.showing')} {startIndex + 1}-{Math.min(endIndex, filteredRecords.length)} {t('common.of')} {filteredRecords.length} {t('attendance.workHoursRecords')}
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            {t('common.previous')}
                        </Button>
                        <div className="text-sm text-muted-foreground">
                            {t('common.page')} {currentPage} {t('common.of')} {totalPages}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                        >
                            {t('common.next')}
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Delete Dialog */}
            <DeleteWorkHoursDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                record={selectedRecord}
                onSuccess={handleDeleteSuccess}
            />
        </div>
    );
}
