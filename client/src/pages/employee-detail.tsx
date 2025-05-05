import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AttendanceLog } from "@/components/attendance/attendance-log";
import { Calendar } from "@/components/ui/calendar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  ArrowLeft,
  Calendar as CalendarIcon,
  Edit2,
  Mail,
  Phone,
  Trash2,
  User
} from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Employee } from "@shared/schema";
import { FaceRegistration } from "@/components/face-recognition/face-registration";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function EmployeeDetail() {
  const [, params] = useRoute<{ id: string }>("/employees/:id");
  const { toast } = useToast();
  const [date, setDate] = useState<Date>(new Date());
  const employeeId = params?.id ? parseInt(params.id) : 0;

  const { data: employee, isLoading, refetch } = useQuery<Employee>({
    queryKey: [`/api/employees/${employeeId}`],
    queryFn: async () => {
      if (!employeeId) return null;
      const res = await fetch(`/api/employees/${employeeId}`);
      if (!res.ok) throw new Error("Failed to fetch employee details");
      return await res.json();
    },
    enabled: !!employeeId,
  });

  const { data: attendanceRecords } = useQuery({
    queryKey: [`/api/attendance/employee/${employeeId}`, format(date, 'yyyy-MM')],
    queryFn: async () => {
      if (!employeeId) return [];

      const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const res = await fetch(`/api/attendance/employee/${employeeId}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);
      if (!res.ok) throw new Error("Failed to fetch attendance records");

      return await res.json();
    },
    enabled: !!employeeId,
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/employees/${employeeId}`);
    },
    onSuccess: () => {
      toast({
        title: "Employee Deleted",
        description: "The employee has been successfully deleted.",
      });
      window.location.href = "/employees";
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete employee: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header title="Employee Details" />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0 px-4 md:px-6 py-4">
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header title="Employee Details" />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0 px-4 md:px-6 py-4">
          <div className="flex flex-col items-center justify-center h-full">
            <AlertCircle className="h-16 w-16 text-destructive mb-4" />
            <h3 className="text-xl font-medium mb-2">Employee Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The employee you're looking for doesn't exist or has been removed.
            </p>
            <Link href="/employees">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Employees
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'on_leave':
        return <Badge className="bg-amber-500 hover:bg-amber-600">On Leave</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Employee Details" />

      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 px-4 md:px-6 py-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div className="flex items-center">
            <Link href="/employees">
              <Button variant="ghost" className="mr-2 p-0 h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Employee Profile</h1>
          </div>

          <div className="flex items-center mt-4 md:mt-0 space-x-2">
            <Link href={`/employees/${employeeId}/edit`}>
              <Button variant="outline">
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the employee
                    record and all associated attendance data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => deleteEmployeeMutation.mutate()}
                  >
                    {deleteEmployeeMutation.isPending ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                    {getInitials(employee.firstName, employee.lastName)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardTitle className="text-xl">
                {employee.firstName} {employee.lastName}
              </CardTitle>
              <CardDescription>{employee.position || 'No position specified'}</CardDescription>
              <div className="mt-2">{getStatusBadge(employee.status)}</div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Employee ID</Label>
                  <p className="font-medium">{employee.employeeId}</p>
                </div>

                <Separator />

                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Email</Label>
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                    <p className="font-medium">{employee.email}</p>
                  </div>
                </div>

                {employee.phone && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <Label className="text-sm text-muted-foreground">Phone</Label>
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                        <p className="font-medium">{employee.phone}</p>
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Department</Label>
                  <p className="font-medium">{employee.departmentId}</p>
                </div>

                <Separator />

                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Join Date</Label>
                  <p className="font-medium">
                    {employee.joinDate ?
                      format(
                        typeof employee.joinDate === 'string' ?
                          new Date(employee.joinDate) :
                          employee.joinDate,
                        'PPP'
                      ) :
                      'Not specified'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <Tabs defaultValue="attendance" className="space-y-4">
              <TabsList>
                <TabsTrigger value="attendance">Attendance History</TabsTrigger>
                <TabsTrigger value="profile">Face Profile</TabsTrigger>
              </TabsList>

              <TabsContent value="attendance">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                      <div>
                        <CardTitle>Attendance Records</CardTitle>
                        <CardDescription>
                          View detailed attendance history
                        </CardDescription>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="mt-2 sm:mt-0">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(date, 'MMMM yyyy')}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={(date) => date && setDate(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {attendanceRecords && attendanceRecords.length > 0 ? (
                      <AttendanceLog
                        records={attendanceRecords.map((record: any) => ({
                          id: record.id,
                          employeeId: employee.id,
                          employeeName: `${employee.firstName} ${employee.lastName}`,
                          departmentName: "Department Name", // This would come from a real API
                          date: format(new Date(record.date), 'yyyy-MM-dd'),
                          timeIn: record.type === 'in' ? format(new Date(record.time), 'HH:mm') : undefined,
                          timeOut: record.type === 'out' ? format(new Date(record.time), 'HH:mm') : undefined,
                          status: record.status,
                        }))}
                        isLoading={false}
                        date={date}
                        showSearch={false}
                      />
                    ) : (
                      <div className="text-center py-8">
                        <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Attendance Records</h3>
                        <p className="text-muted-foreground">
                          No attendance records found for this month.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="profile">
                <Card>
                  <CardHeader>
                    <CardTitle>Face Recognition Profile</CardTitle>
                    <CardDescription>
                      Manage employee's face recognition data
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center">
                    <div className="relative w-64 h-64 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center mb-6">
                      {employee.faceDescriptor ? (
                        <div className="text-center">
                          <User className="h-16 w-16 text-primary mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Face data is registered</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <User className="h-16 w-16 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No face data registered</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 w-full max-w-md">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button className="w-full" disabled={isLoading}>
                            {employee.faceDescriptor ? "Update Face Data" : "Register Face Data"}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Face Registration</DialogTitle>
                          </DialogHeader>
                          <FaceRegistration
                            employeeId={employee.id}
                            onComplete={() => refetch()}
                          />
                        </DialogContent>
                      </Dialog>

                      {employee.faceDescriptor && (
                        <Button
                          variant="destructive"
                          className="w-full"
                          onClick={async () => {
                            if (confirm("Are you sure you want to reset this employee's face data? This action cannot be undone.")) {
                              try {
                                // Delete face data using the simplified endpoint
                                const res = await fetch(`/api/employees/${employee.id}/face-data`, {
                                  method: 'DELETE',
                                  headers: { 'Content-Type': 'application/json' }
                                });

                                if (!res.ok) {
                                  throw new Error("Failed to reset face data");
                                }

                                toast({
                                  title: "Face Data Reset",
                                  description: "Employee's face data has been reset successfully.",
                                });

                                refetch();
                              } catch (error) {
                                console.error("Error resetting face data:", error);
                                toast({
                                  title: "Error",
                                  description: "Failed to reset face data. Please try again.",
                                  variant: "destructive"
                                });
                              }
                            }
                          }}
                        >
                          Reset Face Data
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
