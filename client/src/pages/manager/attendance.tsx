import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Users, TrendingUp, Download, Calendar as CalendarIcon, RefreshCw, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { format } from "date-fns";

export default function ManagerAttendance() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState("all");

  if (!user || user.role !== "manager") {
    navigate("/");
    return null;
  }

  // Helper functions for date navigation
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Fetch attendance data
  const { data: attendanceData, isLoading: isAttendanceLoading, refetch } = useQuery({
    queryKey: ["/api/manager/attendance", selectedDate.toISOString().split('T')[0], statusFilter],
    queryFn: async () => {
      const dateParam = selectedDate.toISOString().split('T')[0];
      const res = await fetch(`/api/manager/attendance?date=${dateParam}&status=${statusFilter}`);
      if (!res.ok) throw new Error("Failed to fetch attendance");
      return await res.json();
    }
  });

  // Fetch department info
  const { data: departmentInfo, isLoading: isDeptLoading } = useQuery({
    queryKey: ["/api/manager/department-info"],
    queryFn: async () => {
      const res = await fetch("/api/manager/department-info");
      if (!res.ok) throw new Error("Failed to fetch department info");
      return await res.json();
    }
  });

  const exportAttendance = () => {
    if (!attendanceData?.attendance) return;

    const csvContent = [
      ['Employee Name', 'Position', 'Department', 'Check In', 'Check Out', 'Status', 'Work Hours'].join(','),
      ...attendanceData.attendance.map((record: any) => [
        record.employeeName,
        record.position || 'N/A',
        record.departmentName || 'N/A',
        record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString() : 'N/A',
        record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString() : 'N/A',
        record.status,
        record.workHours || '0.0'
      ].join(','))
    ].join('\n');

    // Add BOM for UTF-8 to ensure proper Vietnamese character display in Excel
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvContent;

    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${selectedDate.toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const attendanceStats = {
    total: attendanceData?.total || 0,
    present: attendanceData?.attendance?.filter((a: any) => a.status === 'present' || a.status === 'normal').length || 0,
    late: attendanceData?.attendance?.filter((a: any) => a.status === 'late').length || 0,
    absent: attendanceData?.attendance?.filter((a: any) => a.status === 'absent').length || 0,
    leave: attendanceData?.attendance?.filter((a: any) => a.status === 'leave').length || 0,
    earlyLeave: attendanceData?.attendance?.filter((a: any) => a.status === 'early_leave').length || 0,
    overtime: attendanceData?.attendance?.filter((a: any) => a.status === 'overtime').length || 0
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
      case 'normal':
        return <Badge className="bg-green-500 hover:bg-green-600">Có mặt</Badge>;
      case 'late':
        return <Badge className="bg-amber-500 hover:bg-amber-600">Đi muộn</Badge>;
      case 'absent':
        return <Badge variant="destructive">Vắng mặt</Badge>;
      case 'leave':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Nghỉ phép</Badge>;
      case 'early_leave':
        return <Badge className="bg-orange-500 hover:bg-orange-600">Về sớm</Badge>;
      case 'overtime':
        return <Badge className="bg-purple-500 hover:bg-purple-600">Tăng ca</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Quản lý chấm công" />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">


          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <Card className="hover:shadow-lg transition-all duration-200 bg-white border-indigo-100 hover:border-indigo-300">
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Tổng số</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">{attendanceStats.total}</div>
                {attendanceData?.debug?.workHoursCount === '0' || attendanceData?.debug?.workHoursCount === 0 ? (
                  <p className="text-xs text-muted-foreground mt-1">Chưa có dữ liệu chấm công</p>
                ) : null}
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-200 bg-white border-green-100 hover:border-green-300">
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Có mặt</span>
                </div>
                <div className="text-2xl font-bold text-green-600">{attendanceStats.present}</div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-200 bg-white border-yellow-100 hover:border-yellow-300">
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium">Đi muộn</span>
                </div>
                <div className="text-2xl font-bold text-yellow-600">{attendanceStats.late}</div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-200 bg-white border-red-100 hover:border-red-300">
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Vắng mặt</span>
                </div>
                <div className="text-2xl font-bold text-red-600">{attendanceStats.absent}</div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-200 bg-white border-blue-100 hover:border-blue-300">
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Nghỉ phép</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">{attendanceStats.leave}</div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-200 bg-white border-orange-100 hover:border-orange-300">
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">Về sớm</span>
                </div>
                <div className="text-2xl font-bold text-orange-600">{attendanceStats.earlyLeave}</div>
              </CardContent>
            </Card>
          </div>

          {/* Attendance Table */}
          <Card className="hover:shadow-lg transition-all duration-200 bg-white border-indigo-100 hover:border-indigo-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Chấm công hàng ngày</CardTitle>
                  <CardDescription>
                    Xem và quản lý chấm công cho ngày {format(selectedDate, "dd/MM/yyyy")}
                  </CardDescription>
                </div>
                <Button onClick={exportAttendance} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Xuất CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                  {/* Filters */}
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    {/* Date Picker with Navigation */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={goToPreviousDay}
                        className="h-8 w-8"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="min-w-[180px] justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(selectedDate, "PPP")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => date && setSelectedDate(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={goToNextDay}
                        className="h-8 w-8"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToToday}
                      >
                        Hôm nay
                      </Button>
                    </div>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Lọc theo trạng thái" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả trạng thái</SelectItem>
                        <SelectItem value="present">Có mặt</SelectItem>
                        <SelectItem value="normal">Có mặt</SelectItem>
                        <SelectItem value="late">Đi muộn</SelectItem>
                        <SelectItem value="absent">Vắng mặt</SelectItem>
                        <SelectItem value="leave">Nghỉ phép</SelectItem>
                        <SelectItem value="early_leave">Về sớm</SelectItem>
                        <SelectItem value="overtime">Tăng ca</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button onClick={() => refetch()} variant="outline" size="icon">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Attendance Table */}
                  <div className="border rounded-md">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left p-4 font-medium">Nhân viên</th>
                            <th className="text-left p-4 font-medium">Chức vụ</th>
                            <th className="text-left p-4 font-medium">Phòng ban</th>
                            <th className="text-left p-4 font-medium">Giờ vào</th>
                            <th className="text-left p-4 font-medium">Giờ ra</th>
                            <th className="text-left p-4 font-medium">Giờ làm</th>
                            <th className="text-left p-4 font-medium">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {isAttendanceLoading ? (
                            <tr>
                              <td colSpan={7} className="text-center p-8">
                                Đang tải dữ liệu chấm công...
                              </td>
                            </tr>
                          ) : attendanceData?.debug?.workHoursCount === '0' || attendanceData?.debug?.workHoursCount === 0 ? (
                            <tr>
                              <td colSpan={7} className="text-center p-8">
                                <div className="flex flex-col items-center gap-4">
                                  <div className="text-6xl">📅</div>
                                  <div>
                                    <h3 className="text-lg font-medium text-muted-foreground">
                                      Hôm nay chưa có chấm công
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      Chưa có dữ liệu chấm công cho ngày {new Date(attendanceData?.date || selectedDate).toLocaleDateString('vi-VN')}
                                    </p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ) : attendanceData?.attendance?.length > 0 ? (
                            attendanceData.attendance.map((record: any, index: number) => (
                              <tr key={index} className="border-b border-gray-100 hover:bg-indigo-50 transition-colors duration-200">
                                <td className="p-4 font-medium">{record.employeeName}</td>
                                <td className="p-4">{record.position || 'N/A'}</td>
                                <td className="p-4">{record.departmentName || 'N/A'}</td>
                                <td className="p-4">
                                  {record.checkInTime
                                    ? new Date(record.checkInTime).toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                    : 'N/A'
                                  }
                                </td>
                                <td className="p-4">
                                  {record.checkOutTime
                                    ? new Date(record.checkOutTime).toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                    : 'N/A'
                                  }
                                </td>
                                <td className="p-4">{Number(record.workHours || 0).toFixed(1)} giờ</td>
                                <td className="p-4">{getStatusBadge(record.status)}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="text-center p-8 text-muted-foreground">
                                Không tìm thấy dữ liệu chấm công cho ngày này
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
