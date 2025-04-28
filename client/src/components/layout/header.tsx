import { useState } from "react";
import { Bell, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";

type HeaderProps = {
  title: string;
  onSearch?: (query: string) => void;
};

export function Header({ title, onSearch }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  return (
    <header className="bg-background sticky top-0 border-b z-10">
      <div className="flex items-center justify-between h-16 px-4">
        <div className="flex items-center">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden mr-2">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <Sidebar />
            </SheetContent>
          </Sheet>
          <h1 className="text-xl font-medium">{title}</h1>
        </div>
        
        <div className="flex items-center">
          <form onSubmit={handleSearch} className="relative mr-4">
            <Input
              type="text"
              placeholder="Search..."
              className="bg-background/80 w-40 md:w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          </form>
          
          <div className="relative">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 bg-destructive text-destructive-foreground text-xs w-4 h-4 flex items-center justify-center rounded-full">3</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
