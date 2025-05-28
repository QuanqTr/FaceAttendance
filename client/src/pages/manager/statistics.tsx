import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { WeeklyAttendanceChart } from "@/components/dashboard/weekly-attendance-chart";
import { DepartmentStats } from "@/components/dashboard/department-stats";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Users, Clock, TrendingUp, AlertTriangle } from "lucide-react";

export default function ManagerStatistics() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [, navigate] = useLocation();

    if (!user || user.role !== "manager") {
        navigate("/");
        return null;
    }

    // Fetch attendance statistics
    const { data: attendanceStats, isLoading: isStatsLoading } = useQuery({
        queryKey: ["/api/manager/stats/daily"],
        queryFn: async () => {
            const res = await fetch("/api/manager/stats/daily");
            if (!res.ok) throw new Error("Failed to fetch attendance stats");
            return await res.json();
        }
    });

    // Fetch department statistics
    const { data: departmentStats, isLoading: isDeptLoading } = useQuery({
        queryKey: ["/api/manager/stats/departments"],
        queryFn: async () => {
            const res = await fetch("/api/manager/stats/departments");
            if (!res.ok) throw new Error("Failed to fetch department stats");
            return await res.json();
        }
    });

    // Fetch weekly attendance data
    const { data: weeklyData, isLoading: isWeeklyLoading } = useQuery({
        queryKey: ["/api/manager/stats/weekly"],
        queryFn: async () => {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 6);

            const res = await fetch(
                `/api/manager/stats/weekly?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
            );
            if (!res.ok) throw new Error("Failed to fetch weekly data");
            return await res.json();
        }
    });

    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            <Header title="Statistics Overview" />

            <main className="flex-1 overflow-y-auto p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Stats Cards */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <StatsCard
                            title="Total Employees"
                            value={attendanceStats?.total || 0}
                            icon={<Users className="h-4 w-4 text-muted-foreground" />}
                            trend={{
                                value: 0,
                                label: "from last month"
                            }}
                            loading={isStatsLoading}
                        />

                        <StatsCard
                            title="Present Today"
                            value={attendanceStats?.present || 0}
                            icon={<Clock className="h-4 w-4 text-muted-foreground" />}
                            trend={{
                                value: 5,
                                label: "from yesterday"
                            }}
                            loading={isStatsLoading}
                        />

                        <StatsCard
                            title="Late Arrivals"
                            value={attendanceStats?.late || 0}
                            icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
                            trend={{
                                value: -2,
                                label: "from yesterday"
                            }}
                            loading={isStatsLoading}
                        />

                        <StatsCard
                            title="Attendance Rate"
                            value={attendanceStats?.total > 0
                                ? `${Math.round((attendanceStats.present / attendanceStats.total) * 100)}%`
                                : "0%"
                            }
                            icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
                            trend={{
                                value: 3,
                                label: "from last week"
                            }}
                            loading={isStatsLoading}
                        />
                    </div>

                    {/* Charts */}
                    <div className="grid gap-6 md:grid-cols-2">
                        <WeeklyAttendanceChart
                            data={weeklyData || []}
                            loading={isWeeklyLoading}
                        />

                        <DepartmentStats
                            data={departmentStats || []}
                            loading={isDeptLoading}
                        />
                    </div>

                    {/* Additional Statistics Tables or Charts can be added here */}
                    <div className="bg-card rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-4">Monthly Attendance Summary</h3>
                        <p className="text-muted-foreground">
                            Detailed monthly attendance statistics will be displayed here.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
} 