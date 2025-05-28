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
import { useTranslation } from "react-i18next";
import { useI18nToast } from "@/hooks/use-i18n-toast";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { format } from "date-fns";
import { insertEmployeeSchema } from "@shared/schema";

// Extend the schema with additional validation
const createEmployeeFormSchema = (t: any) => insertEmployeeSchema.extend({
  firstName: z.string().min(1, { message: t('employees.firstNameRequired') })
    .refine(val => /^[A-Za-zÀ-ỹ\s]+$/.test(val), {
      message: t('employees.nameNoNumbersSpecialChars')
    }),
  lastName: z.string().min(1, { message: t('employees.lastNameRequired') })
    .refine(val => /^[A-Za-zÀ-ỹ\s]+$/.test(val), {
      message: t('employees.nameNoNumbersSpecialChars')
    }),
  email: z.string().email({ message: t('employees.invalidEmail') }),
  employeeId: z.string().min(1, { message: t('employees.employeeIdRequired') }),
  departmentId: z.number().min(1, { message: t('employees.departmentRequired') }),
  position: z.string().min(1, { message: t('employees.positionRequired') })
    .refine(val => !val || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(val), {
      message: t('employees.positionNoSpecialChars')
    }),
  phone: z.string().optional()
    .refine(val => !val || /^\d+$/.test(val), {
      message: t('employees.phoneNumbersOnly')
    }),
  joinDate: z.string(),
  status: z.enum(["active", "inactive", "on_leave"]).default("active"),
});

type EmployeeFormValues = z.infer<ReturnType<typeof createEmployeeFormSchema>>;

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

// Function to generate employee ID based on E0xx format
function generateEmployeeId(): string {
  // Get all existing employees to find the next available ID
  const nextId = Math.floor(Math.random() * 99) + 1; // For demo purposes using random number between 1-99

  // Format: E0xx where xx is padded with leading zeros
  return `E${nextId.toString().padStart(3, '0')}`;
}

export default function EmployeeForm() {
  const [, params] = useRoute<{ id: string }>("/employees/:id/edit");
  const [isEditMode, setIsEditMode] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const i18nToast = useI18nToast();

  const employeeId = params?.id ? parseInt(params.id) : null;

  // Get departments for dropdown 
  const { data: departments = [], isLoading: isLoadingDepartments, error: departmentsError } = useQuery({
    queryKey: ["/api/departments"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/departments");
      if (!res.ok) throw new Error("Failed to fetch departments");
      return res.data || [];
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

  const employeeFormSchema = createEmployeeFormSchema(t);

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
    } else {
      // This is create mode - generate employee ID
      form.setValue('employeeId', generateEmployeeId());
    }
  }, [employee, form]);

  // Create employee mutation
  const createMutation = useMutation({
    mutationFn: async (data: EmployeeFormValues) => {
      const res = await apiRequest("POST", "/api/employees", data);
      return await res.json();
    },
    onSuccess: () => {
      i18nToast.success('employees.createSuccess', 'employees.createSuccessMessage');
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      window.location.href = "/employees";
    },
    onError: (error) => {
      i18nToast.error('common.error', 'employees.createError', { error: error.message });
    },
  });

  // Update employee mutation
  const updateMutation = useMutation({
    mutationFn: async (data: EmployeeFormValues) => {
      const res = await apiRequest("PUT", `/api/employees/${employeeId}`, data);
      return await res.json();
    },
    onSuccess: () => {
      i18nToast.success('employees.updateSuccess', 'employees.updateSuccessMessage');
      queryClient.invalidateQueries({ queryKey: [`/api/employees/${employeeId}`] });
      window.location.href = "/employees";
    },
    onError: (error) => {
      i18nToast.error('common.error', 'employees.updateError', { error: error.message });
    },
  });

  const onSubmit = async (data: EmployeeFormValues) => {
    console.log("Form submitted with data:", data);

    const sessionValid = await checkSession();
    if (!sessionValid) {
      i18nToast.error('employees.sessionExpired', 'employees.sessionExpiredMessage');
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
      return;
    }

    // Format date as YYYY-MM-DD string
    const formattedData = {
      ...data,
      joinDate: parseJoinDate(data.joinDate),
    };
    console.log("Formatted data:", formattedData);

    if (isEditMode && employeeId) {
      updateMutation.mutate(formattedData);
    } else {
      createMutation.mutate(formattedData);
    }
  };

  if (isEditMode && isLoadingEmployee) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header title={t('employees.editEmployee')} />
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
      <Header title='Chỉnh sửa thông tin' />

      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 px-4 md:px-6 py-4">
        <div className="flex items-center mb-6">
          <Link href="/employees" className="mr-4">
            <Button variant="ghost" className="h-8 w-8 p-0" aria-label={t('common.back')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Chỉnh sửa thông tin cá nhân</h1>
        </div>

        <div className="mx-auto max-w-4xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>{t('employees.personalInfo')}</CardTitle>
                  <CardDescription>{t('employees.personalInfoDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('employees.firstName')}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('employees.enterFirstName')} {...field} />
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
                          <FormLabel>{t('employees.lastName')}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('employees.enterLastName')} {...field} />
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
                        <FormLabel>{t('employees.email')}</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder={t('employees.enterEmail')} {...field} />
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
                        <FormLabel>{t('employees.phone')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('employees.enterPhone')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('employees.employmentInfo')}</CardTitle>
                  <CardDescription>{t('employees.employmentInfoDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Employee ID is hidden from interface but still part of the form data */}
                  <input type="hidden" {...form.register('employeeId')} />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="position"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('employees.position')}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('employees.enterPosition')} {...field} />
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
                          <FormLabel>{t('employees.department')}</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            value={field.value?.toString()}
                            disabled={isLoadingDepartments}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('employees.selectDepartment')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingDepartments ? (
                                <div className="flex items-center justify-center p-2">
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  <span>{t('employees.loadingDepartments')}</span>
                                </div>
                              ) : departmentsError ? (
                                <div className="text-center p-2 text-destructive">
                                  {t('employees.departmentsError')}
                                </div>
                              ) : departments.length === 0 ? (
                                <div className="text-center p-2">
                                  {t('employees.noDepartments')}
                                </div>
                              ) : (
                                departments.map((department) => (
                                  <SelectItem key={department.id} value={department.id.toString()}>
                                    {department.name} - {department.description || t('employees.noDescription')}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="joinDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('employees.joinDate')}</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('employees.status')}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('employees.selectStatus')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="active">{t('employees.active')}</SelectItem>
                              <SelectItem value="inactive">{t('employees.inactive')}</SelectItem>
                              <SelectItem value="on_leave">{t('employees.onLeave')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.location.href = "/employees"}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={isEditMode ? updateMutation.isPending : createMutation.isPending}
                  >
                    {isEditMode ? (
                      updateMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('employees.updating')}
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          {t('employees.updateEmployee')}
                        </>
                      )
                    ) : (
                      createMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('employees.creating')}
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          {t('employees.createEmployee')}
                        </>
                      )
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}
