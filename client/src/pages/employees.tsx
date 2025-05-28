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
import { useTranslation } from "react-i18next";
import { useI18nToast } from "@/hooks/use-i18n-toast";
import { apiRequest } from "@/lib/queryClient";

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
  const { t } = useTranslation();
  const i18nToast = useI18nToast();

  // Add debounced search
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const { data: departments } = useQuery({
    queryKey: ["/api/departments"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/departments");
      if (!res.ok) throw new Error("Failed to fetch departments");
      return res.data;
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
      const res = await apiRequest("GET", `/api/employees?${queryParams}`);
      if (!res.ok) throw new Error("Failed to fetch employees");
      return res.data;
    }
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearchQuery, departmentFilter, statusFilter, positionFilter, joinDateFilter, sortBy, limit]);

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
      <Header
        title=""
        onSearch={handleSearch}
        showSearch={true}
        searchPlaceholder={t('employees.searchByName')}
      />

      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 px-4 md:px-6 py-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-2xl font-bold">{t('employees.title')}</h1>

          <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0">
            <Button
              variant="outline"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="relative"
            >
              <Filter className="mr-2 h-4 w-4" />
              {t('common.filter')}
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </Button>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('common.filter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{t('employees.sortNewest')}</SelectItem>
                <SelectItem value="oldest">{t('employees.sortOldest')}</SelectItem>
                <SelectItem value="name_asc">{t('employees.sortNameAsc')}</SelectItem>
                <SelectItem value="name_desc">{t('employees.sortNameDesc')}</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleAddEmployee}>
              <Plus className="mr-2 h-4 w-4" /> {t('employees.addNew')}
            </Button>
          </div>
        </div>

        {showAdvancedFilters && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>{t('employees.advancedFilters')}</CardTitle>
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  <X className="h-4 w-4 mr-1" /> {t('employees.clearAll')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">{t('employees.department')}</Label>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger id="department">
                    <SelectValue placeholder={t('employees.allDepartments')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('employees.allDepartments')}</SelectItem>
                    {departments?.map((dept: { id: number, name: string }) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">{t('common.status')}</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder={t('employees.allStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('employees.allStatus')}</SelectItem>
                    <SelectItem value="active">{t('employees.active')}</SelectItem>
                    <SelectItem value="inactive">{t('employees.inactive')}</SelectItem>
                    <SelectItem value="on_leave">{t('employees.onLeave')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">{t('employees.position')}</Label>
                <Input
                  id="position"
                  placeholder={t('employees.anyPosition')}
                  value={positionFilter}
                  onChange={(e) => setPositionFilter(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="joinDate">{t('employees.joinDate')}</Label>
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
                      {joinDateFilter ? format(joinDateFilter, "PPP") : t('employees.anyDate')}
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
                          <X className="h-4 w-4 mr-1" /> {t('employees.clearDate')}
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
                      {t('common.back')}
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
                      {t('common.next')}
                    </Button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}

            <div className="flex justify-end mt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t('common.rowsPerPage')}:</span>
                <Select value={limit.toString()} onValueChange={(value) => setLimit(Number(value))}>
                  <SelectTrigger className="w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="8">8</SelectItem>
                    <SelectItem value="12">12</SelectItem>
                    <SelectItem value="16">16</SelectItem>
                    <SelectItem value="24">24</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">
                  {t('common.showing')} {Math.min((page - 1) * limit + 1, totalCount)} - {Math.min(page * limit, totalCount)} {t('common.of')} {totalCount}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-center h-[400px] bg-muted/20 rounded-lg">
            <Users2 className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">{t('employees.noEmployeesFound')}</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || departmentFilter !== "all" || statusFilter !== "all" || positionFilter || joinDateFilter
                ? t('employees.adjustFilters')
                : t('employees.getStarted')}
            </p>
            {(searchQuery || departmentFilter !== "all" || statusFilter !== "all" || positionFilter || joinDateFilter) && (
              <Button variant="outline" onClick={clearAllFilters} className="mb-4">
                <X className="h-4 w-4 mr-1" /> {t('employees.clearAllFilters')}
              </Button>
            )}
            <Button onClick={handleAddEmployee}>
              <Plus className="mr-2 h-4 w-4" /> {t('employees.addNew')}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
