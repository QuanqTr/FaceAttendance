import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { 
  ArrowDownIcon, 
  ArrowUpIcon, 
  BadgeIcon, 
  PersonStanding, 
  PersonStandingIcon, 
  TimerIcon, 
  Users2Icon
} from "lucide-react";

type StatsIconType = 'people' | 'absent' | 'late' | 'total';

const getStatsIcon = (type: StatsIconType) => {
  switch (type) {
    case 'people':
      return <Users2Icon className="text-primary" />;
    case 'absent':
      return <PersonStandingIcon className="text-destructive" />;
    case 'late':
      return <TimerIcon className="text-amber-500" />;
    case 'total':
      return <BadgeIcon className="text-secondary" />;
  }
};

type StatsCardProps = {
  title: string;
  value: number;
  change?: {
    value: number;
    isIncrease: boolean;
    text: string;
  };
  type: StatsIconType;
};

export function StatsCard({ title, value, change, type }: StatsCardProps) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-muted-foreground text-sm font-medium mb-1">{title}</p>
            <h3 className="text-2xl font-bold">{value}</h3>
            {change && (
              <p className={cn(
                "text-xs mt-1 flex items-center",
                change.isIncrease ? "text-secondary" : "text-destructive"
              )}>
                {change.isIncrease ? <ArrowUpIcon className="h-3 w-3 mr-1" /> : <ArrowDownIcon className="h-3 w-3 mr-1" />}
                <span>{change.text}</span>
              </p>
            )}
          </div>
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            type === 'people' && "bg-primary/10",
            type === 'absent' && "bg-destructive/10",
            type === 'late' && "bg-amber-500/10",
            type === 'total' && "bg-secondary/10"
          )}>
            {getStatsIcon(type)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
