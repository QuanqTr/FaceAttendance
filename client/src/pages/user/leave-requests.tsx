import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, addDays } from "date-fns";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog";
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
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Loader2, CalendarIcon, Filter, XCircle, Plus } from "lucide-react";

// Define the schema for leave request form validation
const leaveRequestSchema = z.object({
    type: z.enum(["vacation", "sick", "personal", "other"], {
        required_error: "Please select leave type",
    }),
    startDate: z.date({
        required_error: "Start date is required",
    }),
    endDate: z.date({
        required_error: "End date is required",
    }),
    reason: z.string().min(5, "Reason must be at least 5 characters"),
}).refine((data) => {
    // Ensure end date is same as or after start date
    return data.endDate >= data.startDate;
}, {
    message: "End date must be on or after start date",
    path: ["endDate"],
});

type LeaveRequestFormValues = z.infer<typeof leaveRequestSchema>;

export default function LeaveRequestsPage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [cancelRequestId, setCancelRequestId] = useState<number | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>("all");

    // Form for leave request creation
    const form = useForm<LeaveRequestFormValues>({
        resolver: zodResolver(leaveRequestSchema),
        defaultValues: {
            type: "vacation",
            reason: "",
            startDate: new Date(),
            endDate: new Date(),
        },
    });

    // Query to get employee's leave requests
    const {
        data: leaveRequests,
        isLoading,
        error,
    } = useQuery({
        queryKey: ["/api/leave-requests/employee", user?.employeeId, statusFilter],
        queryFn: async () => {
            if (!user?.employeeId) return [];

            let url = `/api/leave-requests/employee/${user.employeeId}`;

            if (statusFilter && statusFilter !== "all") {
                url += `?status=${statusFilter}`;
            }

            const response = await fetch(url, {
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch leave requests: ${response.statusText}`);
            }

            return await response.json();
        },
        enabled: !!user?.employeeId,
    });

    // Mutation to create new leave request
    const createLeaveRequestMutation = useMutation({
        mutationFn: async (data: LeaveRequestFormValues) => {
            if (!user?.employeeId) throw new Error("Employee ID not found");

            const requestData = {
                ...data,
                employeeId: user.employeeId,
                status: "pending",
                createdAt: new Date(),
                days: differenceInDays(data.endDate, data.startDate) + 1,
            };

            const response = await fetch(`/api/leave-requests`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestData),
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error(`Failed to create leave request: ${response.statusText}`);
            }

            return await response.json();
        },
        onSuccess: () => {
            toast({
                title: t("user.leaveRequests.requestSubmitted"),
                description: t("user.leaveRequests.requestSubmittedDesc"),
            });
            setIsDialogOpen(false);
            form.reset();
            queryClient.invalidateQueries({ queryKey: ["/api/leave-requests/employee", user?.employeeId] });
        },
        onError: (error) => {
            toast({
                title: t("common.error"),
                description: error.message,
                variant: "destructive",
            });
        },
    });

    // Mutation to cancel leave request
    const cancelLeaveRequestMutation = useMutation({
        mutationFn: async (id: number) => {
            const response = await fetch(`/api/leave-requests/${id}/cancel`, {
                method: "PATCH",
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error(`Failed to cancel leave request: ${response.statusText}`);
            }

            return await response.json();
        },
        onSuccess: () => {
            toast({
                title: t("user.leaveRequests.requestCancelled"),
                description: t("user.leaveRequests.requestCancelledDesc"),
            });
            setCancelRequestId(null);
            queryClient.invalidateQueries({ queryKey: ["/api/leave-requests/employee", user?.employeeId] });
        },
        onError: (error) => {
            toast({
                title: t("common.error"),
                description: error.message,
                variant: "destructive",
            });
        },
    });

    // Handle leave request form submission
    const onSubmit = (data: LeaveRequestFormValues) => {
        createLeaveRequestMutation.mutate(data);
    };

    // Get status badge style
    const getStatusBadge = (status: string) => {
        switch (status) {
            case "approved":
                return (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        {t("leaveRequests.approved")}
                    </Badge>
                );
            case "pending":
                return (
                    <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                        {t("leaveRequests.pending")}
                    </Badge>
                );
            case "rejected":
                return (
                    <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                        {t("leaveRequests.rejected")}
                    </Badge>
                );
            case "cancelled":
                return (
                    <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
                        {t("leaveRequests.cancelled")}
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
                        {status}
                    </Badge>
                );
        }
    };

    // Calculate leave days
    const calculateLeaveDays = () => {
        const startDate = form.watch("startDate");
        const endDate = form.watch("endDate");

        if (startDate && endDate && endDate >= startDate) {
            return differenceInDays(endDate, startDate) + 1;
        }

        return 0;
    };

    if (isLoading) {
        return (
            <>
                <Header
                    title={t("user.leaveRequests.title")}
                    description={t("user.leaveRequests.description")}
                />
                <div className="p-4 md:p-6">
                    <Card>
                        <CardContent className="p-6">
                            <div className="space-y-6">
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </>
        );
    }

    if (error) {
        return (
            <>
                <Header
                    title={t("user.leaveRequests.title")}
                    description={t("user.leaveRequests.description")}
                />
                <div className="p-4 md:p-6">
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-center py-4 text-destructive">
                                {t("common.errorOccurred")}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </>
        );
    }

    return (
        <>
            <Header
                title={t("user.leaveRequests.title")}
                description={t("user.leaveRequests.description")}
            />

            <div className="p-4 md:p-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>{t("user.leaveRequests.myRequests")}</CardTitle>
                            <CardDescription>
                                {t("user.leaveRequests.manageYourRequests")}
                            </CardDescription>
                        </div>
                        <div className="flex flex-row items-center gap-4">
                            <Select
                                value={statusFilter}
                                onValueChange={setStatusFilter}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder={t("common.status")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t("common.all")}</SelectItem>
                                    <SelectItem value="pending">{t("leaveRequests.pending")}</SelectItem>
                                    <SelectItem value="approved">{t("leaveRequests.approved")}</SelectItem>
                                    <SelectItem value="rejected">{t("leaveRequests.rejected")}</SelectItem>
                                    <SelectItem value="cancelled">{t("leaveRequests.cancelled")}</SelectItem>
                                </SelectContent>
                            </Select>

                            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button>
                                        <Plus className="mr-2 h-4 w-4" />
                                        {t("user.leaveRequests.newRequest")}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[500px]">
                                    <DialogHeader>
                                        <DialogTitle>{t("user.leaveRequests.createLeaveRequest")}</DialogTitle>
                                        <DialogDescription>
                                            {t("user.leaveRequests.fillFormBelow")}
                                        </DialogDescription>
                                    </DialogHeader>

                                    <Form {...form}>
                                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                            <FormField
                                                control={form.control}
                                                name="type"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{t("leaveRequests.leaveType")}</FormLabel>
                                                        <Select
                                                            onValueChange={field.onChange}
                                                            defaultValue={field.value}
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder={t("leaveRequests.selectType")} />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="vacation">{t("leaveRequests.vacation")}</SelectItem>
                                                                <SelectItem value="sick">{t("leaveRequests.sick")}</SelectItem>
                                                                <SelectItem value="personal">{t("leaveRequests.personal")}</SelectItem>
                                                                <SelectItem value="other">{t("leaveRequests.other")}</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField
                                                    control={form.control}
                                                    name="startDate"
                                                    render={({ field }) => (
                                                        <FormItem className="flex flex-col">
                                                            <FormLabel>{t("leaveRequests.startDate")}</FormLabel>
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <FormControl>
                                                                        <Button
                                                                            variant={"outline"}
                                                                            className="pl-3 text-left font-normal"
                                                                        >
                                                                            {field.value ? (
                                                                                format(field.value, "PPP")
                                                                            ) : (
                                                                                <span>{t("common.pickDate")}</span>
                                                                            )}
                                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                                        </Button>
                                                                    </FormControl>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-auto p-0" align="start">
                                                                    <Calendar
                                                                        mode="single"
                                                                        selected={field.value}
                                                                        onSelect={field.onChange}
                                                                        disabled={(date) => date < new Date()}
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
                                                            <FormLabel>{t("leaveRequests.endDate")}</FormLabel>
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <FormControl>
                                                                        <Button
                                                                            variant={"outline"}
                                                                            className="pl-3 text-left font-normal"
                                                                        >
                                                                            {field.value ? (
                                                                                format(field.value, "PPP")
                                                                            ) : (
                                                                                <span>{t("common.pickDate")}</span>
                                                                            )}
                                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                                        </Button>
                                                                    </FormControl>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-auto p-0" align="start">
                                                                    <Calendar
                                                                        mode="single"
                                                                        selected={field.value}
                                                                        onSelect={field.onChange}
                                                                        disabled={(date) =>
                                                                            date < (form.watch("startDate") || new Date())
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

                                            <div className="bg-muted rounded-md p-3">
                                                <p className="text-sm">
                                                    {t("user.leaveRequests.totalDays")}: {calculateLeaveDays()}
                                                </p>
                                            </div>

                                            <FormField
                                                control={form.control}
                                                name="reason"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{t("leaveRequests.reason")}</FormLabel>
                                                        <FormControl>
                                                            <Textarea
                                                                placeholder={t("user.leaveRequests.reasonPlaceholder")}
                                                                className="min-h-[100px]"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <DialogFooter>
                                                <DialogClose asChild>
                                                    <Button variant="outline" type="button">
                                                        {t("common.cancel")}
                                                    </Button>
                                                </DialogClose>
                                                <Button
                                                    type="submit"
                                                    disabled={createLeaveRequestMutation.isPending}
                                                >
                                                    {createLeaveRequestMutation.isPending && (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    )}
                                                    {t("common.submit")}
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </Form>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {leaveRequests?.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                {t("user.leaveRequests.noRequests")}
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("leaveRequests.type")}</TableHead>
                                        <TableHead>{t("leaveRequests.dates")}</TableHead>
                                        <TableHead>{t("leaveRequests.days")}</TableHead>
                                        <TableHead>{t("leaveRequests.reason")}</TableHead>
                                        <TableHead>{t("common.status")}</TableHead>
                                        <TableHead>{t("leaveRequests.createdAt")}</TableHead>
                                        <TableHead>{t("common.actions")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {leaveRequests?.map((request: any) => (
                                        <TableRow key={request.id}>
                                            <TableCell className="font-medium">
                                                {t(`leaveRequests.${request.type}`)}
                                            </TableCell>
                                            <TableCell>
                                                {format(new Date(request.startDate), "dd/MM/yyyy")} - {format(new Date(request.endDate), "dd/MM/yyyy")}
                                            </TableCell>
                                            <TableCell>{request.days}</TableCell>
                                            <TableCell className="max-w-[200px] truncate">
                                                {request.reason}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(request.status)}</TableCell>
                                            <TableCell>
                                                {format(new Date(request.createdAt), "dd/MM/yyyy")}
                                            </TableCell>
                                            <TableCell>
                                                {request.status === "pending" && (
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-destructive"
                                                                onClick={() => setCancelRequestId(request.id)}
                                                            >
                                                                <XCircle className="h-4 w-4 mr-1" />
                                                                {t("common.cancel")}
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>{t("user.leaveRequests.confirmCancel")}</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    {t("user.leaveRequests.cancelWarning")}
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>{t("common.back")}</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => cancelLeaveRequestMutation.mutate(request.id)}
                                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                >
                                                                    {cancelLeaveRequestMutation.isPending &&
                                                                        cancelRequestId === request.id && (
                                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                        )}
                                                                    {t("common.confirm")}
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
} 