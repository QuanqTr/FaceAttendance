import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportGenerator } from "@/components/reports/report-generator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Download, FileText, PieChart as PieChartIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

// Sample data for demonstration
const COLORS = ['#1E88E5', '#E53935', '#FFC107', '#26A69A'];

export default function Reports() {
  const { t } = useTranslation();
  const [date, setDate] = useState<Date>(new Date());
  const [reportType, setReportType] = useState("attendance");
  const { user } = useAuth();
  const [, navigate] = useLocation();

  if (!user || user.role !== "manager") {
    navigate("/");
    return null;
  }

  const startDate = startOfMonth(date);
  const endDate = endOfMonth(date);

  const { data: weeklyData } = useQuery({
    queryKey: ["/api/stats/weekly", startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const res = await fetch(`/api/stats/weekly?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);
      if (!res.ok) throw new Error("Failed to fetch weekly stats");
      return await res.json();
    }
  });

  const { data: departmentStats } = useQuery({
    queryKey: ["/api/stats/departments", date.toISOString()],
    queryFn: async () => {
      const res = await fetch(`/api/stats/departments?date=${date.toISOString()}`);
      if (!res.ok) throw new Error("Failed to fetch department stats");
      return await res.json();
    }
  });

  const previousMonth = () => {
    setDate(subMonths(date, 1));
  };

  const nextMonth = () => {
    setDate(addMonths(date, 1));
  };

  // Prepare data for monthly attendance chart
  const monthlyData = weeklyData?.map((day: any) => ({
    name: format(new Date(day.date), 'dd'),
    present: day.present,
    absent: day.absent,
    late: day.late,
  })) || [];

  // Prepare data for department attendance pie chart
  const departmentPieData = departmentStats?.map((dept: any) => ({
    name: dept.departmentName,
    value: dept.presentPercentage,
  })) || [];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title={t('reports.title')} />

      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 px-4 md:px-6 py-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-2xl font-bold">{t('reports.reportsAndAnalytics')}</h1>

          <div className="flex items-center space-x-2 mt-4 md:mt-0">
            <div className="flex items-center space-x-1">
              <Button variant="outline" size="icon" onClick={previousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="min-w-[160px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, "MMMM yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => newDate && setDate(newDate)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="charts" className="space-y-6">
          <TabsList className="mb-2">
            <TabsTrigger value="charts">{t('reports.chartsAndAnalytics')}</TabsTrigger>
            <TabsTrigger value="export">{t('reports.generateReports')}</TabsTrigger>
          </TabsList>

          <TabsContent value="charts" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('reports.monthlyAttendanceOverview')}</CardTitle>
                  <CardDescription>
                    {t('reports.dailyAttendanceFor')} {format(date, "MMMM yyyy")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={monthlyData}
                        margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="present" fill="#1E88E5" name={t('attendance.present')} />
                        <Bar dataKey="late" fill="#FFC107" name={t('attendance.late')} />
                        <Bar dataKey="absent" fill="#E53935" name={t('attendance.absent')} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('reports.departmentAttendance')}</CardTitle>
                  <CardDescription>
                    {t('reports.percentagePresent')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={departmentPieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {departmentPieData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any) => [`${value}%`, t('reports.attendanceRate')]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t('reports.attendanceTrends')}</CardTitle>
                <CardDescription>
                  {t('reports.monthlyPatterns')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlyData}
                      margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="present" fill="#1E88E5" name={t('attendance.present')} />
                      <Bar dataKey="late" fill="#FFC107" name={t('attendance.late')} />
                      <Bar dataKey="absent" fill="#E53935" name={t('attendance.absent')} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="export">
            <ReportGenerator
              startDate={startDate}
              endDate={endDate}
              reportType={reportType}
              setReportType={setReportType}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
