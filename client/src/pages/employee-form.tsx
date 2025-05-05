import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { format } from "date-fns";
import { insertEmployeeSchema } from "@shared/schema";

// Extend the schema with additional validation
const employeeFormSchema = insertEmployeeSchema.extend({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  employeeId: z.string().min(1, "Employee ID is required"),
  departmentId: z.number().min(1, "Department is required"),
  position: z.string().optional(),
  phone: z.string().optional(),
  joinDate: z.string(),
  status: z.enum(["active", "inactive", "on_leave"]).default("active"),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

// Robust date parsing function to handle various date formats
function parseJoinDate(dateValue: any): string {
  if (!dateValue) return new Date().toISOString().split('T')[0]; // Default to today

  try {
    let date;

    if (typeof dateValue === 'string') {
      // Try different parsing approaches based on the format
      if (dateValue.includes('T')) {
        // ISO format with time: 2025-05-05T00:00:00.000Z
        date = new Date(dateValue);
      } else {
        // Simple date format: 2025-05-05
        const parts = dateValue.split('-');
        if (parts.length === 3) {
          // Create date with proper parts interpretation
          date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else {
          date = new Date(dateValue);
        }
      }
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else {
      date = new Date(dateValue);
    }

    // Validate that we have a valid date
    if (isNaN(date.getTime())) {
      console.error("Invalid date detected, using today:", dateValue);
      date = new Date();
    }

    // Format as YYYY-MM-DD for HTML date input
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;

  } catch (error) {
    console.error("Error parsing date, using today:", error, dateValue);
    return new Date().toISOString().split('T')[0]; // Fallback to today
  }
}

// Function to check session validity before submitting
async function checkSession(): Promise<boolean> {
  try {
    const response = await fetch('/api/user', {
      credentials: 'include'
    });

    if (response.status === 401) {
      console.log("Session expired (401 unauthorized)");
      return false;
    }

    return response.ok;
  } catch (error) {
    console.error("Error checking session:", error);
    return false;
  }
}

export default function EmployeeForm() {
  const [, params] = useRoute<{ id: string }>("/employees/:id/edit");
  const [isEditMode, setIsEditMode] = useState(false);
  const { toast } = useToast();

  const employeeId = params?.id ? parseInt(params.id) : null;

  // Get departments for dropdown - hardcoded for now due to API issues
  const departments = [
    { id: 1, name: 'DS', description: 'Phòng Design' },
    { id: 2, name: 'HR', description: 'Phòng Nhân sự' }
  ];
  const isLoadingDepartments = false;
  const departmentsError = null;

  // Get employee data if in edit mode
  const { data: employee, isLoading: isLoadingEmployee } = useQuery({
    queryKey: [`/api/employees/${employeeId}`],
    queryFn: async () => {
      if (!employeeId) return null;
      const res = await fetch(`/api/employees/${employeeId}`);
      if (!res.ok) throw new Error("Failed to fetch employee details");
      return await res.json();
    },
    enabled: !!employeeId,
  });

  // Initialize form
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      employeeId: "",
      departmentId: undefined,
      position: "",
      phone: "",
      joinDate: new Date().toISOString().split('T')[0],
      status: "active",
    }
  });

  // Update form when employee data is loaded
  useEffect(() => {
    if (employee) {
      console.log("Employee data loaded:", employee);
      setIsEditMode(true);

      // Format join date for the form field as YYYY-MM-DD (format required for HTML date input)
      let formattedJoinDate = '';

      if (employee.joinDate) {
        try {
          // Convert any date format to YYYY-MM-DD
          const date = new Date(employee.joinDate);
          if (!isNaN(date.getTime())) {
            // Valid date - format as YYYY-MM-DD
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            formattedJoinDate = `${year}-${month}-${day}`;
          } else if (typeof employee.joinDate === 'string') {
            // Try parsing from string directly
            if (employee.joinDate.includes('T')) {
              // ISO format with time
              formattedJoinDate = employee.joinDate.split('T')[0];
            } else {
              // Simple date string - try to parse
              const parts = employee.joinDate.split(/[-\/]/);
              if (parts.length === 3) {
                // Check format (YYYY-MM-DD or MM/DD/YYYY)
                if (parts[0].length === 4) {
                  // YYYY-MM-DD
                  formattedJoinDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                } else {
                  // MM/DD/YYYY or similar
                  formattedJoinDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
                }
              }
            }
          }
        } catch (error) {
          console.error("Error formatting join date:", error);
        }
      }

      // Fallback to today if we couldn't parse the date
      if (!formattedJoinDate) {
        formattedJoinDate = new Date().toISOString().split('T')[0];
        console.log("Using fallback date:", formattedJoinDate);
      }

      console.log("Final formatted join date for form:", formattedJoinDate);

      // Ensure departmentId is a number
      const departmentId = employee.departmentId ? Number(employee.departmentId) : undefined;
      console.log("Department ID:", departmentId);

      // Reset form with employee data
      form.reset({
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        employeeId: employee.employeeId,
        departmentId: departmentId,
        position: employee.position || "",
        phone: employee.phone || "",
        joinDate: formattedJoinDate,
        status: employee.status,
      });

      // Force update the specific fields that might not be updated correctly
      if (departmentId !== undefined) {
        form.setValue('departmentId', departmentId);
      }
      form.setValue('joinDate', formattedJoinDate);
      console.log("Form has been set with join date:", formattedJoinDate);
    }
  }, [employee, form]);

  // Create employee mutation
  const createMutation = useMutation({
    mutationFn: async (data: EmployeeFormValues) => {
      const res = await apiRequest("POST", "/api/employees", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Employee Created",
        description: "The employee has been successfully created.",
      });
      window.location.href = "/employees";
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create employee: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update employee mutation
  const updateMutation = useMutation({
    mutationFn: async (data: EmployeeFormValues) => {
      try {
        // Nhận date string từ date input, định dạng value là YYYY-MM-DD khi lấy từ e.target.value
        // bất kể định dạng hiển thị là MM/DD/YYYY hay bất kỳ định dạng nào khác
        // Dữ liệu từ form luôn là YYYY-MM-DD

        console.log("Sending data with join date:", data.joinDate);

        const apiData = {
          ...data,
          // Giữ nguyên định dạng YYYY-MM-DD cho API
          joinDate: data.joinDate ? data.joinDate : null
        };

        console.log("Final API data:", apiData);

        const res = await apiRequest("PUT", `/api/employees/${employeeId}`, apiData);
        return await res.json();
      } catch (error) {
        console.error("Error in update mutation:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Employee Updated",
        description: "The employee has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/employees/${employeeId}`] });
      // Use window.location.replace to avoid adding to history stack
      window.location.replace(`/employees/${employeeId}`);
    },
    onError: (error) => {
      console.error("Update mutation error:", error);

      // If session expired, redirect to login
      if (error instanceof Error &&
        (error.message.includes("401") ||
          error.message.toLowerCase().includes("unauthorized"))) {
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please login again.",
          variant: "destructive",
        });
        // Use history replace to avoid adding to history stack
        setTimeout(() => window.location.replace("/auth"), 1500);
      } else {
        toast({
          title: "Error",
          description: `Failed to update employee: ${error.message}`,
          variant: "destructive",
        });
      }
    },
  });

  const onSubmit = async (data: EmployeeFormValues) => {
    console.log("Form submitted with data:", data);
    console.log("Join date value from form:", data.joinDate);
    console.log("Join date type:", typeof data.joinDate);

    // Kiểm tra và đảm bảo departmentId luôn là số
    if (!data.departmentId) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn phòng ban",
        variant: "destructive",
      });
      return;
    }

    // Kiểm tra định dạng của ngày tháng
    if (data.joinDate && typeof data.joinDate === 'string') {
      console.log("Join date format check - raw value:", data.joinDate);

      // Kiểm tra xem có đúng định dạng YYYY-MM-DD không
      const isValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(data.joinDate);
      if (!isValidFormat) {
        console.error("Join date is not in YYYY-MM-DD format:", data.joinDate);
        toast({
          title: "Lỗi định dạng ngày",
          description: "Ngày phải có định dạng YYYY-MM-DD",
          variant: "destructive",
        });
        return;
      }
    }

    if (isEditMode) {
      // Check session before proceeding
      const isSessionValid = await checkSession();
      if (!isSessionValid) {
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please login again.",
          variant: "destructive",
        });
        setTimeout(() => window.location.replace("/auth"), 1500);
        return;
      }

      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  if (isEditMode && isLoadingEmployee) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header title={isEditMode ? "Edit Employee" : "Add Employee"} />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0 px-4 md:px-6 py-4">
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title={isEditMode ? "Edit Employee" : "Add Employee"} />

      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 px-4 md:px-6 py-4">
        <div className="flex items-center mb-6">
          <Link href={isEditMode ? `/employees/${employeeId}` : "/employees"}>
            <Button variant="ghost" className="mr-2 p-0 h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">
            {isEditMode ? "Edit Employee" : "Add New Employee"}
          </h1>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Enter the employee's basic information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter first name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter last name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter phone number (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Employment Details</CardTitle>
                <CardDescription>
                  Enter employment and department information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="employeeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employee ID</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter employee ID" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="departmentId"
                    render={({ field }) => {
                      console.log("Department field value:", field.value);
                      return (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              console.log("Selected department value:", value);
                              field.onChange(parseInt(value));
                            }}
                            defaultValue={field.value?.toString()}
                            value={field.value?.toString() || ""}
                            disabled={isLoadingDepartments}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={isLoadingDepartments ? "Loading departments..." : "Select a department"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingDepartments ? (
                                <div className="p-2 text-center">Loading departments...</div>
                              ) : departments && departments.length > 0 ? (
                                departments.map((dept: any) => (
                                  <SelectItem key={dept.id} value={dept.id.toString()}>
                                    {dept.name} - {dept.description || "No description"}
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="p-2 text-center">No departments available</div>
                              )}
                            </SelectContent>
                          </Select>
                          {departmentsError && (
                            <div className="text-sm text-red-500 mt-1">
                              Error loading departments. Please try again.
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Position</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter position (optional)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="joinDate"
                    render={({ field }) => {
                      console.log("Join date field value:", field.value);
                      return (
                        <FormItem>
                          <FormLabel>Join Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => {
                                // HTML date input trả về chuỗi theo định dạng YYYY-MM-DD dù hiển thị MM/DD/YYYY
                                console.log("Selected date (raw value):", e.target.value);
                                field.onChange(e.target.value);
                              }}
                            />
                          </FormControl>
                          <FormDescription className="text-xs mt-1">
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )
                    }}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="on_leave">On Leave</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.history.back()}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <span className="flex items-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEditMode ? "Updating..." : "Creating..."}
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Save className="mr-2 h-4 w-4" />
                      {isEditMode ? "Update Employee" : "Create Employee"}
                    </span>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </Form>
      </main>
    </div>
  );
}
