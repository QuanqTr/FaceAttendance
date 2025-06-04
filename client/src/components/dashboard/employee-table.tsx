import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, Eye, Pencil, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Employee } from "@shared/schema";
import { formatEmployeeName } from "@/lib/name-utils";

type EmployeeWithAttendance = {
  employee: Employee;
  attendance?: {
    status: 'present' | 'absent' | 'late' | 'leave';
    clockIn?: string;
    clockOut?: string;
  };
};

export function EmployeeTable() {
  const [page, setPage] = useState(1);
  const limit = 5;

  // Hardcoded departments instead of fetching from API due to API issues
  const departments = [
    { id: 1, name: 'DS', description: 'Phòng Design' },
    { id: 2, name: 'HR', description: 'Phòng Nhân sự' }
  ];

  // Create a map of department IDs to department names for quick lookup
  const departmentMap = useMemo(() => {
    return departments.reduce((map: Record<number, string>, dept: { id: number, name: string }) => {
      map[dept.id] = dept.name;
      return map;
    }, {});
  }, []);

  const { data, isLoading } = useQuery<{ employees: EmployeeWithAttendance[]; total: number }>({
    queryKey: ["/api/employees", page, limit],
    queryFn: async () => {
      const res = await fetch(`/api/employees?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch employees");

      // Fetch the employees
      const employees = await res.json();

      // Also fetch today's attendance for these employees
      const today = new Date();
      const attendanceRes = await fetch(`/api/attendance/daily?date=${today.toISOString()}`);
      let attendanceData = [];

      if (attendanceRes.ok) {
        attendanceData = await attendanceRes.json();
      }

      // Combine employee data with attendance data
      const employeesWithAttendance = employees.map((employee: any) => {
        const attendance = attendanceData.find((a: any) => a.employee.id === employee.id)?.attendance;
        return {
          employee,
          attendance: attendance ? {
            status: attendance.status,
            clockIn: attendance.type === 'in' ? new Date(attendance.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
            clockOut: attendance.type === 'out' ? new Date(attendance.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
          } : undefined
        };
      });

      return {
        employees: employeesWithAttendance,
        total: employees.total || employees.length
      };
    }
  });

  const getStatusBadge = (status?: 'present' | 'absent' | 'late' | 'leave') => {
    if (!status) return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        Not Recorded
      </span>
    );

    switch (status) {
      case 'present':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Present
          </span>
        );
      case 'absent':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Absent
          </span>
        );
      case 'late':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            Late
          </span>
        );
      case 'leave':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Leave
          </span>
        );
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium">Recent Employees</CardTitle>
          <Link href="/employees" className="text-sm text-primary hover:underline">
            Manage Employees
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">Employee</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">Department</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">Status Today</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">Clock In</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">Clock Out</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                // Skeletons for loading state
                Array(limit).fill(0).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <Skeleton className="w-8 h-8 rounded-full mr-3" />
                        <div>
                          <Skeleton className="h-4 w-24 mb-1" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="py-3 px-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <Skeleton className="h-8 w-8 rounded" />
                        <Skeleton className="h-8 w-8 rounded" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : data?.employees && data.employees.length > 0 ? (
                data.employees.map((item) => (
                  <tr key={item.employee.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full flex-shrink-0 bg-primary/10 flex items-center justify-center mr-3">
                          <User className="text-primary h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {formatEmployeeName(item.employee)}
                          </p>
                          <p className="text-xs text-muted-foreground">{item.employee.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm">
                        {item.employee.departmentId && departmentMap[item.employee.departmentId] || "Not assigned"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(item.attendance?.status)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm">{item.attendance?.clockIn || "--:--"}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm">{item.attendance?.clockOut || "--:--"}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/employees/${item.employee.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/employees/${item.employee.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    No employees found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {data && data.total > 0 && (
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-medium">{(page - 1) * limit + 1}-{Math.min(page * limit, data.total)}</span> of <span className="font-medium">{data.total}</span> employees
            </div>
            <div className="flex space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: Math.ceil(data.total / limit) }).slice(0, 3).map((_, i) => (
                <Button
                  key={i}
                  variant={page === i + 1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page * limit >= data.total}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
