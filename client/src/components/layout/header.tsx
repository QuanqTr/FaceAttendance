import { useAuth } from "@/hooks/use-auth";
import { Bell, Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface HeaderProps {
  title: string;
  showSearch?: boolean;
  onSearch?: (value: string) => void;
}

export function Header({ title, showSearch = false, onSearch }: HeaderProps) {
  const { user } = useAuth();
  
  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <div className="border-b bg-background sticky top-0 z-10">
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2 md:hidden">
          <Menu className="h-5 w-5" />
          <h1 className="text-xl font-bold">{title}</h1>
        </div>
        <h1 className="text-xl font-bold hidden md:block">{title}</h1>
        
        <div className="flex items-center gap-4">
          {showSearch && (
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="w-[200px] md:w-[300px] pl-8"
                onChange={(e) => onSearch && onSearch(e.target.value)}
              />
            </div>
          )}
          
          <Button variant="outline" size="icon" className="rounded-full">
            <Bell className="h-5 w-5" />
          </Button>
          
          <Avatar>
            <AvatarImage src="" alt={user?.fullName || "User"} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </div>
  );
}