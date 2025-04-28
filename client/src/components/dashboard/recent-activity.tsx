import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogInIcon, LogOutIcon, UserPlusIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

type ActivityType = 'clockIn' | 'clockOut' | 'newEmployee';

type ActivityItem = {
  id: number;
  name: string;
  description: string;
  time: Date;
  type: ActivityType;
};

export function RecentActivity() {
  const { data: activities, isLoading } = useQuery<ActivityItem[]>({
    queryKey: ["/api/attendance/recent-activities"],
    // Fallback to empty array if the API doesn't exist yet
    queryFn: async () => {
      try {
        const res = await fetch("/api/attendance/recent-activities");
        if (!res.ok) return [];
        return await res.json();
      } catch (error) {
        console.error("Error fetching activities:", error);
        return [];
      }
    }
  });

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'clockIn':
        return (
          <div className="w-8 h-8 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center">
            <LogInIcon className="text-primary h-4 w-4" />
          </div>
        );
      case 'clockOut':
        return (
          <div className="w-8 h-8 rounded-full bg-destructive/10 flex-shrink-0 flex items-center justify-center">
            <LogOutIcon className="text-destructive h-4 w-4" />
          </div>
        );
      case 'newEmployee':
        return (
          <div className="w-8 h-8 rounded-full bg-secondary/10 flex-shrink-0 flex items-center justify-center">
            <UserPlusIcon className="text-secondary h-4 w-4" />
          </div>
        );
    }
  };

  return (
    <Card className="shadow-sm h-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium">Recent Activity</CardTitle>
          <a href="/attendance" className="text-sm text-primary hover:underline">View All</a>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          // Loading skeletons
          Array(5).fill(0).map((_, i) => (
            <div key={i} className="flex items-start pb-3 border-b">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="ml-3 space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))
        ) : activities && activities.length > 0 ? (
          activities.map((activity, index) => (
            <div key={activity.id} className={`flex items-start ${index < activities.length - 1 ? 'pb-3 border-b' : ''}`}>
              {getActivityIcon(activity.type)}
              <div className="ml-3">
                <p className="text-sm font-medium">{activity.name}</p>
                <p className="text-xs text-muted-foreground">{activity.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(activity.time), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No recent activities</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
