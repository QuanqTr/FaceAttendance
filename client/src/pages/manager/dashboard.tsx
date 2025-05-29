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
  Settings
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
                    className="h-20 flex flex-col items-center justify-center space-y-2"
                    onClick={() => navigate('/manager/employees')}
                  >
                    <Users className="h-6 w-6 text-blue-500" />
                    <span className="text-sm">View Team</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center space-y-2"
                    onClick={() => navigate('/manager/reports')}
                  >
                    <BarChart3 className="h-6 w-6 text-green-500" />
                    <span className="text-sm">Reports</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center space-y-2"
                    onClick={() => navigate('/manager/leave-requests')}
                  >
                    <FileText className="h-6 w-6 text-orange-500" />
                    <span className="text-sm">Leave Requests</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center space-y-2"
                    onClick={() => navigate('/manager/settings')}
                  >
                    <Settings className="h-6 w-6 text-purple-500" />
                    <span className="text-sm">Settings</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              Recent Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-3 bg-blue-50 rounded-lg">
                <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">John Doe checked in</p>
                  <p className="text-xs text-gray-500">8:30 AM - On time</p>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">Present</Badge>
              </div>

              <div className="flex items-center space-x-4 p-3 bg-orange-50 rounded-lg">
                <div className="h-8 w-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Jane Smith - Late arrival</p>
                  <p className="text-xs text-gray-500">9:15 AM - 15 minutes late</p>
                </div>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">Late</Badge>
              </div>

              <div className="flex items-center space-x-4 p-3 bg-blue-50 rounded-lg">
                <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">New leave request from Mike Johnson</p>
                  <p className="text-xs text-gray-500">Vacation - June 15-20</p>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">Pending</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
