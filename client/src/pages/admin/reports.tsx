import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiRequest } from '@/lib/api';
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

// Add ApiResponse interface
interface ApiResponse<T> {
  data: T;
  message?: string;
  status?: number;
}

const Reports: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const months = [
    { value: 1, label: 'Tháng 1' }, { value: 2, label: 'Tháng 2' },
    { value: 3, label: 'Tháng 3' }, { value: 4, label: 'Tháng 4' },
    { value: 5, label: 'Tháng 5' }, { value: 6, label: 'Tháng 6' },
    { value: 7, label: 'Tháng 7' }, { value: 8, label: 'Tháng 8' },
    { value: 9, label: 'Tháng 9' }, { value: 10, label: 'Tháng 10' },
    { value: 11, label: 'Tháng 11' }, { value: 12, label: 'Tháng 12' },
  ];

  const years = [2023, 2024, 2025, 2026].map(year => ({ value: year, label: `Năm ${year}` }));

  // Get month and year from selectedMonth Date
  const currentMonth = selectedMonth.getMonth() + 1;
  const currentYear = selectedMonth.getFullYear();

  // Format date for API requests
  const formatDateParam = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // API Queries
  const { data: overallStats, isLoading: isOverallLoading, refetch: refetchOverall } = useQuery<OverallStats>({
    queryKey: ['/api/reports/overall-stats', currentMonth, currentYear],
    queryFn: async () => {
      const startDate = new Date(currentYear, currentMonth - 1, 1);
      const endDate = new Date(currentYear, currentMonth, 0);
      const res = await apiRequest<OverallStats>('GET', `/api/reports/overall-stats?month=${currentMonth}&year=${currentYear}&startDate=${formatDateParam(startDate)}&endDate=${formatDateParam(endDate)}`);
      return res.data;
    }
  });

  const { data: departmentStats, isLoading: isDeptLoading, refetch: refetchDepartments } = useQuery<DepartmentStats[]>({
    queryKey: ['/api/reports/department-stats', currentMonth, currentYear],
    queryFn: async () => {
      const startDate = new Date(currentYear, currentMonth - 1, 1);
      const endDate = new Date(currentYear, currentMonth, 0);
      const res = await apiRequest<DepartmentStats[]>('GET', `/api/reports/department-stats?month=${currentMonth}&year=${currentYear}&startDate=${formatDateParam(startDate)}&endDate=${formatDateParam(endDate)}`);
      return res.data;
    }
  });

  const { data: attendanceRecords, isLoading: isAttendanceLoading, refetch: refetchAttendance } = useQuery<AttendanceRecord[]>({
    queryKey: ['/api/reports/monthly-attendance', currentMonth, currentYear, selectedDepartment],
    queryFn: async () => {
      const startDate = new Date(currentYear, currentMonth - 1, 1);
      const endDate = new Date(currentYear, currentMonth, 0);
      let url = `/api/reports/monthly-attendance?month=${currentMonth}&year=${currentYear}&startDate=${formatDateParam(startDate)}&endDate=${formatDateParam(endDate)}`;
      if (selectedDepartment !== 'all') {
        url += `&departmentId=${selectedDepartment}`;
      }
      const res = await apiRequest<AttendanceRecord[]>('GET', url);
      return res.data;
    }
  });

  const { data: topPerformers, isLoading: isTopLoading, refetch: refetchTop } = useQuery<TopPerformer[]>({
    queryKey: ['/api/reports/top-performers', currentMonth, currentYear],
    queryFn: async () => {
      const startDate = new Date(currentYear, currentMonth - 1, 1);
      const endDate = new Date(currentYear, currentMonth, 0);
      const res = await apiRequest<TopPerformer[]>('GET', `/api/reports/top-performers?month=${currentMonth}&year=${currentYear}&startDate=${formatDateParam(startDate)}&endDate=${formatDateParam(endDate)}&limit=10`);
      return res.data;
    }
  });

  const { data: penaltyAnalysis, isLoading: isPenaltyLoading, refetch: refetchPenalty } = useQuery<PenaltyAnalysis[]>({
    queryKey: ['/api/reports/penalty-analysis', currentMonth, currentYear],
    queryFn: async () => {
      const startDate = new Date(currentYear, currentMonth - 1, 1);
      const endDate = new Date(currentYear, currentMonth, 0);
      const res = await apiRequest<PenaltyAnalysis[]>('GET', `/api/reports/penalty-analysis?month=${currentMonth}&year=${currentYear}&startDate=${formatDateParam(startDate)}&endDate=${formatDateParam(endDate)}`);
      return res.data;
    }
  });

  // New query for trends
  const { data: attendanceTrends, isLoading: isTrendsLoading } = useQuery<AttendanceTrend[]>({
    queryKey: ['/api/reports/attendance-trends', currentYear],
    queryFn: async () => {
      const res = await apiRequest<AttendanceTrend[]>('GET', `/api/reports/attendance-trends?year=${currentYear}`);
      return res.data;
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

  // Export to CSV function
  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(field => row[field]).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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
    refetchAttendance();
    refetchTop();
    refetchPenalty();
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

  // Filter penalty analysis based on search term and department
  const filteredPenaltyAnalysis = penaltyAnalysis?.filter(record => {
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
      <Header title="Báo cáo chấm công" />

      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 px-4 md:px-6 py-4">
        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Báo cáo chấm công</h2>
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">📈 Tổng quan</TabsTrigger>
            <TabsTrigger value="trends">📊 Xu hướng</TabsTrigger>
            <TabsTrigger value="charts">📈 Biểu đồ</TabsTrigger>
            <TabsTrigger value="attendance">📋 Chấm công</TabsTrigger>
            <TabsTrigger value="penalties">⚠️ Phân tích phạt</TabsTrigger>
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
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${Math.min((safeNumber(overallStats?.avgHoursPerEmployee) / 180) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tổng tăng ca</CardTitle>
                    <TrendingUp className="h-4 w-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">{formatHours(overallStats?.totalOvertimeHours)}</div>
                    <p className="text-xs text-muted-foreground">
                      TB: {formatHours(overallStats?.avgOvertimePerEmployee)}/người
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {safeNumber(overallStats?.totalOvertimeHours) > 0 && safeNumber(overallStats?.totalHours) > 0
                        ? ((safeNumber(overallStats?.totalOvertimeHours) / safeNumber(overallStats?.totalHours)) * 100).toFixed(1)
                        : "0"}% tổng giờ làm
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
                    <p className="text-xs text-red-500 mt-1">
                      {safeNumber(overallStats?.totalLateMinutes)} phút đi muộn tổng
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Department Summary */}
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
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${index === 0 ? 'bg-gold' : index === 1 ? 'bg-silver' : index === 2 ? 'bg-bronze' : 'bg-gray-500'
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

              {/* Penalty Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertTriangle className="mr-2 h-5 w-5 text-red-600" />
                    Phân tích vi phạm
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {penaltyAnalysis && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-red-50 rounded-lg">
                          <p className="text-2xl font-bold text-red-600">
                            {penaltyAnalysis.filter(p => p.penaltyAmount > 0).length}
                          </p>
                          <p className="text-sm text-gray-600">Nhân viên bị phạt</p>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">
                            {penaltyAnalysis.filter(p => p.penaltyAmount === 0).length}
                          </p>
                          <p className="text-sm text-gray-600">Không vi phạm</p>
                        </div>
                      </div>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            dataKey="value"
                            data={[
                              { name: 'Không phạt', value: penaltyAnalysis.filter(p => p.penaltyLevel === 'Không phạt').length },
                              { name: 'Phạt nhẹ', value: penaltyAnalysis.filter(p => p.penaltyLevel === 'Phạt nhẹ').length },
                              { name: 'Phạt trung bình', value: penaltyAnalysis.filter(p => p.penaltyLevel === 'Phạt trung bình').length },
                              { name: 'Phạt nặng', value: penaltyAnalysis.filter(p => p.penaltyLevel === 'Phạt nặng').length }
                            ]}
                            cx="50%"
                            cy="50%"
                            outerRadius={70}
                            fill="#8884d8"
                            label
                          >
                            {['#22c55e', '#eab308', '#f97316', '#ef4444'].map((color, index) => (
                              <Cell key={`cell-${index}`} fill={color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
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

            {/* Comparative Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>📊 Phân tích so sánh các tháng</CardTitle>
              </CardHeader>
              <CardContent>
                {attendanceTrends && (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={attendanceTrends} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tickFormatter={(value) => `Tháng ${value}`} />
                      <YAxis />
                      <Tooltip
                        formatter={(value, name) => [
                          name === 'avgHours' ? formatHours(Number(value)) :
                            name === 'totalLeaveDays' ? `${value} ngày` :
                              name === 'employeeCount' ? `${value} người` :
                                value,
                          name === 'avgHours' ? 'Giờ TB/người' :
                            name === 'totalLeaveDays' ? 'Ngày nghỉ' :
                              name === 'employeeCount' ? 'Số nhân viên' :
                                name
                        ]}
                      />
                      <Legend />
                      <Bar dataKey="employeeCount" fill="#8884d8" name="Số nhân viên" />
                      <Bar dataKey="avgHours" fill="#82ca9d" name="Giờ TB/người" />
                      <Bar dataKey="totalLeaveDays" fill="#ffc658" name="Ngày nghỉ" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
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

              {/* Average Hours per Employee by Department */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="mr-2 h-5 w-5 text-green-600" />
                    Giờ trung bình/nhân viên theo phòng ban
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {departmentStats && (
                    <ResponsiveContainer width="100%" height={350}>
                      <AreaChart data={departmentStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="departmentName" angle={-30} textAnchor="end" height={60} fontSize={11} />
                        <YAxis />
                        <Tooltip formatter={(value) => [formatHours(Number(value)), 'Giờ TB/người']} />
                        <Area
                          type="monotone"
                          dataKey="avgTotalHours"
                          stroke="#22c55e"
                          fill="#22c55e"
                          fillOpacity={0.6}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Overtime vs Regular Hours */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="mr-2 h-5 w-5 text-orange-600" />
                    So sánh giờ làm thường vs tăng ca
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {departmentStats && (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={departmentStats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="departmentName" angle={-30} textAnchor="end" height={80} fontSize={11} />
                        <YAxis />
                        <Tooltip formatter={(value) => [formatHours(Number(value)), '']} />
                        <Legend />
                        <Bar dataKey="totalDepartmentHours" fill="#8884d8" name="Giờ làm thường" />
                        <Bar dataKey="avgOvertimeHours" fill="#82ca9d" name="Giờ tăng ca TB" />
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
                    <ResponsiveContainer width="100%" height={300}>
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
          <TabsContent value="attendance" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Chi tiết chấm công tháng {currentMonth}/{currentYear}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Hiển thị {filteredAttendanceRecords?.length || 0} bản ghi
                  {searchTerm && ` (lọc: "${searchTerm}")`}
                  {selectedDepartment !== 'all' && ` - Phòng ban: ${departmentStats?.find(d => d.departmentId.toString() === selectedDepartment)?.departmentName}`}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => exportToCSV(filteredAttendanceRecords || [], `cham-cong-${currentMonth}-${currentYear}`)}
                  className="flex items-center gap-2"
                  variant="outline"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Xuất Excel
                </Button>
                <Button
                  onClick={() => exportToCSV(filteredAttendanceRecords || [], `cham-cong-${currentMonth}-${currentYear}`)}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Xuất CSV
                </Button>
              </div>
            </div>

            {/* Summary Cards */}
            {filteredAttendanceRecords && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card className="text-center">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {filteredAttendanceRecords.length}
                    </div>
                    <p className="text-sm text-gray-600">Tổng bản ghi</p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">
                      {formatHours(filteredAttendanceRecords.reduce((sum, record) => sum + (record.totalHours || 0), 0))}
                    </div>
                    <p className="text-sm text-gray-600">Tổng giờ làm</p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-orange-600">
                      {formatHours(filteredAttendanceRecords.reduce((sum, record) => sum + (record.overtimeHours || 0), 0))}
                    </div>
                    <p className="text-sm text-gray-600">Tổng tăng ca</p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(filteredAttendanceRecords.reduce((sum, record) => sum + (record.penaltyAmount || 0), 0))}
                    </div>
                    <p className="text-sm text-gray-600">Tổng phạt</p>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Nhân viên</TableHead>
                        <TableHead>Phòng ban</TableHead>
                        <TableHead>Chức vụ</TableHead>
                        <TableHead className="text-right">Giờ làm</TableHead>
                        <TableHead className="text-right">Tăng ca</TableHead>
                        <TableHead className="text-right">Nghỉ phép</TableHead>
                        <TableHead className="text-right">Đi muộn</TableHead>
                        <TableHead className="text-right">Về sớm</TableHead>
                        <TableHead className="text-right">Tiền phạt</TableHead>
                        <TableHead className="text-center">Đánh giá</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAttendanceRecords?.map((record) => (
                        <TableRow key={record.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">
                            <div>
                              <p className="font-semibold">{record.employeeName}</p>
                              <p className="text-xs text-gray-500">ID: {record.employeeId}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{record.departmentName}</Badge>
                          </TableCell>
                          <TableCell>{record.position}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatHours(record.totalHours)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={record.overtimeHours > 0 ? "text-orange-600 font-medium" : ""}>
                              {formatHours(record.overtimeHours)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{record.leaveDays} ngày</TableCell>
                          <TableCell className="text-right">
                            <span className={record.lateMinutes > 0 ? "text-red-500 font-medium" : ""}>
                              {record.lateMinutes} phút
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={record.earlyMinutes > 0 ? "text-red-500 font-medium" : ""}>
                              {record.earlyMinutes} phút
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={record.penaltyAmount > 0 ? "text-red-600 font-medium" : "text-green-600"}>
                              {formatCurrency(record.penaltyAmount)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {record.penaltyAmount === 0 && record.lateMinutes === 0 ? (
                              <Badge className="bg-green-100 text-green-800">Xuất sắc</Badge>
                            ) : record.penaltyAmount > 0 ? (
                              <Badge variant="destructive">Cần cải thiện</Badge>
                            ) : (
                              <Badge variant="secondary">Bình thường</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!filteredAttendanceRecords || filteredAttendanceRecords.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                            {searchTerm ? 'Không tìm thấy nhân viên nào phù hợp' : 'Không có dữ liệu chấm công cho tháng này'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Penalties Tab */}
          <TabsContent value="penalties" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">⚠️ Phân tích vi phạm và tiền phạt</h3>
                <p className="text-sm text-gray-600 mt-1">Chi tiết các vi phạm về giờ giấc và mức độ phạt</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => exportToCSV(filteredPenaltyAnalysis || [], `penalty-analysis-${currentMonth}-${currentYear}`)}
                  className="flex items-center gap-2"
                  variant="outline"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Xuất báo cáo vi phạm
                </Button>
              </div>
            </div>

            {/* Penalty Statistics */}
            {penaltyAnalysis && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {penaltyAnalysis.filter(p => p.penaltyAmount > 0).length}
                    </div>
                    <p className="text-sm text-red-700">Nhân viên vi phạm</p>
                  </CardContent>
                </Card>

                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {penaltyAnalysis.reduce((sum, p) => sum + p.lateMinutes, 0)}
                    </div>
                    <p className="text-sm text-orange-700">Phút đi muộn tổng</p>
                  </CardContent>
                </Card>

                <Card className="bg-yellow-50 border-yellow-200">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {penaltyAnalysis.reduce((sum, p) => sum + p.earlyMinutes, 0)}
                    </div>
                    <p className="text-sm text-yellow-700">Phút về sớm tổng</p>
                  </CardContent>
                </Card>

                <Card className="bg-red-50 border-red-200">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(penaltyAnalysis.reduce((sum, p) => sum + p.penaltyAmount, 0))}
                    </div>
                    <p className="text-sm text-red-700">Tổng tiền phạt</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Penalty Level Summary */}
            {penaltyAnalysis && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {['Không phạt', 'Phạt nhẹ', 'Phạt trung bình', 'Phạt nặng'].map((level, index) => {
                  const count = penaltyAnalysis.filter(p => p.penaltyLevel === level).length;
                  const colors = ['green', 'yellow', 'orange', 'red'];
                  const color = colors[index];

                  return (
                    <Card key={level} className={`bg-${color}-50 border-${color}-200`}>
                      <CardContent className="p-4 text-center">
                        <div className={`text-xl font-bold text-${color}-600`}>
                          {count}
                        </div>
                        <p className={`text-sm text-${color}-700`}>{level}</p>
                        <p className={`text-xs text-${color}-600 mt-1`}>
                          {penaltyAnalysis.length > 0 ? ((count / penaltyAnalysis.length) * 100).toFixed(1) : 0}%
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Nhân viên</TableHead>
                        <TableHead>Phòng ban</TableHead>
                        <TableHead>Chức vụ</TableHead>
                        <TableHead className="text-right">Đi muộn</TableHead>
                        <TableHead className="text-right">Về sớm</TableHead>
                        <TableHead className="text-right">Tiền phạt</TableHead>
                        <TableHead className="text-center">Mức độ</TableHead>
                        <TableHead className="text-center">Đánh giá</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPenaltyAnalysis?.map((analysis) => (
                        <TableRow key={analysis.employeeId} className="hover:bg-gray-50">
                          <TableCell className="font-medium">
                            <div>
                              <p className="font-semibold">{analysis.employeeName}</p>
                              <p className="text-xs text-gray-500">ID: {analysis.employeeId}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{analysis.departmentName}</Badge>
                          </TableCell>
                          <TableCell>{analysis.position}</TableCell>
                          <TableCell className="text-right">
                            <span className={analysis.lateMinutes > 0 ? "text-red-500 font-medium" : "text-green-500"}>
                              {analysis.lateMinutes} phút
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={analysis.earlyMinutes > 0 ? "text-orange-500 font-medium" : "text-green-500"}>
                              {analysis.earlyMinutes} phút
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={analysis.penaltyAmount > 0 ? "text-red-600 font-bold" : "text-green-600 font-medium"}>
                              {formatCurrency(analysis.penaltyAmount)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={
                                analysis.penaltyLevel === 'Không phạt' ? 'default' :
                                  analysis.penaltyLevel === 'Phạt nhẹ' ? 'secondary' :
                                    analysis.penaltyLevel === 'Phạt trung bình' ? 'default' : 'destructive'
                              }
                              className={
                                analysis.penaltyLevel === 'Không phạt' ? 'bg-green-100 text-green-800' :
                                  analysis.penaltyLevel === 'Phạt nhẹ' ? 'bg-yellow-100 text-yellow-800' :
                                    analysis.penaltyLevel === 'Phạt trung bình' ? 'bg-orange-100 text-orange-800' :
                                      'bg-red-100 text-red-800'
                              }
                            >
                              {analysis.penaltyLevel}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {analysis.penaltyAmount === 0 ? (
                              <span className="text-green-600 font-medium">✅ Xuất sắc</span>
                            ) : analysis.penaltyLevel === 'Phạt nhẹ' ? (
                              <span className="text-yellow-600 font-medium">⚠️ Cần chú ý</span>
                            ) : analysis.penaltyLevel === 'Phạt trung bình' ? (
                              <span className="text-orange-600 font-medium">📢 Cảnh báo</span>
                            ) : (
                              <span className="text-red-600 font-medium">❌ Nghiêm trọng</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!filteredPenaltyAnalysis || filteredPenaltyAnalysis.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                            Không có dữ liệu vi phạm cho tháng này
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Reports;
