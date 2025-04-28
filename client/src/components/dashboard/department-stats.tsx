import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

type DepartmentStat = {
  departmentId: number;
  departmentName: string;
  presentPercentage: number;
};

export function DepartmentStats() {
  const [timePeriod, setTimePeriod] = useState("today");
  
  const { data: departments, isLoading } = useQuery<DepartmentStat[]>({
    queryKey: ["/api/stats/departments", timePeriod],
    queryFn: async () => {
      const date = new Date();
      const res = await fetch(`/api/stats/departments?date=${date.toISOString()}`);
      if (!res.ok) throw new Error("Failed to fetch department stats");
      return await res.json();
    }
  });
  
  return (
    <Card className="shadow-sm h-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium">Department Attendance</CardTitle>
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="thisWeek">This Week</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            // Skeletons for loading state
            Array(5).fill(0).map((_, i) => (
              <div key={i}>
                <div className="flex justify-between mb-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-10" />
                </div>
                <Skeleton className="h-2.5 w-full rounded-full" />
              </div>
            ))
          ) : departments && departments.length > 0 ? (
            departments.map((dept) => (
              <div key={dept.departmentId}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">{dept.departmentName}</span>
                  <span className="text-sm font-medium">{dept.presentPercentage}%</span>
                </div>
                <Progress value={dept.presentPercentage} className="h-2.5" />
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No department data available</p>
            </div>
          )}
        </div>
        
        <div className="mt-6">
          <Button 
            className="w-full py-2 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors"
            variant="outline"
          >
            View Full Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
