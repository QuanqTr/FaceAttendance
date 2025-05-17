import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, addDays, parseISO } from "date-fns";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/header";
import { AttendanceRecognition } from "@/components/dashboard/attendance-recognition";
import { AttendanceLog } from "@/components/attendance/attendance-log";
import { WorkHoursLog } from "@/components/attendance/work-hours-log";
import { AttendanceTabs } from "@/components/attendance/attendance-tabs";
import type { WorkHoursRecord } from "@/components/attendance/work-hours-log";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useI18nToast } from "@/hooks/use-i18n-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

type AttendanceRecord = {
  id: number;
  employeeId: number;
  employeeName: string;
  departmentName: string;
  date: string;
  timeIn?: string;
  timeOut?: string;
  status: 'present' | 'absent' | 'late';
};

export default function Attendance() {
  const { t } = useTranslation();
  const toast = useI18nToast();
  const [date, setDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("record");
  const { user } = useAuth();
  const [, navigate] = useLocation();

  if (!user || user.role !== "manager") {
    navigate("/");
    return null;
  }

  const formattedDate = format(date, "yyyy-MM-dd");

  const { data: attendanceRecords, isLoading: isLoadingAttendance } = useQuery<AttendanceRecord[]>({
    queryKey: ["/api/attendance/daily", formattedDate],
    queryFn: async () => {
      const res = await fetch(`/api/attendance/daily?date=${formattedDate}`);
      if (!res.ok) throw new Error("Failed to fetch attendance records");

      const data = await res.json();

      // Transform the data to match the AttendanceRecord type
      return data.map((item: any, index: number) => ({
        // Ensure each record has a unique ID by combining employee ID with index
        id: item.attendance?.id || (item.employee.id * 1000 + index),
        employeeId: item.employee.id,
        employeeName: `${item.employee.lastName} ${item.employee.firstName}`,
        departmentName: item.employee.departmentId, // In a real app, this would fetch the department name
        date: formattedDate,
        timeIn: item.attendance?.type === 'in' ? new Date(item.attendance?.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
        timeOut: item.attendance?.type === 'out' ? new Date(item.attendance?.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
        status: item.attendance?.status || 'absent',
      }));
    }
  });

  // Fetch work hours data
  const { data: workHoursData, isLoading: isLoadingWorkHours } = useQuery<WorkHoursRecord[]>({
    queryKey: ["/api/work-hours/daily", formattedDate],
    queryFn: async () => {
      const res = await fetch(`/api/work-hours/daily?date=${formattedDate}`);
      if (!res.ok) throw new Error("Failed to fetch work hours data");
      return await res.json();
    }
  });

  const handlePreviousDay = () => {
    setDate(subDays(date, 1));
  };

  const handleNextDay = () => {
    setDate(addDays(date, 1));
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const filteredRecords = attendanceRecords?.filter(record =>
    record.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.departmentName.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const exportAttendance = () => {
    // In a real app, this would trigger a CSV/Excel export
    console.log("Exporting attendance data");
    toast.success(t('common.success'), t('reports.exportSuccess'));
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header title={t('attendance.title')} onSearch={handleSearch} showSearch={true} />

      <main className="flex-1 container py-4 space-y-2">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
          <h1 className="text-2xl px-6 font-bold tracking-tight">{t('attendance.title')}</h1>

          <div className="flex items-center space-x-2 px-6">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePreviousDay}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                  )}
                >
                  <CalendarIcon className="mr-3 h-4 w-4" />
                  {format(date, "dd/MM/yyyy")}
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

            <Button
              variant="outline"
              size="icon"
              onClick={handleNextDay}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <AttendanceTabs activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="space-y-6">


          {activeTab === "workhours" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xl">{t('attendance.dailyAttendance')}</CardTitle>
              </CardHeader>
              <CardContent>
                <WorkHoursLog
                  records={workHoursData || []}
                  isLoading={isLoadingWorkHours}
                  date={date}
                  onDateChange={setDate}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
