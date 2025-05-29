import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Users, TrendingUp, Download, Calendar as CalendarIcon, RefreshCw } from "lucide-react";
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
        record.workHours?.toFixed(1) || '0'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${selectedDate.toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const attendanceStats = {
    total: attendanceData?.total || 0,
    present: attendanceData?.attendance?.filter((a: any) => a.status === 'present').length || 0,
    late: attendanceData?.attendance?.filter((a: any) => a.status === 'late').length || 0,
    absent: attendanceData?.attendance?.filter((a: any) => a.status === 'absent').length || 0
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-100 text-green-800">Present</Badge>;
      case 'late':
        return <Badge className="bg-yellow-100 text-yellow-800">Late</Badge>;
      case 'absent':
        return <Badge className="bg-red-100 text-red-800">Absent</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Attendance Management" />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Department Info */}
          {departmentInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Department Overview
                </CardTitle>
                <CardDescription>
                  Managing {departmentInfo.departmentCount || 1} department(s) with {departmentInfo.totalEmployees || 0} employees
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Total</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">{attendanceStats.total}</div>
                {attendanceData?.debug?.timeLogsCount === '0' || attendanceData?.debug?.timeLogsCount === 0 ? (
                  <p className="text-xs text-muted-foreground mt-1">Chưa có dữ liệu chấm công</p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Present</span>
                </div>
                <div className="text-2xl font-bold text-green-600">{attendanceStats.present}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium">Late</span>
                </div>
                <div className="text-2xl font-bold text-yellow-600">{attendanceStats.late}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Absent</span>
                </div>
                <div className="text-2xl font-bold text-red-600">{attendanceStats.absent}</div>
              </CardContent>
            </Card>
          </div>

          {/* Attendance Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Daily Attendance</CardTitle>
                  <CardDescription>
                    View and manage attendance for {format(selectedDate, "PPP")}
                  </CardDescription>
                </div>
                <Button onClick={exportAttendance} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="table" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="table">Table View</TabsTrigger>
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                </TabsList>

                <TabsContent value="table" className="space-y-4">
                  {/* Filters */}
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="gap-2">
                          <CalendarIcon className="h-4 w-4" />
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

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="late">Late</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
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
                            <th className="text-left p-4 font-medium">Employee</th>
                            <th className="text-left p-4 font-medium">Position</th>
                            <th className="text-left p-4 font-medium">Department</th>
                            <th className="text-left p-4 font-medium">Check In</th>
                            <th className="text-left p-4 font-medium">Check Out</th>
                            <th className="text-left p-4 font-medium">Work Hours</th>
                            <th className="text-left p-4 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {isAttendanceLoading ? (
                            <tr>
                              <td colSpan={7} className="text-center p-8">
                                Loading attendance data...
                              </td>
                            </tr>
                          ) : attendanceData?.debug?.timeLogsCount === '0' || attendanceData?.debug?.timeLogsCount === 0 ? (
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
                              <tr key={index} className="border-b hover:bg-muted/50">
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
                                <td className="p-4">{record.workHours?.toFixed(1) || '0'} hrs</td>
                                <td className="p-4">{getStatusBadge(record.status)}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="text-center p-8 text-muted-foreground">
                                No attendance records found for this date
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="summary" className="space-y-4">
                  {attendanceData?.debug?.timeLogsCount === '0' || attendanceData?.debug?.timeLogsCount === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                      <div className="text-8xl mb-4">📅</div>
                      <h3 className="text-xl font-medium text-muted-foreground mb-2">
                        Hôm nay chưa có chấm công
                      </h3>
                      <p className="text-muted-foreground">
                        Chưa có dữ liệu chấm công cho ngày {new Date(attendanceData?.date || selectedDate).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card>
                        <CardHeader>
                          <CardTitle>Attendance Rate</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">
                            {attendanceStats.total > 0
                              ? Math.round((attendanceStats.present / attendanceStats.total) * 100)
                              : 0
                            }%
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {attendanceStats.present} out of {attendanceStats.total} employees present
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Punctuality Rate</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">
                            {attendanceStats.present > 0
                              ? Math.round(((attendanceStats.present - attendanceStats.late) / attendanceStats.present) * 100)
                              : 0
                            }%
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {attendanceStats.present - attendanceStats.late} employees on time
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
