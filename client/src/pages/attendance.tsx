import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, addDays, parseISO } from "date-fns";
import { Header } from "@/components/layout/header";
import { AttendanceRecognition } from "@/components/dashboard/attendance-recognition";
import { AttendanceLog } from "@/components/attendance/attendance-log";
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
  const [date, setDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("today");

  const formattedDate = format(date, "yyyy-MM-dd");

  const { data: attendanceRecords, isLoading } = useQuery<AttendanceRecord[]>({
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
        employeeName: `${item.employee.firstName} ${item.employee.lastName}`,
        departmentName: item.employee.departmentId, // In a real app, this would fetch the department name
        date: formattedDate,
        timeIn: item.attendance?.type === 'in' ? new Date(item.attendance?.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
        timeOut: item.attendance?.type === 'out' ? new Date(item.attendance?.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
        status: item.attendance?.status || 'absent',
      }));
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
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Attendance" onSearch={handleSearch} />

      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 px-4 md:px-6 py-4">
        <Tabs defaultValue="today" className="space-y-4" onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
            <TabsList>
              <TabsTrigger value="today">Today's Attendance</TabsTrigger>
              <TabsTrigger value="record">Record Attendance</TabsTrigger>
            </TabsList>

            <div className="flex items-center mt-4 sm:mt-0 space-x-2">
              {activeTab === "today" && (
                <>
                  <div className="flex items-center space-x-1">
                    <Button variant="outline" size="icon" onClick={handlePreviousDay}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="min-w-[160px] justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(date, "MMMM d, yyyy")}
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
                    <Button variant="outline" size="icon" onClick={handleNextDay}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="outline" size="icon" onClick={exportAttendance}>
                    <Download className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          <TabsContent value="today" className="space-y-4">
            <AttendanceLog
              records={filteredRecords}
              isLoading={isLoading}
              date={date}
            />
          </TabsContent>

          <TabsContent value="record">
            <Card>
              <CardHeader>
                <CardTitle>Face Recognition Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                <AttendanceRecognition />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
