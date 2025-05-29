import { useState } from "react";
import { useLocation, useParams, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Calendar, Save } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useI18nToast } from "@/hooks/use-i18n-toast";
import { leaveRequestTypeEnum } from "@shared/schema";

// Form schema for leave request
const formSchema = z.object({
  employeeIds: z.array(z.number()).min(1, "Chọn ít nhất 1 nhân viên"),
  startDate: z.date({
    required_error: "Start date is required",
  }),
  endDate: z.date({
    required_error: "End date is required",
  }).refine(date => date instanceof Date, {
    message: "End date is required"
  }),
  type: z.enum(["sick", "vacation", "personal", "other"], {
    required_error: "Leave type is required",
  }),
  reason: z.string().optional(),
}).refine(data => {
  return data.endDate >= data.startDate
}, {
  message: "End date must be after start date",
  path: ["endDate"]
});

// Extract the expected type from the form schema
type FormValues = z.infer<typeof formSchema>;

export default function LeaveRequestForm() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const i18nToast = useI18nToast();
  const [selectedEmployee, setSelectedEmployee] = useState<{
    id: number;
    name: string;
    departmentId?: number;
    departmentName?: string;
    departmentDescription?: string;
  } | null>(null);
  const [isLoadingEmployeeDetails, setIsLoadingEmployeeDetails] = useState(false);

  // Get list of employees for dropdown
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ["/api/employees"],
    queryFn: async () => {
      const res = await fetch("/api/employees");
      if (!res.ok) throw new Error("Failed to fetch employees");
      const employeesList = await res.json();

      // Fetch all departments to have names ready
      try {
        const deptRes = await fetch("/api/departments");
        if (deptRes.ok) {
          const departments = await deptRes.json();

          // Đảm bảo employees luôn là mảng
          let arr = [];
          if (employeesList && typeof employeesList === 'object') {
            if (Array.isArray(employeesList.employees)) arr = employeesList.employees;
            else if (Array.isArray(employeesList.items)) arr = employeesList.items;
            else if (Array.isArray(employeesList)) arr = employeesList;
          }

          return arr.map((emp: any) => {
            if (emp.departmentId) {
              const dept = departments.find((d: any) => d.id === emp.departmentId);
              if (dept) {
                return {
                  ...emp,
                  departmentName: dept.name,
                  departmentDescription: dept.description
                };
              }
            }
            return emp;
          });
        }
      } catch (error) {
        console.error("Error fetching departments:", error);
      }

      // Fallback: đảm bảo luôn trả về mảng
      if (employeesList && typeof employeesList === 'object') {
        if (Array.isArray(employeesList.employees)) return employeesList.employees;
        if (Array.isArray(employeesList.items)) return employeesList.items;
        if (Array.isArray(employeesList)) return employeesList;
      }
      return [];
    }
  });

  // Form setup with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employeeIds: [],
      startDate: new Date(),
      endDate: new Date(),
      type: "vacation",
      reason: "",
    },
  });

  // Mutation to create a leave request
  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const results = [];
      for (const empId of data.employeeIds) {
        const formattedData = {
          ...data,
          employeeId: empId,
          startDate: data.startDate instanceof Date ? data.startDate.toISOString().split('T')[0] : data.startDate,
          endDate: data.endDate instanceof Date ? data.endDate.toISOString().split('T')[0] : data.endDate,
        };
        // Xóa employeeIds nếu có
        if ('employeeIds' in formattedData) {
          delete (formattedData as any).employeeIds;
        }
        try {
          const res = await apiRequest("POST", "/api/leave-requests", formattedData);
          let responseData: any = null;
          let isJson = true;
          try {
            responseData = await res.clone().json();
          } catch {
            isJson = false;
          }
          if (res.ok) {
            results.push({
              empId,
              success: true,
              data: responseData,
              employeeName: employees.find((e: any) => e.id === empId)?.firstName + ' ' +
                employees.find((e: any) => e.id === empId)?.lastName
            });
          } else {
            results.push({
              empId,
              success: false,
              error: isJson && responseData && responseData.message ? responseData.message : 'Unknown error',
              employeeName: employees.find((e: any) => e.id === empId)?.firstName + ' ' +
                employees.find((e: any) => e.id === empId)?.lastName
            });
          }
        } catch (error: any) {
          results.push({
            empId,
            success: false,
            error: error.message || 'Unknown error',
            employeeName: employees.find((e: any) => e.id === empId)?.firstName + ' ' +
              employees.find((e: any) => e.id === empId)?.lastName
          });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      const successResults = results.filter((r: any) => r.success);
      const failResults = results.filter((r: any) => !r.success);

      if (successResults.length > 0) {
        const successMessage = successResults.length === 1
          ? `Tạo thành công đơn nghỉ phép cho ${successResults[0].employeeName}`
          : `Tạo thành công ${successResults.length} đơn nghỉ phép`;
        i18nToast.success('common.success', successMessage);
      }

      if (failResults.length > 0) {
        const errorDetails = failResults.map((r: any) =>
          `${r.employeeName}: ${r.error}`
        ).join('\n');
        i18nToast.error('common.error', `Có ${failResults.length} đơn nghỉ phép bị lỗi:\n${errorDetails}`);
      }

      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      navigate("/leave-requests");
    },
    onError: (error: Error) => {
      i18nToast.error('common.error', 'leaveRequests.createError', { error: error.message });
    },
  });

  // Form submission handler
  const onSubmit = (data: FormValues) => {
    createMutation.mutate(data);
  };

  // Handle employee selection
  const handleEmployeeSelect = async (employeeId: string) => {
    const id = parseInt(employeeId);
    const employee = employees.find((e: any) => e.id === id);
    if (employee) {
      form.setValue("employeeIds", [id]);

      // Set initial data from the list
      setSelectedEmployee({
        id: employee.id,
        name: `${employee.firstName} ${employee.lastName}`,
        departmentId: employee.departmentId
      });

      // Fetch detailed employee information
      try {
        setIsLoadingEmployeeDetails(true);
        const response = await fetch(`/api/employees/${id}`);
        if (response.ok) {
          const employeeDetails = await response.json();

          // Update with department details if available
          let departmentName = "";
          let departmentDescription = "";
          if (employeeDetails.departmentId) {
            try {
              const deptResponse = await fetch(`/api/departments/${employeeDetails.departmentId}`);
              if (deptResponse.ok) {
                const deptDetails = await deptResponse.json();
                departmentName = deptDetails.name;
                departmentDescription = deptDetails.description || "";
              }
            } catch (error) {
              console.error("Error fetching department details:", error);
            }
          }

          setSelectedEmployee({
            id: employeeDetails.id,
            name: `${employeeDetails.firstName} ${employeeDetails.lastName}`,
            departmentId: employeeDetails.departmentId,
            departmentName: departmentName,
            departmentDescription: departmentDescription
          });
        }
      } catch (error) {
        console.error("Error fetching employee details:", error);
      } finally {
        setIsLoadingEmployeeDetails(false);
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title={t('leaveRequests.newRequest')} />

      <div className="p-4 flex-1 overflow-auto">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>{t('leaveRequests.newRequest')}</CardTitle>
            <CardDescription>
              {t('leaveRequests.newRequestDescription')}
            </CardDescription>
          </CardHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                {/* Employee selection */}
                <FormField
                  control={form.control}
                  name="employeeIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('leaveRequests.employeeName')}</FormLabel>
                      <div className="border rounded-md p-2 max-h-60 overflow-y-auto bg-background">
                        {employeesLoading ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : !Array.isArray(employees) || employees.length === 0 ? (
                          <div className="p-2 text-center text-muted-foreground">
                            {t('leaveRequests.noEmployeesFound')}
                          </div>
                        ) : (
                          employees.map((employee: any) => (
                            <label key={employee.id} className="flex items-center gap-2 py-1 cursor-pointer">
                              <input
                                type="checkbox"
                                value={employee.id}
                                checked={field.value.includes(employee.id)}
                                onChange={e => {
                                  if (e.target.checked) {
                                    field.onChange([...field.value, employee.id]);
                                    // Update selected employee name
                                    setSelectedEmployee({
                                      id: employee.id,
                                      name: `${employee.firstName} ${employee.lastName}`,
                                      departmentId: employee.departmentId,
                                      departmentName: employee.departmentName,
                                      departmentDescription: employee.departmentDescription
                                    });
                                  } else {
                                    field.onChange(field.value.filter((id: number) => id !== employee.id));
                                    // Clear selected employee if unchecked
                                    if (field.value.length === 1 && field.value.includes(employee.id)) {
                                      setSelectedEmployee(null);
                                    }
                                  }
                                }}
                              />
                              <span>{employee.firstName} {employee.lastName}</span>
                              {employee.departmentId && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  {t('employees.department')}: {employee.departmentName || ''}
                                  {employee.departmentDescription && ` - ${employee.departmentDescription}`}
                                </span>
                              )}
                            </label>
                          ))
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Date range fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>{t('leaveRequests.startDate')}</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>{t('leaveRequests.selectDate')}</span>
                                )}
                                <Calendar className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < new Date(new Date().setHours(0, 0, 0, 0))
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>{t('leaveRequests.endDate')}</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>{t('leaveRequests.selectDate')}</span>
                                )}
                                <Calendar className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < new Date(new Date().setHours(0, 0, 0, 0))
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Leave type selection */}
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('leaveRequests.leaveType')}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('leaveRequests.selectLeaveType')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sick">{t('leaveRequests.sick')}</SelectItem>
                          <SelectItem value="vacation">{t('leaveRequests.vacation')}</SelectItem>
                          <SelectItem value="personal">{t('leaveRequests.personal')}</SelectItem>
                          <SelectItem value="other">{t('leaveRequests.other')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Reason field */}
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('leaveRequests.reasonOptional')}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t('leaveRequests.reasonPlaceholder')}
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {t('leaveRequests.reasonDescription')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>

              <CardFooter className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/leave-requests")}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="gap-2"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {t('common.save')}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}