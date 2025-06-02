import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { Link } from "wouter";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
    Clock,
    Calendar,
    FileText,
    DollarSign,
    Settings,
    CheckCircle,
    Clock3,
    XCircle,
    ChevronRight,
    Fingerprint,
    UserCog,
    FileSpreadsheet,
    FileCheck,
    User,
    Building,
    TrendingUp,
    AlertCircle,
    Sun,
    Moon,
    Sunrise,
    Sunset
} from "lucide-react";

export default function UserDashboard() {
    const { t } = useTranslation();
    const { user } = useAuth();

    // State for real-time clock
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update time every second for real-time feel
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Get greeting based on time
    const getGreeting = () => {
        const hour = currentTime.getHours();
        if (hour < 12) return "🌅 Chào buổi sáng";
        if (hour < 18) return "☀️ Chào buổi chiều";
        return "🌙 Chào buổi tối";
    };

    // Query to get employee data
    const {
        data: employeeData,
        isLoading: isEmployeeLoading,
    } = useQuery({
        queryKey: ["/api/employees/profile", user?.employeeId],
        queryFn: async () => {
            if (!user?.employeeId) return null;

            const response = await fetch(`/api/employees/profile/${user.employeeId}`, {
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch profile data: ${response.statusText}`);
            }

            return await response.json();
        },
        enabled: !!user?.employeeId,
    });

    // Query to get attendance data for today
    const {
        data: todayAttendance,
        isLoading: isAttendanceLoading,
    } = useQuery({
        queryKey: ["/api/attendance/today", user?.employeeId],
        queryFn: async () => {
            if (!user?.employeeId) return null;

            const today = format(new Date(), "yyyy-MM-dd");
            const response = await fetch(
                `/api/attendance/employee/${user.employeeId}/date/${today}`,
                {
                    credentials: "include",
                }
            );

            if (response.status === 404) {
                return null; // No attendance record for today
            }

            if (!response.ok) {
                throw new Error(`Failed to fetch attendance data: ${response.statusText}`);
            }

            return await response.json();
        },
        enabled: !!user?.employeeId,
    });

    // Query to get attendance stats
    const {
        data: attendanceStats,
        isLoading: isStatsLoading,
    } = useQuery({
        queryKey: ["/api/attendance/stats", user?.employeeId],
        queryFn: async () => {
            if (!user?.employeeId) return null;

            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();

            const response = await fetch(
                `/api/attendance/stats/employee/${user.employeeId}?month=${currentMonth}&year=${currentYear}`,
                {
                    credentials: "include",
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch attendance stats: ${response.statusText}`);
            }

            return await response.json();
        },
        enabled: !!user?.employeeId,
    });

    // Query to get pending leave requests
    const {
        data: leaveRequests,
        isLoading: isLeaveRequestsLoading,
    } = useQuery({
        queryKey: ["/api/leave-requests/pending", user?.employeeId],
        queryFn: async () => {
            if (!user?.employeeId) return [];

            const response = await fetch(
                `/api/leave-requests/employee/${user.employeeId}?status=pending`,
                {
                    credentials: "include",
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch leave requests: ${response.statusText}`);
            }

            return await response.json();
        },
        enabled: !!user?.employeeId,
    });

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(amount);
    };

    // Check if all data is loading
    const isLoading = isEmployeeLoading || isAttendanceLoading || isStatsLoading || isLeaveRequestsLoading;

    if (isLoading) {
        return (
            <>
                <Header
                    title="🏠 Trang chủ nhân viên"
                    description={`Chào mừng ${employeeData?.firstName || user?.fullName || 'bạn'} đến với hệ thống chấm công`}
                />
                <div className="p-4 md:p-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Header
                title="🏠 Trang chủ nhân viên"
                description={`Chào mừng ${employeeData?.firstName || user?.fullName || 'bạn'} đến với hệ thống chấm công`}
            />

            <div className="p-4 md:p-6 space-y-6">
                {/* Welcome Banner */}
                <Card className="bg-gradient-to-br from-blue-500 via-blue-600 to-purple-700 text-white border-none shadow-lg">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold">{getGreeting()}</h2>
                                <p className="text-blue-100 text-lg">
                                    {employeeData?.firstName} {employeeData?.lastName}
                                </p>
                                <div className="flex items-center space-x-4 text-sm text-blue-100">
                                    <span className="flex items-center">
                                        <User className="h-4 w-4 mr-1" />
                                        {employeeData?.position || "Nhân viên"}
                                    </span>
                                    <span className="flex items-center">
                                        <Building className="h-4 w-4 mr-1" />
                                        {employeeData?.department?.name || "Chưa xác định"}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-bold">{format(currentTime, "HH:mm")}</div>
                                <div className="text-blue-100 text-sm">{format(currentTime, "dd/MM/yyyy")}</div>
                                <div className="text-blue-200 text-xs mt-1">{format(currentTime, "EEEE")}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Stats Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {/* Today's Attendance Card */}
                    <Card className="hover:shadow-md transition-shadow duration-200">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                Điểm danh hôm nay
                            </CardTitle>
                            <div className="p-2 bg-green-100 rounded-full">
                                <Clock className="h-4 w-4 text-green-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {todayAttendance ? (
                                <div className="space-y-3">
                                    <div className="text-center">
                                        <StatusBadge status={todayAttendance.status} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="text-center p-2 bg-green-50 rounded">
                                            <div className="font-medium text-green-700">Vào làm</div>
                                            <div className="text-green-600">
                                                {todayAttendance.checkIn
                                                    ? format(new Date(todayAttendance.checkIn), "HH:mm")
                                                    : "Chưa có"}
                                            </div>
                                        </div>
                                        <div className="text-center p-2 bg-red-50 rounded">
                                            <div className="font-medium text-red-700">Tan làm</div>
                                            <div className="text-red-600">
                                                {todayAttendance.checkOut
                                                    ? format(new Date(todayAttendance.checkOut), "HH:mm")
                                                    : "Chưa có"}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-lg font-bold text-blue-600">
                                            {todayAttendance.workHours || 0}h
                                        </div>
                                        <div className="text-xs text-gray-500">Giờ làm việc</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                    <div className="text-sm text-gray-500">Chưa có dữ liệu hôm nay</div>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button variant="outline" className="w-full" asChild>

                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Monthly Attendance Card */}
                    <Card className="hover:shadow-md transition-shadow duration-200">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                Chấm công tháng này
                            </CardTitle>
                            <div className="p-2 bg-blue-100 rounded-full">
                                <TrendingUp className="h-4 w-4 text-blue-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {attendanceStats ? (
                                <div className="space-y-3">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-blue-600">
                                            {attendanceStats.attendanceRate}%
                                        </div>
                                        <div className="text-xs text-gray-500">Tỷ lệ chấm công</div>
                                    </div>
                                    <Progress
                                        value={attendanceStats.attendanceRate}
                                        className="h-2"
                                    />
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                        <div className="text-center">
                                            <div className="font-bold text-green-600">{attendanceStats.present}</div>
                                            <div className="text-gray-500">Có mặt</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="font-bold text-orange-600">{attendanceStats.late}</div>
                                            <div className="text-gray-500">Muộn</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="font-bold text-red-600">{attendanceStats.absent}</div>
                                            <div className="text-gray-500">Vắng</div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                    <div className="text-sm text-gray-500">Chưa có dữ liệu tháng này</div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Leave Requests Card */}
                    <Card className="hover:shadow-md transition-shadow duration-200">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                Đơn xin nghỉ
                            </CardTitle>
                            <div className="p-2 bg-purple-100 rounded-full">
                                <Calendar className="h-4 w-4 text-purple-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center space-y-2">
                                <div className="text-2xl font-bold text-purple-600">
                                    {leaveRequests?.length || 0}
                                </div>
                                <div className="text-xs text-gray-500">Đơn đang chờ duyệt</div>
                            </div>

                            <div className="mt-4 space-y-2">
                                {leaveRequests && leaveRequests.length > 0 ? (
                                    leaveRequests.slice(0, 2).map((request: any) => (
                                        <div key={request.id} className="p-2 bg-purple-50 rounded text-xs">
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium text-purple-700">
                                                    {request.type === 'annual' ? 'Nghỉ phép' :
                                                        request.type === 'sick' ? 'Nghỉ ốm' :
                                                            request.type === 'personal' ? 'Nghỉ cá nhân' :
                                                                request.type === 'maternity' ? 'Nghỉ thai sản' :
                                                                    request.type}
                                                </span>
                                                <Badge variant="secondary" className="text-xs">
                                                    {request.days} ngày
                                                </Badge>
                                            </div>
                                            <div className="text-purple-600 mt-1">
                                                {format(new Date(request.startDate), "dd/MM")} - {format(new Date(request.endDate), "dd/MM")}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-2 text-xs text-gray-500">
                                        Không có đơn xin nghỉ
                                    </div>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button variant="outline" className="w-full" asChild>
                                <Link href="/user/leave-requests">
                                    <FileCheck className="mr-2 h-4 w-4" />
                                    Xem đơn xin nghỉ
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Quick Actions Card */}
                    <Card className="hover:shadow-md transition-shadow duration-200">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                Thao tác nhanh
                            </CardTitle>
                            <div className="p-2 bg-orange-100 rounded-full">
                                <Settings className="h-4 w-4 text-orange-600" />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button variant="ghost" className="w-full justify-start h-8 text-xs" asChild>
                                <Link href="/user/profile">
                                    <UserCog className="mr-2 h-3 w-3" />
                                    Hồ sơ cá nhân
                                </Link>
                            </Button>
                            <Button variant="ghost" className="w-full justify-start h-8 text-xs" asChild>
                                <Link href="/user/attendance-history">
                                    <FileText className="mr-2 h-3 w-3" />
                                    Lịch sử chấm công
                                </Link>
                            </Button>
                            <Button variant="ghost" className="w-full justify-start h-8 text-xs" asChild>
                                <Link href="/reports">
                                    <FileSpreadsheet className="mr-2 h-3 w-3" />
                                    Báo cáo
                                </Link>
                            </Button>
                            <Button variant="ghost" className="w-full justify-start h-8 text-xs" asChild>
                                <Link href="/user/settings">
                                    <Settings className="mr-2 h-3 w-3" />
                                    Cài đặt
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions */}
                <div className="grid gap-6">
                    {/* Quick Links Section - Updated với giao diện mới */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <ChevronRight className="mr-2 h-5 w-5 text-green-600" />
                                🔗 Liên kết nhanh
                            </CardTitle>
                            <CardDescription>
                                Các chức năng thường dùng
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid gap-3">
                                <Button variant="outline" className="justify-between h-12 px-4" asChild>
                                    <Link href="/user/profile">
                                        <div className="flex items-center">
                                            <div className="p-2 bg-blue-100 rounded-full mr-3">
                                                <UserCog className="h-4 w-4 text-blue-600" />
                                            </div>
                                            <div className="text-left">
                                                <div className="font-medium text-sm">Hồ sơ cá nhân</div>
                                                <div className="text-xs text-gray-500">Quản lý thông tin cá nhân</div>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-gray-400" />
                                    </Link>
                                </Button>

                                <Button variant="outline" className="justify-between h-12 px-4" asChild>
                                    <Link href="/user/attendance-history">
                                        <div className="flex items-center">
                                            <div className="p-2 bg-green-100 rounded-full mr-3">
                                                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                                            </div>
                                            <div className="text-left">
                                                <div className="font-medium text-sm">Lịch sử chấm công</div>
                                                <div className="text-xs text-gray-500">Xem chi tiết chấm công</div>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-gray-400" />
                                    </Link>
                                </Button>

                                <Button variant="outline" className="justify-between h-12 px-4" asChild>
                                    <Link href="/user/leave-requests">
                                        <div className="flex items-center">
                                            <div className="p-2 bg-purple-100 rounded-full mr-3">
                                                <Calendar className="h-4 w-4 text-purple-600" />
                                            </div>
                                            <div className="text-left">
                                                <div className="font-medium text-sm">Đơn xin nghỉ</div>
                                                <div className="text-xs text-gray-500">Quản lý đơn xin nghỉ</div>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-gray-400" />
                                    </Link>
                                </Button>

                                <Button variant="outline" className="justify-between h-12 px-4" asChild>
                                    <Link href="/reports">
                                        <div className="flex items-center">
                                            <div className="p-2 bg-orange-100 rounded-full mr-3">
                                                <FileText className="h-4 w-4 text-orange-600" />
                                            </div>
                                            <div className="text-left">
                                                <div className="font-medium text-sm">Báo cáo</div>
                                                <div className="text-xs text-gray-500">Xem báo cáo hiệu suất</div>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-gray-400" />
                                    </Link>
                                </Button>

                                <Button variant="outline" className="justify-between h-12 px-4" asChild>
                                    <Link href="/user/settings">
                                        <div className="flex items-center">
                                            <div className="p-2 bg-gray-100 rounded-full mr-3">
                                                <Settings className="h-4 w-4 text-gray-600" />
                                            </div>
                                            <div className="text-left">
                                                <div className="font-medium text-sm">Cài đặt</div>
                                                <div className="text-xs text-gray-500">Tùy chỉnh hệ thống</div>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-gray-400" />
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

// Status Badge component
function StatusBadge({ status }: { status: string }) {
    const { t } = useTranslation();

    switch (status) {
        case "present":
            return (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    {t("attendance.present")}
                </Badge>
            );
        case "late":
            return (
                <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                    <Clock3 className="mr-1 h-3 w-3" />
                    {t("attendance.late")}
                </Badge>
            );
        case "absent":
            return (
                <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                    <XCircle className="mr-1 h-3 w-3" />
                    {t("attendance.absent")}
                </Badge>
            );
        case "leave":
            return (
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                    <Calendar className="mr-1 h-3 w-3" />
                    {t("attendance.leave")}
                </Badge>
            );
        default:
            return (
                <Badge variant="outline">
                    {status}
                </Badge>
            );
    }
} 