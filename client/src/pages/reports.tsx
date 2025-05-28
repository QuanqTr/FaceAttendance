import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Download, FileText, Users, TrendingUp, BarChart3, PieChart, Building2, Clock, Target, Calendar as CalendarIcon, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsPage() {
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");

  // Generate year options (current year and 2 years back)
  const yearOptions = Array.from({ length: 3 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return { value: year.toString(), label: year.toString() };
  });

  // Month options in Vietnamese
  const monthOptions = [
    { value: "1", label: "Tháng 1" },
    { value: "2", label: "Tháng 2" },
    { value: "3", label: "Tháng 3" },
    { value: "4", label: "Tháng 4" },
    { value: "5", label: "Tháng 5" },
    { value: "6", label: "Tháng 6" },
    { value: "7", label: "Tháng 7" },
    { value: "8", label: "Tháng 8" },
    { value: "9", label: "Tháng 9" },
    { value: "10", label: "Tháng 10" },
    { value: "11", label: "Tháng 11" },
    { value: "12", label: "Tháng 12" },
  ];

  // Fetch departments for filter
  const { data: departments } = useQuery({
    queryKey: ["/api/departments"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/departments");
      return res.data || [];
    }
  });

  // Fetch attendance summary data
  const { data: attendanceSummary, isLoading: isAttendanceLoading } = useQuery({
    queryKey: ["/api/reports/attendance-summary", selectedYear, selectedMonth, selectedDepartment],
    queryFn: async () => {
      const params = new URLSearchParams({
        year: selectedYear,
        month: selectedMonth,
      });
      if (selectedDepartment !== "all") {
        params.append("departmentId", selectedDepartment);
      }

      const res = await apiRequest("GET", `/api/reports/attendance-summary?${params}`);
      return res.data || [];
    }
  });

  // Fetch statistics data
  const { data: statistics, isLoading: isStatsLoading } = useQuery({
    queryKey: ["/api/reports/statistics", selectedYear, selectedMonth, selectedDepartment],
    queryFn: async () => {
      const params = new URLSearchParams({
        year: selectedYear,
        month: selectedMonth,
      });
      if (selectedDepartment !== "all") {
        params.append("departmentId", selectedDepartment);
      }

      const res = await apiRequest("GET", `/api/reports/statistics?${params}`);
      return res.data || {
        totalEmployees: 0,
        totalHours: 0,
        attendanceRate: 0,
        averageHoursPerEmployee: 0
      };
    }
  });

  // Fetch department summary
  const { data: departmentSummary, isLoading: isDeptLoading } = useQuery({
    queryKey: ["/api/reports/department-summary", selectedYear, selectedMonth],
    queryFn: async () => {
      const params = new URLSearchParams({
        year: selectedYear,
        month: selectedMonth,
      });

      const res = await apiRequest("GET", `/api/reports/department-summary?${params}`);
      return res.data || [];
    }
  });

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      const params = new URLSearchParams({
        format,
        year: selectedYear,
        month: selectedMonth,
        type: activeTab,
      });
      if (selectedDepartment !== "all") {
        params.append("departmentId", selectedDepartment);
      }

      const res = await fetch(`/api/reports/export?${params}`, {
        credentials: 'include'
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `report-${activeTab}-${selectedYear}-${selectedMonth}.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "✅ Xuất báo cáo thành công",
        description: `Báo cáo ${format.toUpperCase()} đã được tải xuống`,
      });
    } catch (error) {
      toast({
        title: "❌ Lỗi xuất báo cáo",
        description: "Không thể xuất báo cáo. Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`;
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`;
  };

  // Loading skeleton
  if (isAttendanceLoading || isStatsLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex space-x-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              📊 Báo cáo thống kê
            </h1>
            <p className="text-muted-foreground text-lg">
              Phân tích dữ liệu chấm công và hiệu suất làm việc
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-4 w-4 text-gray-500" />
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Năm" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year.value} value={year.value}>
                      {year.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Tháng" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Phòng ban" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả phòng ban</SelectItem>
                  {departments?.map((dept: any) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Export buttons */}
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('excel')}
                className="bg-green-50 border-green-200 hover:bg-green-100"
              >
                <FileText className="h-4 w-4 mr-2 text-green-600" />
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('pdf')}
                className="bg-red-50 border-red-200 hover:bg-red-100"
              >
                <Download className="h-4 w-4 mr-2 text-red-600" />
                PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-blue-100/50 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-800">Tổng nhân viên</CardTitle>
              <Users className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700">{statistics?.totalEmployees || 0}</div>
              <p className="text-xs text-blue-600 mt-1">nhân viên hoạt động</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-50 to-green-100/50 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-800">Tổng giờ làm</CardTitle>
              <Clock className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-700">
                {formatHours(statistics?.totalHours || 0)}
              </div>
              <p className="text-xs text-green-600 mt-1">trong tháng</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500 bg-gradient-to-br from-orange-50 to-orange-100/50 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-800">Tỷ lệ chấm công</CardTitle>
              <Target className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-700">
                {formatPercentage(statistics?.attendanceRate || 0)}
              </div>
              <Progress value={statistics?.attendanceRate || 0} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50 to-purple-100/50 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-800">TB giờ/nhân viên</CardTitle>
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-700">
                {formatHours(statistics?.averageHoursPerEmployee || 0)}
              </div>
              <p className="text-xs text-purple-600 mt-1">trung bình</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different report views */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/50 backdrop-blur-sm">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Tổng quan</span>
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Chi tiết chấm công</span>
            </TabsTrigger>
            <TabsTrigger value="departments" className="flex items-center space-x-2">
              <Building2 className="h-4 w-4" />
              <span>Theo phòng ban</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Department Performance Chart */}
              <Card className="shadow-lg bg-white/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PieChart className="mr-2 h-5 w-5 text-blue-600" />
                    Hiệu suất theo phòng ban
                  </CardTitle>
                  <CardDescription>
                    Tỷ lệ chấm công của từng phòng ban
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isDeptLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : departmentSummary?.length > 0 ? (
                    <div className="space-y-4">
                      {departmentSummary.slice(0, 5).map((dept: any, index: number) => {
                        const colors = [
                          'bg-blue-500', 'bg-green-500', 'bg-orange-500',
                          'bg-purple-500', 'bg-pink-500'
                        ];
                        const color = colors[index % colors.length];

                        return (
                          <div key={dept.departmentName} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium truncate">{dept.departmentName}</span>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-500">{dept.employeeCount} nhân viên</span>
                                <Badge variant="outline" className="text-xs">
                                  {formatPercentage(dept.attendanceRate || 0)}
                                </Badge>
                              </div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className={`h-3 rounded-full ${color.replace('bg-', 'bg-gradient-to-r from-')} to-${color.split('-')[1]}-400`}
                                style={{ width: `${Math.min(dept.attendanceRate || 0, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Chưa có dữ liệu hiệu suất phòng ban</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Performers */}
              <Card className="shadow-lg bg-white/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="mr-2 h-5 w-5 text-green-600" />
                    Nhân viên xuất sắc
                  </CardTitle>
                  <CardDescription>
                    Top 5 nhân viên có giờ làm cao nhất
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isAttendanceLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : attendanceSummary?.length > 0 ? (
                    <div className="space-y-3">
                      {attendanceSummary
                        .sort((a: any, b: any) => (b.totalHours || 0) - (a.totalHours || 0))
                        .slice(0, 5)
                        .map((employee: any, index: number) => (
                          <div key={employee.employeeId} className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-medium
                                                                ${index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                                  index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                                    index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-500' :
                                      'bg-gradient-to-r from-blue-400 to-blue-500'}`}>
                                {index + 1}
                              </span>
                              <div>
                                <p className="font-medium text-gray-800">{employee.employeeName}</p>
                                <p className="text-sm text-gray-500">{employee.departmentName}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-green-600">{formatHours(employee.totalHours || 0)}</p>
                              <p className="text-xs text-gray-500">{formatPercentage(employee.attendanceRate || 0)}</p>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Chưa có dữ liệu nhân viên</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Attendance Details Tab */}
          <TabsContent value="attendance" className="space-y-6">
            <Card className="shadow-lg bg-white/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Chi tiết chấm công nhân viên</CardTitle>
                <CardDescription>
                  Thông tin chi tiết về giờ làm việc và chấm công của từng nhân viên
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isAttendanceLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : attendanceSummary?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nhân viên</TableHead>
                          <TableHead>Phòng ban</TableHead>
                          <TableHead>Tổng giờ</TableHead>
                          <TableHead>Giờ làm thêm</TableHead>
                          <TableHead>Tỷ lệ chấm công</TableHead>
                          <TableHead>Trạng thái</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceSummary.map((employee: any) => (
                          <TableRow key={employee.employeeId}>
                            <TableCell className="font-medium">
                              {employee.employeeName}
                            </TableCell>
                            <TableCell>{employee.departmentName}</TableCell>
                            <TableCell>{formatHours(employee.totalHours || 0)}</TableCell>
                            <TableCell>{formatHours(employee.overtimeHours || 0)}</TableCell>
                            <TableCell>
                              <Badge variant={
                                (employee.attendanceRate || 0) >= 90 ? "default" :
                                  (employee.attendanceRate || 0) >= 80 ? "secondary" : "destructive"
                              }>
                                {formatPercentage(employee.attendanceRate || 0)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                (employee.totalHours || 0) >= 160 ? "default" :
                                  (employee.totalHours || 0) >= 120 ? "secondary" : "destructive"
                              }>
                                {(employee.totalHours || 0) >= 160 ? "Đạt chuẩn" :
                                  (employee.totalHours || 0) >= 120 ? "Cần cải thiện" : "Dưới chuẩn"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">Chưa có dữ liệu chấm công</h3>
                    <p className="text-gray-500">Không có dữ liệu chấm công cho kỳ đã chọn</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Departments Tab */}
          <TabsContent value="departments" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isDeptLoading ? (
                [...Array(6)].map((_, i) => (
                  <Card key={i} className="shadow-lg">
                    <CardHeader>
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))
              ) : departmentSummary?.length > 0 ? (
                departmentSummary.map((dept: any, index: number) => {
                  const gradients = [
                    'from-blue-500 to-blue-600',
                    'from-green-500 to-green-600',
                    'from-orange-500 to-orange-600',
                    'from-purple-500 to-purple-600',
                    'from-pink-500 to-pink-600',
                    'from-indigo-500 to-indigo-600'
                  ];
                  const gradient = gradients[index % gradients.length];

                  return (
                    <Card key={dept.departmentName} className="shadow-lg hover:shadow-xl transition-shadow bg-white/60 backdrop-blur-sm">
                      <CardHeader className={`bg-gradient-to-r ${gradient} text-white rounded-t-lg`}>
                        <CardTitle className="text-lg">{dept.departmentName}</CardTitle>
                        <CardDescription className="text-white/90">
                          {dept.employeeCount} nhân viên
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Tổng giờ:</span>
                            <span className="font-semibold text-blue-600">
                              {formatHours(dept.totalHours || 0)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Tỷ lệ chấm công:</span>
                            <Badge variant={
                              (dept.attendanceRate || 0) >= 90 ? "default" :
                                (dept.attendanceRate || 0) >= 80 ? "secondary" : "destructive"
                            }>
                              {formatPercentage(dept.attendanceRate || 0)}
                            </Badge>
                          </div>
                          <div className="mt-4">
                            <div className="flex justify-between text-xs mb-1">
                              <span>Tiến độ</span>
                              <span>{formatPercentage(dept.attendanceRate || 0)}</span>
                            </div>
                            <Progress value={dept.attendanceRate || 0} className="h-2" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <div className="col-span-full">
                  <Card className="text-center py-12">
                    <CardContent>
                      <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-600 mb-2">Chưa có dữ liệu phòng ban</h3>
                      <p className="text-gray-500">Không có dữ liệu phòng ban cho kỳ đã chọn</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
