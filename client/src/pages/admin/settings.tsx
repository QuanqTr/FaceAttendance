import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/use-language";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { BellRing, Clock, Database, Globe, Key, Save, User, Settings as SettingsIcon, Users, Building2, Target, Shield } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

export default function Settings() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage } = useLanguage();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  if (!user || user.role !== "admin") {
    navigate("/");
    return null;
  }

  // Fetch company info
  const { data: companyInfo, isLoading: isLoadingCompany } = useQuery({
    queryKey: ["/api/admin/company-info"],
    queryFn: () => apiRequest.get("/api/admin/company-info")
  });

  // Fetch system settings
  const { data: systemSettingsData, isLoading: isLoadingSystem } = useQuery({
    queryKey: ["/api/admin/system-settings"],
    queryFn: () => apiRequest.get("/api/admin/system-settings")
  });

  // Fetch notification settings
  const { data: notificationSettingsData, isLoading: isLoadingNotifications } = useQuery({
    queryKey: ["/api/admin/notification-settings"],
    queryFn: () => apiRequest.get("/api/admin/notification-settings")
  });

  // Mutations for updating settings
  const updateCompanyMutation = useMutation({
    mutationFn: (data: any) => apiRequest.put("/api/admin/company-settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company-info"] });
      toast({
        title: "Thành công",
        description: "Cập nhật thông tin công ty thành công",
      });
    },
    onError: () => {
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật thông tin công ty",
        variant: "destructive"
      });
    }
  });

  const updateSystemMutation = useMutation({
    mutationFn: (data: any) => apiRequest.put("/api/admin/system-settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/system-settings"] });
      toast({
        title: "Thành công",
        description: "Cập nhật cài đặt hệ thống thành công",
      });
    },
    onError: () => {
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật cài đặt hệ thống",
        variant: "destructive"
      });
    }
  });

  const updateNotificationMutation = useMutation({
    mutationFn: (data: any) => apiRequest.put("/api/admin/notification-settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notification-settings"] });
      toast({
        title: "Thành công",
        description: "Cập nhật cài đặt thông báo thành công",
      });
    },
    onError: () => {
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật cài đặt thông báo",
        variant: "destructive"
      });
    }
  });

  const [companySettings, setCompanySettings] = useState({
    companyName: "",
    companyAddress: "",
    companyPhone: "",
    companyEmail: "",
    taxCode: "",
    website: ""
  });

  const [systemSettings, setSystemSettings] = useState({
    workingHours: {
      start: "08:00",
      end: "17:00"
    },
    lateThreshold: "20",
    attendanceReminders: true,
    exportFormat: "csv",
    backupFrequency: "daily",
    maintenanceMode: false
  });

  const [notificationSettings, setNotificationSettings] = useState({
    systemAlerts: true,
    userRegistrations: true,
    attendanceReports: true,
    systemUpdates: false,
    securityAlerts: true,
    backupNotifications: true
  });

  // Update state when data is loaded
  useEffect(() => {
    if (companyInfo) {
      setCompanySettings(companyInfo);
    }
  }, [companyInfo]);

  useEffect(() => {
    if (systemSettingsData) {
      setSystemSettings(systemSettingsData);
    }
  }, [systemSettingsData]);

  useEffect(() => {
    if (notificationSettingsData) {
      setNotificationSettings(notificationSettingsData);
    }
  }, [notificationSettingsData]);

  const handleCompanyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCompanySettings(prev => ({ ...prev, [name]: value }));
  };

  const handleNotificationToggle = (setting: keyof typeof notificationSettings) => {
    setNotificationSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handleSystemToggle = (setting: keyof typeof systemSettings) => {
    if (typeof systemSettings[setting] === 'boolean') {
      setSystemSettings(prev => ({
        ...prev,
        [setting]: !prev[setting]
      }));
    }
  };

  const handleWorkingHoursChange = (type: 'start' | 'end', value: string) => {
    setSystemSettings(prev => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [type]: value
      }
    }));
  };

  const saveSettings = (type: string) => {
    switch (type) {
      case 'company':
        updateCompanyMutation.mutate(companySettings);
        break;
      case 'system':
        updateSystemMutation.mutate(systemSettings);
        break;
      case 'notifications':
        updateNotificationMutation.mutate(notificationSettings);
        break;
      case 'language':
        toast({
          title: "Thành công",
          description: "Cài đặt ngôn ngữ đã được lưu",
        });
        break;
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50">
      <Header title="" />

      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 px-4 md:px-6 py-4">
        {/* Header Section */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div className="mb-4 md:mb-0">
                <h1 className="text-2xl font-bold mb-2 flex items-center">
                  <SettingsIcon className="mr-3 h-6 w-6" />
                  {t('settings.title')}
                </h1>
                <p className="opacity-90">Cấu hình hệ thống và thông tin công ty</p>
              </div>
              <div className="text-right">
                <div className="text-sm opacity-75">Hệ thống</div>
                <div className="text-lg font-semibold">Admin Panel</div>
                <div className="text-xs opacity-60">
                  Quản trị viên
                </div>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="bg-white border border-blue-200">
            <TabsTrigger value="profile" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <User className="mr-2 h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="company" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <Building2 className="mr-2 h-4 w-4" />
              Company
            </TabsTrigger>
            <TabsTrigger value="system" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <SettingsIcon className="mr-2 h-4 w-4" />
              System
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <BellRing className="mr-2 h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="language" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <Globe className="mr-2 h-4 w-4" />
              Language
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="bg-white border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-800">Admin Profile</CardTitle>
                <CardDescription>
                  Manage your personal information and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    value={user?.fullName || ""}
                    disabled
                    className="border-blue-200 bg-gray-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={user?.username || ""}
                    disabled
                    className="border-blue-200 bg-gray-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    value="System Administrator"
                    disabled
                    className="border-blue-200 bg-gray-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="permissions">Permissions</Label>
                  <Input
                    id="permissions"
                    value="Full System Access"
                    disabled
                    className="border-blue-200 bg-gray-50"
                  />
                  <p className="text-sm text-gray-500">Administrator permissions are managed by system configuration</p>
                </div>
              </CardContent>
              <CardFooter>
                <div className="ml-auto p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">Read-only Information</h3>
                      <div className="mt-1 text-sm text-blue-700">
                        <p>Profile information is managed through system configuration.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="company">
            <Card className="bg-white border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-800">Thông tin công ty</CardTitle>
                <CardDescription>
                  Xem thông tin cơ bản của công ty
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Tên công ty</Label>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                    <p className="text-gray-900 font-medium">{companySettings.companyName || "Chưa cập nhật"}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Địa chỉ công ty</Label>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                    <p className="text-gray-900">{companySettings.companyAddress || "Chưa cập nhật"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Số điện thoại</Label>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                      <p className="text-gray-900">{companySettings.companyPhone || "Chưa cập nhật"}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Email công ty</Label>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                      <p className="text-gray-900">{companySettings.companyEmail || "Chưa cập nhật"}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Mã số thuế</Label>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                      <p className="text-gray-900">{companySettings.taxCode || "Chưa cập nhật"}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Website</Label>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                      {companySettings.website ? (
                        <a
                          href={companySettings.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {companySettings.website}
                        </a>
                      ) : (
                        <p className="text-gray-900">Chưa cập nhật</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">Thông tin chỉ đọc</h3>
                      <div className="mt-1 text-sm text-blue-700">
                        <p>Thông tin công ty được quản lý tập trung. Liên hệ quản trị hệ thống để thay đổi thông tin này.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="ml-auto bg-blue-600 hover:bg-blue-700"
                  onClick={() => saveSettings('company')}
                  disabled={updateCompanyMutation.isPending}
                >
                  {updateCompanyMutation.isPending ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Đang lưu...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Save className="mr-2 h-4 w-4" />
                      Lưu thay đổi
                    </span>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="system">
            <Card className="bg-white border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-800">Cài đặt hệ thống</CardTitle>
                <CardDescription>
                  Cấu hình các thông số hệ thống chấm công
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Giờ bắt đầu làm việc</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={systemSettings.workingHours?.start || "08:00"}
                      onChange={(e) => handleWorkingHoursChange('start', e.target.value)}
                      className="border-blue-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">Giờ kết thúc làm việc</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={systemSettings.workingHours?.end || "17:00"}
                      onChange={(e) => handleWorkingHoursChange('end', e.target.value)}
                      className="border-blue-200"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lateThreshold">Ngưỡng đi muộn (phút)</Label>
                  <Select
                    value={systemSettings.lateThreshold}
                    onValueChange={(value) => setSystemSettings(prev => ({ ...prev, lateThreshold: value }))}
                  >
                    <SelectTrigger className="border-blue-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 phút</SelectItem>
                      <SelectItem value="15">15 phút</SelectItem>
                      <SelectItem value="20">20 phút</SelectItem>
                      <SelectItem value="30">30 phút</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Nhắc nhở chấm công</Label>
                      <p className="text-sm text-muted-foreground">
                        Gửi thông báo nhắc nhở nhân viên chấm công
                      </p>
                    </div>
                    <Switch
                      checked={systemSettings.attendanceReminders}
                      onCheckedChange={() => handleSystemToggle('attendanceReminders')}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Chế độ bảo trì</Label>
                      <p className="text-sm text-muted-foreground">
                        Tạm thời tắt hệ thống để bảo trì
                      </p>
                    </div>
                    <Switch
                      checked={systemSettings.maintenanceMode}
                      onCheckedChange={() => handleSystemToggle('maintenanceMode')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Định dạng xuất file</Label>
                  <Select
                    value={systemSettings.exportFormat}
                    onValueChange={(value) => setSystemSettings(prev => ({ ...prev, exportFormat: value }))}
                  >
                    <SelectTrigger className="border-blue-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tần suất sao lưu</Label>
                  <Select
                    value={systemSettings.backupFrequency}
                    onValueChange={(value) => setSystemSettings(prev => ({ ...prev, backupFrequency: value }))}
                  >
                    <SelectTrigger className="border-blue-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Hàng ngày</SelectItem>
                      <SelectItem value="weekly">Hàng tuần</SelectItem>
                      <SelectItem value="monthly">Hàng tháng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="ml-auto bg-blue-600 hover:bg-blue-700"
                  onClick={() => saveSettings('system')}
                  disabled={updateSystemMutation.isPending}
                >
                  {updateSystemMutation.isPending ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Đang lưu...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Save className="mr-2 h-4 w-4" />
                      Lưu cài đặt hệ thống
                    </span>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="bg-white border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-800">Cài đặt thông báo</CardTitle>
                <CardDescription>
                  Cấu hình các loại thông báo hệ thống
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Cảnh báo hệ thống</Label>
                    <p className="text-sm text-muted-foreground">
                      Nhận thông báo về các vấn đề hệ thống
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.systemAlerts}
                    onCheckedChange={() => handleNotificationToggle('systemAlerts')}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Đăng ký người dùng mới</Label>
                    <p className="text-sm text-muted-foreground">
                      Thông báo khi có người dùng mới đăng ký
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.userRegistrations}
                    onCheckedChange={() => handleNotificationToggle('userRegistrations')}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Báo cáo chấm công</Label>
                    <p className="text-sm text-muted-foreground">
                      Nhận báo cáo chấm công định kỳ
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.attendanceReports}
                    onCheckedChange={() => handleNotificationToggle('attendanceReports')}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Cảnh báo bảo mật</Label>
                    <p className="text-sm text-muted-foreground">
                      Thông báo về các vấn đề bảo mật
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.securityAlerts}
                    onCheckedChange={() => handleNotificationToggle('securityAlerts')}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Thông báo sao lưu</Label>
                    <p className="text-sm text-muted-foreground">
                      Nhận thông báo về quá trình sao lưu dữ liệu
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.backupNotifications}
                    onCheckedChange={() => handleNotificationToggle('backupNotifications')}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="ml-auto bg-blue-600 hover:bg-blue-700"
                  onClick={() => saveSettings('notifications')}
                  disabled={updateNotificationMutation.isPending}
                >
                  {updateNotificationMutation.isPending ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Đang lưu...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Save className="mr-2 h-4 w-4" />
                      Lưu cài đặt thông báo
                    </span>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="language">
            <Card className="bg-white border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-800 flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  {t('settings.language')}
                </CardTitle>
                <CardDescription>
                  {t('settings.selectLanguage')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="language">{t('settings.language')}</Label>
                  <Select
                    value={currentLanguage}
                    onValueChange={(value) => changeLanguage(value)}
                  >
                    <SelectTrigger id="language" className="border-blue-200">
                      <SelectValue placeholder={t('settings.selectLanguage')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">{t('settings.english')}</SelectItem>
                      <SelectItem value="vi">{t('settings.vietnamese')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="ml-auto bg-blue-600 hover:bg-blue-700"
                  onClick={() => saveSettings('language')}
                  disabled={false}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Lưu cài đặt ngôn ngữ
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
