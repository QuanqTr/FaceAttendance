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
    <div className="flex flex-col flex-1 overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50">
      <Header title={`Welcome back, ${user.fullName || 'Manager'}`} />

      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 px-4 md:px-6 py-4">
        {/* Welcome Section */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-2 flex items-center">
                  <Building2 className="mr-3 h-6 w-6" />
                  {departmentInfo?.name || 'Department'} Manager Dashboard
                </h1>
                <p className="opacity-90">Monitor your team's performance and manage daily operations</p>
                <div className="mt-2 flex items-center text-sm opacity-75">
                  <Users className="h-4 w-4 mr-1" />
                  {departmentInfo?.totalEmployees || 0} team members
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm opacity-75">Today</div>
                <div className="text-lg font-semibold">{new Date().toLocaleDateString()}</div>
                <div className="text-xs opacity-60">
                  Department: {departmentInfo?.code || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-600 mb-1">Team Present</p>
                  <p className="text-2xl font-bold text-emerald-800">{dailyStats?.present || 0}</p>
                  <p className="text-xs text-emerald-600">out of {departmentInfo?.totalEmployees || 0}</p>
                </div>
                <div className="h-12 w-12 bg-emerald-500 rounded-full flex items-center justify-center">
                  <UserCheck className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600 mb-1">Absent Today</p>
                  <p className="text-2xl font-bold text-red-800">{dailyStats?.absent || 0}</p>
                  <p className="text-xs text-red-600">employees</p>
                </div>
                <div className="h-12 w-12 bg-red-500 rounded-full flex items-center justify-center">
                  <UserX className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600 mb-1">Late Arrivals</p>
                  <p className="text-2xl font-bold text-orange-800">{dailyStats?.late || 0}</p>
                  <p className="text-xs text-orange-600">employees</p>
                </div>
                <div className="h-12 w-12 bg-orange-500 rounded-full flex items-center justify-center">
                  <Clock3 className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-1">Pending Approvals</p>
                  <p className="text-2xl font-bold text-blue-800">{pendingCounts?.total || 0}</p>
                  <p className="text-xs text-blue-600">items to review</p>
                </div>
                <div className="h-12 w-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <Bell className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Department Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="bg-gradient-to-br from-purple-50 to-indigo-100 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center text-purple-800">
                <Target className="mr-2 h-5 w-5" />
                Department Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Attendance Rate</span>
                    <span className="font-medium">{dailyStats?.attendanceRate || 0}% / 95%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-emerald-400 to-teal-500 h-2 rounded-full"
                      style={{ width: `${Math.min(100, (dailyStats?.attendanceRate || 0) / 95 * 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">On-time Rate</span>
                    <span className="font-medium">{dailyStats?.onTimeRate || 0}% / 90%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-400 to-indigo-500 h-2 rounded-full"
                      style={{ width: `${Math.min(100, (dailyStats?.onTimeRate || 0) / 90 * 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Productivity</span>
                    <span className="font-medium">{dailyStats?.productivityScore || 0}% / 85%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-purple-400 to-pink-500 h-2 rounded-full"
                      style={{ width: `${Math.min(100, (dailyStats?.productivityScore || 0) / 85 * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="mr-2 h-5 w-5 text-yellow-500" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
                    onClick={() => navigate('/manager/employees')}
                  >
                    <Users className="h-6 w-6 text-blue-500" />
                    <span className="text-sm font-medium">View Team</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-green-50 hover:border-green-300 transition-all duration-200"
                    onClick={() => navigate('/manager/reports')}
                  >
                    <BarChart3 className="h-6 w-6 text-green-500" />
                    <span className="text-sm font-medium">Reports</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-orange-50 hover:border-orange-300 transition-all duration-200"
                    onClick={() => navigate('/manager/leave-requests')}
                  >
                    <FileText className="h-6 w-6 text-orange-500" />
                    <span className="text-sm font-medium">Leave Requests</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-purple-50 hover:border-purple-300 transition-all duration-200"
                    onClick={() => navigate('/manager/settings')}
                  >
                    <Settings className="h-6 w-6 text-purple-500" />
                    <span className="text-sm font-medium">Settings</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Enhanced Quick Access Section */}
        <Card className="bg-white shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center text-lg">
              <Clock className="mr-2 h-6 w-6" />
              Truy cập nhanh - Quản lý nhóm
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Team Management */}
              <div
                className="group p-4 border border-blue-200 rounded-lg hover:bg-blue-50 transition-all duration-300 cursor-pointer hover:shadow-md hover:scale-105"
                onClick={() => navigate('/manager/employees')}
              >
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-blue-100 rounded-full mr-3 group-hover:bg-blue-200 transition-colors">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="font-semibold text-blue-700">Quản lý nhân viên</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">Xem danh sách, thông tin và trạng thái chấm công của nhóm</p>
              </div>

              {/* Attendance Tracking */}
              <div
                className="group p-4 border border-green-200 rounded-lg hover:bg-green-50 transition-all duration-300 cursor-pointer hover:shadow-md hover:scale-105"
                onClick={() => navigate('/manager/attendance')}
              >
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-green-100 rounded-full mr-3 group-hover:bg-green-200 transition-colors">
                    <UserCheck className="h-5 w-5 text-green-600" />
                  </div>
                  <span className="font-semibold text-green-700">Theo dõi chấm công</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">Kiểm tra ai đã đến, đi muộn, vắng mặt hôm nay</p>
              </div>

              {/* Leave Requests */}
              <div
                className="group p-4 border border-orange-200 rounded-lg hover:bg-orange-50 transition-all duration-300 cursor-pointer hover:shadow-md hover:scale-105"
                onClick={() => navigate('/manager/leave-requests')}
              >
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-orange-100 rounded-full mr-3 group-hover:bg-orange-200 transition-colors">
                    <CalendarIcon className="h-5 w-5 text-orange-600" />
                  </div>
                  <span className="font-semibold text-orange-700">Duyệt nghỉ phép</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">Xét duyệt các đơn xin nghỉ phép của nhân viên</p>
              </div>

              {/* Reports */}
              <div
                className="group p-4 border border-purple-200 rounded-lg hover:bg-purple-50 transition-all duration-300 cursor-pointer hover:shadow-md hover:scale-105"
                onClick={() => navigate('/manager/reports')}
              >
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-purple-100 rounded-full mr-3 group-hover:bg-purple-200 transition-colors">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                  </div>
                  <span className="font-semibold text-purple-700">Báo cáo chi tiết</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">Xuất báo cáo chấm công, thống kê hiệu suất nhóm</p>
              </div>

              {/* Performance Analytics */}
              <div
                className="group p-4 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-all duration-300 cursor-pointer hover:shadow-md hover:scale-105"
                onClick={() => navigate('/manager/analytics')}
              >
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-indigo-100 rounded-full mr-3 group-hover:bg-indigo-200 transition-colors">
                    <PieChart className="h-5 w-5 text-indigo-600" />
                  </div>
                  <span className="font-semibold text-indigo-700">Phân tích hiệu suất</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">Xem biểu đồ, xu hướng và KPI của phòng ban</p>
              </div>

              {/* Department Settings */}
              <div
                className="group p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-300 cursor-pointer hover:shadow-md hover:scale-105"
                onClick={() => navigate('/manager/settings')}
              >
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-gray-100 rounded-full mr-3 group-hover:bg-gray-200 transition-colors">
                    <Settings className="h-5 w-5 text-gray-600" />
                  </div>
                  <span className="font-semibold text-gray-700">Cài đặt phòng ban</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">Thiết lập quy định, giờ làm việc cho phòng ban</p>
              </div>
            </div>

            {/* Quick Stats Footer */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Đang quản lý: <span className="font-semibold text-blue-600">{departmentInfo?.totalEmployees || 0} nhân viên</span></span>
                <span>Hôm nay: <span className="font-semibold text-green-600">{dailyStats?.present || 0} có mặt</span></span>
                <span>Chờ duyệt: <span className="font-semibold text-orange-600">{pendingCounts?.total || 0} đơn</span></span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
