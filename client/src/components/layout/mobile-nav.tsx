import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  ClipboardList, 
  LayoutDashboard, 
  Menu, 
  Settings, 
  Users2 
} from "lucide-react";

type MobileNavLinkProps = {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isActive: boolean;
};

const MobileNavLink = ({ href, icon, children, isActive }: MobileNavLinkProps) => {
  return (
    <Link href={href}>
      <div className={cn(
        "flex flex-col items-center py-2 cursor-pointer",
        isActive ? "text-primary" : "text-muted-foreground"
      )}>
        {icon}
        <span className="text-xs mt-1">{children}</span>
      </div>
    </Link>
  );
};

export function MobileNav() {
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === '/' && location === '/') return true;
    if (path !== '/' && location.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t z-10 md:hidden">
      <div className="flex justify-around">
        <MobileNavLink 
          href="/"
          icon={<LayoutDashboard className="h-5 w-5" />}
          isActive={isActive('/')}
        >
          Dashboard
        </MobileNavLink>
        
        <MobileNavLink 
          href="/attendance"
          icon={<ClipboardList className="h-5 w-5" />}
          isActive={isActive('/attendance')}
        >
          Attendance
        </MobileNavLink>
        
        <MobileNavLink 
          href="/employees"
          icon={<Users2 className="h-5 w-5" />}
          isActive={isActive('/employees')}
        >
          Employees
        </MobileNavLink>
        
        <MobileNavLink 
          href="/reports"
          icon={<ClipboardList className="h-5 w-5" />}
          isActive={isActive('/reports')}
        >
          Reports
        </MobileNavLink>
        
        <MobileNavLink 
          href="/settings"
          icon={<Settings className="h-5 w-5" />}
          isActive={isActive('/settings')}
        >
          Settings
        </MobileNavLink>
      </div>
    </div>
  );
}
