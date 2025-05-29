import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { WeeklyAttendanceChart } from "@/components/dashboard/weekly-attendance-chart";
import { DepartmentStats } from "@/components/dashboard/department-stats";
import { EmployeeTable } from "@/components/dashboard/employee-table";
import { useAuth } from "@/hooks/use-auth";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area } from 'recharts';
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Users, Clock, Calendar, AlertTriangle } from "lucide-react";

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();

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

  // Mock monthly trends data
  const monthlyTrends = [
    { month: 'T1', present: 85, absent: 10, late: 5 },
    { month: 'T2', present: 88, absent: 8, late: 4 },
    { month: 'T3', present: 92, absent: 5, late: 3 },
    { month: 'T4', present: 90, absent: 7, late: 3 },
    { month: 'T5', present: 87, absent: 9, late: 4 },
    { month: 'T6', present: 93, absent: 4, late: 3 },
  ];

  const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#f97316'];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header
        title="📊 Tổng quan hệ thống"
        description="Thống kê và theo dõi chấm công toàn công ty"
      />

      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 px-4 md:px-6 py-4 space-y-6">
        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Có mặt hôm nay</CardTitle>
              <Users className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {isSummaryLoading ? 0 : dailySummary?.present || 0}
              </div>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                <p className="text-xs text-green-600">+12% so với hôm qua</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Vắng mặt</CardTitle>
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {isSummaryLoading ? 0 : dailySummary?.absent || 0}
              </div>
              <div className="flex items-center mt-2">
                <TrendingDown className="h-3 w-3 text-green-500 mr-1" />
                <p className="text-xs text-green-600">-8% so với hôm qua</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500 hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Đi muộn</CardTitle>
              <Clock className="h-5 w-5 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">
                {isSummaryLoading ? 0 : dailySummary?.late || 0}
              </div>
              <div className="flex items-center mt-2">
                <TrendingDown className="h-3 w-3 text-green-500 mr-1" />
                <p className="text-xs text-green-600">-2% so với hôm qua</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Tổng nhân viên</CardTitle>
              <Calendar className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {isSummaryLoading ? 0 : dailySummary?.total || 0}
              </div>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                <p className="text-xs text-green-600">+1 tháng này</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Attendance Trend */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5 text-blue-600" />
                Xu hướng chấm công tuần
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyStats || []} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
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

          {/* Department Distribution */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5 text-purple-600" />
                Phân bố theo phòng ban
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={departmentStats || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="presentPercentage"
                    >
                      {(departmentStats || []).map((entry: any, index: number) => (
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
        </div>

        {/* Monthly Trends */}
        <Card className="hover:shadow-lg transition-shadow duration-200">
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

        {/* Department Stats and Employee Table */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <DepartmentStats />
          </div>
          <div className="lg:col-span-2">
            <EmployeeTable />
          </div>
        </div>
      </main>
    </div>
  );
}