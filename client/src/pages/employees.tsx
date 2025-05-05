import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { EmployeeCard } from "@/components/employees/employee-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Employee } from "@shared/schema";
import { CalendarIcon, Check, Filter, Loader2, Plus, Search, SlidersHorizontal, Users2, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

export default function Employees() {
  const [_, navigate] = useLocation();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(8);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [joinDateFilter, setJoinDateFilter] = useState<Date | undefined>(undefined);
  const [positionFilter, setPositionFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Add debounced search
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const { data: departments } = useQuery({
    queryKey: ["/api/departments"],
    queryFn: async () => {
      const res = await fetch("/api/departments");
      if (!res.ok) throw new Error("Failed to fetch departments");
      return await res.json();
    }
  });

  // Construct query parameters for API request
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    if (debouncedSearchQuery) {
      params.append('search', debouncedSearchQuery);
    }

    if (departmentFilter !== "all") {
      params.append('departmentId', departmentFilter);
    }

    if (statusFilter !== "all") {
      params.append('status', statusFilter);
    }

    if (positionFilter) {
      params.append('position', positionFilter);
    }

    if (joinDateFilter) {
      params.append('joinDate', format(joinDateFilter, 'yyyy-MM-dd'));
    }

    if (sortBy) {
      params.append('sortBy', sortBy);
    }

    return params.toString();
  };

  const queryParams = buildQueryParams();

  const { data, isLoading, refetch } = useQuery<{ employees: Employee[], total: number }>({
    queryKey: ["/api/employees", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/employees?${queryParams}`);
      if (!res.ok) throw new Error("Failed to fetch employees");
      return await res.json();
    }
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearchQuery, departmentFilter, statusFilter, positionFilter, joinDateFilter, sortBy]);

  const employees = data?.employees || [];
  const totalCount = data?.total || 0;
  const totalPages = Math.ceil(totalCount / limit);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setDepartmentFilter("all");
    setStatusFilter("all");
    setJoinDateFilter(undefined);
    setPositionFilter("");
    setSortBy("newest");
  };

  const handleAddEmployee = () => {
    navigate("/employees/new");
  };

  const activeFiltersCount = [
    departmentFilter !== "all",
    statusFilter !== "all",
    positionFilter !== "",
    joinDateFilter !== undefined
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Employees" onSearch={handleSearch} />

      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 px-4 md:px-6 py-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-2xl font-bold">Employee Directory</h1>

          <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0">
            <Button
              variant="outline"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="relative"
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </Button>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                <SelectItem value="name_desc">Name (Z-A)</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleAddEmployee}>
              <Plus className="mr-2 h-4 w-4" /> Add Employee
            </Button>
          </div>
        </div>

        {showAdvancedFilters && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Advanced Filters</CardTitle>
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  <X className="h-4 w-4 mr-1" /> Clear all
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger id="department">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments?.map((dept: { id: number, name: string }) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  placeholder="Any position"
                  value={positionFilter}
                  onChange={(e) => setPositionFilter(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="joinDate">Join Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="joinDate"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !joinDateFilter && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {joinDateFilter ? format(joinDateFilter, "PPP") : "Any date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={joinDateFilter}
                      onSelect={setJoinDateFilter}
                      initialFocus
                    />
                    {joinDateFilter && (
                      <div className="p-3 border-t border-border">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setJoinDateFilter(undefined)}
                          className="w-full"
                        >
                          <X className="h-4 w-4 mr-1" /> Clear date
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : employees.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {employees.map(employee => (
                <EmployeeCard
                  key={employee.id}
                  employee={employee}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination className="mt-8">
                <PaginationContent>
                  <PaginationItem>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                  </PaginationItem>

                  {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                    // Show pages around current page for large number of pages
                    let pageToShow = i + 1;
                    if (totalPages > 5) {
                      if (page > 3 && page <= totalPages - 2) {
                        pageToShow = page - 2 + i;
                      } else if (page > totalPages - 2) {
                        pageToShow = totalPages - 4 + i;
                      }
                    }

                    return (
                      <PaginationItem key={i}>
                        <Button
                          variant={page === pageToShow ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(pageToShow)}
                        >
                          {pageToShow}
                        </Button>
                      </PaginationItem>
                    );
                  })}

                  <PaginationItem>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-center h-[400px] bg-muted/20 rounded-lg">
            <Users2 className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">No employees found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || departmentFilter !== "all" || statusFilter !== "all" || positionFilter || joinDateFilter
                ? "Try adjusting your filters or search query"
                : "Get started by adding your first employee"}
            </p>
            {(searchQuery || departmentFilter !== "all" || statusFilter !== "all" || positionFilter || joinDateFilter) && (
              <Button variant="outline" onClick={clearAllFilters} className="mb-4">
                <X className="h-4 w-4 mr-1" /> Clear all filters
              </Button>
            )}
            <Button onClick={handleAddEmployee}>
              <Plus className="mr-2 h-4 w-4" /> Add Employee
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
