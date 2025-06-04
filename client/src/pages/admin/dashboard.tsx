import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/hooks/use-auth";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, Line } from 'recharts';
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Users, Clock, Calendar, Building2, UserCheck, UserX, Timer, Settings, BarChart3, UserPlus, ClipboardList, Database } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreatingData, setIsCreatingData] = useState(false);





  // Fetch daily attendance summary
  const { data: dailySummary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["/api/stats/daily"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/stats/daily");
        console.log("API Response for daily stats:", res.data);
        return res.data;
      } catch (error) {
        console.warn("Failed to fetch daily stats:", error);
        return null;
      }
    },
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true
  });

  // Fetch weekly stats
  const { data: weeklyStats, isLoading: weeklyStatsLoading } = useQuery({
    queryKey: ["/api/stats/weekly"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/stats/weekly");
        return res.data;
      } catch (error) {
        console.warn("Failed to fetch weekly stats, using sample data");
        return null;
      }
    }
  });

  // Fetch department stats for pie chart
  const { data: departmentStats, isLoading: departmentStatsLoading } = useQuery({
    queryKey: ["/api/stats/departments"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/stats/departments");
        return res.data;
      } catch (error) {
        console.warn("Failed to fetch department stats, using sample data");
        return null;
      }
    }
  });

  // Use real data only, no fallback to sample data
  const currentDailySummary = dailySummary || { present: 0, absent: 0, late: 0, total: 0 };
  const currentWeeklyStats = weeklyStats || [];
  const currentDepartmentStats = departmentStats || [];



  // Fetch monthly trends
  const { data: monthlyTrends, isLoading: monthlyTrendsLoading } = useQuery({
    queryKey: ["/api/stats/monthly"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/stats/monthly");
        return res.data;
      } catch (error) {
        console.warn("Failed to fetch monthly trends, returning empty data");
        return [];
      }
    }
  });

  const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#f97316'];

  // Function to create sample data (development only)
  const createSampleData = async () => {
    if (process.env.NODE_ENV !== 'development') return;

    setIsCreatingData(true);
    try {
      await apiRequest("POST", "/api/stats/create-sample-data");

      // Refresh all queries
      queryClient.invalidateQueries({ queryKey: ["/api/stats/daily"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/weekly"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/departments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/monthly"] });

      toast({
        title: "Thành công",
        description: "Đã tạo dữ liệu mẫu thành công",
      });
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tạo dữ liệu mẫu",
        variant: "destructive",
      });
    } finally {
      setIsCreatingData(false);
    }
  };

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
      action: () => setLocation("/attendance")
    },
    {
      icon: UserPlus,
      title: "Thêm nhân viên",
      description: "Đăng ký nhân viên mới vào hệ thống",
      color: "green",
      action: () => setLocation("/employees/new")
    },
    {
      icon: Building2,
      title: "Quản lý phòng ban",
      description: "Thêm, sửa, xóa thông tin phòng ban",
      color: "purple",
      action: () => setLocation("/departments")
    },
    {
      icon: ClipboardList,
      title: "Báo cáo tháng",
      description: "Xuất báo cáo chấm công chi tiết",
      color: "orange",
      action: () => setLocation("/reports")
    },
    {
      icon: BarChart3,
      title: "Thống kê chi tiết",
      description: "Xem các biểu đồ và thống kê nâng cao",
      color: "indigo",
      action: () => setLocation("/reports")
    },
    {
      icon: Settings,
      title: "Cài đặt hệ thống",
      description: "Thiết lập giờ làm việc, nghỉ lễ",
      color: "gray",
      action: () => setLocation("/settings")
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
      <div className="flex items-center justify-between p-4 md:p-6 border-b bg-white">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📊 Tổng quan hệ thống</h1>
          <p className="text-gray-600">Thống kê và theo dõi chấm công toàn công ty</p>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <Button
            onClick={createSampleData}
            disabled={isCreatingData}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Database className="h-4 w-4" />
            {isCreatingData ? "Đang tạo..." : "Tạo dữ liệu mẫu"}
          </Button>
        )}
      </div>

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
                    {!dailySummary && currentDailySummary.total === 0 && (
                      <span className="text-sm text-gray-500 ml-2">(chưa có dữ liệu)</span>
                    )}
                  </div>
                  <div className="flex items-center">
                    {dailySummary ? (
                      <>
                        <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                        <p className="text-xs text-green-600">Dữ liệu thực tế</p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-500">Chưa có dữ liệu chấm công hôm nay</p>
                    )}
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
                    {!dailySummary && currentDailySummary.total === 0 && (
                      <span className="text-sm text-gray-500 ml-2">(chưa có dữ liệu)</span>
                    )}
                  </div>
                  <div className="flex items-center">
                    {dailySummary ? (
                      <>
                        <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                        <p className="text-xs text-red-600">Dữ liệu thực tế</p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-500">Chưa có dữ liệu chấm công hôm nay</p>
                    )}
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
                    {!dailySummary && currentDailySummary.total === 0 && (
                      <span className="text-sm text-gray-500 ml-2">(chưa có dữ liệu)</span>
                    )}
                  </div>
                  <div className="flex items-center">
                    {dailySummary ? (
                      <>
                        <Clock className="h-3 w-3 text-yellow-500 mr-1" />
                        <p className="text-xs text-yellow-600">Dữ liệu thực tế</p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-500">Chưa có dữ liệu chấm công hôm nay</p>
                    )}
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
                    {!dailySummary && currentDailySummary.total === 0 && (
                      <span className="text-sm text-gray-500 ml-2">(chưa có dữ liệu)</span>
                    )}
                  </div>
                  <div className="flex items-center">
                    <Users className="h-3 w-3 text-green-500 mr-1" />
                    <p className="text-xs text-green-600">Tổng số nhân viên</p>
                  </div>
                  <div className="mt-2 bg-green-50 rounded-lg p-2">
                    <p className="text-xs text-green-700">
                      {dailySummary ?
                        `Hoạt động: ${currentDailySummary?.present || 0} / ${currentDailySummary?.total || 0}` :
                        "Chưa có dữ liệu chấm công hôm nay"
                      }
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
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentWeeklyStats.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="text-center">
                      <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg font-medium">Không có dữ liệu</p>
                      <p className="text-gray-400 text-sm">Chưa có dữ liệu chấm công tuần để hiển thị</p>
                    </div>
                  </div>
                ) : (
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
                )}
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
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentDepartmentStats.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="text-center">
                      <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg font-medium">Không có dữ liệu</p>
                      <p className="text-gray-400 text-sm">Chưa có dữ liệu phòng ban để hiển thị</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={currentDepartmentStats}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ departmentName, percent }: any) => `${departmentName}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="presentPercentage"
                        >
                          {currentDepartmentStats.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => [`${value}%`, 'Tỷ lệ có mặt']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

       
      </main>
    </div>
  );
}