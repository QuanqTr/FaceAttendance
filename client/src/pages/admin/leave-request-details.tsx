import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { LeaveRequest } from "@shared/schema";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
    ArrowLeft,
    CheckCircle2,
    XCircle,
    Loader2,
    Calendar,
    User,
    Building2,
    FileText
} from "lucide-react";

export default function LeaveRequestDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const [, navigate] = useLocation();
    const { user } = useAuth();
    const { t } = useTranslation();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");

    // Fetch leave request details
    const { data: request, isLoading } = useQuery<LeaveRequest>({
        queryKey: ["/api/leave-requests", id],
        queryFn: async () => {
            const res = await fetch(`/api/leave-requests/${id}`);
            if (!res.ok) throw new Error("Failed to fetch leave request details");
            return res.json();
        }
    });

    // Fetch employee details if needed
    const { data: employee, isLoading: isLoadingEmployee } = useQuery({
        queryKey: ["/api/employees", request?.employeeId],
        queryFn: async () => {
            if (!request?.employeeId) return null;
            const res = await fetch(`/api/employees/${request.employeeId}`);
            if (!res.ok) throw new Error("Failed to fetch employee details");
            return res.json();
        },
        enabled: !!request?.employeeId,
    });

    // Get department details if needed
    const { data: department, isLoading: departmentLoading } = useQuery({
        queryKey: ["/api/departments", employee?.departmentId],
        queryFn: async () => {
            if (!employee?.departmentId) return null;
            const res = await fetch(`/api/departments/${employee.departmentId}`);
            if (!res.ok) return null;
            return res.json();
        },
        enabled: !!employee?.departmentId,
    });

    // Check if user is a manager
    const isManager = user?.role === 'admin' || user?.role === 'manager';

    // Approve request mutation
    const approveMutation = useMutation({
        mutationFn: async () => {
            const response = await fetch(`/api/leave-requests/${id}/approve`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" }
            });

            if (!response.ok) {
                throw new Error("Failed to approve leave request");
            }

            return response.json();
        },
        onSuccess: () => {
            toast({
                title: t("leaveRequests.approveSuccess"),
                description: t("leaveRequests.requestUpdated"),
            });
            queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
            queryClient.invalidateQueries({ queryKey: ["/api/leave-requests", id] });
            queryClient.invalidateQueries({ queryKey: ["/api/leave-requests/manager"] });
        },
        onError: (error) => {
            toast({
                title: t("common.error"),
                description: error.message,
                variant: "destructive",
            });
        }
    });

    // Reject request mutation
    const rejectMutation = useMutation({
        mutationFn: async (reason: string) => {
            const response = await fetch(`/api/leave-requests/${id}/reject`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason })
            });

            if (!response.ok) {
                throw new Error("Failed to reject leave request");
            }

            return response.json();
        },
        onSuccess: () => {
            toast({
                title: t("leaveRequests.rejectSuccess"),
                description: t("leaveRequests.requestUpdated"),
            });
            setIsRejectDialogOpen(false);
            setRejectionReason("");
            queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
            queryClient.invalidateQueries({ queryKey: ["/api/leave-requests", id] });
            queryClient.invalidateQueries({ queryKey: ["/api/leave-requests/manager"] });
        },
        onError: (error) => {
            toast({
                title: t("common.error"),
                description: error.message,
                variant: "destructive",
            });
        }
    });

    // Cancel request mutation (for employee)
    const cancelMutation = useMutation({
        mutationFn: async () => {
            const response = await fetch(`/api/leave-requests/${id}/cancel`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" }
            });

            if (!response.ok) {
                throw new Error("Failed to cancel leave request");
            }

            return response.json();
        },
        onSuccess: () => {
            toast({
                title: t("leaveRequests.cancelSuccess"),
                description: t("leaveRequests.requestCancelled"),
            });
            queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
            queryClient.invalidateQueries({ queryKey: ["/api/leave-requests", id] });
        },
        onError: (error) => {
            toast({
                title: t("common.error"),
                description: error.message,
                variant: "destructive",
            });
        }
    });

    const handleApprove = () => {
        approveMutation.mutate();
    };

    const handleReject = () => {
        setIsRejectDialogOpen(true);
    };

    const handleRejectConfirm = () => {
        rejectMutation.mutate(rejectionReason);
    };

    const handleCancel = () => {
        cancelMutation.mutate();
    };

    const renderStatusBadge = (status: string) => {
        switch (status) {
            case "pending":
                return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">{t('leaveRequests.pending')}</Badge>;
            case "approved":
                return <Badge variant="outline" className="bg-green-100 text-green-800">{t('leaveRequests.approved')}</Badge>;
            case "rejected":
                return <Badge variant="outline" className="bg-red-100 text-red-800">{t('leaveRequests.rejected')}</Badge>;
            case "cancelled":
                return <Badge variant="outline" className="bg-gray-100 text-gray-600">{t('leaveRequests.cancelled')}</Badge>;
            default:
                return <Badge variant="outline">{t('common.status')}</Badge>;
        }
    };

    const renderLeaveTypeIcon = (type: string) => {
        switch (type) {
            case "sick":
                return <Badge variant="secondary" className="bg-blue-100 text-blue-800">{t('leaveRequests.sick')}</Badge>;
            case "vacation":
                return <Badge variant="secondary" className="bg-purple-100 text-purple-800">{t('leaveRequests.vacation')}</Badge>;
            case "personal":
                return <Badge variant="secondary" className="bg-orange-100 text-orange-800">{t('leaveRequests.personal')}</Badge>;
            default:
                return <Badge variant="secondary" className="bg-gray-100">{t('leaveRequests.other')}</Badge>;
        }
    };

    const calculateDaysBetween = (start: string, end: string) => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
        return diffDays;
    };

    const handleBack = () => {
        // Determine where to navigate back to based on user role
        if (isManager) {
            navigate("/leave-requests");
        } else {
            navigate("/leave-requests");
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col h-full">
                <Header title={t('leaveRequests.requestDetails')} />
                <div className="p-4 flex-1 overflow-auto">
                    <Card className="max-w-3xl mx-auto">
                        <CardContent className="p-6">
                            <div className="space-y-4">
                                <Skeleton className="h-8 w-1/3" />
                                <div className="grid grid-cols-2 gap-4">
                                    <Skeleton className="h-24" />
                                    <Skeleton className="h-24" />
                                </div>
                                <Skeleton className="h-32" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    if (!request) {
        return (
            <div className="flex flex-col h-full">
                <Header title={t('leaveRequests.requestDetails')} />
                <div className="p-4 flex-1 overflow-auto">
                    <Card className="max-w-3xl mx-auto">
                        <CardContent className="p-6 text-center">
                            <p className="text-muted-foreground">{t('leaveRequests.requestNotFound')}</p>
                            <Button variant="outline" className="mt-4" onClick={handleBack}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                {t('common.back')}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <Header title={t('leaveRequests.requestDetails')} />

            <div className="p-4 flex-1 overflow-auto">
                <Card className="max-w-3xl mx-auto">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="mb-2"
                                onClick={handleBack}
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                {t('common.back')}
                            </Button>
                            <CardTitle className="text-xl flex items-center gap-2">
                                {t('leaveRequests.requestId', { id: request.id })}
                                {renderStatusBadge(request.status)}
                                {renderLeaveTypeIcon(request.type)}
                            </CardTitle>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {/* Employee Information */}
                        <div className="bg-muted rounded-lg p-4">
                            <h3 className="font-medium mb-3 flex items-center">
                                <User className="mr-2 h-4 w-4" />
                                {t('leaveRequests.employeeInfo')}
                            </h3>

                            {isLoadingEmployee ? (
                                <Skeleton className="h-12" />
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('leaveRequests.name')}</p>
                                        <p className="font-medium">{employee?.firstName} {employee?.lastName}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('leaveRequests.department')}</p>
                                        <p className="font-medium">
                                            {departmentLoading
                                                ? t('common.loading')
                                                : department?.description || t('common.notSpecified')}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('leaveRequests.position')}</p>
                                        <p className="font-medium">{employee?.position || t('common.notSpecified')}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('leaveRequests.employeeId')}</p>
                                        <p className="font-medium">{employee?.employeeId || t('common.notSpecified')}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Leave Request Details */}
                        <div className="bg-muted rounded-lg p-4">
                            <h3 className="font-medium mb-3 flex items-center">
                                <Calendar className="mr-2 h-4 w-4" />
                                {t('leaveRequests.leaveDetails')}
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('leaveRequests.leaveType')}</p>
                                    <p className="font-medium">{t(`leaveRequests.${request.type}`)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('leaveRequests.submittedOn')}</p>
                                    <p className="font-medium">{format(new Date(request.createdAt), 'PPP')}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('leaveRequests.dateRange')}</p>
                                    <p className="font-medium">
                                        {format(new Date(request.startDate), 'PPP')} - {format(new Date(request.endDate), 'PPP')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('leaveRequests.days')}</p>
                                    <p className="font-medium">{calculateDaysBetween(request.startDate, request.endDate)} {t('leaveRequests.days')}</p>
                                </div>
                            </div>
                        </div>

                        {/* Reason */}
                        <div className="bg-muted rounded-lg p-4">
                            <h3 className="font-medium mb-3 flex items-center">
                                <FileText className="mr-2 h-4 w-4" />
                                {t('leaveRequests.reason')}
                            </h3>
                            <p className="text-sm border rounded-md p-3 bg-background">
                                {request.reason || t('common.notProvided')}
                            </p>
                        </div>

                        {/* Rejection Reason - only shown if the request is rejected */}
                        {request.status === 'rejected' && (request as any).rejectionReason && (
                            <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                                <h3 className="font-medium mb-3 text-red-800 flex items-center">
                                    <XCircle className="mr-2 h-4 w-4" />
                                    {t('leaveRequests.rejectionReason')}
                                </h3>
                                <p className="text-sm text-red-800">
                                    {(request as any).rejectionReason}
                                </p>
                            </div>
                        )}

                        {/* Approval Information - only shown if the request is approved */}
                        {request.status === 'approved' && request.approvedAt && (
                            <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                                <h3 className="font-medium mb-3 text-green-800 flex items-center">
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    {t('leaveRequests.approvalInfo')}
                                </h3>
                                <p className="text-sm text-green-800">
                                    {t('leaveRequests.approvedOn')}: {format(new Date(request.approvedAt), 'PPP')}
                                </p>
                            </div>
                        )}
                    </CardContent>

                    {/* Footer with action buttons */}
                    <CardFooter className="flex justify-end space-x-2 pt-2">
                        {/* Manager actions - only shown to managers and only for pending requests */}
                        {isManager && request.status === 'pending' && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={handleReject}
                                    className="gap-2"
                                    disabled={rejectMutation.isPending}
                                >
                                    <XCircle className="h-4 w-4" />
                                    {t('leaveRequests.reject')}
                                </Button>
                                <Button
                                    onClick={handleApprove}
                                    className="gap-2"
                                    disabled={approveMutation.isPending}
                                >
                                    {approveMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="h-4 w-4" />
                                    )}
                                    {t('leaveRequests.approve')}
                                </Button>
                            </>
                        )}

                        {/* Employee actions - only shown to the employee who created the request and only for pending requests */}
                        {!isManager && request.status === 'pending' && user?.employeeId === employee?.id && (
                            <Button
                                variant="outline"
                                onClick={handleCancel}
                                className="gap-2 border-red-200 hover:bg-red-50"
                                disabled={cancelMutation.isPending}
                            >
                                {cancelMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <XCircle className="h-4 w-4" />
                                )}
                                {t('common.cancel')}
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </div>

            {/* Rejection Reason Dialog */}
            <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('leaveRequests.rejectRequest')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('leaveRequests.rejectRequestDescription')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="py-4">
                        <Textarea
                            placeholder={t('leaveRequests.rejectionReasonPlaceholder')}
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="min-h-[100px]"
                        />
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRejectConfirm} className="bg-destructive text-destructive-foreground">
                            {rejectMutation.isPending && (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            )}
                            {t('leaveRequests.confirmReject')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
} 