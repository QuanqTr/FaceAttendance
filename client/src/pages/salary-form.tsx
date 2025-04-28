import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Save, DollarSign } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertSalaryRecordSchema } from "@shared/schema";

// Form schema for salary record
const formSchema = z.object({
  employeeId: z.number({
    required_error: "Employee is required",
  }),
  month: z.number({
    required_error: "Month is required",
  }),
  year: z.number({
    required_error: "Year is required",
  }),
  basicSalary: z.string().refine(val => !isNaN(parseFloat(val)), {
    message: "Basic salary must be a number",
  }),
  allowance: z.string().refine(val => !isNaN(parseFloat(val)), {
    message: "Allowance must be a number",
  }),
  overtime: z.string().refine(val => !isNaN(parseFloat(val)), {
    message: "Overtime must be a number",
  }),
  bonus: z.string().refine(val => !isNaN(parseFloat(val)), {
    message: "Bonus must be a number",
  }),
  deduction: z.string().refine(val => !isNaN(parseFloat(val)), {
    message: "Deduction must be a number",
  }),
  taxAmount: z.string().refine(val => !isNaN(parseFloat(val)), {
    message: "Tax amount must be a number",
  }),
  paymentStatus: z.boolean().default(false),
  paymentDate: z.date().optional(),
  notes: z.string().optional(),
});

// Extract the expected type from the form schema
type FormValues = z.infer<typeof formSchema>;

export default function SalaryForm() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedEmployee, setSelectedEmployee] = useState<{id: number; name: string} | null>(null);

  // Get list of employees for dropdown
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ["/api/employees"],
    queryFn: async () => {
      const res = await fetch("/api/employees");
      if (!res.ok) throw new Error("Failed to fetch employees");
      return res.json();
    }
  });

  // Create year options
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => (currentYear - 5 + i));
  
  // Month options
  const monthOptions = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  // Form setup with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      month: new Date().getMonth() + 1, // Current month (1-12)
      year: currentYear,
      basicSalary: "0",
      allowance: "0",
      overtime: "0",
      bonus: "0",
      deduction: "0",
      taxAmount: "0",
      paymentStatus: false,
      notes: "",
    },
  });

  // Calculate total salary based on form values
  const calculateTotalSalary = () => {
    const values = form.getValues();
    const basicSalary = parseFloat(values.basicSalary) || 0;
    const allowance = parseFloat(values.allowance) || 0;
    const overtime = parseFloat(values.overtime) || 0;
    const bonus = parseFloat(values.bonus) || 0;
    const deduction = parseFloat(values.deduction) || 0;
    const taxAmount = parseFloat(values.taxAmount) || 0;
    
    return (basicSalary + allowance + overtime + bonus) - (deduction + taxAmount);
  };

  // Mutation to create a salary record
  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      // Calculate total salary
      const totalSalary = calculateTotalSalary();
      
      // Convert string values to numbers
      const formattedData = {
        ...data,
        basicSalary: parseFloat(data.basicSalary),
        allowance: parseFloat(data.allowance),
        overtime: parseFloat(data.overtime),
        bonus: parseFloat(data.bonus),
        deduction: parseFloat(data.deduction),
        taxAmount: parseFloat(data.taxAmount),
        totalSalary,
      };
      
      const response = await apiRequest("POST", "/api/salary-records", formattedData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Salary record created successfully",
      });
      // Invalidate the queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/salary-records"] });
      // Navigate back to the salary page
      navigate("/salary");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create salary record",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (data: FormValues) => {
    createMutation.mutate(data);
  };

  // Handle employee selection
  const handleEmployeeSelect = (employeeId: string) => {
    const id = parseInt(employeeId);
    const employee = employees.find(e => e.id === id);
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
      <Header title="Create Salary Record" />

      <div className="p-4 flex-1 overflow-auto">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>New Salary Record</CardTitle>
            <CardDescription>
              Create a new salary record for an employee.
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
                      <FormLabel>Employee</FormLabel>
                      <Select
                        disabled={employeesLoading || employees.length === 0}
                        onValueChange={handleEmployeeSelect}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an employee">
                              {selectedEmployee?.name || "Select an employee"}
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
                              No employees found
                            </div>
                          ) : (
                            employees.map((employee) => (
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

                {/* Salary period */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="month"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Month</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select month" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {monthOptions.map((month) => (
                              <SelectItem
                                key={month.value}
                                value={month.value.toString()}
                              >
                                {month.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select year" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {yearOptions.map((year) => (
                              <SelectItem
                                key={year}
                                value={year.toString()}
                              >
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Salary components */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="basicSalary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Basic Salary</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="0.00"
                              className="pl-8"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="allowance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Allowance</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="0.00"
                              className="pl-8"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="overtime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Overtime</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="0.00"
                              className="pl-8"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bonus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bonus</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="0.00"
                              className="pl-8"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Deductions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="deduction"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deductions</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="0.00"
                              className="pl-8"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="taxAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax Amount</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="0.00"
                              className="pl-8"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Total Salary Calculation */}
                <div className="bg-muted p-4 rounded-lg flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">Total Salary:</h3>
                    <p className="text-sm text-muted-foreground">
                      (Basic + Allowance + Overtime + Bonus) - (Deductions + Tax)
                    </p>
                  </div>
                  <div className="text-xl font-bold">
                    ${calculateTotalSalary().toFixed(2)}
                  </div>
                </div>

                {/* Payment status */}
                <FormField
                  control={form.control}
                  name="paymentStatus"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Mark as Paid
                        </FormLabel>
                        <FormDescription>
                          Check this if the salary has already been paid to the employee.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Notes field */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any additional notes about this salary record"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Add any additional information about this salary record.
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
                  onClick={() => navigate("/salary")}
                >
                  Cancel
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
                  Save Record
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}