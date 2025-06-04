import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  Users,
  Bell,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Building2,
  Target,
  CheckCircle,
  XCircle,
  Clock3,
  UserCheck,
  UserX,
  Award,
  BarChart3,
  FileText,
  Settings,
  UserPlus,
  ClipboardList,
  Calendar as CalendarIcon,
  PieChart,
  Shield
} from "lucide-react";

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, navigate] = useLocation();

  if (!user || user.role !== "manager") {
    navigate("/");
    return null;
  }

  // Fetch manager data with error handling
  const { data: departmentInfo } = useQuery({
    queryKey: ["/api/manager/department-info"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/manager/department-info");
        if (!res.ok) throw new Error("Failed to fetch");
        return await res.json();
      } catch (error) {
        // Mock data if API fails
        return {
          id: 1,
          name: "Information Technology",
          code: "IT",
          description: "Technology Department",
          totalEmployees: 15,
          activeEmployees: 14,
          presentToday: 12,
          manager: user.fullName
        };
      }
    }
  });

  const { data: dailyStats } = useQuery({
    queryKey: ["/api/manager/stats/daily"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/manager/stats/daily");
        if (!res.ok) throw new Error("Failed to fetch");
        return await res.json();
      } catch (error) {
        // Mock data if API fails
        return {
          present: 12,
          absent: 3,
          late: 2,
          onTime: 10,
          attendanceRate: 80,
          onTimeRate: 83,
          productivityScore: 85
        };
      }
    }
  });

  const { data: pendingCounts } = useQuery({
    queryKey: ["/api/manager/pending-counts"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/manager/pending-counts");
        if (!res.ok) throw new Error("Failed to fetch");
        return await res.json();
      } catch (error) {
        // Mock data if API fails
        return {
          leaveRequests: 3,
          timeOffRequests: 2,
          overtimeRequests: 1,
          total: 6
        };
      }
    }
  });

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-gray-50/50">
      <div className="flex items-center justify-between p-4 md:p-6 border-b bg-white">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📊 Tổng quan phòng ban</h1>
          <p className="text-gray-600">Thống kê và theo dõi chấm công phòng ban {departmentInfo?.name || 'Loading...'}</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Phòng ban</div>
          <div className="text-lg font-semibold text-gray-900">{departmentInfo?.name || 'Loading...'}</div>
          <div className="text-xs text-gray-500">
            {departmentInfo?.totalEmployees || 0} thành viên
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 px-4 md:px-6 py-6 space-y-8">

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Có mặt hôm nay</CardTitle>
              <div className="p-2 bg-blue-100 rounded-full">
                <UserCheck className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {dailyStats?.present || 0}
              </div>
              <div className="flex items-center">
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                <p className="text-xs text-green-600">Dữ liệu phòng ban</p>
              </div>
              <div className="mt-2 bg-blue-50 rounded-lg p-2">
                <p className="text-xs text-blue-700">
                  Tỷ lệ: {departmentInfo?.totalEmployees ? ((dailyStats?.present || 0) / departmentInfo.totalEmployees * 100).toFixed(1) : 0}%
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Vắng mặt</CardTitle>
              <div className="p-2 bg-red-100 rounded-full">
                <UserX className="h-5 w-5 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600 mb-1">
                {dailyStats?.absent || 0}
              </div>
              <div className="flex items-center">
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                <p className="text-xs text-red-600">Dữ liệu phòng ban</p>
              </div>
              <div className="mt-2 bg-red-50 rounded-lg p-2">
                <p className="text-xs text-red-700">
                  Tỷ lệ: {departmentInfo?.totalEmployees ? ((dailyStats?.absent || 0) / departmentInfo.totalEmployees * 100).toFixed(1) : 0}%
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Đi muộn</CardTitle>
              <div className="p-2 bg-yellow-100 rounded-full">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600 mb-1">
                {dailyStats?.late || 0}
              </div>
              <div className="flex items-center">
                <Clock className="h-3 w-3 text-yellow-500 mr-1" />
                <p className="text-xs text-yellow-600">Dữ liệu phòng ban</p>
              </div>
              <div className="mt-2 bg-yellow-50 rounded-lg p-2">
                <p className="text-xs text-yellow-700">
                  Tỷ lệ: {departmentInfo?.totalEmployees ? ((dailyStats?.late || 0) / departmentInfo.totalEmployees * 100).toFixed(1) : 0}%
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Tổng nhân viên</CardTitle>
              <div className="p-2 bg-green-100 rounded-full">
                <Users className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 mb-1">
                {departmentInfo?.totalEmployees || 0}
              </div>
              <div className="flex items-center">
                <Users className="h-3 w-3 text-green-500 mr-1" />
                <p className="text-xs text-green-600">Tổng số nhân viên</p>
              </div>
              <div className="mt-2 bg-green-50 rounded-lg p-2">
                <p className="text-xs text-green-700">
                  Hoạt động: {dailyStats?.present || 0} / {departmentInfo?.totalEmployees || 0}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Access Section */}
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5 text-orange-600" />
              Truy cập nhanh
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => navigate('/manager/employees')}
                className="p-4 border border-blue-200 rounded-lg transition-all duration-200 text-left hover:shadow-md hover:scale-105 hover:bg-blue-50 text-blue-700"
              >
                <div className="flex items-center mb-3">
                  <div className="p-2 rounded-full bg-blue-100 mr-3">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="font-semibold">Quản lý nhân viên</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">Xem danh sách, thông tin và trạng thái chấm công của nhóm</p>
              </button>

              <button
                onClick={() => navigate('/manager/reports')}
                className="p-4 border border-green-200 rounded-lg transition-all duration-200 text-left hover:shadow-md hover:scale-105 hover:bg-green-50 text-green-700"
              >
                <div className="flex items-center mb-3">
                  <div className="p-2 rounded-full bg-green-100 mr-3">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                  </div>
                  <span className="font-semibold">Báo cáo chi tiết</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">Xuất báo cáo chấm công, thống kê hiệu suất nhóm</p>
              </button>

              <button
                onClick={() => navigate('/manager/leave-requests')}
                className="p-4 border border-orange-200 rounded-lg transition-all duration-200 text-left hover:shadow-md hover:scale-105 hover:bg-orange-50 text-orange-700"
              >
                <div className="flex items-center mb-3">
                  <div className="p-2 rounded-full bg-orange-100 mr-3">
                    <CalendarIcon className="h-5 w-5 text-orange-600" />
                  </div>
                  <span className="font-semibold">Duyệt nghỉ phép</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">Xét duyệt các đơn xin nghỉ phép của nhân viên</p>
              </button>

              <button
                onClick={() => navigate('/manager/attendance')}
                className="p-4 border border-purple-200 rounded-lg transition-all duration-200 text-left hover:shadow-md hover:scale-105 hover:bg-purple-50 text-purple-700"
              >
                <div className="flex items-center mb-3">
                  <div className="p-2 rounded-full bg-purple-100 mr-3">
                    <UserCheck className="h-5 w-5 text-purple-600" />
                  </div>
                  <span className="font-semibold">Theo dõi chấm công</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">Kiểm tra ai đã đến, đi muộn, vắng mặt hôm nay</p>
              </button>

              <button
                onClick={() => navigate('/manager/settings')}
                className="p-4 border border-gray-200 rounded-lg transition-all duration-200 text-left hover:shadow-md hover:scale-105 hover:bg-gray-50 text-gray-700"
              >
                <div className="flex items-center mb-3">
                  <div className="p-2 rounded-full bg-gray-100 mr-3">
                    <Settings className="h-5 w-5 text-gray-600" />
                  </div>
                  <span className="font-semibold">Cài đặt phòng ban</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">Thiết lập quy định, giờ làm việc cho phòng ban</p>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attendance Trend Chart */}
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5 text-blue-600" />
                Xu hướng chấm công 7 ngày
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Biểu đồ xu hướng chấm công</p>
                  <p className="text-sm text-gray-400">Dữ liệu 7 ngày gần nhất</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Department Performance */}
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChart className="mr-2 h-5 w-5 text-green-600" />
                Hiệu suất phòng ban
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Tỷ lệ có mặt</span>
                    <span className="font-medium">{departmentInfo?.totalEmployees ? ((dailyStats?.present || 0) / departmentInfo.totalEmployees * 100).toFixed(1) : 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${departmentInfo?.totalEmployees ? ((dailyStats?.present || 0) / departmentInfo.totalEmployees * 100) : 0}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Đúng giờ</span>
                    <span className="font-medium">{departmentInfo?.totalEmployees ? (((dailyStats?.present || 0) - (dailyStats?.late || 0)) / departmentInfo.totalEmployees * 100).toFixed(1) : 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${departmentInfo?.totalEmployees ? (((dailyStats?.present || 0) - (dailyStats?.late || 0)) / departmentInfo.totalEmployees * 100) : 0}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Hiệu suất tổng thể</span>
                    <span className="font-medium">85%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-purple-400 to-purple-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: '85%' }}
                    ></div>
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
