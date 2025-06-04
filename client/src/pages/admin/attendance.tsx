import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, addDays, parseISO } from "date-fns";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/header";
import { WorkHoursLog } from "@/components/attendance/work-hours-log";
import type { WorkHoursRecord } from "@/components/attendance/work-hours-log";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Search, Filter } from "lucide-react";
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

import { cn } from "@/lib/utils";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";



export default function Attendance() {
  const { t } = useTranslation();
  const [date, setDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const formattedDate = format(date, "yyyy-MM-dd");



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

        <div className="space-y-6">
          {/* Filters */}

          {/* Work Hours Log */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">{t('attendance.workHoursStatistics')}</CardTitle>
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
        </div>
      </main>
    </div>
  );
}
