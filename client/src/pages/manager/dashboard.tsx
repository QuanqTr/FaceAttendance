import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { WeeklyAttendanceChart } from "@/components/dashboard/weekly-attendance-chart";
import { DepartmentStats } from "@/components/dashboard/department-stats";
import { EmployeeTable } from "@/components/dashboard/employee-table";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, navigate] = useLocation();

  if (!user || user.role !== "manager") {
    navigate("/");
    return null;
  }

  // Fetch daily attendance summary
  const { data: dailySummary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["/api/stats/daily"],
    queryFn: async () => {
      const res = await fetch("/api/stats/daily");
      if (!res.ok) throw new Error("Failed to fetch daily summary");
      return await res.json();
    }
  });

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
          {/* Attendance Recognition */}


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
