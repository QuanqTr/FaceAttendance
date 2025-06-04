import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon, Clock, TrendingUp, AlertTriangle } from 'lucide-react';

interface AttendanceRecord {
  id: number;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  lateMinutes: number;
  earlyMinutes: number;
  status: string;
  createdAt: string;
}

interface EmployeeAttendanceHistoryProps {
  employeeId: string;
  month: Date;
}

export function EmployeeAttendanceHistory({ employeeId, month }: EmployeeAttendanceHistoryProps) {
  const { data: attendanceHistory, isLoading, error } = useQuery<AttendanceRecord[]>({
    queryKey: [`/api/manager/employees/${employeeId}/work-hours`, format(month, 'yyyy-MM')],
    queryFn: async () => {
      const startDate = format(new Date(month.getFullYear(), month.getMonth(), 1), 'yyyy-MM-dd');
      const endDate = format(new Date(month.getFullYear(), month.getMonth() + 1, 0), 'yyyy-MM-dd');

      const params = new URLSearchParams({
        startDate,
        endDate
      });

      const res = await fetch(`/api/manager/employees/${employeeId}/work-hours?${params}`);
      if (!res.ok) throw new Error('Failed to fetch work hours');
      return await res.json();
    },
    enabled: !!employeeId,
  });

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

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '--:--';
    try {
      return format(new Date(timeString), 'HH:mm');
    } catch {
      return '--:--';
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-muted-foreground">Đang tải lịch sử điểm danh...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Lỗi tải dữ liệu</h3>
        <p className="text-muted-foreground">Không thể tải lịch sử điểm danh. Vui lòng thử lại.</p>
      </div>
    );
  }

  if (!attendanceHistory || attendanceHistory.length === 0) {
    return (
      <div className="text-center py-8">
        <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Không có dữ liệu</h3>
        <p className="text-muted-foreground">
          Không có dữ liệu điểm danh cho tháng {format(month, 'MMMM yyyy', { locale: vi })}
        </p>
      </div>
    );
  }

  // Calculate summary stats
  const totalDays = attendanceHistory.length;
  const presentDays = attendanceHistory.filter(record =>
    record.status === 'present' || record.status === 'normal' || record.status === 'late'
  ).length;
  const lateDays = attendanceHistory.filter(record => Number(record.lateMinutes || 0) > 0).length;
  const totalHours = attendanceHistory.reduce((sum, record) => sum + Number(record.totalHours || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="hover:shadow-lg transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Tổng ngày</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{totalDays}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Có mặt</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{presentDays}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium">Đi muộn</span>
            </div>
            <div className="text-2xl font-bold text-amber-600">{lateDays}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Tổng giờ</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">{totalHours.toFixed(1)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Chi tiết điểm danh</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Ngày</th>
                  <th className="text-left p-3 font-medium">Giờ vào</th>
                  <th className="text-left p-3 font-medium">Giờ ra</th>
                  <th className="text-left p-3 font-medium">Giờ làm</th>
                  <th className="text-left p-3 font-medium">Tăng ca</th>
                  <th className="text-left p-3 font-medium">Đi muộn</th>
                  <th className="text-left p-3 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {attendanceHistory.map((record) => (
                  <tr key={record.id} className="border-b border-gray-100 hover:bg-indigo-50 transition-colors duration-200">
                    <td className="p-3">
                      {format(new Date(record.date), 'dd/MM/yyyy')}
                    </td>
                    <td className="p-3">{formatTime(record.checkIn)}</td>
                    <td className="p-3">{formatTime(record.checkOut)}</td>
                    <td className="p-3">{Number(record.totalHours || 0).toFixed(1)} giờ</td>
                    <td className="p-3">{Number(record.overtimeHours || 0).toFixed(1)} giờ</td>
                    <td className="p-3">
                      {Number(record.lateMinutes || 0) > 0 ? `${Math.round(Number(record.lateMinutes))} phút` : '--'}
                    </td>
                    <td className="p-3">{getStatusBadge(record.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
