import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import {
  ClipboardList,
  LayoutDashboard,
  Menu,
  Settings,
  Users2,
  Calendar,
  DollarSign,
  Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const { t } = useTranslation();

  const isActive = (path: string) => {
    if (path === '/' && location === '/') return true;
    if (path !== '/' && location.startsWith(path)) return true;
    return false;
  };

  return (
    <>
      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t z-10 md:hidden">
        <div className="grid grid-cols-5">
          <MobileNavLink
            href="/"
            icon={<LayoutDashboard className="h-5 w-5" />}
            isActive={isActive('/')}
          >
            {t('common.dashboard')}
          </MobileNavLink>

          <MobileNavLink
            href="/attendance"
            icon={<ClipboardList className="h-5 w-5" />}
            isActive={isActive('/attendance')}
          >
            {t('common.attendance')}
          </MobileNavLink>

          <MobileNavLink
            href="/employees"
            icon={<Users2 className="h-5 w-5" />}
            isActive={isActive('/employees')}
          >
            {t('common.employees')}
          </MobileNavLink>

          <MobileNavLink
            href="/leave-requests"
            icon={<Calendar className="h-5 w-5" />}
            isActive={isActive('/leave-requests')}
          >
            {t('common.leaveRequests').split(' ')[0]}
          </MobileNavLink>

          <MobileNavLink
            href="/salary"
            icon={<DollarSign className="h-5 w-5" />}
            isActive={isActive('/salary')}
          >
            {t('common.salary')}
          </MobileNavLink>
        </div>
      </div>
    </>
  );
}
