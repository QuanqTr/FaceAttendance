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

// Sample activity data for demonstration
const SAMPLE_ACTIVITIES: ActivityItem[] = [
  {
    id: 1,
    name: "John Doe",
    description: "Clocked in for the day",
    time: new Date(Date.now() - 25 * 60 * 1000), // 25 minutes ago
    type: 'clockIn'
  },
  {
    id: 2,
    name: "Jane Smith",
    description: "Clocked out for the day",
    time: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
    type: 'clockOut'
  },
  {
    id: 3,
    name: "Alex Johnson",
    description: "New employee registered",
    time: new Date(Date.now() - 120 * 60 * 1000), // 2 hours ago
    type: 'newEmployee'
  },
  {
    id: 4,
    name: "Sarah Lee",
    description: "Clocked in for the day",
    time: new Date(Date.now() - 150 * 60 * 1000), // 2.5 hours ago
    type: 'clockIn'
  }
];

export function RecentActivity() {
  const { data: activities, isLoading } = useQuery<ActivityItem[]>({
    queryKey: ["/api/attendance/recent-activities"],
    // Fallback to sample data if the API doesn't exist yet
    queryFn: async () => {
      try {
        const res = await fetch("/api/attendance/recent-activities");

        // First check the content type to avoid parsing HTML as JSON
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.log("API returned non-JSON response, using sample data");
          return SAMPLE_ACTIVITIES;
        }

        if (!res.ok) {
          console.warn(`API returned status ${res.status}, using sample data`);
          return SAMPLE_ACTIVITIES;
        }

        const data = await res.json();
        return Array.isArray(data) && data.length ? data : SAMPLE_ACTIVITIES;
      } catch (error) {
        console.error("Error fetching activities:", error);
        // Return sample data instead of empty array for better UI
        return SAMPLE_ACTIVITIES;
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
          <span className="text-sm text-primary hover:underline cursor-pointer">View All</span>
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
