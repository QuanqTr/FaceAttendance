import { useState } from "react";
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
    Bell,
    CheckCircle,
    Clock3,
    XCircle,
    ChevronRight,
    Fingerprint,
    UserCog,
    FileSpreadsheet,
    FileCheck
} from "lucide-react";

export default function UserDashboard() {
    const { t } = useTranslation();
    const { user } = useAuth();

    // Query to get employee data
    const {
        data: employeeData,
        isLoading: isEmployeeLoading,
    } = useQuery({
        queryKey: ["/api/employees/profile", user?.employeeId],
        queryFn: async () => {
            if (!user?.employeeId) return null;

            const response = await fetch(`/api/employees/${user.employeeId}`, {
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

    // Query to get recent announcements
    const {
        data: announcements,
        isLoading: isAnnouncementsLoading,
    } = useQuery({
        queryKey: ["/api/announcements"],
        queryFn: async () => {
            const response = await fetch("/api/announcements?limit=3", {
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch announcements: ${response.statusText}`);
            }

            return await response.json();
        },
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

    // Get current time
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update time every minute
    setTimeout(() => {
        setCurrentTime(new Date());
    }, 60000);

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(amount);
    };

    // Check if all data is loading
    const isLoading = isEmployeeLoading || isAttendanceLoading || isAnnouncementsLoading ||
        isLeaveRequestsLoading || isStatsLoading;

    if (isLoading) {
        return (
            <>
                <Header
                    title={t("user.dashboard.title")}
                    description={t("user.dashboard.welcomeMessage", { name: user?.fullName })}
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
                title={t("user.dashboard.title")}
                description={t("user.dashboard.welcomeMessage", { name: user?.fullName })}
            />

            <div className="p-4 md:p-6 space-y-6">
                {/* Quick Info Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {/* Today's Attendance Card */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">
                                {t("user.dashboard.todayAttendance")}
                            </CardTitle>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-lg font-bold">
                                {format(currentTime, "EEEE, dd MMM yyyy")}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                                {format(currentTime, "HH:mm")}
                            </div>

                            <div className="mt-4">
                                {todayAttendance ? (
                                    <div className="space-y-1">
                                        <div className="text-sm flex justify-between">
                                            <span>{t("attendance.checkIn")}:</span>
                                            <span className="font-medium">
                                                {todayAttendance.checkIn
                                                    ? format(new Date(todayAttendance.checkIn), "HH:mm")
                                                    : "-"}
                                            </span>
                                        </div>
                                        <div className="text-sm flex justify-between">
                                            <span>{t("attendance.checkOut")}:</span>
                                            <span className="font-medium">
                                                {todayAttendance.checkOut
                                                    ? format(new Date(todayAttendance.checkOut), "HH:mm")
                                                    : "-"}
                                            </span>
                                        </div>
                                        <div className="text-sm flex justify-between">
                                            <span>{t("attendance.status")}:</span>
                                            <StatusBadge status={todayAttendance.status} />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-sm text-muted-foreground">
                                        {t("user.dashboard.noAttendanceRecordToday")}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button variant="outline" className="w-full" asChild>
                                <Link href="/face-recognition-live">
                                    <Fingerprint className="mr-2 h-4 w-4" />
                                    {t("user.dashboard.checkInOut")}
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Leave Requests Card */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">
                                {t("user.dashboard.leaveRequests")}
                            </CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {leaveRequests?.length || 0}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {t("user.dashboard.pendingLeaveRequests")}
                            </p>

                            <div className="mt-4 space-y-2">
                                {leaveRequests && leaveRequests.length > 0 ? (
                                    leaveRequests.slice(0, 2).map((request: any) => (
                                        <div key={request.id} className="text-sm flex justify-between items-center">
                                            <span>
                                                {t(`leaveRequests.${request.type}`)}:{" "}
                                                <span className="text-muted-foreground">
                                                    {format(new Date(request.startDate), "dd/MM")} - {format(new Date(request.endDate), "dd/MM")}
                                                </span>
                                            </span>
                                            <Badge variant="outline">{request.days} {t("common.days")}</Badge>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-sm text-muted-foreground">
                                        {t("user.dashboard.noLeaveRequests")}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button variant="outline" className="w-full" asChild>
                                <Link href="/user/leave-requests">
                                    <FileCheck className="mr-2 h-4 w-4" />
                                    {t("user.dashboard.viewRequests")}
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Attendance Stats Card */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">
                                {t("user.dashboard.monthlyAttendance")}
                            </CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {attendanceStats ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-2xl font-bold">
                                                {attendanceStats.present + attendanceStats.late}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {t("user.dashboard.daysPresent")}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold">
                                                {attendanceStats.workingDays}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {t("user.dashboard.workingDays")}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs">
                                            <span className="flex items-center">
                                                <span className="h-2 w-2 rounded-full bg-green-500 mr-1" />
                                                {t("attendance.present")}
                                            </span>
                                            <span>{attendanceStats.present}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="flex items-center">
                                                <span className="h-2 w-2 rounded-full bg-yellow-500 mr-1" />
                                                {t("attendance.late")}
                                            </span>
                                            <span>{attendanceStats.late}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="flex items-center">
                                                <span className="h-2 w-2 rounded-full bg-blue-500 mr-1" />
                                                {t("attendance.leave")}
                                            </span>
                                            <span>{attendanceStats.leave}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="flex items-center">
                                                <span className="h-2 w-2 rounded-full bg-red-500 mr-1" />
                                                {t("attendance.absent")}
                                            </span>
                                            <span>{attendanceStats.absent}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground">
                                    {t("user.dashboard.noAttendanceStats")}
                                </div>
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button variant="outline" className="w-full" asChild>
                                <Link href="/user/attendance-history">
                                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                                    {t("user.dashboard.viewHistory")}
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Last Salary Card */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">
                                {t("user.dashboard.salary")}
                            </CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatCurrency(employeeData?.salary || 0)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {t("user.dashboard.baseSalary")}
                            </p>

                            <div className="mt-4 space-y-1">
                                <div className="text-sm flex justify-between">
                                    <span>{t("salary.lastPayment")}:</span>
                                    <span className="font-medium">
                                        {format(new Date(), "MM/yyyy")}
                                    </span>
                                </div>

                                <div className="text-sm flex justify-between">
                                    <span>{t("salary.netAmount")}:</span>
                                    <span className="font-medium">
                                        {formatCurrency((employeeData?.salary || 0) * 0.8)}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button variant="outline" className="w-full" asChild>
                                <Link href="/user/salary">
                                    <FileText className="mr-2 h-4 w-4" />
                                    {t("user.dashboard.viewPayslips")}
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                {/* Quick Actions and Announcements */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Announcement Section */}
                    <Card className="md:col-span-1">
                        <CardHeader>
                            <CardTitle>{t("user.dashboard.announcements")}</CardTitle>
                            <CardDescription>
                                {t("user.dashboard.recentAnnouncements")}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[320px]">
                                <div className="space-y-8">
                                    {announcements && announcements.length > 0 ? (
                                        announcements.map((announcement: any) => (
                                            <div key={announcement.id} className="flex items-start">
                                                <div className="mr-4 mt-0.5">
                                                    <Avatar className="h-10 w-10">
                                                        <AvatarImage src={announcement.avatar || ""} alt={announcement.author} />
                                                        <AvatarFallback>
                                                            {announcement.author?.[0] || "A"}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                </div>
                                                <div className="space-y-1">
                                                    <h4 className="text-sm font-semibold">
                                                        {announcement.title}
                                                    </h4>
                                                    <p className="text-sm text-muted-foreground">
                                                        {announcement.content}
                                                    </p>
                                                    <div className="flex items-center pt-1">
                                                        <span className="text-xs text-muted-foreground">
                                                            {announcement.author} - {format(new Date(announcement.createdAt), "dd MMM yyyy")}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-16 text-muted-foreground">
                                            <Bell className="h-8 w-8 mx-auto mb-4 opacity-20" />
                                            {t("user.dashboard.noAnnouncements")}
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    {/* Quick Links Section */}
                    <Card className="md:col-span-1">
                        <CardHeader>
                            <CardTitle>{t("user.dashboard.quickLinks")}</CardTitle>
                            <CardDescription>
                                {t("user.dashboard.commonActions")}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-2">
                            <Button variant="outline" className="justify-between" asChild>
                                <Link href="/user/profile">
                                    <div className="flex items-center">
                                        <UserCog className="mr-2 h-4 w-4" />
                                        {t("user.dashboard.viewProfile")}
                                    </div>
                                    <ChevronRight className="h-4 w-4" />
                                </Link>
                            </Button>

                            <Button variant="outline" className="justify-between" asChild>
                                <Link href="/user/attendance-history">
                                    <div className="flex items-center">
                                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                                        {t("user.dashboard.attendanceHistory")}
                                    </div>
                                    <ChevronRight className="h-4 w-4" />
                                </Link>
                            </Button>

                            <Button variant="outline" className="justify-between" asChild>
                                <Link href="/user/leave-requests">
                                    <div className="flex items-center">
                                        <Calendar className="mr-2 h-4 w-4" />
                                        {t("user.dashboard.applyLeave")}
                                    </div>
                                    <ChevronRight className="h-4 w-4" />
                                </Link>
                            </Button>

                            <Button variant="outline" className="justify-between" asChild>
                                <Link href="/user/salary">
                                    <div className="flex items-center">
                                        <FileText className="mr-2 h-4 w-4" />
                                        {t("user.dashboard.viewSalary")}
                                    </div>
                                    <ChevronRight className="h-4 w-4" />
                                </Link>
                            </Button>

                            <Button variant="outline" className="justify-between" asChild>
                                <Link href="/user/settings">
                                    <div className="flex items-center">
                                        <Settings className="mr-2 h-4 w-4" />
                                        {t("user.dashboard.settings")}
                                    </div>
                                    <ChevronRight className="h-4 w-4" />
                                </Link>
                            </Button>
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