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
    FileText,
    Shield
} from "lucide-react";

export default function ManagerLeaveRequestDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const [, navigate] = useLocation();
    const { user } = useAuth();
    const { t } = useTranslation();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");

    // Fetch leave request details (manager-specific endpoint)
    const { data: request, isLoading } = useQuery<LeaveRequest>({
        queryKey: ["/api/manager/leave-requests", id],
        queryFn: async () => {
            const res = await fetch(`/api/manager/leave-requests/${id}`);
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

    // Approve request mutation (manager-specific)
    const approveMutation = useMutation({
        mutationFn: async () => {
            const response = await fetch(`/api/manager/leave-requests/${id}/approve`, {
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
                title: "✅ Đã phê duyệt",
                description: "Đơn xin nghỉ phép đã được phê duyệt thành công",
            });
            queryClient.invalidateQueries({ queryKey: ["/api/manager/leave-requests"] });
            queryClient.invalidateQueries({ queryKey: ["/api/manager/leave-requests", id] });
        },
        onError: (error) => {
            toast({
                title: "Lỗi",
                description: error.message,
                variant: "destructive",
            });
        }
    });

    // Reject request mutation (manager-specific)
    const rejectMutation = useMutation({
        mutationFn: async (reason: string) => {
            const response = await fetch(`/api/manager/leave-requests/${id}/reject`, {
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
                title: "❌ Đã từ chối",
                description: "Đơn xin nghỉ phép đã được từ chối",
            });
            setIsRejectDialogOpen(false);
            setRejectionReason("");
            queryClient.invalidateQueries({ queryKey: ["/api/manager/leave-requests"] });
            queryClient.invalidateQueries({ queryKey: ["/api/manager/leave-requests", id] });
        },
        onError: (error) => {
            toast({
                title: "Lỗi",
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

    const renderStatusBadge = (status: string) => {
        switch (status) {
            case "pending":
                return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">⏳ Chờ duyệt</Badge>;
            case "approved":
                return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">✅ Đã duyệt</Badge>;
            case "rejected":
                return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">❌ Đã từ chối</Badge>;
            case "cancelled":
                return <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">🚫 Đã hủy</Badge>;
            default:
                return <Badge variant="outline">Trạng thái</Badge>;
        }
    };

    const renderLeaveTypeIcon = (type: string) => {
        switch (type) {
            case "sick":
                return <Badge variant="secondary" className="bg-blue-100 text-blue-800">🏥 Nghỉ ốm</Badge>;
            case "vacation":
                return <Badge variant="secondary" className="bg-purple-100 text-purple-800">🏖️ Nghỉ phép</Badge>;
            case "personal":
                return <Badge variant="secondary" className="bg-orange-100 text-orange-800">👤 Việc cá nhân</Badge>;
            default:
                return <Badge variant="secondary" className="bg-gray-100">📋 Khác</Badge>;
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
        navigate("/manager/leave-requests");
    };

    if (isLoading) {
        return (
            <div className="flex flex-col h-full">
                <Header title="Chi tiết đơn xin nghỉ phép" />
                <div className="p-4 flex-1 overflow-auto">
                    <Card className="max-w-4xl mx-auto">
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
                <Header title="Chi tiết đơn xin nghỉ phép" />
                <div className="p-4 flex-1 overflow-auto">
                    <Card className="max-w-4xl mx-auto">
                        <CardContent className="p-6 text-center">
                            <p className="text-muted-foreground">Không tìm thấy đơn xin nghỉ phép</p>
                            <Button variant="outline" className="mt-4" onClick={handleBack}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Quay lại
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <Header title="Chi tiết đơn xin nghỉ phép" />

            <div className="p-4 flex-1 overflow-auto">
                <Card className="max-w-4xl mx-auto">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="mb-2"
                                onClick={handleBack}
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Quay lại danh sách
                            </Button>
                            <CardTitle className="text-xl flex items-center gap-3">
                                <Shield className="h-5 w-5 text-blue-600" />
                                Đơn xin nghỉ phép #{request.id}
                                {renderStatusBadge(request.status)}
                                {renderLeaveTypeIcon(request.type)}
                            </CardTitle>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {/* Manager Notice */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center mb-2">
                                <Shield className="mr-2 h-4 w-4 text-blue-600" />
                                <h3 className="font-medium text-blue-800">Quyền hạn quản lý</h3>
                            </div>
                            <p className="text-sm text-blue-700">
                                Bạn có quyền phê duyệt hoặc từ chối đơn xin nghỉ phép này của nhân viên trong phòng ban bạn quản lý.
                            </p>
                        </div>

                        {/* Employee Information */}
                        <div className="bg-muted rounded-lg p-4">
                            <h3 className="font-medium mb-3 flex items-center">
                                <User className="mr-2 h-4 w-4" />
                                Thông tin nhân viên
                            </h3>

                            {isLoadingEmployee ? (
                                <Skeleton className="h-12" />
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Họ và tên</p>
                                        <p className="font-medium">{employee?.firstName} {employee?.lastName}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Mã nhân viên</p>
                                        <p className="font-medium">{employee?.employeeId || 'Chưa có'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Phòng ban</p>
                                        <p className="font-medium">
                                            {departmentLoading
                                                ? 'Đang tải...'
                                                : department?.name || 'Chưa xác định'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Chức vụ</p>
                                        <p className="font-medium">{employee?.position || 'Chưa xác định'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Email</p>
                                        <p className="font-medium">{employee?.email || 'Chưa có'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Số điện thoại</p>
                                        <p className="font-medium">{employee?.phone || 'Chưa có'}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Leave Request Details */}
                        <div className="bg-muted rounded-lg p-4">
                            <h3 className="font-medium mb-3 flex items-center">
                                <Calendar className="mr-2 h-4 w-4" />
                                Chi tiết đơn nghỉ phép
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Loại nghỉ phép</p>
                                    <p className="font-medium">
                                        {request.type === 'sick' && '🏥 Nghỉ ốm'}
                                        {request.type === 'vacation' && '🏖️ Nghỉ phép'}
                                        {request.type === 'personal' && '👤 Việc cá nhân'}
                                        {request.type === 'other' && '📋 Khác'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Ngày nộp đơn</p>
                                    <p className="font-medium">{format(new Date(request.createdAt), 'dd/MM/yyyy')}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Từ ngày - đến ngày</p>
                                    <p className="font-medium">
                                        {format(new Date(request.startDate), 'dd/MM/yyyy')} - {format(new Date(request.endDate), 'dd/MM/yyyy')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Số ngày nghỉ</p>
                                    <p className="font-medium">{calculateDaysBetween(request.startDate, request.endDate)} ngày</p>
                                </div>
                            </div>
                        </div>

                        {/* Reason */}
                        <div className="bg-muted rounded-lg p-4">
                            <h3 className="font-medium mb-3 flex items-center">
                                <FileText className="mr-2 h-4 w-4" />
                                Lý do nghỉ phép
                            </h3>
                            <p className="text-sm border rounded-md p-3 bg-background">
                                {request.reason || 'Không có lý do cụ thể'}
                            </p>
                        </div>

                        {/* Rejection Reason - only shown if the request is rejected */}
                        {request.status === 'rejected' && (request as any).rejectionReason && (
                            <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                                <h3 className="font-medium mb-3 text-red-800 flex items-center">
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Lý do từ chối
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
                                    Thông tin phê duyệt
                                </h3>
                                <p className="text-sm text-green-800">
                                    Đã được phê duyệt vào: {format(new Date(request.approvedAt), 'dd/MM/yyyy HH:mm')}
                                </p>
                                <p className="text-sm text-green-600">
                                    Người phê duyệt: {user?.fullName || 'Quản lý'}
                                </p>
                            </div>
                        )}
                    </CardContent>

                    {/* Footer with action buttons */}
                    <CardFooter className="flex justify-end space-x-2 pt-2">
                        {/* Manager actions - only shown for pending requests */}
                        {request.status === 'pending' && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={handleReject}
                                    className="gap-2 border-red-200 hover:bg-red-50"
                                    disabled={rejectMutation.isPending}
                                >
                                    <XCircle className="h-4 w-4" />
                                    Từ chối
                                </Button>
                                <Button
                                    onClick={handleApprove}
                                    className="gap-2 bg-green-600 hover:bg-green-700"
                                    disabled={approveMutation.isPending}
                                >
                                    {approveMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="h-4 w-4" />
                                    )}
                                    Phê duyệt
                                </Button>
                            </>
                        )}

                        {/* Show status info for non-pending requests */}
                        {request.status !== 'pending' && (
                            <div className="text-sm text-muted-foreground">
                                {request.status === 'approved' && '✅ Đơn này đã được phê duyệt'}
                                {request.status === 'rejected' && '❌ Đơn này đã bị từ chối'}
                                {request.status === 'cancelled' && '🚫 Đơn này đã bị hủy bởi nhân viên'}
                            </div>
                        )}
                    </CardFooter>
                </Card>
            </div>

            {/* Rejection Reason Dialog */}
            <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Từ chối đơn xin nghỉ phép</AlertDialogTitle>
                        <AlertDialogDescription>
                            Vui lòng nhập lý do từ chối để nhân viên hiểu rõ quyết định của bạn.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="py-4">
                        <Textarea
                            placeholder="Nhập lý do từ chối (ví dụ: Quá nhiều người nghỉ cùng thời điểm, cần hoàn thành dự án trước...)"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="min-h-[100px]"
                        />
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRejectConfirm}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={!rejectionReason.trim()}
                        >
                            {rejectMutation.isPending && (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            )}
                            Xác nhận từ chối
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
} 