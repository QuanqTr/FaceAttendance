import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import {
  ClipboardList,
  LayoutDashboard,
  Menu,
  Settings,
  Users2,
  Calendar,
  DollarSign,
  Globe,
  UserCircle,
  History,
  FileText,
  Scan,
  MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

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
  const { user } = useAuth();

  const isEmployee = user?.role === "employee";

  const isActive = (path: string) => {
    if (path === '/' && location === '/') return true;
    if (path === '/user' && location === '/user') return true;
    if (path !== '/' && path !== '/user' && location.startsWith(path)) return true;
    return false;
  };

  return (
    <>
      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t z-10 md:hidden">
        <div className="grid grid-cols-5">
          {isEmployee ? (
            // Employee mobile navigation
            <>
              <MobileNavLink
                href="/user"
                icon={<LayoutDashboard className="h-5 w-5" />}
                isActive={isActive('/user')}
              >
                {t('common.dashboard')}
              </MobileNavLink>

              <MobileNavLink
                href="/user/attendance-history"
                icon={<History className="h-5 w-5" />}
                isActive={isActive('/user/attendance-history')}
              >
                {t('common.attendance')}
              </MobileNavLink>

              <MobileNavLink
                href="/user/profile"
                icon={<UserCircle className="h-5 w-5" />}
                isActive={isActive('/user/profile')}
              >
                {t('common.profile')}
              </MobileNavLink>

              <MobileNavLink
                href="/user/leave-requests"
                icon={<Calendar className="h-5 w-5" />}
                isActive={isActive('/user/leave-requests')}
              >
                {t('common.leaveRequests')?.split(' ')[0] || 'Leave'}
              </MobileNavLink>

              <Sheet>
                <SheetTrigger asChild>
                  <div className={cn(
                    "flex flex-col items-center py-2 cursor-pointer text-muted-foreground"
                  )}>
                    <MoreHorizontal className="h-5 w-5" />
                    <span className="text-xs mt-1">{t('common.more')}</span>
                  </div>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-64">
                  <div className="grid grid-cols-3 gap-4 py-4">
                    <Link href="/user/salary">
                      <div className="flex flex-col items-center p-3 rounded-lg hover:bg-muted">
                        <DollarSign className="h-6 w-6 mb-2" />
                        <span className="text-sm">{t('common.salary')}</span>
                      </div>
                    </Link>
                    <Link href="/user/settings">
                      <div className="flex flex-col items-center p-3 rounded-lg hover:bg-muted">
                        <Settings className="h-6 w-6 mb-2" />
                        <span className="text-sm">{t('common.settings')}</span>
                      </div>
                    </Link>
                  </div>
                </SheetContent>
              </Sheet>
            </>
          ) : (
            // Admin/Manager mobile navigation
            <>
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
                {t('common.leaveRequests')?.split(' ')[0] || 'Leave'}
              </MobileNavLink>

              <MobileNavLink
                href="/salary"
                icon={<DollarSign className="h-5 w-5" />}
                isActive={isActive('/salary')}
              >
                {t('common.salary')}
              </MobileNavLink>
            </>
          )}
        </div>
      </div>
    </>
  );
}
