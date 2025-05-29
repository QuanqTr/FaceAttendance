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
  employeeId: z.number({
    required_error: "Employee is required",
  }),
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
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: number; name: string } | null>(null);

  // Get list of employees for dropdown
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ["/api/employees"],
    queryFn: async () => {
      const res = await fetch("/api/employees");
      if (!res.ok) throw new Error("Failed to fetch employees");
      return res.json();
    }
  });

  // Form setup with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      startDate: new Date(),
      endDate: new Date(),
      type: "vacation",
      reason: "",
    },
  });

  // Mutation to create a leave request
  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await apiRequest("POST", "/api/manager/leave-requests", data);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Leave request submitted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/manager/leave-requests"] });

      navigate("/manager/leave-requests");
    },
    onError: (error: Error) => {
      i18nToast.error('common.error', 'leaveRequests.createError', { error: error.message });
    },
  });

  // Form submission handler
  const onSubmit = (data: FormValues) => {
    // Format dates to ISO string and keep only the date part
    const formattedData = {
      ...data,
      startDate: data.startDate instanceof Date ? data.startDate.toISOString().split('T')[0] : data.startDate,
      endDate: data.endDate instanceof Date ? data.endDate.toISOString().split('T')[0] : data.endDate,
    };

    // Use create mutation with the original data that has Date objects
    createMutation.mutate(data);
  };

  // Handle employee selection
  const handleEmployeeSelect = (employeeId: string) => {
    const id = parseInt(employeeId);
    const employee = employees.find((e: any) => e.id === id);
    if (employee) {
      form.setValue("employeeId", id);
      setSelectedEmployee({
        id: employee.id,
        name: `${employee.firstName} ${employee.lastName}`
      });
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
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('leaveRequests.employeeName')}</FormLabel>
                      <Select
                        disabled={employeesLoading || employees.length === 0}
                        onValueChange={handleEmployeeSelect}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('leaveRequests.selectEmployee')}>
                              {selectedEmployee?.name || t('leaveRequests.selectEmployee')}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employeesLoading ? (
                            <div className="flex items-center justify-center p-4">
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                          ) : employees.length === 0 ? (
                            <div className="p-2 text-center text-muted-foreground">
                              {t('leaveRequests.noEmployeesFound')}
                            </div>
                          ) : (
                            employees.map((employee: any) => (
                              <SelectItem
                                key={employee.id}
                                value={employee.id.toString()}
                              >
                                {employee.firstName} {employee.lastName}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
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
                  onClick={() => navigate("/manager/leave-requests")}
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