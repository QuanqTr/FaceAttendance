import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    FileSpreadsheet,
    Download,
    Calendar,
    Clock,
    TrendingUp,
    TrendingDown,
    BarChart3,
    PieChart as PieChartIcon,
    Award,
    AlertTriangle,
    Users,
    Building,
    Target,
    Activity
} from "lucide-react";

// Real Chart components using SVG
const BarChart = ({ data, className = "" }: { data: any[], className?: string }) => {
    if (!data || data.length === 0) {
        return (
            <div className={`bg-gray-50 rounded-lg p-4 flex items-center justify-center ${className}`}>
                <div className="text-center space-y-2">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto" />
                    <p className="text-sm text-gray-500">Không có dữ liệu</p>
                </div>
            </div>
        );
    }

    const maxValue = Math.max(...data.map(d => d.hours || d.attendance || 1));
    const chartHeight = 200;
    const chartWidth = 600;
    const barWidth = Math.max(8, (chartWidth - 80) / data.length - 2);
    const chartPadding = 40;

    return (
        <div className={`bg-white rounded-lg p-4 ${className}`}>
            <div className="overflow-x-auto">
                <svg width="100%" height={chartHeight + 60} viewBox={`0 0 ${chartWidth} ${chartHeight + 60}`} className="min-w-full">
                    {data.map((item, index) => {
                        const barHeight = ((item.hours || item.attendance || 0) / maxValue) * (chartHeight - 40);
                        const x = chartPadding + index * (barWidth + 2);
                        const y = chartHeight - barHeight - 30;

                        const showLabel = index % Math.max(1, Math.floor(data.length / 8)) === 0 || index === data.length - 1;

                        return (
                            <g key={index}>
                                <rect
                                    x={x}
                                    y={y}
                                    width={barWidth}
                                    height={barHeight}
                                    fill={item.attendance === 1 ? "#3b82f6" : "#ef4444"}
                                    rx="2"
                                    className="hover:opacity-80 transition-opacity"
                                />
                                {showLabel && (
                                    <text
                                        x={x + barWidth / 2}
                                        y={chartHeight + 15}
                                        textAnchor="middle"
                                        fontSize="8"
                                        fill="#6b7280"
                                        transform={`rotate(-45, ${x + barWidth / 2}, ${chartHeight + 15})`}
                                    >
                                        {item.date}
                                    </text>
                                )}
                                <title>{`${item.date}: ${item.hours ? `${item.hours.toFixed(1)}h` : (item.attendance ? 'Có mặt' : 'Vắng mặt')}`}</title>
                            </g>
                        );
                    })}

                    <text x="10" y="20" fontSize="8" fill="#6b7280">Giờ</text>
                    <text x="10" y={chartHeight - 10} fontSize="8" fill="#6b7280">0</text>
                    <text x="10" y="40" fontSize="8" fill="#6b7280">{maxValue.toFixed(0)}</text>
                </svg>
            </div>
        </div>
    );
};

