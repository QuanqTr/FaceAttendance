import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "react-i18next";
import { Bell, Search, Menu, User, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LanguageSwitcher } from "@/components/language-switcher";

interface HeaderProps {
  title: string;
  description?: string;
  showSearch?: boolean;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
}

export function Header({ title, description, showSearch = false, onSearch, searchPlaceholder }: HeaderProps) {
  const { user, logoutMutation } = useAuth();
  const { t } = useTranslation();

  const initials = user?.fullName
    ? user.fullName
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
    : 'U';

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="border-b bg-background sticky top-0 z-10">
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2 md:hidden">
            <Menu className="h-5 w-5" />
            <h1 className="text-xl font-bold">{title}</h1>
          </div>
          <h1 className="text-xl font-bold hidden md:block">{title}</h1>
          {description && <p className="text-sm text-muted-foreground hidden md:block">{description}</p>}
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {showSearch && (
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={searchPlaceholder || t('common.search') + "..."}
                className="w-[200px] md:w-[300px] pl-8"
                onChange={(e) => onSearch && onSearch(e.target.value)}
              />
            </div>
          )}

          <LanguageSwitcher />

          <Button variant="outline" size="icon" className="rounded-full" title={t('common.notifications')}>
            <Bell className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" alt={user?.fullName || t('common.user')} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.fullName}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.username}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Quản lý hồ sơ</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Cài đặt</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Đăng xuất</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}