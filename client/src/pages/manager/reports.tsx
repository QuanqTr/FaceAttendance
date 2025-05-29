import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { vi } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Download, Search, RefreshCw, Loader2, Users, Clock, TrendingUp, AlertTriangle, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

// Chart colors - giống admin
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff7f', '#ff1493', '#00bfff', '#ffd700'];

// Interfaces - tương tự admin nhưng department-specific
interface DepartmentOverallStats {
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
  activeEmployees: number;
  absentEmployees: number;
}

interface DepartmentAttendanceRecord {
  id: number;
  employeeId: number;
  employeeName: string;
  position: string;
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
  totalHours: number;
  overtimeHours: number;
  lateMinutes: number;
  penaltyAmount: number;
}

interface PenaltyAnalysis {
  employeeId: number;
  employeeName: string;
  position: string;
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
  const { t } = useTranslation();
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();
  const [, navigate] = useLocation();

  if (!user || user.role !== "manager") {
    navigate("/");
    return null;
  }

  const currentYear = selectedMonth.getFullYear();
  const formatDateParam = (date: Date) => format(date, 'yyyy-MM-dd');

  // Format functions - giống admin
  const formatHours = (hours: number | null | undefined) => {
    if (!hours || isNaN(hours)) return "0h 0m";
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount || isNaN(amount)) return "0 ₫";
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const safeNumber = (value: number | null | undefined) => {
    return value && !isNaN(value) ? value : 0;
  };

  // API calls - department-specific
  const { data: overallStats, isLoading: isOverallLoading, refetch: refetchOverall } = useQuery<DepartmentOverallStats>({
    queryKey: ["/api/manager/stats/department-overall", formatDateParam(selectedMonth)],
    queryFn: async () => {
      try {
        console.log('🔍 Calling manager department stats API...');
        const res = await fetch(`/api/manager/stats/department-overall?month=${formatDateParam(selectedMonth)}`);
        console.log('📡 API Response Status:', res.status);
        if (!res.ok) {
          console.error('❌ API Error:', res.status, res.statusText);
          throw new Error("Failed to fetch");
        }
        const data = await res.json();
        console.log('✅ API Success - Manager Department Stats:', data);
        return data;
      } catch (error) {
        console.error("❌ API Error - Using Mock Data:", error);
        // Mock data for department
        const mockData = {
          totalEmployees: 15,
          totalHours: 2400,
          avgHoursPerEmployee: 160,
          totalOvertimeHours: 240,
          avgOvertimePerEmployee: 16,
          totalLeaveDays: 25,
          avgLeaveDaysPerEmployee: 1.67,
          totalLateMinutes: 180,
          avgLateMinutesPerEmployee: 12,
          totalPenaltyAmount: 500000,
          avgPenaltyPerEmployee: 33333,
          activeEmployees: 14,
          absentEmployees: 1
        };
        console.log('🔄 Using Mock Data instead:', mockData);
        return mockData;
      }
    }
  });

