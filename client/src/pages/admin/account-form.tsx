import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Header } from "@/components/layout/header";
import { ArrowLeft } from "lucide-react";

// Define the schema for form validation
const accountFormSchema = z.object({
    username: z.string()
        .min(3, "Username must be at least 3 characters")
        .max(50, "Username must be at most 50 characters"),
    password: z.string()
        .min(6, "Password must be at least 6 characters")
        .or(z.literal('')) // Allow empty string for password
        .optional(),
    role: z.enum(["admin", "manager", "employee"], {
        required_error: "Please select a role",
    }),
    employeeId: z.string()
        .optional(),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

type Employee = {
    id: number;
    firstName: string;
    lastName: string;
    employeeId: string;
};

type UserAccount = {
    id: number;
    username: string;
    role: "admin" | "manager" | "employee";
    employeeId?: number;
    fullName: string;
    createdAt: string;
};

export default function AccountFormPage() {
    const { t } = useTranslation();
    const { toast } = useToast();
    const { user } = useAuth();
    const [, navigate] = useLocation();
    const [match, params] = useRoute("/accounts/:id/edit");
    const queryClient = useQueryClient();
    const isEditing = !!match;
    const accountId = isEditing ? Number(params?.id) : null;

    // Ensure only admins can access this page
    if (user?.role !== "admin") {
        navigate("/");
        return null;
    }

    // Form setup
    const form = useForm<AccountFormValues>({
        resolver: zodResolver(accountFormSchema),
        defaultValues: {
            username: "",
            password: "",
            role: "admin",
            employeeId: "none",
        },
    });

    // Fetch account data if editing
    const { data: accountData, isLoading: isLoadingAccount } = useQuery<UserAccount>({
        queryKey: [`/api/users/${accountId}`],
        queryFn: async () => {
            if (!accountId) return null;
            const res = await fetch(`/api/users/${accountId}`, {
                credentials: 'include',
            });
            if (!res.ok) {
                console.error(`API error: ${res.status} ${res.statusText}`);
                const errorText = await res.text();
                console.error("Error response:", errorText);
                throw new Error("Failed to fetch account");
            }
            const data = await res.json();
            console.log("Account data loaded:", data); // Log for debugging
            return data;
        },
        enabled: isEditing && !!accountId,
    });

    // Fetch employees without accounts
    const { data: employees = [], isLoading: isLoadingEmployees, error: employeesError, refetch: refetchEmployees } = useQuery<Employee[]>({
        queryKey: ["/api/employees/without-accounts"],
        queryFn: async () => {
            try {
                const res = await fetch("/api/employees/without-accounts", {
                    credentials: 'include',
                });
                if (!res.ok) {
                    console.error(`API error: ${res.status} ${res.statusText}`);
                    const errorText = await res.text();
                    console.error("Error response:", errorText);
                    throw new Error(`Failed to fetch employees: ${res.status} ${res.statusText}`);
                }
                const data = await res.json();
                console.log("Employees without accounts:", data); // Log for debugging
                return data;
            } catch (error) {
                console.error("Error fetching employees:", error);
                return [];
            }
        },
        retry: 2,
        retryDelay: 1000,
    });

    // Effect to show error toast if employees cannot be loaded
    useEffect(() => {
        if (employeesError) {
            toast({
                title: "Error",
                description: "Failed to load employees list. Please try again.",
                variant: "destructive",
            });
        }
    }, [employeesError, toast]);

    // Current employee data if editing
    const { data: currentEmployee } = useQuery<Employee>({
        queryKey: [`/api/employees/by-account/${accountId}`],
        queryFn: async () => {
            if (!accountId || !accountData?.employeeId) return null;
            const res = await fetch(`/api/employees/${accountData.employeeId}`, {
                credentials: 'include',
            });
            if (!res.ok) {
                console.error(`API error: ${res.status} ${res.statusText}`);
                const errorText = await res.text();
                console.error("Error response:", errorText);
                throw new Error("Failed to fetch employee details");
            }
            const data = await res.json();
            console.log("Current employee data:", data); // Log for debugging
            return data;
        },
        enabled: isEditing && !!accountId && !!accountData?.employeeId,
    });

    // Set form values when editing and data is loaded
    useEffect(() => {
        if (isEditing && accountData) {
            console.log("Setting form values with role:", accountData.role); // Log the role
            form.reset({
                username: accountData.username,
                password: "", // Don't populate password for security
                role: accountData.role,
                employeeId: currentEmployee?.id ? String(currentEmployee.id) : "none",
            });
        }
    }, [accountData, currentEmployee, form, isEditing]);

    // Create or update account mutation
    const accountMutation = useMutation({
        mutationFn: async (payload: any) => {
            if (isEditing && accountId) {
                // Update existing account
                const res = await fetch(`/api/users/${accountId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    credentials: 'include',
                    body: JSON.stringify(payload),
                });

                if (!res.ok) {
                    const errorText = await res.text();
                    throw new Error(errorText || "Failed to update account");
                }

                return res.json();
            } else {
                // Create new account
                const res = await fetch("/api/users", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: 'include',
                    body: JSON.stringify(payload),
                });

                if (!res.ok) {
                    const errorText = await res.text();
                    throw new Error(errorText || "Failed to create account");
                }

                return res.json();
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/users"] });
            toast({
                title: isEditing ? "Account updated" : "Account created",
                description: isEditing
                    ? "The account has been successfully updated"
                    : "The account has been successfully created",
            });
            navigate("/accounts");
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message || "An error occurred",
                variant: "destructive",
            });
        },
    });

    // Handle form submission
    const onSubmit = (values: AccountFormValues) => {
        // Make a copy of values to modify
        const formValues = { ...values };

        console.log("Form values before submission:", formValues);

        // Create proper payload with correct types
        const payload: any = {
            username: formValues.username,
            role: formValues.role
        };

        // Only include password if it's not empty in edit mode
        if (!isEditing || (formValues.password && formValues.password !== "")) {
            payload.password = formValues.password;
        }

        // Handle employee association
        if (formValues.employeeId === "none") {
            payload.employeeId = null; // Set to null to remove association
        } else if (formValues.employeeId) {
            payload.employeeId = Number(formValues.employeeId); // Convert to number
        }

        console.log("Payload after processing:", payload);

        // Send to server
        accountMutation.mutate(payload);
    };

    // Display selected employee or employees without accounts
    const getEmployeeOptions = () => {
        const options: JSX.Element[] = [];

        console.log("Rendering employee options:", {
            employeesCount: employees?.length || 0,
            currentEmployee: currentEmployee
        });

        // Add current employee if editing and has one associated
        if (isEditing && currentEmployee) {
            options.push(
                <SelectItem key={currentEmployee.id} value={String(currentEmployee.id)}>
                    {currentEmployee.lastName} {currentEmployee.firstName} ({currentEmployee.employeeId})
                </SelectItem>
            );
        }

        // Show all available employees 
        if (Array.isArray(employees) && employees.length > 0) {
            employees.forEach((employee) => {
                // Skip if this employee is already in the options (current employee)
                if (currentEmployee && employee.id === currentEmployee.id) {
                    return;
                }

                options.push(
                    <SelectItem key={employee.id} value={String(employee.id)}>
                        {employee.lastName} {employee.firstName} ({employee.employeeId})
                    </SelectItem>
                );
            });
        } else {
            console.log("No available employees to display");
        }

        console.log(`Created ${options.length} employee options`);
        return options;
    };

    // Check if employee is associated with this account
    const hasAssociatedEmployee = isEditing && !!currentEmployee;

    return (
        <div className="flex flex-col h-full">
            <Header
                title={isEditing ? t("accounts.editAccount") || "Edit Account" : t("accounts.createAccount") || "Create Account"}
                showSearch={false}
            />

            <div className="mx-4 mb-4">
                <Button variant="ghost" onClick={() => navigate("/accounts")}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t("common.back") || "Back to Accounts"}
                </Button>
            </div>

            <Card className="mx-4 mb-4">
                <CardHeader>
                    <CardTitle>
                        {isEditing ? t("accounts.editAccount") || "Edit Account" : t("accounts.createAccount") || "Create Account"}
                    </CardTitle>
                    <CardDescription>
                        {isEditing
                            ? t("accounts.editAccountDesc") || "Update the account details and permissions"
                            : t("accounts.createAccountDesc") || "Fill in the details to create a new user account"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="username"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("accounts.username") || "Username"}</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder={t("accounts.usernamePlaceholder") || "Enter username"}
                                                    {...field}
                                                    disabled={isLoadingAccount || accountMutation.isPending}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                {t("accounts.usernameDesc") || "Used for login, must be unique"}
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                {isEditing
                                                    ? t("accounts.newPassword") || "New Password (leave empty to keep current)"
                                                    : t("accounts.password") || "Password"}
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="password"
                                                    placeholder={isEditing
                                                        ? t("accounts.newPasswordPlaceholder") || "Enter new password (optional)"
                                                        : t("accounts.passwordPlaceholder") || "Enter password"
                                                    }
                                                    {...field}
                                                    disabled={isLoadingAccount || accountMutation.isPending}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                {isEditing
                                                    ? t("accounts.newPasswordDesc") || "Leave empty to keep the current password"
                                                    : t("accounts.passwordDesc") || "Minimum 6 characters"}
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="role"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("accounts.role") || "Role"}</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                value={field.value}
                                                disabled={isLoadingAccount || accountMutation.isPending}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={t("accounts.selectRole") || "Select a role"} />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="admin">{t("accounts.admin") || "Admin"}</SelectItem>
                                                    <SelectItem value="manager">{t("accounts.manager") || "Manager"}</SelectItem>
                                                    <SelectItem value="employee">{t("accounts.employee") || "Employee"}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                {t("accounts.roleDesc") || "Determines the user's permissions in the system"}
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="employeeId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("accounts.associatedEmployee") || "Associated Employee"}</FormLabel>
                                            {employeesError ? (
                                                <div className="flex items-center space-x-2">
                                                    <Select
                                                        onValueChange={field.onChange}
                                                        value={field.value}
                                                        disabled={true}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder={t("accounts.selectEmployee") || "Select an employee"} />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="none">
                                                                {t("accounts.noEmployee") || "No associated employee"}
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Button
                                                        variant="outline"
                                                        type="button"
                                                        className="ml-2"
                                                        onClick={() => refetchEmployees()}
                                                    >
                                                        <span className="mr-1">↻</span> {t("common.retry") || "Retry"}
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Select
                                                    onValueChange={field.onChange}
                                                    value={field.value}
                                                    disabled={isLoadingAccount || isLoadingEmployees || accountMutation.isPending}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={t("accounts.selectEmployee") || "Select an employee"} />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="none">
                                                            {t("accounts.noEmployee") || "No associated employee"}
                                                        </SelectItem>
                                                        {getEmployeeOptions()}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                            <FormDescription>
                                                {hasAssociatedEmployee && currentEmployee
                                                    ? `${t("accounts.currentlyLinked") || "Currently linked to"}: ${currentEmployee?.lastName} ${currentEmployee?.firstName} (${currentEmployee?.employeeId})`
                                                    : t("accounts.employeeAssociationDesc") || "Link this account to an employee record"}
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => navigate("/accounts")}
                                    disabled={accountMutation.isPending}
                                >
                                    {t("common.cancel") || "Cancel"}
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={accountMutation.isPending || isLoadingAccount || isLoadingEmployees}
                                >
                                    {accountMutation.isPending ?
                                        (isEditing ? t("accounts.updating") || "Updating..." : t("accounts.creating") || "Creating...") :
                                        (isEditing ? t("accounts.update") || "Update" : t("accounts.create") || "Create")
                                    }
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
} 