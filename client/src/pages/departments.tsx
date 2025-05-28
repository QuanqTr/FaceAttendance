import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Users, Building2, PieChart, BarChart3, TrendingUp } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";

interface Department {
    id: number;
    name: string;
    description?: string;
    managerId?: number | null;
    managerName?: string | null;
    employeeCount?: number;
}

interface Manager {
    id: number;
    username: string;
    fullName: string;
    employeeId: number | null;
    employeeData: {
        id: number;
        firstName: string;
        lastName: string;
        fullName: string;
        departmentId: number | null;
    } | null;
}

interface DepartmentStats {
    totalDepartments: number;
    totalEmployees: number;
    avgEmployeesPerDept: number;
    largestDepartment: { name: string; count: number };
}

export default function Departments() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        managerId: "none"
    });

    // Fetch departments
    const { data: departments, isLoading: isDepartmentsLoading, error: departmentsError } = useQuery<Department[]>({
        queryKey: ["/api/departments"],
        queryFn: async () => {
            const res = await apiRequest("GET", "/api/departments");
            if (!res.ok) throw new Error("Failed to fetch departments");
            return res.data;
        }
    });

    // Fetch managers for manager selection
    const { data: managers, isLoading: isManagersLoading } = useQuery<Manager[]>({
        queryKey: ["/api/managers/all"],
        queryFn: async () => {
            try {
                const res = await apiRequest("GET", "/api/managers/all");
                if (!res.ok) {
                    console.warn("Failed to fetch managers, using empty array");
                    return [];
                }
                return res.data || [];
            } catch (error) {
                console.warn("Error fetching managers:", error);
                return [];
            }
        },
        retry: 1,
        retryDelay: 1000,
    });

    // Calculate department statistics
    const departmentStats: DepartmentStats = {
        totalDepartments: departments?.length || 0,
        totalEmployees: departments?.reduce((sum, dept) => sum + (dept.employeeCount || 0), 0) || 0,
        avgEmployeesPerDept: departments?.length ?
            Math.round((departments.reduce((sum, dept) => sum + (dept.employeeCount || 0), 0) / departments.length) * 10) / 10 : 0,
        largestDepartment: departments?.reduce((largest, dept) =>
            (dept.employeeCount || 0) > (largest?.count || 0) ?
                { name: dept.name, count: dept.employeeCount || 0 } : largest,
            { name: "", count: 0 }) || { name: "", count: 0 }
    };

    // Create department mutation
    const createMutation = useMutation({
        mutationFn: async (data: { name: string; description?: string; managerId?: number }) => {
            const res = await apiRequest("POST", "/api/departments", data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
            setIsCreateDialogOpen(false);
            resetForm();
            toast({
                title: "✅ Thành công",
                description: "Phòng ban đã được tạo thành công",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "❌ Lỗi",
                description: error.message,
                variant: "destructive",
            });
        }
    });

    // Update department mutation
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: { name: string; description?: string; managerId?: number } }) => {
            const res = await apiRequest("PUT", `/api/departments/${id}`, data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
            setIsEditDialogOpen(false);
            resetForm();
            toast({
                title: "✅ Thành công",
                description: "Phòng ban đã được cập nhật thành công",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "❌ Lỗi",
                description: error.message,
                variant: "destructive",
            });
        }
    });

    // Delete department mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await apiRequest("DELETE", `/api/departments/${id}`);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
            setIsDeleteDialogOpen(false);
            setSelectedDepartment(null);
            toast({
                title: "✅ Thành công",
                description: "Phòng ban đã được xóa thành công",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "❌ Lỗi",
                description: error.message,
                variant: "destructive",
            });
        }
    });

    const resetForm = () => {
        setFormData({
            name: "",
            description: "",
            managerId: "none"
        });
    };

    const handleCreate = () => {
        if (!formData.name.trim()) {
            toast({
                title: "⚠️ Cảnh báo",
                description: "Tên phòng ban không được để trống",
                variant: "destructive",
            });
            return;
        }

        const data = {
            name: formData.name.trim(),
            description: formData.description.trim() || undefined,
            managerId: formData.managerId && formData.managerId !== "none" ? parseInt(formData.managerId) : undefined
        };
        createMutation.mutate(data);
    };

    const handleEdit = (department: Department) => {
        setSelectedDepartment(department);
        setFormData({
            name: department.name,
            description: department.description || "",
            managerId: department.managerId?.toString() || "none"
        });
        setIsEditDialogOpen(true);
    };

    const handleUpdate = () => {
        if (!selectedDepartment) return;
        if (!formData.name.trim()) {
            toast({
                title: "⚠️ Cảnh báo",
                description: "Tên phòng ban không được để trống",
                variant: "destructive",
            });
            return;
        }

        const data = {
            name: formData.name.trim(),
            description: formData.description.trim() || undefined,
            managerId: formData.managerId && formData.managerId !== "none" ? parseInt(formData.managerId) : undefined
        };
        updateMutation.mutate({ id: selectedDepartment.id, data });
    };

    const handleDelete = (department: Department) => {
        setSelectedDepartment(department);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (!selectedDepartment) return;
        deleteMutation.mutate(selectedDepartment.id);
    };

    const managersOnly = managers || [];

    // Chart data preparation
    const chartData = departments?.map(dept => ({
        name: dept.name,
        employees: dept.employeeCount || 0
    })) || [];

    // Loading state
    if (isDepartmentsLoading) {
        return (
            <div className="container mx-auto p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <Skeleton className="h-8 w-64 mb-2" />
                        <Skeleton className="h-4 w-96" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-8 w-16" />
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    // Error state
    if (departmentsError) {
        return (
            <div className="container mx-auto p-6">
                <Card className="border-red-200 bg-red-50">
                    <CardHeader>
                        <CardTitle className="text-red-800">❌ Lỗi tải dữ liệu</CardTitle>
                        <CardDescription className="text-red-600">
                            {departmentsError.message || "Không thể tải danh sách phòng ban"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="outline"
                            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/departments"] })}
                        >
                            🔄 Thử lại
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Quản lý Phòng ban
                    </h1>
                    <p className="text-muted-foreground">
                        Tạo và quản lý các phòng ban trong tổ chức của bạn
                    </p>
                </div>

                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button
                            onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}
                            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Thêm phòng ban
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center">
                                <Building2 className="mr-2 h-5 w-5 text-blue-600" />
                                Tạo phòng ban mới
                            </DialogTitle>
                            <DialogDescription>
                                Nhập thông tin để tạo phòng ban mới trong hệ thống
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name" className="flex items-center">
                                    <span className="text-red-500 mr-1">*</span>
                                    Tên phòng ban
                                </Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Nhập tên phòng ban"
                                    className="focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="description">Mô tả</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Nhập mô tả về chức năng và nhiệm vụ của phòng ban"
                                    rows={3}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="manager">Quản lý phòng ban</Label>
                                <Select
                                    value={formData.managerId}
                                    onValueChange={(value) => setFormData({ ...formData, managerId: value })}
                                    disabled={isManagersLoading}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn quản lý phòng ban" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Không có quản lý</SelectItem>
                                        {managersOnly.map((manager) => (
                                            <SelectItem
                                                key={manager.employeeData?.id || manager.id}
                                                value={manager.employeeData?.id?.toString() || "disabled"}
                                                disabled={!manager.employeeData}
                                            >
                                                {manager.employeeData?.fullName || manager.fullName}
                                                {manager.employeeData ? ` (${manager.username})` : ' (Không có hồ sơ nhân viên)'}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {isManagersLoading && (
                                    <p className="text-sm text-muted-foreground">Đang tải danh sách quản lý...</p>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2">
                            <Button
                                variant="outline"
                                onClick={() => setIsCreateDialogOpen(false)}
                            >
                                Hủy
                            </Button>
                            <Button
                                onClick={handleCreate}
                                disabled={createMutation.isPending}
                                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                            >
                                {createMutation.isPending ? "Đang tạo..." : "Tạo phòng ban"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tổng số phòng ban</CardTitle>
                        <Building2 className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{departmentStats.totalDepartments}</div>
                        <p className="text-xs text-muted-foreground">phòng ban hoạt động</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tổng nhân viên</CardTitle>
                        <Users className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{departmentStats.totalEmployees}</div>
                        <p className="text-xs text-muted-foreground">nhân viên trong tổ chức</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">TB nhân viên/phòng ban</CardTitle>
                        <TrendingUp className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{departmentStats.avgEmployeesPerDept}</div>
                        <p className="text-xs text-muted-foreground">nhân viên trung bình</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Phòng ban lớn nhất</CardTitle>
                        <BarChart3 className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold text-purple-600 truncate" title={departmentStats.largestDepartment.name}>
                            {departmentStats.largestDepartment.name || "Chưa có"}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {departmentStats.largestDepartment.count} nhân viên
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs for different views */}
            <Tabs defaultValue="list" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="list">📋 Danh sách phòng ban</TabsTrigger>
                    <TabsTrigger value="charts">📊 Biểu đồ thống kê</TabsTrigger>
                </TabsList>

                <TabsContent value="list" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {departments?.map((department) => (
                            <Card key={department.id} className="hover:shadow-lg transition-shadow duration-200">
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg font-semibold text-gray-800 truncate">
                                            {department.name}
                                        </CardTitle>
                                        <div className="flex space-x-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEdit(department)}
                                                className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(department)}
                                                className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    {department.description && (
                                        <CardDescription className="text-sm text-gray-600 line-clamp-2">
                                            {department.description}
                                        </CardDescription>
                                    )}
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-500">Nhân viên:</span>
                                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                                <Users className="h-3 w-3 mr-1" />
                                                {department.employeeCount || 0}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-500">Quản lý:</span>
                                            <span className="text-sm font-medium text-gray-700">
                                                {department.managerName || "Chưa có"}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {departments?.length === 0 && (
                        <Card className="text-center py-12">
                            <CardContent>
                                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-600 mb-2">Chưa có phòng ban nào</h3>
                                <p className="text-gray-500 mb-4">Bắt đầu bằng cách tạo phòng ban đầu tiên cho tổ chức của bạn</p>
                                <Button onClick={() => setIsCreateDialogOpen(true)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Tạo phòng ban đầu tiên
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="charts" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Employee Distribution Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <PieChart className="mr-2 h-5 w-5 text-blue-600" />
                                    Phân bố nhân viên theo phòng ban
                                </CardTitle>
                                <CardDescription>
                                    Biểu đồ thể hiện số lượng nhân viên trong từng phòng ban
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {chartData.length > 0 ? (
                                    <div className="space-y-3">
                                        {chartData.map((dept, index) => {
                                            const percentage = departmentStats.totalEmployees > 0
                                                ? Math.round((dept.employees / departmentStats.totalEmployees) * 100)
                                                : 0;
                                            const colors = [
                                                'bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500',
                                                'bg-pink-500', 'bg-indigo-500', 'bg-yellow-500', 'bg-red-500'
                                            ];
                                            const color = colors[index % colors.length];

                                            return (
                                                <div key={dept.name} className="flex items-center space-x-3">
                                                    <div className={`w-4 h-4 rounded-full ${color}`}></div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-sm font-medium truncate">{dept.name}</span>
                                                            <span className="text-sm text-gray-500">{dept.employees} ({percentage}%)</span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                                            <div
                                                                className={`h-2 rounded-full ${color}`}
                                                                style={{ width: `${percentage}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                        <p className="text-gray-500">Chưa có dữ liệu để hiển thị biểu đồ</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Department Size Analysis */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <BarChart3 className="mr-2 h-5 w-5 text-green-600" />
                                    Phân tích quy mô phòng ban
                                </CardTitle>
                                <CardDescription>
                                    Thống kê chi tiết về kích thước các phòng ban
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {chartData.length > 0 ? (
                                    <div className="space-y-4">
                                        {/* Size categories */}
                                        {(() => {
                                            const small = chartData.filter(d => d.employees <= 5).length;
                                            const medium = chartData.filter(d => d.employees > 5 && d.employees <= 15).length;
                                            const large = chartData.filter(d => d.employees > 15).length;

                                            return (
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                                                        <div>
                                                            <span className="font-medium text-blue-800">Phòng ban nhỏ</span>
                                                            <p className="text-sm text-blue-600">≤ 5 nhân viên</p>
                                                        </div>
                                                        <Badge className="bg-blue-100 text-blue-800">{small} phòng ban</Badge>
                                                    </div>

                                                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                                                        <div>
                                                            <span className="font-medium text-green-800">Phòng ban trung bình</span>
                                                            <p className="text-sm text-green-600">6-15 nhân viên</p>
                                                        </div>
                                                        <Badge className="bg-green-100 text-green-800">{medium} phòng ban</Badge>
                                                    </div>

                                                    <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                                                        <div>
                                                            <span className="font-medium text-orange-800">Phòng ban lớn</span>
                                                            <p className="text-sm text-orange-600">&gt; 15 nhân viên</p>
                                                        </div>
                                                        <Badge className="bg-orange-100 text-orange-800">{large} phòng ban</Badge>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Top departments */}
                                        <div className="mt-6">
                                            <h4 className="font-medium mb-3">Top 3 phòng ban có nhiều nhân viên nhất:</h4>
                                            <div className="space-y-2">
                                                {chartData
                                                    .sort((a, b) => b.employees - a.employees)
                                                    .slice(0, 3)
                                                    .map((dept, index) => (
                                                        <div key={dept.name} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                                            <div className="flex items-center">
                                                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-sm font-medium mr-3 
                                                                    ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-600'}`}>
                                                                    {index + 1}
                                                                </span>
                                                                <span className="font-medium">{dept.name}</span>
                                                            </div>
                                                            <Badge variant="outline">{dept.employees} nhân viên</Badge>
                                                        </div>
                                                    ))
                                                }
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                        <p className="text-gray-500">Chưa có dữ liệu để phân tích</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center">
                            <Edit className="mr-2 h-5 w-5 text-blue-600" />
                            Chỉnh sửa phòng ban
                        </DialogTitle>
                        <DialogDescription>
                            Cập nhật thông tin phòng ban {selectedDepartment?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-name" className="flex items-center">
                                <span className="text-red-500 mr-1">*</span>
                                Tên phòng ban
                            </Label>
                            <Input
                                id="edit-name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Nhập tên phòng ban"
                                className="focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-description">Mô tả</Label>
                            <Textarea
                                id="edit-description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Nhập mô tả về chức năng và nhiệm vụ của phòng ban"
                                rows={3}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-manager">Quản lý phòng ban</Label>
                            <Select
                                value={formData.managerId}
                                onValueChange={(value) => setFormData({ ...formData, managerId: value })}
                                disabled={isManagersLoading}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn quản lý phòng ban" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Không có quản lý</SelectItem>
                                    {managersOnly.map((manager) => (
                                        <SelectItem
                                            key={manager.employeeData?.id || manager.id}
                                            value={manager.employeeData?.id?.toString() || "disabled"}
                                            disabled={!manager.employeeData}
                                        >
                                            {manager.employeeData?.fullName || manager.fullName}
                                            {manager.employeeData ? ` (${manager.username})` : ' (Không có hồ sơ nhân viên)'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsEditDialogOpen(false)}
                        >
                            Hủy
                        </Button>
                        <Button
                            onClick={handleUpdate}
                            disabled={updateMutation.isPending}
                            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                        >
                            {updateMutation.isPending ? "Đang cập nhật..." : "Cập nhật"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center">
                            <Trash2 className="mr-2 h-5 w-5 text-red-600" />
                            Xác nhận xóa phòng ban
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc chắn muốn xóa phòng ban <strong>"{selectedDepartment?.name}"</strong>?
                            <br />
                            <span className="text-red-600 font-medium">Hành động này không thể hoàn tác!</span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? "Đang xóa..." : "Xóa phòng ban"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
} 