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
  joinDate: z.string().default(() => format(new Date(), 'yyyy-MM-dd')),
  status: z.enum(["active", "inactive", "on_leave"]).default("active"),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

export default function EmployeeForm() {
  const [, params] = useRoute<{ id: string }>("/employees/:id/edit");
  const [isEditMode, setIsEditMode] = useState(false);
  const { toast } = useToast();
  
  const employeeId = params?.id ? parseInt(params.id) : null;

  // Get departments for dropdown
  const { data: departments } = useQuery({
    queryKey: ["/api/departments"],
    queryFn: async () => {
      const res = await fetch("/api/departments");
      if (!res.ok) throw new Error("Failed to fetch departments");
      return await res.json();
    }
  });

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
      joinDate: format(new Date(), 'yyyy-MM-dd'),
      status: "active",
    }
  });

  // Update form when employee data is loaded
  useEffect(() => {
    if (employee) {
      setIsEditMode(true);
      form.reset({
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        employeeId: employee.employeeId,
        departmentId: employee.departmentId,
        position: employee.position || "",
        phone: employee.phone || "",
        joinDate: format(new Date(employee.joinDate), 'yyyy-MM-dd'),
        status: employee.status,
      });
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
      const res = await apiRequest("PUT", `/api/employees/${employeeId}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Employee Updated",
        description: "The employee has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/employees/${employeeId}`] });
      window.location.href = `/employees/${employeeId}`;
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update employee: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EmployeeFormValues) => {
    if (isEditMode) {
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
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          defaultValue={field.value?.toString()}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a department" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {departments?.map((dept: any) => (
                              <SelectItem key={dept.id} value={dept.id.toString()}>
                                {dept.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
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
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Join Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
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
