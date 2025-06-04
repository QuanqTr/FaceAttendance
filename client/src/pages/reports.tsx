import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import {
    Users, Clock, AlertTriangle, TrendingUp, Award,
    Building2, DollarSign, Calendar, Download, FileSpreadsheet,
    BarChart3, PieChart as PieChartIcon, TrendingDown,
    FileText, Filter, RefreshCw, Search, ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/layout/header';
import { format, subMonths, addMonths } from 'date-fns';
import { vi } from 'date-fns/locale';

// Types
interface OverallStats {
    totalEmployees: number;
    totalHours: number;
    avgHoursPerEmployee: number;
    totalOvertimeHours: number;
    avgOvertimePerEmployee: number;
    totalLeaveDays: number;
    avgLeaveDaysPerEmployee: number;
    totalLateMinutes: number;
    avgLateMinutesPerEmployee: number;
    totalPenaltyAmount: number;
    avgPenaltyPerEmployee: number;
    fullTimeEmployees: number;
    partTimeEmployees: number;
    absentEmployees: number;
}

interface DepartmentStats {
    departmentId: number;
    departmentName: string;
    employeeCount: number;
    avgTotalHours: number;
    totalDepartmentHours: number;
    avgOvertimeHours: number;
    totalLeaveDays: number;
    avgLateMinutes: number;
    totalPenaltyAmount: number;
}

interface AttendanceRecord {
    id: number;
    employeeId: number;
    employeeName: string;
    position: string;
    departmentName: string;
    month: number;
    year: number;
    totalHours: number;
    overtimeHours: number;
    leaveDays: number;
    earlyMinutes: number;
    lateMinutes: number;
    penaltyAmount: number;
    createdAt: string;
}

interface TopPerformer {
    employeeId: number;
    employeeName: string;
    position: string;
    departmentName: string;
    totalHours: number;
    overtimeHours: number;
    lateMinutes: number;
    penaltyAmount: number;
}

interface PenaltyAnalysis {
    employeeId: number;
    employeeName: string;
    position: string;
    departmentName: string;
    lateMinutes: number;
    earlyMinutes: number;
    penaltyAmount: number;
    penaltyLevel: string;
}

interface AttendanceTrend {
    month: number;
    employeeCount: number;
    totalHours: number;
    avgHours: number;
    totalOvertime: number;
    totalLeaveDays: number;
    totalPenalties: number;
}

const Reports: React.FC = () => {
    const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
    const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState<string>('');

    // Get month and year from selectedMonth Date
    const currentMonth = selectedMonth.getMonth() + 1;
    const currentYear = selectedMonth.getFullYear();

    // API Queries with mock data fallback
    const { data: overallStats, isLoading: isOverallLoading, refetch: refetchOverall } = useQuery<OverallStats>({
        queryKey: ['/api/reports/overall-stats', currentMonth, currentYear],
        queryFn: async () => {
            // Mock data for admin system statistics
            return {
                totalEmployees: 45,
                totalHours: 7200,
                avgHoursPerEmployee: 160,
                totalOvertimeHours: 150,
                avgOvertimePerEmployee: 3.33,
                totalLeaveDays: 32,
                avgLeaveDaysPerEmployee: 0.71,
                totalLateMinutes: 480,
                avgLateMinutesPerEmployee: 10.67,
                totalPenaltyAmount: 2500000,
                avgPenaltyPerEmployee: 55555,
                fullTimeEmployees: 42,
                partTimeEmployees: 3,
                absentEmployees: 2
            };
        }
    });

    const { data: departmentStats, isLoading: isDeptLoading, refetch: refetchDepartments } = useQuery<DepartmentStats[]>({
        queryKey: ['/api/reports/department-stats', currentMonth, currentYear],
        queryFn: async () => {
            // Mock data for department statistics
            return [
                {
                    departmentId: 1,
                    departmentName: "Phòng Design",
                    employeeCount: 15,
                    avgTotalHours: 165,
                    totalDepartmentHours: 2475,
                    avgOvertimeHours: 4.2,
                    totalLeaveDays: 8,
                    avgLateMinutes: 12.5,
                    totalPenaltyAmount: 750000
                },
                {
                    departmentId: 2,
                    departmentName: "Phòng Nhân sự",
                    employeeCount: 12,
                    avgTotalHours: 158,
                    totalDepartmentHours: 1896,
                    avgOvertimeHours: 2.8,
                    totalLeaveDays: 6,
                    avgLateMinutes: 8.3,
                    totalPenaltyAmount: 450000
                },
                {
                    departmentId: 3,
                    departmentName: "Phòng IT",
                    employeeCount: 18,
                    avgTotalHours: 172,
                    totalDepartmentHours: 3096,
                    avgOvertimeHours: 5.1,
                    totalLeaveDays: 12,
                    avgLateMinutes: 15.2,
                    totalPenaltyAmount: 920000
                }
            ];
        }
    });

    const { data: attendanceRecords, isLoading: isAttendanceLoading } = useQuery<AttendanceRecord[]>({
        queryKey: ['/api/reports/monthly-attendance', currentMonth, currentYear, selectedDepartment],
        queryFn: async () => {
            // Mock attendance records
            return [
                {
                    id: 1,
                    employeeId: 1,
                    employeeName: "Nguyễn Văn A",
                    position: "Designer",
                    departmentName: "Phòng Design",
                    month: currentMonth,
                    year: currentYear,
                    totalHours: 168,
                    overtimeHours: 8,
                    leaveDays: 1,
                    earlyMinutes: 0,
                    lateMinutes: 30,
                    penaltyAmount: 150000,
                    createdAt: new Date().toISOString()
                },
                {
                    id: 2,
                    employeeId: 2,
                    employeeName: "Trần Thị B",
                    position: "HR Specialist",
                    departmentName: "Phòng Nhân sự",
                    month: currentMonth,
                    year: currentYear,
                    totalHours: 160,
                    overtimeHours: 5,
                    leaveDays: 0,
                    earlyMinutes: 0,
                    lateMinutes: 15,
                    penaltyAmount: 75000,
                    createdAt: new Date().toISOString()
                }
            ];
        }
    });

    const { data: topPerformers, isLoading: isTopLoading } = useQuery<TopPerformer[]>({
        queryKey: ['/api/reports/top-performers', currentMonth, currentYear],
        queryFn: async () => {
            // Mock top performers
            return [
                {
                    employeeId: 1,
                    employeeName: "Nguyễn Văn A",
                    position: "Senior Designer",
                    departmentName: "Phòng Design",
                    totalHours: 180,
                    overtimeHours: 20,
                    lateMinutes: 0,
                    penaltyAmount: 0
                },
                {
                    employeeId: 3,
                    employeeName: "Lê Văn C",
                    position: "Developer",
                    departmentName: "Phòng IT",
                    totalHours: 175,
                    overtimeHours: 15,
                    lateMinutes: 5,
                    penaltyAmount: 25000
                }
            ];
        }
    });

    const { data: attendanceTrends, isLoading: isTrendsLoading } = useQuery<AttendanceTrend[]>({
        queryKey: ['/api/reports/attendance-trends', currentYear],
        queryFn: async () => {
            // Mock trends data for 12 months
            return Array.from({ length: 12 }, (_, i) => ({
                month: i + 1,
                employeeCount: 45 + Math.floor(Math.random() * 10),
                totalHours: 7000 + Math.floor(Math.random() * 1000),
                avgHours: 155 + Math.floor(Math.random() * 20),
                totalOvertime: 100 + Math.floor(Math.random() * 100),
                totalLeaveDays: 20 + Math.floor(Math.random() * 30),
                totalPenalties: 1000000 + Math.floor(Math.random() * 2000000)
            }));
        }
    });

    // Chart colors
    const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff7f', '#ff1493', '#00bfff', '#ffd700'];

    // Format hours with null safety
    const formatHours = (hours: number | null | undefined) => {
        if (!hours || isNaN(hours)) return "0h 0m";
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return `${h}h ${m}m`;
    };

    // Format currency with null safety
    const formatCurrency = (amount: number | null | undefined) => {
        if (!amount || isNaN(amount)) return "0 ₫";
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            minimumFractionDigits: 0
        }).format(amount);
    };

    // Safe number formatting
    const safeNumber = (value: number | null | undefined) => {
        return value && !isNaN(value) ? value : 0;
    };

    // Export to CSV function with proper UTF-8 encoding for Vietnamese
    const exportToCSV = (data: any[], filename: string) => {
        if (!data || data.length === 0) return;

        const headers = Object.keys(data[0]);

        // Escape CSV values and handle Vietnamese characters
        const escapeCSVValue = (value: any) => {
            if (value === null || value === undefined) return '';
            const stringValue = String(value);
            // If value contains comma, newline, or quotes, wrap in quotes and escape internal quotes
            if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        };

        const csvContent = [
            headers.map(escapeCSVValue).join(','),
            ...data.map(row => headers.map(field => escapeCSVValue(row[field])).join(','))
        ].join('\n');

        // Add BOM for UTF-8 to ensure proper Vietnamese character display in Excel
        const BOM = '\uFEFF';
        const csvWithBOM = BOM + csvContent;

        const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Refresh all data
    const refreshAllData = () => {
        refetchOverall();
        refetchDepartments();
    };

    // Filter attendance records based on search term and department
    const filteredAttendanceRecords = attendanceRecords?.filter(record => {
        const matchesSearch = !searchTerm ||
            record.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.departmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.position.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesDepartment = selectedDepartment === 'all' ||
            record.departmentName === departmentStats?.find(d => d.departmentId.toString() === selectedDepartment)?.departmentName;

        return matchesSearch && matchesDepartment;
    }) || [];

    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            <Header
                title="📊 Báo cáo thống kê toàn hệ thống"
                description="Thống kê và phân tích dữ liệu chấm công của toàn bộ công ty"
            />

            <main className="flex-1 overflow-y-auto pb-16 md:pb-0 px-4 md:px-6 py-4">
                {/* Controls */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-semibold">Báo cáo quản trị</h2>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        {/* Search */}
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Tìm kiếm nhân viên..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Department Filter */}
                        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                            <SelectTrigger className="w-full md:w-48">
                                <SelectValue placeholder="Chọn phòng ban" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả phòng ban</SelectItem>
                                {departmentStats?.map((dept) => (
                                    <SelectItem key={dept.departmentId} value={dept.departmentId.toString()}>
                                        {dept.departmentName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Month Navigation */}
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
                                className="h-9"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="min-w-[120px] text-center flex items-center justify-center px-3 py-1 border rounded">
                                <p className="font-medium text-sm">
                                    {format(selectedMonth, 'MM/yyyy', { locale: vi })}
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
                                className="h-9"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Refresh Button */}
                        <Button
                            onClick={refreshAllData}
                            variant="outline"
                            size="sm"
                            disabled={isOverallLoading}
                            className="h-9"
                        >
                            {isOverallLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="h-4 w-4" />
                            )}
                            Làm mới
                        </Button>
                    </div>
                </div>

                {/* Tabs for different views */}
                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="overview">📈 Tổng quan</TabsTrigger>
                        <TabsTrigger value="trends">📊 Xu hướng</TabsTrigger>
                        <TabsTrigger value="charts">📈 Biểu đồ</TabsTrigger>
                        <TabsTrigger value="attendance">📋 Chấm công</TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-6">
                        {/* Quick Stats Cards */}
                        {overallStats && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Tổng nhân viên</CardTitle>
                                        <Users className="h-4 w-4 text-blue-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-blue-600">{safeNumber(overallStats?.totalEmployees)}</div>
                                        {overallStats?.absentEmployees && overallStats.absentEmployees > 0 && (
                                            <p className="text-xs text-red-500">
                                                {overallStats.absentEmployees} nghỉ việc
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Tổng giờ làm</CardTitle>
                                        <Clock className="h-4 w-4 text-green-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-green-600">{formatHours(overallStats?.totalHours)}</div>
                                        <p className="text-xs text-muted-foreground">
                                            TB: {formatHours(overallStats?.avgHoursPerEmployee)}/người
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Tăng ca</CardTitle>
                                        <TrendingUp className="h-4 w-4 text-orange-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-orange-600">{formatHours(overallStats?.totalOvertimeHours)}</div>
                                        <p className="text-xs text-muted-foreground">
                                            TB: {formatHours(overallStats?.avgOvertimePerEmployee)}/người
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Tổng phạt</CardTitle>
                                        <AlertTriangle className="h-4 w-4 text-red-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-red-600">{formatCurrency(overallStats?.totalPenaltyAmount)}</div>
                                        <p className="text-xs text-muted-foreground">
                                            TB: {formatCurrency(overallStats?.avgPenaltyPerEmployee)}/người
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Department Performance & Top Performers */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <Building2 className="mr-2 h-5 w-5 text-blue-600" />
                                        Hiệu suất phòng ban
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {departmentStats?.slice(0, 5).map((dept, index) => (
                                            <div key={dept.departmentId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                <div className="flex items-center space-x-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${index === 0 ? 'bg-yellow-500' :
                                                            index === 1 ? 'bg-gray-400' :
                                                                index === 2 ? 'bg-orange-600' : 'bg-gray-500'
                                                        }`}>
                                                        {index + 1}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{dept.departmentName}</p>
                                                        <p className="text-sm text-gray-500">{dept.employeeCount} nhân viên</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-semibold text-blue-600">{formatHours(dept.totalDepartmentHours)}</p>
                                                    <p className="text-sm text-gray-500">TB: {formatHours(dept.avgTotalHours)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Top Performers */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <Award className="mr-2 h-5 w-5 text-yellow-600" />
                                        Nhân viên xuất sắc
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {topPerformers?.slice(0, 5).map((performer, index) => (
                                            <div key={performer.employeeId} className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg">
                                                <div className="flex items-center space-x-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${index === 0 ? 'bg-yellow-500' :
                                                            index === 1 ? 'bg-gray-400' :
                                                                index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                                                        }`}>
                                                        {index + 1}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{performer.employeeName}</p>
                                                        <p className="text-sm text-gray-500">{performer.position}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-semibold text-green-600">{formatHours(performer.totalHours)}</p>
                                                    <p className="text-sm text-blue-500">+{formatHours(performer.overtimeHours)} TC</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Trends Tab */}
                    <TabsContent value="trends" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Monthly Trends */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <TrendingUp className="mr-2 h-5 w-5 text-blue-600" />
                                        Xu hướng giờ làm năm {currentYear}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {attendanceTrends && (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <AreaChart data={attendanceTrends}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="month" tickFormatter={(value) => `T${value}`} />
                                                <YAxis />
                                                <Tooltip
                                                    formatter={(value, name) => [
                                                        name === 'totalHours' ? formatHours(Number(value)) : value,
                                                        name === 'totalHours' ? 'Tổng giờ' :
                                                            name === 'avgHours' ? 'Trung bình' :
                                                                name === 'totalOvertime' ? 'Tăng ca' : name
                                                    ]}
                                                    labelFormatter={(value) => `Tháng ${value}`}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="totalHours"
                                                    stackId="1"
                                                    stroke="#8884d8"
                                                    fill="#8884d8"
                                                    fillOpacity={0.6}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="totalOvertime"
                                                    stackId="2"
                                                    stroke="#82ca9d"
                                                    fill="#82ca9d"
                                                    fillOpacity={0.6}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Penalty Trends */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <TrendingDown className="mr-2 h-5 w-5 text-red-600" />
                                        Xu hướng vi phạm năm {currentYear}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {attendanceTrends && (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <LineChart data={attendanceTrends}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="month" tickFormatter={(value) => `T${value}`} />
                                                <YAxis />
                                                <Tooltip
                                                    formatter={(value) => [formatCurrency(Number(value)), 'Tiền phạt']}
                                                    labelFormatter={(value) => `Tháng ${value}`}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="totalPenalties"
                                                    stroke="#ef4444"
                                                    strokeWidth={3}
                                                    dot={{ fill: '#ef4444', strokeWidth: 2 }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Charts Tab */}
                    <TabsContent value="charts" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Department Hours Chart */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between">
                                        <span className="flex items-center">
                                            <Building2 className="mr-2 h-5 w-5 text-blue-600" />
                                            Giờ làm theo phòng ban
                                        </span>
                                        <Button
                                            onClick={() => exportToCSV(departmentStats || [], `phong-ban-${currentMonth}-${currentYear}`)}
                                            variant="outline"
                                            size="sm"
                                        >
                                            <Download className="h-4 w-4" />
                                        </Button>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {departmentStats && (
                                        <ResponsiveContainer width="100%" height={350}>
                                            <BarChart data={departmentStats} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis
                                                    dataKey="departmentName"
                                                    angle={-45}
                                                    textAnchor="end"
                                                    height={70}
                                                    fontSize={12}
                                                />
                                                <YAxis />
                                                <Tooltip
                                                    formatter={(value) => [formatHours(Number(value)), 'Giờ làm']}
                                                    labelStyle={{ color: '#000' }}
                                                />
                                                <Bar dataKey="totalDepartmentHours" fill="#8884d8" radius={[4, 4, 0, 0]}>
                                                    {departmentStats.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Penalty Distribution */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <AlertTriangle className="mr-2 h-5 w-5 text-red-600" />
                                        Phân bố tiền phạt theo phòng ban
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {departmentStats && (
                                        <ResponsiveContainer width="100%" height={350}>
                                            <BarChart data={departmentStats}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="departmentName" angle={-30} textAnchor="end" height={80} fontSize={11} />
                                                <YAxis />
                                                <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Tiền phạt']} />
                                                <Bar dataKey="totalPenaltyAmount" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Attendance Records Tab */}
                    <TabsContent value="attendance" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span className="flex items-center">
                                        <FileText className="mr-2 h-5 w-5 text-blue-600" />
                                        Bảng chấm công chi tiết - {format(selectedMonth, 'MM/yyyy')}
                                    </span>
                                    <Button
                                        onClick={() => exportToCSV(filteredAttendanceRecords, `cham-cong-${currentMonth}-${currentYear}`)}
                                        variant="outline"
                                        size="sm"
                                    >
                                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                                        Xuất Excel
                                    </Button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isAttendanceLoading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="h-8 w-8 animate-spin" />
                                    </div>
                                ) : (
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Nhân viên</TableHead>
                                                    <TableHead>Chức vụ</TableHead>
                                                    <TableHead>Phòng ban</TableHead>
                                                    <TableHead>Giờ làm</TableHead>
                                                    <TableHead>Tăng ca</TableHead>
                                                    <TableHead>Nghỉ phép</TableHead>
                                                    <TableHead>Đi muộn</TableHead>
                                                    <TableHead>Tiền phạt</TableHead>
                                                    <TableHead>Trạng thái</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredAttendanceRecords.length > 0 ? (
                                                    filteredAttendanceRecords.map((record) => (
                                                        <TableRow key={record.id}>
                                                            <TableCell className="font-medium">{record.employeeName}</TableCell>
                                                            <TableCell>{record.position}</TableCell>
                                                            <TableCell>{record.departmentName}</TableCell>
                                                            <TableCell>{formatHours(record.totalHours)}</TableCell>
                                                            <TableCell>{formatHours(record.overtimeHours)}</TableCell>
                                                            <TableCell>{record.leaveDays} ngày</TableCell>
                                                            <TableCell>{record.lateMinutes} phút</TableCell>
                                                            <TableCell className="text-red-600">{formatCurrency(record.penaltyAmount)}</TableCell>
                                                            <TableCell>
                                                                <Badge variant={record.penaltyAmount > 0 ? "destructive" : "default"}>
                                                                    {record.penaltyAmount > 0 ? "Có phạt" : "Bình thường"}
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                                            Không có dữ liệu chấm công cho tháng này
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
};

export default Reports; 