const LineChart = ({ data, className = "" }: { data: any[], className?: string }) => {
    if (!data || data.length === 0) {
        return (
            <div className={`bg-gray-50 rounded-lg p-4 flex items-center justify-center ${className}`}>
                <div className="text-center space-y-2">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto" />
                    <p className="text-sm text-gray-500">Không có dữ liệu</p>
                </div>
            </div>
        );
    }

    const maxValue = Math.max(...data.map(d => d.hours || 1));
    const minValue = Math.min(...data.map(d => d.hours || 0));
    const chartHeight = 180;
    const chartWidth = 600;
    const chartPadding = 40;
    const stepX = (chartWidth - chartPadding * 2) / (data.length - 1);

    const points = data.map((item, index) => {
        const x = chartPadding + index * stepX;
        const y = chartHeight - ((item.hours || 0 - minValue) / (maxValue - minValue)) * (chartHeight - 60) - 30;
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className={`bg-white rounded-lg p-4 ${className}`}>
            <div className="overflow-x-auto">
                <svg width="100%" height={chartHeight + 60} viewBox={`0 0 ${chartWidth} ${chartHeight + 60}`} className="min-w-full">
                    {Array.from({ length: 5 }, (_, i) => {
                        const y = 30 + (i * (chartHeight - 60) / 4);
                        return (
                            <line
                                key={i}
                                x1={chartPadding}
                                y1={y}
                                x2={chartWidth - chartPadding}
                                y2={y}
                                stroke="#f3f4f6"
                                strokeWidth="1"
                            />
                        );
                    })}

                    <polyline
                        points={points}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2"
                        className="drop-shadow-sm"
                    />

                    {data.map((item, index) => {
                        const x = chartPadding + index * stepX;
                        const y = chartHeight - ((item.hours || 0 - minValue) / (maxValue - minValue)) * (chartHeight - 60) - 30;

                        const showLabel = index % Math.max(1, Math.floor(data.length / 6)) === 0 || index === data.length - 1;

                        return (
                            <g key={index}>
                                <circle
                                    cx={x}
                                    cy={y}
                                    r="3"
                                    fill="#10b981"
                                    className="hover:r-5 transition-all"
                                />
                                {showLabel && (
                                    <text
                                        x={x}
                                        y={chartHeight + 15}
                                        textAnchor="middle"
                                        fontSize="8"
                                        fill="#6b7280"
                                        transform={`rotate(-45, ${x}, ${chartHeight + 15})`}
                                    >
                                        {item.date}
                                    </text>
                                )}
                                <title>{`${item.date}: ${(item.hours || 0).toFixed(1)}h`}</title>
                            </g>
                        );
                    })}

                    <text x="10" y="25" fontSize="8" fill="#6b7280">Giờ</text>
                    <text x="10" y={chartHeight - 15} fontSize="8" fill="#6b7280">{minValue.toFixed(1)}</text>
                    <text x="10" y="35" fontSize="8" fill="#6b7280">{maxValue.toFixed(1)}</text>
                </svg>
            </div>
        </div>
    );
};

const PieChart = ({ data, className = "" }: { data: any[], className?: string }) => {
    if (!data || data.length === 0) {
        return (
            <div className={`bg-gray-50 rounded-lg p-4 flex items-center justify-center ${className}`}>
                <div className="text-center space-y-2">
                    <PieChartIcon className="h-12 w-12 text-gray-400 mx-auto" />
                    <p className="text-sm text-gray-500">Không có dữ liệu</p>
                </div>
            </div>
        );
    }

    const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
    const radius = 70;
    const centerX = 90;
    const centerY = 90;
    const colors = ["#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6"];

    let currentAngle = 0;

    return (
        <div className={`bg-white rounded-lg p-4 ${className}`}>
            <div className="flex flex-col lg:flex-row items-center space-y-4 lg:space-y-0 lg:space-x-6">
                <svg width="180" height="180" viewBox="0 0 180 180" className="flex-shrink-0">
                    {data.map((item, index) => {
                        const angle = (item.value / total) * 360;
                        const startAngle = currentAngle;
                        const endAngle = currentAngle + angle;

                        const x1 = centerX + radius * Math.cos((startAngle * Math.PI) / 180);
                        const y1 = centerY + radius * Math.sin((startAngle * Math.PI) / 180);
                        const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
                        const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180);

                        const largeArcFlag = angle > 180 ? 1 : 0;

                        const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

                        currentAngle += angle;

                        return (
                            <path
                                key={index}
                                d={pathData}
                                fill={colors[index % colors.length]}
                                className="hover:opacity-80 transition-opacity"
                            >
                                <title>{`${item.label}: ${item.value} (${((item.value / total) * 100).toFixed(1)}%)`}</title>
                            </path>
                        );
                    })}
                </svg>
                <div className="flex-1 min-w-0">
                    <div className="grid grid-cols-1 gap-2">
                        {data.map((item, index) => (
                            <div key={index} className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-2">
                                <div className="flex items-center space-x-2 min-w-0">
                                    <div
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: colors[index % colors.length] }}
                                    />
                                    <span className="truncate">{item.label}</span>
                                </div>
                                <div className="flex items-center space-x-2 text-right">
                                    <span className="font-medium">{item.value}</span>
                                    <span className="text-xs text-gray-500">
                                        ({((item.value / total) * 100).toFixed(1)}%)
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Chart component selector
const SimpleChart = ({ data, type = "bar", className = "" }: {
    data: any[],
    type?: "bar" | "line" | "pie",
    className?: string
}) => {
    if (type === "bar") return <BarChart data={data} className={className} />;
    if (type === "line") return <LineChart data={data} className={className} />;
    if (type === "pie") return <PieChart data={data} className={className} />;
    return <BarChart data={data} className={className} />;
};

export default function UserReportsPage() {
    const { t } = useTranslation();
    const { user } = useAuth();

    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
    const [reportType, setReportType] = useState<"attendance" | "performance" | "overview">("overview");

    // Generate months for selection
    const months = Array.from({ length: 12 }, (_, i) => ({
        value: (i + 1).toString(),
        label: new Date(0, i).toLocaleDateString('vi-VN', { month: 'long' })
    }));

    // Generate years for selection
    const years = Array.from({ length: 5 }, (_, i) => {
        const year = new Date().getFullYear() - i;
        return { value: year.toString(), label: year.toString() };
    });

    // Query to get attendance stats
    const {
        data: attendanceStats,
        isLoading: isStatsLoading,
    } = useQuery({
        queryKey: ["/api/attendance/stats", user?.employeeId, selectedMonth, selectedYear],
        queryFn: async () => {
            if (!user?.employeeId) return null;

            const response = await fetch(
                `/api/attendance/stats/employee/${user.employeeId}?month=${selectedMonth}&year=${selectedYear}`,
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

    // Query to get employee profile
    const {
        data: profileData,
        isLoading: isProfileLoading,
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

    // Mock data for charts
    const chartData = useMemo(() => {
        if (!attendanceStats) return [];

        const daysInMonth = eachDayOfInterval({
            start: startOfMonth(new Date(selectedYear, selectedMonth - 1)),
            end: endOfMonth(new Date(selectedYear, selectedMonth - 1))
        });

        return daysInMonth.map((day, index) => ({
            date: format(day, 'dd/MM'),
            attendance: Math.random() > 0.2 ? 1 : 0, // Mock attendance data
            hours: Math.random() * 8 + 6, // Mock hours worked
        }));
    }, [attendanceStats, selectedMonth, selectedYear]);

    const isLoading = isStatsLoading || isProfileLoading;

    // Calculate performance metrics
    const performanceMetrics = useMemo(() => {
        if (!attendanceStats) return null;

        return {
            attendanceScore: attendanceStats.attendanceRate,
            punctualityScore: attendanceStats.punctualityRate,
            productivityScore: Math.min(100, (attendanceStats.totalHours / (attendanceStats.workingDays * 8)) * 100),
            overallScore: Math.round((attendanceStats.attendanceRate + attendanceStats.punctualityRate) / 2)
        };
    }, [attendanceStats]);

    if (isLoading) {
        return (
            <>
                <Header
                    title="📊 Báo cáo chấm công cá nhân"
                    description="Xem báo cáo và thống kê chấm công cá nhân của bạn"
                />
                <div className="p-4 md:p-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Header
                title="📊 Báo cáo chấm công cá nhân"
                description="Xem báo cáo và thống kê chấm công cá nhân của bạn"
            />

            <div className="p-4 md:p-6 space-y-6 max-w-full overflow-x-hidden">
                {/* Filters Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Target className="mr-2 h-5 w-5 text-blue-600" />
                            Bộ lọc báo cáo
                        </CardTitle>
                        <CardDescription>
                            Chọn thời gian và loại báo cáo bạn muốn xem
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="text-sm font-medium">Tháng</label>
                                <Select
                                    value={selectedMonth.toString()}
                                    onValueChange={(value) => setSelectedMonth(parseInt(value))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {months.map((month) => (
                                            <SelectItem key={month.value} value={month.value}>
                                                {month.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Năm</label>
                                <Select
                                    value={selectedYear.toString()}
                                    onValueChange={(value) => setSelectedYear(parseInt(value))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {years.map((year) => (
                                            <SelectItem key={year.value} value={year.value}>
                                                {year.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Loại báo cáo</label>
                                <Select
                                    value={reportType}
                                    onValueChange={(value: "attendance" | "performance" | "overview") => setReportType(value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="overview">Tổng quan</SelectItem>
                                        <SelectItem value="attendance">Chấm công</SelectItem>
                                        <SelectItem value="performance">Hiệu suất</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-end">
                                <Button className="w-full">
                                    <Download className="mr-2 h-4 w-4" />
                                    Xuất báo cáo
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Overview Stats */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-l-4 border-l-green-500">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-gray-600 truncate">Ngày có mặt</p>
                                    <p className="text-2xl font-bold text-green-600">
                                        {attendanceStats?.present + attendanceStats?.late || 0}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                        /{attendanceStats?.workingDays || 0} ngày làm việc
                                    </p>
                                </div>
                                <div className="p-3 bg-green-100 rounded-full flex-shrink-0">
                                    <Calendar className="h-6 w-6 text-green-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-gray-600 truncate">Tổng giờ làm</p>
                                    <p className="text-2xl font-bold text-blue-600">
                                        {attendanceStats?.totalHours || 0}h
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                        +{attendanceStats?.overtimeHours || 0}h tăng ca
                                    </p>
                                </div>
                                <div className="p-3 bg-blue-100 rounded-full flex-shrink-0">
                                    <Clock className="h-6 w-6 text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-purple-500">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-gray-600 truncate">Tỷ lệ chấm công</p>
                                    <p className="text-2xl font-bold text-purple-600">
                                        {attendanceStats?.attendanceRate || 0}%
                                    </p>
                                    <div className="flex items-center mt-1">
                                        {(attendanceStats?.attendanceRate || 0) >= 90 ? (
                                            <TrendingUp className="h-3 w-3 text-green-500 mr-1 flex-shrink-0" />
                                        ) : (
                                            <TrendingDown className="h-3 w-3 text-red-500 mr-1 flex-shrink-0" />
                                        )}
                                        <p className="text-xs text-gray-500 truncate">
                                            {(attendanceStats?.attendanceRate || 0) >= 90 ? 'Tốt' : 'Cần cải thiện'}
                                        </p>
                                    </div>
                                </div>
                                <div className="p-3 bg-purple-100 rounded-full flex-shrink-0">
                                    <Award className="h-6 w-6 text-purple-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-orange-500">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-gray-600 truncate">Điểm đúng giờ</p>
                                    <p className="text-2xl font-bold text-orange-600">
                                        {attendanceStats?.punctualityRate || 0}%
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                        {attendanceStats?.late || 0} lần muộn
                                    </p>
                                </div>
                                <div className="p-3 bg-orange-100 rounded-full flex-shrink-0">
                                    <AlertTriangle className="h-6 w-6 text-orange-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs for different report views */}
                <Tabs value={reportType} onValueChange={(value) => setReportType(value as any)}>
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="overview">Tổng quan</TabsTrigger>
                        <TabsTrigger value="attendance">Chi tiết chấm công</TabsTrigger>
                        <TabsTrigger value="performance">Hiệu suất</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid gap-6 lg:grid-cols-2">
                            {/* Attendance Chart */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center text-base">
                                        <BarChart3 className="mr-2 h-5 w-5 text-blue-600" />
                                        Biểu đồ chấm công tháng
                                    </CardTitle>
                                    <CardDescription className="text-sm">
                                        Hiển thị tình trạng chấm công theo từng ngày trong tháng
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-80 w-full">
                                        <SimpleChart data={chartData} type="bar" className="h-full w-full" />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Performance Breakdown */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center text-base">
                                        <PieChartIcon className="mr-2 h-5 w-5 text-purple-600" />
                                        Phân tích hiệu suất
                                    </CardTitle>
                                    <CardDescription className="text-sm">
                                        Đánh giá toàn diện về hiệu suất làm việc
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {performanceMetrics && (
                                        <>
                                            <div>
                                                <div className="flex justify-between text-sm mb-2">
                                                    <span>Điểm chấm công</span>
                                                    <span className="font-medium">{performanceMetrics.attendanceScore}%</span>
                                                </div>
                                                <Progress value={performanceMetrics.attendanceScore} className="h-2" />
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-sm mb-2">
                                                    <span>Điểm đúng giờ</span>
                                                    <span className="font-medium">{performanceMetrics.punctualityScore}%</span>
                                                </div>
                                                <Progress value={performanceMetrics.punctualityScore} className="h-2" />
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-sm mb-2">
                                                    <span>Điểm năng suất</span>
                                                    <span className="font-medium">{Math.round(performanceMetrics.productivityScore)}%</span>
                                                </div>
                                                <Progress value={performanceMetrics.productivityScore} className="h-2" />
                                            </div>
                                            <div className="pt-4 border-t">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-medium">Điểm tổng thể</span>
                                                    <Badge
                                                        variant={performanceMetrics.overallScore >= 90 ? "default" :
                                                            performanceMetrics.overallScore >= 70 ? "secondary" : "destructive"}
                                                        className="text-lg py-1 px-3"
                                                    >
                                                        {performanceMetrics.overallScore}%
                                                    </Badge>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="attendance" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Chi tiết chấm công tháng {selectedMonth}/{selectedYear}</CardTitle>
                                <CardDescription>
                                    Thông tin chi tiết về chấm công và giờ làm việc theo từng ngày
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 md:grid-cols-3 mb-6">
                                    <div className="space-y-2">
                                        <h4 className="font-medium text-green-700">Thống kê tích cực</h4>
                                        <div className="space-y-1 text-sm">
                                            <div className="flex justify-between">
                                                <span>Ngày có mặt:</span>
                                                <span className="font-medium">{attendanceStats?.present || 0}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Giờ làm việc:</span>
                                                <span className="font-medium">{attendanceStats?.totalHours || 0}h</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Giờ tăng ca:</span>
                                                <span className="font-medium">{attendanceStats?.overtimeHours || 0}h</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="font-medium text-orange-700">Cần cải thiện</h4>
                                        <div className="space-y-1 text-sm">
                                            <div className="flex justify-between">
                                                <span>Số lần muộn:</span>
                                                <span className="font-medium">{attendanceStats?.late || 0}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Ngày vắng:</span>
                                                <span className="font-medium">{attendanceStats?.absent || 0}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Về sớm:</span>
                                                <span className="font-medium">{attendanceStats?.earlyOut || 0}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="font-medium text-blue-700">Đánh giá</h4>
                                        <div className="space-y-1 text-sm">
                                            <div className="flex justify-between">
                                                <span>Tỷ lệ chấm công:</span>
                                                <Badge variant={
                                                    (attendanceStats?.attendanceRate || 0) >= 95 ? "default" :
                                                        (attendanceStats?.attendanceRate || 0) >= 90 ? "secondary" : "destructive"
                                                }>
                                                    {attendanceStats?.attendanceRate || 0}%
                                                </Badge>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Tỷ lệ đúng giờ:</span>
                                                <Badge variant={
                                                    (attendanceStats?.punctualityRate || 0) >= 95 ? "default" :
                                                        (attendanceStats?.punctualityRate || 0) >= 90 ? "secondary" : "destructive"
                                                }>
                                                    {attendanceStats?.punctualityRate || 0}%
                                                </Badge>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Giờ TB/ngày:</span>
                                                <span className="font-medium">{attendanceStats?.averageHours || 0}h</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t pt-4">
                                    <h4 className="font-medium mb-3 flex items-center">
                                        <Activity className="mr-2 h-4 w-4 text-green-600" />
                                        Biểu đồ giờ làm việc theo ngày
                                    </h4>
                                    <div className="h-64 w-full bg-gray-50 rounded-lg p-2">
                                        <SimpleChart data={chartData} type="line" className="h-full w-full" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="performance" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Award className="mr-2 h-5 w-5 text-yellow-600" />
                                    Đánh giá hiệu suất làm việc
                                </CardTitle>
                                <CardDescription>
                                    Phân tích toàn diện về hiệu suất và đề xuất cải thiện
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-6 lg:grid-cols-2">
                                    <div className="space-y-4">
                                        <h4 className="font-medium">Điểm số hiệu suất</h4>
                                        {performanceMetrics && (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                                    <span className="text-sm font-medium">Chấm công đều đặn</span>
                                                    <Badge variant="outline" className="bg-white">
                                                        {performanceMetrics.attendanceScore}/100
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                                    <span className="text-sm font-medium">Đúng giờ</span>
                                                    <Badge variant="outline" className="bg-white">
                                                        {performanceMetrics.punctualityScore}/100
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                                                    <span className="text-sm font-medium">Năng suất làm việc</span>
                                                    <Badge variant="outline" className="bg-white">
                                                        {Math.round(performanceMetrics.productivityScore)}/100
                                                    </Badge>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="font-medium">Đề xuất cải thiện</h4>
                                        <div className="space-y-2 text-sm">
                                            {(attendanceStats?.punctualityRate || 0) < 90 && (
                                                <div className="p-3 bg-orange-50 border-l-4 border-orange-400 rounded">
                                                    <p className="font-medium text-orange-700">💡 Cải thiện việc đi làm đúng giờ</p>
                                                    <p className="text-orange-600">Hãy cố gắng đến văn phòng sớm hơn 10-15 phút</p>
                                                </div>
                                            )}
                                            {(attendanceStats?.attendanceRate || 0) < 95 && (
                                                <div className="p-3 bg-red-50 border-l-4 border-red-400 rounded">
                                                    <p className="font-medium text-red-700">🎯 Tăng tỷ lệ chấm công</p>
                                                    <p className="text-red-600">Đảm bảo chấm công đầy đủ các ngày làm việc</p>
                                                </div>
                                            )}
                                            {(attendanceStats?.totalHours || 0) / (attendanceStats?.workingDays || 1) < 8 && (
                                                <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                                                    <p className="font-medium text-blue-700">⏰ Tăng giờ làm việc</p>
                                                    <p className="text-blue-600">Cố gắng hoàn thành đủ 8 giờ làm việc mỗi ngày</p>
                                                </div>
                                            )}
                                            {performanceMetrics && performanceMetrics.overallScore >= 90 && (
                                                <div className="p-3 bg-green-50 border-l-4 border-green-400 rounded">
                                                    <p className="font-medium text-green-700">🎉 Xuất sắc!</p>
                                                    <p className="text-green-600">Bạn đang có hiệu suất làm việc rất tốt</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Performance Pie Chart - Full width */}
                                <div className="mt-6 pt-6 border-t">
                                    <h4 className="font-medium mb-4 flex items-center">
                                        <PieChartIcon className="mr-2 h-4 w-4 text-purple-600" />
                                        Phân tích tình trạng chấm công
                                    </h4>
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <SimpleChart
                                            data={[
                                                { label: "Có mặt", value: attendanceStats?.present || 20 },
                                                { label: "Muộn", value: attendanceStats?.late || 3 },
                                                { label: "Vắng mặt", value: attendanceStats?.absent || 2 },
                                                { label: "Nghỉ phép", value: attendanceStats?.onLeave || 5 }
                                            ]}
                                            type="pie"
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
} 