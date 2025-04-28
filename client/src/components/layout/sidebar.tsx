import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { 
  ClipboardList, 
  LayoutDashboard, 
  LogOut, 
  Settings, 
  User, 
  Users2 
} from "lucide-react";
import { Button } from "@/components/ui/button";

type SidebarLinkProps = {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isActive: boolean;
};

const SidebarLink = ({ href, icon, children, isActive }: SidebarLinkProps) => {
  return (
    <li className="mb-1">
      <Link href={href}>
        <div 
          className={cn(
            "flex items-center px-4 py-3 rounded-lg transition-colors cursor-pointer",
            isActive
              ? "bg-primary text-white"
              : "text-foreground hover:bg-primary/10"
          )}
        >
          {icon}
          <span className="ml-3">{children}</span>
        </div>
      </Link>
    </li>
  );
};

export function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const isActive = (path: string) => {
    if (path === '/' && location === '/') return true;
    if (path !== '/' && location.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="hidden md:flex flex-col w-64 bg-background border-r">
      <div className="flex items-center justify-center h-16 border-b">
        <span className="text-primary text-xl font-bold">FaceAttend</span>
      </div>
      
      <div className="px-4 py-6">
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <User className="text-primary h-10 w-10" />
          </div>
          <h3 className="font-medium text-foreground">{user?.fullName || 'Admin User'}</h3>
          <p className="text-sm text-muted-foreground">{user?.role || 'Administrator'}</p>
        </div>
        
        <nav>
          <ul>
            <SidebarLink 
              href="/" 
              icon={<LayoutDashboard className="h-5 w-5" />} 
              isActive={isActive('/')}
            >
              Dashboard
            </SidebarLink>
            
            <SidebarLink 
              href="/attendance" 
              icon={<ClipboardList className="h-5 w-5" />}
              isActive={isActive('/attendance')}
            >
              Attendance
            </SidebarLink>
            
            <SidebarLink 
              href="/employees" 
              icon={<Users2 className="h-5 w-5" />}
              isActive={isActive('/employees')}
            >
              Employees
            </SidebarLink>
            
            <SidebarLink 
              href="/reports" 
              icon={<ClipboardList className="h-5 w-5" />}
              isActive={isActive('/reports')}
            >
              Reports
            </SidebarLink>
            
            <SidebarLink 
              href="/settings" 
              icon={<Settings className="h-5 w-5" />}
              isActive={isActive('/settings')}
            >
              Settings
            </SidebarLink>
          </ul>
        </nav>
      </div>
      
      <div className="mt-auto border-t p-4">
        <Button 
          variant="ghost" 
          className="w-full flex items-center justify-start text-foreground hover:bg-primary/10"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="h-5 w-5 mr-3" />
          <span>Logout</span>
        </Button>
      </div>
    </div>
  );
}
