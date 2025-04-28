import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

type WeeklyData = {
  date: string;
  present: number;
  absent: number;
  late: number;
};

export function WeeklyAttendanceChart() {
  const [selectedPeriod, setSelectedPeriod] = useState("thisWeek");
  
  // Calculate date ranges based on selected period
  const today = new Date();
  let startDate = startOfWeek(today);
  let endDate = endOfWeek(today);
  
  if (selectedPeriod === "lastWeek") {
    startDate = startOfWeek(subWeeks(today, 1));
    endDate = endOfWeek(subWeeks(today, 1));
  } else if (selectedPeriod === "lastMonth") {
    startDate = startOfWeek(subWeeks(today, 4));
    endDate = endOfWeek(today);
  }

  const { data: weeklyData, isLoading } = useQuery<WeeklyData[]>({
    queryKey: ["/api/stats/weekly", startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const res = await fetch(`/api/stats/weekly?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);
      if (!res.ok) throw new Error("Failed to fetch weekly attendance data");
      return await res.json();
    }
  });

  // Format data for chart display
  const chartData = weeklyData?.map(day => ({
    ...day,
    date: format(new Date(day.date), "EEE"),
  })) || [];

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium">Weekly Attendance</CardTitle>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="thisWeek">This Week</SelectItem>
              <SelectItem value="lastWeek">Last Week</SelectItem>
              <SelectItem value="lastMonth">Last Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="w-full h-[250px] flex items-center justify-center">
            <Skeleton className="w-full h-[200px]" />
          </div>
        ) : (
          <>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 0,
                    bottom: 5,
                  }}
                >
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="present" fill="#1E88E5" name="Present" />
                  <Bar dataKey="absent" fill="#E53935" name="Absent" />
                  <Bar dataKey="late" fill="#FFC107" name="Late" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex justify-center mt-6">
              <div className="flex items-center mr-4">
                <div className="w-3 h-3 bg-primary mr-2"></div>
                <span className="text-xs text-muted-foreground">Present</span>
              </div>
              <div className="flex items-center mr-4">
                <div className="w-3 h-3 bg-destructive mr-2"></div>
                <span className="text-xs text-muted-foreground">Absent</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-amber-500 mr-2"></div>
                <span className="text-xs text-muted-foreground">Late</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
