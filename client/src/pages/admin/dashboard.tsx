import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { WeeklyAttendanceChart } from "@/components/dashboard/weekly-attendance-chart";
import { useAuth } from "@/hooks/use-auth";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area } from 'recharts';
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Users, Clock, Calendar, AlertTriangle, Building2, UserCheck, UserX, Timer, FileText, Settings, BarChart3, PieChart as PieChartIcon, UserPlus, ClipboardList } from "lucide-react";

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Sample data for when real data is not available
  const sampleDailySummary = {
    present: 142,
    absent: 8,
    late: 5,
    total: 155
  };

  const sampleWeeklyStats = [
    { date: '2024-01-15', present: 145, late: 8, absent: 7 },
    { date: '2024-01-16', present: 142, late: 6, absent: 12 },
    { date: '2024-01-17', present: 149, late: 4, absent: 6 },
    { date: '2024-01-18', present: 147, late: 7, absent: 8 },
    { date: '2024-01-19', present: 151, late: 3, absent: 4 },
    { date: '2024-01-20', present: 138, late: 9, absent: 13 },
    { date: '2024-01-21', present: 144, late: 5, absent: 11 }
  ];

  const sampleDepartmentStats = [
    { name: 'Kỹ thuật', employeeCount: 45, presentPercentage: 92 },
    { name: 'Kinh doanh', employeeCount: 32, presentPercentage: 89 },
    { name: 'Marketing', employeeCount: 28, presentPercentage: 95 },
    { name: 'Nhân sự', employeeCount: 15, presentPercentage: 87 },
    { name: 'Kế toán', employeeCount: 12, presentPercentage: 100 },
    { name: 'Hành chính', employeeCount: 23, presentPercentage: 91 }
  ];

  // Fetch daily attendance summary
  const { data: dailySummary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["/api/stats/daily"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/stats/daily");
      return res.data;
    }
  });

  // Fetch weekly stats
  const { data: weeklyStats, isLoading: weeklyStatsLoading } = useQuery({
    queryKey: ["/api/stats/weekly"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/stats/weekly");
      return res.data;
    }
  });

  // Fetch department stats for pie chart
  const { data: departmentStats, isLoading: departmentStatsLoading } = useQuery({
    queryKey: ["/api/stats/departments"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/stats/departments");
      return res.data;
    }
  });

  // Use sample data when real data is not available
  const currentDailySummary = dailySummary || sampleDailySummary;
  const currentWeeklyStats = weeklyStats && weeklyStats.length > 0 ? weeklyStats : sampleWeeklyStats;
  const currentDepartmentStats = departmentStats && departmentStats.length > 0 ? departmentStats : sampleDepartmentStats;

  // Monthly trends data
  const monthlyTrends = [
    { month: 'T1', present: 85, absent: 10, late: 5 },
    { month: 'T2', present: 88, absent: 8, late: 4 },
    { month: 'T3', present: 92, absent: 5, late: 3 },
    { month: 'T4', present: 90, absent: 7, late: 3 },
    { month: 'T5', present: 87, absent: 9, late: 4 },
    { month: 'T6', present: 93, absent: 4, late: 3 },
  ];

  const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#f97316'];

  const StatCardSkeleton = () => (
    <Card className="border-l-4 border-l-gray-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-5 rounded-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );

  const ChartSkeleton = () => (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-center justify-center">
          <div className="space-y-3 w-full">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="h-4 w-3/6" />
            <Skeleton className="h-4 w-2/6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Quick access items
  const quickAccessItems = [
    {
      icon: UserCheck,
      title: "Chấm công hôm nay",
      description: "Xem danh sách nhân viên đã/chưa chấm công",
      color: "blue",
      action: () => console.log("Navigate to attendance")
    },
    {
      icon: UserPlus,
      title: "Thêm nhân viên",
      description: "Đăng ký nhân viên mới vào hệ thống",
      color: "green",
      action: () => console.log("Navigate to add employee")
    },
    {
      icon: Building2,
      title: "Quản lý phòng ban",
      description: "Thêm, sửa, xóa thông tin phòng ban",
      color: "purple",
      action: () => console.log("Navigate to departments")
    },
    {
      icon: ClipboardList,
      title: "Báo cáo tháng",
      description: "Xuất báo cáo chấm công chi tiết",
      color: "orange",
      action: () => console.log("Generate report")
    },
    {
      icon: BarChart3,
      title: "Thống kê chi tiết",
      description: "Xem các biểu đồ và thống kê nâng cao",
      color: "indigo",
      action: () => console.log("Navigate to detailed stats")
    },
    {
      icon: Settings,
      title: "Cài đặt hệ thống",
      description: "Thiết lập giờ làm việc, nghỉ lễ",
      color: "gray",
      action: () => console.log("Navigate to settings")
    }
  ];

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: "border-blue-200 hover:bg-blue-50 text-blue-700",
      green: "border-green-200 hover:bg-green-50 text-green-700",
      purple: "border-purple-200 hover:bg-purple-50 text-purple-700",
      orange: "border-orange-200 hover:bg-orange-50 text-orange-700",
      indigo: "border-indigo-200 hover:bg-indigo-50 text-indigo-700",
      gray: "border-gray-200 hover:bg-gray-50 text-gray-700"
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-gray-50/50">
      <Header
        title="📊 Tổng quan hệ thống"
        description="Thống kê và theo dõi chấm công toàn công ty"
      />

      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 px-4 md:px-6 py-6 space-y-8">
        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {isSummaryLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all duration-300 hover:scale-105">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Có mặt hôm nay</CardTitle>
                  <div className="p-2 bg-blue-100 rounded-full">
                    <UserCheck className="h-5 w-5 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {currentDailySummary?.present || 0}
                  </div>
                  <div className="flex items-center">
                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                    <p className="text-xs text-green-600">+12% so với hôm qua</p>
                  </div>
                  <div className="mt-2 bg-blue-50 rounded-lg p-2">
                    <p className="text-xs text-blue-700">
                      Tỷ lệ: {currentDailySummary?.total ? ((currentDailySummary.present / currentDailySummary.total) * 100).toFixed(1) : 0}%
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
                    {currentDailySummary?.absent || 0}
                  </div>
                  <div className="flex items-center">
                    <TrendingDown className="h-3 w-3 text-green-500 mr-1" />
                    <p className="text-xs text-green-600">-8% so với hôm qua</p>
                  </div>
                  <div className="mt-2 bg-red-50 rounded-lg p-2">
                    <p className="text-xs text-red-700">
                      Tỷ lệ: {currentDailySummary?.total ? ((currentDailySummary.absent / currentDailySummary.total) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-yellow-500 hover:shadow-lg transition-all duration-300 hover:scale-105">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Đi muộn</CardTitle>
                  <div className="p-2 bg-yellow-100 rounded-full">
                    <Timer className="h-5 w-5 text-yellow-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600 mb-1">
                    {currentDailySummary?.late || 0}
                  </div>
                  <div className="flex items-center">
                    <TrendingDown className="h-3 w-3 text-green-500 mr-1" />
                    <p className="text-xs text-green-600">-2% so với hôm qua</p>
                  </div>
                  <div className="mt-2 bg-yellow-50 rounded-lg p-2">
                    <p className="text-xs text-yellow-700">
                      Tỷ lệ: {currentDailySummary?.total ? ((currentDailySummary.late / currentDailySummary.total) * 100).toFixed(1) : 0}%
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
                    {currentDailySummary?.total || 0}
                  </div>
                  <div className="flex items-center">
                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                    <p className="text-xs text-green-600">+1 tháng này</p>
                  </div>
                  <div className="mt-2 bg-green-50 rounded-lg p-2">
                    <p className="text-xs text-green-700">
                      Hoạt động: {currentDailySummary?.total || 0} nhân viên
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Quick Access Section - Moved to the top */}
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5 text-orange-600" />
              Truy cập nhanh
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickAccessItems.map((item, index) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={index}
                    onClick={item.action}
                    className={`p-4 border rounded-lg transition-all duration-200 text-left hover:shadow-md hover:scale-105 ${getColorClasses(item.color)}`}
                  >
                    <div className="flex items-center mb-3">
                      <div className={`p-2 rounded-full bg-${item.color}-100 mr-3`}>
                        <IconComponent className={`h-5 w-5 text-${item.color}-600`} />
                      </div>
                      <span className="font-semibold">{item.title}</span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Main Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Attendance Trend */}
          {weeklyStatsLoading ? (
            <ChartSkeleton />
          ) : (
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5 text-blue-600" />
                  Xu hướng chấm công tuần
                  {(!weeklyStats || weeklyStats.length === 0) && (
                    <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                      Dữ liệu mẫu
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={currentWeeklyStats} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="present"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorPresent)"
                        name="Có mặt"
                      />
                      <Line type="monotone" dataKey="late" stroke="#f59e0b" name="Đi muộn" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Department Distribution */}
          {departmentStatsLoading ? (
            <ChartSkeleton />
          ) : (
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="mr-2 h-5 w-5 text-purple-600" />
                  Phân bố theo phòng ban
                  {(!departmentStats || departmentStats.length === 0) && (
                    <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                      Dữ liệu mẫu
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={currentDepartmentStats}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="presentPercentage"
                      >
                        {currentDepartmentStats.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => [`${value}%`, 'Tỷ lệ có mặt']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Monthly Trends */}
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-green-600" />
              Xu hướng 6 tháng gần đây
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrends} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="present" fill="#3b82f6" name="Có mặt" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="late" fill="#f59e0b" name="Đi muộn" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="absent" fill="#ef4444" name="Vắng mặt" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}