  const { data: attendanceRecords, isLoading: isAttendanceLoading, refetch: refetchAttendance } = useQuery<DepartmentAttendanceRecord[]>({
    queryKey: ["/api/manager/stats/attendance-records", formatDateParam(selectedMonth)],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/manager/stats/attendance-records?month=${formatDateParam(selectedMonth)}`);
        if (!res.ok) throw new Error("Failed to fetch");
        return await res.json();
      } catch (error) {
        console.error("API Error:", error);
        // Mock attendance records for department
        return [
          { id: 1, employeeId: 1, employeeName: "John Doe", position: "Senior Developer", month: selectedMonth.getMonth() + 1, year: selectedMonth.getFullYear(), totalHours: 168, overtimeHours: 20, leaveDays: 2, earlyMinutes: 0, lateMinutes: 15, penaltyAmount: 50000, createdAt: new Date().toISOString() },
          { id: 2, employeeId: 2, employeeName: "Jane Smith", position: "Frontend Developer", month: selectedMonth.getMonth() + 1, year: selectedMonth.getFullYear(), totalHours: 152, overtimeHours: 12, leaveDays: 3, earlyMinutes: 5, lateMinutes: 25, penaltyAmount: 75000, createdAt: new Date().toISOString() },
          { id: 3, employeeId: 3, employeeName: "Mike Johnson", position: "Backend Developer", month: selectedMonth.getMonth() + 1, year: selectedMonth.getFullYear(), totalHours: 160, overtimeHours: 18, leaveDays: 1, earlyMinutes: 0, lateMinutes: 10, penaltyAmount: 25000, createdAt: new Date().toISOString() },
          { id: 4, employeeId: 4, employeeName: "Sarah Wilson", position: "UI/UX Designer", month: selectedMonth.getMonth() + 1, year: selectedMonth.getFullYear(), totalHours: 155, overtimeHours: 15, leaveDays: 2, earlyMinutes: 10, lateMinutes: 20, penaltyAmount: 60000, createdAt: new Date().toISOString() }
        ];
      }
    }
  });

  const { data: topPerformers, isLoading: isTopLoading, refetch: refetchTop } = useQuery<TopPerformer[]>({
    queryKey: ["/api/manager/stats/top-performers", formatDateParam(selectedMonth)],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/manager/stats/top-performers?month=${formatDateParam(selectedMonth)}`);
        if (!res.ok) throw new Error("Failed to fetch");
        return await res.json();
      } catch (error) {
        console.error("API Error:", error);
        // Mock top performers for department
        return [
          { employeeId: 1, employeeName: "John Doe", position: "Senior Developer", totalHours: 168, overtimeHours: 20, lateMinutes: 15, penaltyAmount: 50000 },
          { employeeId: 3, employeeName: "Mike Johnson", position: "Backend Developer", totalHours: 160, overtimeHours: 18, lateMinutes: 10, penaltyAmount: 25000 },
          { employeeId: 4, employeeName: "Sarah Wilson", position: "UI/UX Designer", totalHours: 155, overtimeHours: 15, lateMinutes: 20, penaltyAmount: 60000 }
        ];
      }
    }
  });

  const { data: penaltyAnalysis, isLoading: isPenaltyLoading, refetch: refetchPenalty } = useQuery<PenaltyAnalysis[]>({
    queryKey: ["/api/manager/stats/penalty-analysis", formatDateParam(selectedMonth)],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/manager/stats/penalty-analysis?month=${formatDateParam(selectedMonth)}`);
        if (!res.ok) throw new Error("Failed to fetch");
        return await res.json();
      } catch (error) {
        console.error("API Error:", error);
        // Mock penalty analysis for department
        return [
          { employeeId: 1, employeeName: "John Doe", position: "Senior Developer", lateMinutes: 15, earlyMinutes: 0, penaltyAmount: 50000, penaltyLevel: "Phạt nhẹ" },
          { employeeId: 2, employeeName: "Jane Smith", position: "Frontend Developer", lateMinutes: 25, earlyMinutes: 5, penaltyAmount: 75000, penaltyLevel: "Phạt trung bình" },
          { employeeId: 3, employeeName: "Mike Johnson", position: "Backend Developer", lateMinutes: 10, earlyMinutes: 0, penaltyAmount: 25000, penaltyLevel: "Phạt nhẹ" },
          { employeeId: 4, employeeName: "Sarah Wilson", position: "UI/UX Designer", lateMinutes: 20, earlyMinutes: 10, penaltyAmount: 60000, penaltyLevel: "Phạt trung bình" }
        ];
      }
    }
  });

  const { data: attendanceTrends, isLoading: isTrendsLoading, refetch: refetchTrends } = useQuery<AttendanceTrend[]>({
    queryKey: ["/api/manager/stats/attendance-trends", currentYear],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/manager/stats/attendance-trends?year=${currentYear}`);
        if (!res.ok) throw new Error("Failed to fetch");
        return await res.json();
      } catch (error) {
        console.error("API Error:", error);
        // Mock attendance trends for department
        return [
          { month: 1, employeeCount: 15, totalHours: 2400, avgHours: 160, totalOvertime: 240, totalLeaveDays: 25, totalPenalties: 500000 },
          { month: 2, employeeCount: 15, totalHours: 2280, avgHours: 152, totalOvertime: 220, totalLeaveDays: 30, totalPenalties: 450000 },
          { month: 3, employeeCount: 15, totalHours: 2520, avgHours: 168, totalOvertime: 280, totalLeaveDays: 20, totalPenalties: 400000 },
          { month: 4, employeeCount: 15, totalHours: 2400, avgHours: 160, totalOvertime: 240, totalLeaveDays: 25, totalPenalties: 500000 }
        ];
      }
    }
  });

  // Export functions
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
    refetchAttendance();
    refetchTop();
    refetchPenalty();
    refetchTrends();
  };

  // Filter attendance records based on search term
  const filteredAttendanceRecords = attendanceRecords?.filter(record => {
    const matchesSearch = !searchTerm ||
      record.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.position.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) || [];

  // Filter penalty analysis based on search term
  const filteredPenaltyAnalysis = penaltyAnalysis?.filter(record => {
    const matchesSearch = !searchTerm ||
      record.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.position.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) || [];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Báo cáo chấm công phòng ban" />

      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 px-4 md:px-6 py-4">
        {/* Controls - giống admin */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Báo cáo chấm công phòng ban</h2>
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

        {/* Tabs for different views - GIỐNG HỆT ADMIN */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">📈 Tổng quan</TabsTrigger>
            <TabsTrigger value="trends">📊 Xu hướng</TabsTrigger>
            <TabsTrigger value="charts">📈 Biểu đồ</TabsTrigger>
            <TabsTrigger value="attendance">📋 Chấm công</TabsTrigger>
            <TabsTrigger value="penalties">⚠️ Phân tích phạt</TabsTrigger>
          </TabsList>

          {/* Overview Tab - GIỐNG ADMIN */}
          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats Cards */}
            {overallStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tổng nhân viên phòng ban</CardTitle>
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

            {/* Department Summary và Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building2 className="mr-2 h-5 w-5 text-blue-600" />
                    Nhân viên xuất sắc phòng ban
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topPerformers?.slice(0, 5).map((emp, index) => (
                      <div key={emp.employeeId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-gray-500'
                            }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{emp.employeeName}</p>
                            <p className="text-sm text-gray-500">{emp.position}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-blue-600">{formatHours(emp.totalHours)}</p>
                          <p className="text-sm text-gray-500">TC: {formatHours(emp.overtimeHours)}</p>
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
                    Phân tích vi phạm phòng ban
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

          {/* Trends Tab - GIỐNG ADMIN */}
          <TabsContent value="trends" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="mr-2 h-5 w-5 text-blue-600" />
                    Xu hướng giờ làm phòng ban năm {currentYear}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {attendanceTrends && (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={attendanceTrends}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="totalHours" stroke="#8884d8" name="Tổng giờ làm" />
                        <Line type="monotone" dataKey="totalOvertime" stroke="#82ca9d" name="Tăng ca" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Penalty Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertTriangle className="mr-2 h-5 w-5 text-red-600" />
                    Xu hướng phạt phòng ban
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {attendanceTrends && (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={attendanceTrends}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="totalPenalties" fill="#ef4444" name="Tổng phạt (VND)" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Charts Tab - GIỐNG ADMIN */}
          <TabsContent value="charts" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Hours Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Phân bố giờ làm phòng ban</CardTitle>
                </CardHeader>
                <CardContent>
                  {attendanceRecords && (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={attendanceRecords}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="employeeName" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="totalHours" fill="#8884d8" name="Giờ làm" />
                        <Bar dataKey="overtimeHours" fill="#82ca9d" name="Tăng ca" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Late Minutes Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Phân bố phút đi muộn</CardTitle>
                </CardHeader>
                <CardContent>
                  {attendanceRecords && (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          dataKey="lateMinutes"
                          data={attendanceRecords}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          label={({ name, value }) => `${name}: ${value} phút`}
                        >
                          {attendanceRecords.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Attendance Tab - GIỐNG ADMIN */}
          <TabsContent value="attendance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Chi tiết chấm công phòng ban</CardTitle>
                <CardDescription>
                  Bảng chi tiết chấm công nhân viên phòng ban tháng {format(selectedMonth, 'MM/yyyy')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-4 font-medium">Nhân viên</th>
                        <th className="text-left p-4 font-medium">Chức vụ</th>
                        <th className="text-left p-4 font-medium">Giờ làm</th>
                        <th className="text-left p-4 font-medium">Tăng ca</th>
                        <th className="text-left p-4 font-medium">Nghỉ phép</th>
                        <th className="text-left p-4 font-medium">Đi muộn</th>
                        <th className="text-left p-4 font-medium">Phạt</th>
                        <th className="text-left p-4 font-medium">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAttendanceRecords.map((record) => (
                        <tr key={record.id} className="border-b hover:bg-gray-50">
                          <td className="p-4 font-medium">{record.employeeName}</td>
                          <td className="p-4">{record.position}</td>
                          <td className="p-4">{formatHours(record.totalHours)}</td>
                          <td className="p-4">{formatHours(record.overtimeHours)}</td>
                          <td className="p-4">{record.leaveDays} ngày</td>
                          <td className="p-4">{record.lateMinutes} phút</td>
                          <td className="p-4">{formatCurrency(record.penaltyAmount)}</td>
                          <td className="p-4">
                            <Button variant="outline" size="sm">
                              Chi tiết
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredAttendanceRecords.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      Không có dữ liệu chấm công cho kỳ này
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Penalties Tab - GIỐNG ADMIN */}
          <TabsContent value="penalties" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Phân tích phạt chi tiết phòng ban</CardTitle>
                <CardDescription>
                  Chi tiết vi phạm và mức phạt của nhân viên phòng ban
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-4 font-medium">Nhân viên</th>
                        <th className="text-left p-4 font-medium">Chức vụ</th>
                        <th className="text-left p-4 font-medium">Đi muộn</th>
                        <th className="text-left p-4 font-medium">Về sớm</th>
                        <th className="text-left p-4 font-medium">Mức phạt</th>
                        <th className="text-left p-4 font-medium">Loại phạt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPenaltyAnalysis.map((record) => (
                        <tr key={record.employeeId} className="border-b hover:bg-gray-50">
                          <td className="p-4 font-medium">{record.employeeName}</td>
                          <td className="p-4">{record.position}</td>
                          <td className="p-4">{record.lateMinutes} phút</td>
                          <td className="p-4">{record.earlyMinutes} phút</td>
                          <td className="p-4">{formatCurrency(record.penaltyAmount)}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs ${record.penaltyLevel === 'Không phạt' ? 'bg-green-100 text-green-800' :
                              record.penaltyLevel === 'Phạt nhẹ' ? 'bg-yellow-100 text-yellow-800' :
                                record.penaltyLevel === 'Phạt trung bình' ? 'bg-orange-100 text-orange-800' :
                                  'bg-red-100 text-red-800'
                              }`}>
                              {record.penaltyLevel}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredPenaltyAnalysis.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      Không có dữ liệu phân tích phạt cho kỳ này
                    </div>
                  )}
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
