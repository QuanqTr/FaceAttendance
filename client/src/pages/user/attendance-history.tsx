import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { format, parseISO, isToday, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search, Filter, CalendarIcon, ArrowRight, Clock, MapPin, FileText, Check, AlertTriangle, Ban, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useDebounce } from "@/hooks/use-debounce";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { AttendanceTable } from "@/components/attendance/attendance-table";
import { MonthlyAttendanceCalendar } from "@/components/attendance/monthly-attendance-calendar";

export default function AttendanceHistoryPage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'details'>('list');

    const itemsPerPage = 10;

    // Get employee ID from the authenticated user
    const employeeId = user?.employeeId;

    // Get all work hours for the current month
    const [monthData, setMonthData] = useState<any[]>([]);
    const [isLoadingMonth, setIsLoadingMonth] = useState(false);
    const [monthError, setMonthError] = useState<string | null>(null);

    // Fetch work hours for the whole month when employeeId or currentMonth changes
    useEffect(() => {
        if (!employeeId) return;
        setIsLoadingMonth(true);
        setMonthError(null);
        const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
        const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");
        apiRequest.get(`/api/work-hours/employee/${employeeId}?startDate=${startDate}&endDate=${endDate}`)
            .then(res => {
                setMonthData(res.data);
                setIsLoadingMonth(false);
            })
            .catch(err => {
                setMonthError("Lỗi khi tải dữ liệu tháng");
                setIsLoadingMonth(false);
            });
    }, [employeeId, currentMonth]);

    // Table data: filter/search by ngày/trạng thái nếu cần
    const filteredTableData = monthData.filter(record => {
        let match = true;
        if (date) {
            match = match && isSameDay(new Date(record.date), date);
        }
        if (statusFilter !== "all") {
            if (statusFilter === "present") {
                match = match && record.status === "normal";
            } else {
                match = match && record.status === statusFilter;
            }
        }
        if (searchTerm) {
            match = match && (
                format(new Date(record.date), "dd/MM/yyyy").includes(searchTerm) ||
                (record.status && t(`attendance.${record.status}`).toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }
        return match;
    });

    // Calendar: get status for a date
    const getAttendanceStatusForDate = (date: Date) => {
        const rec = monthData.find(item => isSameDay(new Date(item.date), date));
        return rec ? rec.status : null;
    };

    // Calendar color mapping (đậm hơn)
    const getCalendarCellClass = (status: string | null) => {
        switch (status) {
            case 'normal':
                return 'bg-green-300 hover:bg-green-400 border-green-600'; // xanh lá đậm
            case 'absent':
                return 'bg-red-300 hover:bg-red-400 border-red-600'; // đỏ đậm
            case 'late':
                return 'bg-yellow-300 hover:bg-yellow-400 border-yellow-600'; // vàng đậm
            default:
                return 'bg-gray-100 hover:bg-gray-200';
        }
    };

    // Table pagination (if needed)
    const totalPages = Math.ceil(filteredTableData.length / itemsPerPage);
    const paginatedData = filteredTableData.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    const handlePageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= totalPages) {
            setPage(newPage);
        }
    };

    // Handle search input change
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setPage(1); // Reset to first page when search changes
    };

    // Clear all filters
    const clearFilters = () => {
        setSearchTerm("");
        setDate(undefined);
        setStatusFilter("all");
        setPage(1);
    };

    // Set date and switch to details view
    const viewDateDetails = (date: Date) => {
        setSelectedDate(date);
        setViewMode('details');
    };

    // Generate calendar days with attendance status
    const calendarDays = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth)
    });

    // Status color mapping
    const getStatusColor = (status: string | null) => {
        switch (status) {
            case 'present':
                return 'bg-green-100 text-green-800 border-green-300';
            case 'late':
                return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'absent':
                return 'bg-red-100 text-red-800 border-red-300';
            case 'leave':
                return 'bg-blue-100 text-blue-800 border-blue-300';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    // Add export function
    const handleExport = async () => {
        try {
            const response = await apiRequest.get(`/api/attendance/employee/${employeeId}/export`, {
                responseType: 'blob'
            });

            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            saveAs(blob, `attendance_history_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
        } catch (error) {
            console.error('Export failed:', error);
        }
    };

    return (
        <div className="container mx-auto  space-y-6">
            <Header
                title={t("user.attendanceHistory.title")}
                description={t("user.attendanceHistory.description")}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main content - Table */}
                <div className="lg:col-span-2">
                    <AttendanceTable
                        data={paginatedData}
                        isLoading={isLoadingMonth}
                        error={monthError}
                        onExport={handleExport}
                        searchTerm={searchTerm}
                        onSearchChange={handleSearchChange}
                        date={date}
                        onDateChange={setDate}
                        statusFilter={statusFilter}
                        onStatusFilterChange={setStatusFilter}
                        onClearFilters={clearFilters}
                        page={page}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                        t={t}
                    />
                </div>

                {/* Calendar Sidebar */}
                <div className="lg:col-span-1">
                    <MonthlyAttendanceCalendar
                        monthData={monthData}
                        currentMonth={currentMonth}
                        onMonthChange={setCurrentMonth}
                        onDateClick={viewDateDetails}
                        t={t}
                    />
                </div>
            </div>
        </div>
    );
} 