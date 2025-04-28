import { useState } from "react";
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
import { Employee } from "@shared/schema";
import { Loader2, Plus, Users2 } from "lucide-react";

export default function Employees() {
  const [_, navigate] = useLocation();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(8);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: departments } = useQuery({
    queryKey: ["/api/departments"],
    queryFn: async () => {
      const res = await fetch("/api/departments");
      if (!res.ok) throw new Error("Failed to fetch departments");
      return await res.json();
    }
  });

  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees", page, limit],
    queryFn: async () => {
      const res = await fetch(`/api/employees?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch employees");
      return await res.json();
    }
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1); // Reset to first page when searching
  };

  // Filter employees based on search query, department, and status
  const filteredEmployees = employees?.filter(employee => {
    const matchesSearch = 
      employee.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDepartment = departmentFilter === "all" || 
      employee.departmentId === parseInt(departmentFilter);
    
    const matchesStatus = statusFilter === "all" || 
      employee.status === statusFilter;
    
    return matchesSearch && matchesDepartment && matchesStatus;
  }) || [];

  const totalPages = Math.ceil((filteredEmployees.length || 0) / limit);

  const handleAddEmployee = () => {
    navigate("/employees/new");
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Employees" onSearch={handleSearch} />
      
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 px-4 md:px-6 py-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-2xl font-bold">Employee Directory</h1>
          
          <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0">
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments?.map(dept => (
                  <SelectItem key={dept.id} value={dept.id.toString()}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={handleAddEmployee}>
              <Plus className="mr-2 h-4 w-4" /> Add Employee
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredEmployees.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredEmployees.map(employee => (
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
                    <PaginationPrevious 
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        isActive={page === i + 1}
                        onClick={() => setPage(i + 1)}
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    />
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
              {searchQuery || departmentFilter !== "all" || statusFilter !== "all" 
                ? "Try adjusting your filters or search query" 
                : "Get started by adding your first employee"}
            </p>
            <Button onClick={handleAddEmployee}>
              <Plus className="mr-2 h-4 w-4" /> Add Employee
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
