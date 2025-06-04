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
import { CalendarIcon, Check, Filter, Loader2, Plus, Search, SlidersHorizontal, Users2, X, UserPlus, Eye, Edit, Grid, List } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { useTranslation } from "react-i18next";
import { useI18nToast } from "@/hooks/use-i18n-toast";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Helper function to get full name and initials
const getFullName = (employee: Employee) => `${employee.firstName} ${employee.lastName}`.trim();
const getInitials = (employee: Employee) => {
  const firstName = employee.firstName || '';
  const lastName = employee.lastName || '';
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

export default function Employees() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  if (!user || user.role !== "manager") {
    navigate("/");
    return null;
  }
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(8);
  const [searchQuery, setSearchQuery] = useState("");
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

  // Modified query to only fetch employees from manager's department
  const { data, isLoading, refetch } = useQuery<{ employees: (Employee & { department?: { name: string } })[], total: number }>({
    queryKey: ["/api/manager/employees", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/manager/employees?${queryParams}`);
      if (!res.ok) throw new Error("Failed to fetch employees");
      return await res.json();
    }
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearchQuery, statusFilter, positionFilter, joinDateFilter, sortBy, limit]);

  const employees = data?.employees || [];
  const totalCount = data?.total || 0;
  const totalPages = Math.ceil(totalCount / limit);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setJoinDateFilter(undefined);
    setPositionFilter("");
    setSortBy("newest");
  };

  const handleAddEmployee = () => {
    navigate("/manager/employees/new");
  };

  const activeFiltersCount = [
    statusFilter !== "all",
    positionFilter !== "",
    joinDateFilter !== undefined
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-gradient-to-br from-indigo-50 to-blue-50">
      <Header
        title=""
        onSearch={handleSearch}
        showSearch={true}
        searchPlaceholder="Search team members..."
      />

      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 px-4 md:px-6 py-4">
        {/* Header Section */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div className="mb-4 md:mb-0">
                <h1 className="text-2xl font-bold mb-2 flex items-center">
                  <Users2 className="mr-3 h-6 w-6" />
                  My Team Members
                </h1>
                <p className="opacity-90">Manage employees in your department and track their performance</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setViewMode(viewMode === "grid" ? "table" : "grid")}
                  >
                    {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className="relative bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    Filters
                    {activeFiltersCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-900 text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {activeFiltersCount}
                      </span>
                    )}
                  </Button>
                </div>

                <Button onClick={handleAddEmployee} variant="secondary">
                  <UserPlus className="mr-2 h-4 w-4" /> Add Member
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white border-blue-200">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{totalCount}</div>
                <div className="text-sm text-gray-600">Total Members</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-green-200">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {employees.filter(e => e.status === 'active').length}
                </div>
                <div className="text-sm text-gray-600">Active</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-yellow-200">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {employees.filter(e => e.status === 'on_leave').length}
                </div>
                <div className="text-sm text-gray-600">On Leave</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-red-200">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {employees.filter(e => e.status === 'inactive').length}
                </div>
                <div className="text-sm text-gray-600">Inactive</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {showAdvancedFilters && (
          <Card className="mb-6 bg-white border-indigo-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-indigo-800">Advanced Filters</CardTitle>
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  <X className="h-4 w-4 mr-1" /> Clear All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="status" className="text-sm font-medium text-gray-700">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="mt-1 border-indigo-200">
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

                <div>
                  <Label htmlFor="position" className="text-sm font-medium text-gray-700">Position</Label>
                  <Input
                    id="position"
                    placeholder="Search position..."
                    value={positionFilter}
                    onChange={(e) => setPositionFilter(e.target.value)}
                    className="mt-1 border-indigo-200"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">Join Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal mt-1 border-indigo-200",
                          !joinDateFilter && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {joinDateFilter ? format(joinDateFilter, "PPP") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={joinDateFilter}
                        onSelect={setJoinDateFilter}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="sort" className="text-sm font-medium text-gray-700">Sort By</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="mt-1 border-indigo-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="name_asc">Name A-Z</SelectItem>
                      <SelectItem value="name_desc">Name Z-A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        )}

        {/* Employee List */}
        {!isLoading && (
          <>
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                {employees.map((employee) => (
                  <Card key={employee.id} className="group hover:shadow-lg transition-all duration-200 bg-white border-indigo-100 hover:border-indigo-300">
                    <CardContent className="p-4">
                      <div className="flex flex-col items-center text-center">
                        <Avatar className="h-16 w-16 mb-3">
                          <AvatarFallback className="bg-indigo-500 text-white text-lg">
                            {getInitials(employee)}
                          </AvatarFallback>
                        </Avatar>
                        <h3 className="font-semibold text-gray-900 mb-1">{getFullName(employee)}</h3>
                        <p className="text-sm text-gray-500 mb-2">{employee.position || 'No position'}</p>
                        <Badge
                          variant={employee.status === 'active' ? 'default' :
                            employee.status === 'on_leave' ? 'secondary' : 'destructive'}
                          className="mb-3"
                        >
                          {employee.status.replace('_', ' ')}
                        </Badge>
                        <div className="flex gap-2 w-full">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/manager/employees/${employee.id}`)}
                            className="flex-1"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/manager/employees/${employee.id}/edit`)}
                            className="flex-1"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              // Table view
              <Card className="mb-6 bg-white">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-indigo-50 border-b border-indigo-200">
                        <tr>
                          <th className="text-left p-4 font-medium text-gray-700">Employee</th>
                          <th className="text-left p-4 font-medium text-gray-700">Position</th>
                          <th className="text-left p-4 font-medium text-gray-700">Department</th>
                          <th className="text-left p-4 font-medium text-gray-700">Status</th>
                          <th className="text-left p-4 font-medium text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map((employee) => (
                          <tr key={employee.id} className="border-b border-gray-100 hover:bg-indigo-50">
                            <td className="p-4">
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback className="bg-indigo-500 text-white">
                                    {getInitials(employee)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium text-gray-900">{getFullName(employee)}</div>
                                  <div className="text-sm text-gray-500">{employee.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-gray-900">{employee.position || 'No position'}</td>
                            <td className="p-4 text-gray-900">{employee.department && employee.department.name ? employee.department.name : 'No department'}</td>
                            <td className="p-4">
                              <Badge
                                variant={employee.status === 'active' ? 'default' :
                                  employee.status === 'on_leave' ? 'secondary' : 'destructive'}
                              >
                                {employee.status.replace('_', ' ')}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(`/manager/employees/${employee.id}`)}
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(`/manager/employees/${employee.id}/edit`)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Empty State */}
        {!isLoading && employees.length === 0 && (
          <Card className="bg-white">
            <CardContent className="text-center py-12">
              <Users2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No team members found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || activeFiltersCount > 0
                  ? "Try adjusting your search or filters"
                  : "You don't have any team members in your department yet"}
              </p>
              <Button onClick={handleAddEmployee}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Team Member
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalCount)} of {totalCount} results
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setPage(Math.max(1, page - 1))}
                        className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            onClick={() => setPage(pageNum)}
                            isActive={page === pageNum}
                            className="cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
