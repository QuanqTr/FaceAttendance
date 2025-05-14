import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, addDays, parseISO } from "date-fns";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/header";
import { AttendanceRecognition } from "@/components/dashboard/attendance-recognition";
import { AttendanceLog } from "@/components/attendance/attendance-log";
import { WorkHoursLog } from "@/components/attendance/work-hours-log";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useI18nToast } from "@/hooks/use-i18n-toast";

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

type WorkHoursRecord = {
  employeeId: number;
  employeeName: string;
  regularHours: number;
  overtimeHours: number;
  checkinTime: string | null;
  checkoutTime: string | null;
};

export default function Attendance() {
  const { t } = useTranslation();
  const toast = useI18nToast();
  const [date, setDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("today");

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
    toast.success('common.success', 'reports.exportSuccess');
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header title={t('attendance.title')} onSearch={handleSearch} showSearch={true} />

      <main className="flex-1 container py-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
          <h1 className="text-2xl font-bold">{t('attendance.title')}</h1>

          <div className="flex items-center space-x-2">
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
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, "PPP")}
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="today">{t('attendance.dailyAttendance')}</TabsTrigger>
            <TabsTrigger value="record">{t('attendance.recordAttendance')}</TabsTrigger>
            <TabsTrigger value="workhours">{t('attendance.workHours')}</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-4">
            <AttendanceLog
              records={attendanceRecords || []}
              isLoading={isLoadingAttendance}
              date={date}
            />
          </TabsContent>

          <TabsContent value="record">
            <Card>
              <CardHeader>
                <CardTitle>{t('attendance.faceRecognition')}</CardTitle>
              </CardHeader>
              <CardContent>
                <AttendanceRecognition />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workhours" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('attendance.workHours')}</CardTitle>
              </CardHeader>
              <CardContent>
                <WorkHoursLog
                  records={workHoursData || []}
                  isLoading={isLoadingWorkHours}
                  date={date}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
