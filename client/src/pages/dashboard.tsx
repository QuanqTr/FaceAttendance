import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { AttendanceRecognition } from "@/components/dashboard/attendance-recognition";
import { WeeklyAttendanceChart } from "@/components/dashboard/weekly-attendance-chart";
import { DepartmentStats } from "@/components/dashboard/department-stats";
import { EmployeeTable } from "@/components/dashboard/employee-table";
import { useAuth } from "@/hooks/use-auth";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Fetch daily attendance summary
  const { data: dailySummary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["/api/stats/daily"],
    queryFn: async () => {
      const res = await fetch("/api/stats/daily");
      if (!res.ok) throw new Error("Failed to fetch daily summary");
      return await res.json();
    }
  });

  // Fetch weekly stats
  const { data: weeklyStats } = useQuery({
    queryKey: ["/api/stats/weekly"],
    queryFn: async () => {
      const res = await fetch("/api/stats/weekly");
      if (!res.ok) throw new Error("Failed to fetch weekly stats");
      return await res.json();
    }
  });

  // Fetch department stats for pie chart
  const { data: departmentStats } = useQuery({
    queryKey: ["/api/stats/departments"],
    queryFn: async () => {
      const res = await fetch("/api/stats/departments");
      if (!res.ok) throw new Error("Failed to fetch department stats");
      return await res.json();
    }
  });

  const COLORS = ['#1E88E5', '#E53935', '#FFC107', '#26A69A', '#8E24AA', '#43A047'];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title={t('common.dashboard')} />

      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 px-4 md:px-6 py-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard
            title={t('dashboard.presentToday')}
            value={isSummaryLoading ? 0 : dailySummary?.present || 0}
            change={{
              value: 12,
              isIncrease: true,
              text: "+12% from yesterday"
            }}
            type="people"
          />

          <StatsCard
            title={t('attendance.absent')}
            value={isSummaryLoading ? 0 : dailySummary?.absent || 0}
            change={{
              value: 3,
              isIncrease: true,
              text: "+3% from yesterday"
            }}
            type="absent"
          />

          <StatsCard
            title={t('attendance.late')}
            value={isSummaryLoading ? 0 : dailySummary?.late || 0}
            change={{
              value: 2,
              isIncrease: false,
              text: "-2% from yesterday"
            }}
            type="late"
          />

          <StatsCard
            title={t('dashboard.totalEmployees')}
            value={isSummaryLoading ? 0 : dailySummary?.total || 0}
            change={{
              value: 1,
              isIncrease: true,
              text: "+1 this month"
            }}
            type="total"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Attendance Recognition chỉ cho admin */}
          {user?.role === "admin" && (
            <div className="lg:col-span-2">
              <AttendanceRecognition />
            </div>
          )}

          {/* Biểu đồ thống kê cho manager */}
          {user?.role === "manager" && (
            <>
              <div className="lg:col-span-2 bg-white rounded shadow p-4">
                <h2 className="text-lg font-bold mb-2">{t('dashboard.weeklyAttendance')}</h2>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyStats || []} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="present" fill="#1E88E5" name={t('attendance.present')} />
                      <Bar dataKey="late" fill="#FFC107" name={t('attendance.late')} />
                      <Bar dataKey="absent" fill="#E53935" name={t('attendance.absent')} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white rounded shadow p-4">
                <h2 className="text-lg font-bold mb-2">{t('dashboard.departmentAttendance')}</h2>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={departmentStats || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="presentPercentage"
                      >
                        {(departmentStats || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value}%`, t('dashboard.attendanceRate')]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {/* Recent Activity */}
          <div>
            <RecentActivity />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Weekly Attendance Chart */}
          <WeeklyAttendanceChart />

          {/* Department Stats */}
          <DepartmentStats />
        </div>

        {/* Employee Table */}
        <EmployeeTable />
      </main>
    </div>
  );
}
