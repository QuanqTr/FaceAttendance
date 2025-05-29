import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/use-language";
import { useQuery } from "@tanstack/react-query";
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

export default function Settings() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();

  if (!user || user.role !== "manager") {
    navigate("/");
    return null;
  }

  // Fetch department info for manager
  const { data: departmentInfo } = useQuery({
    queryKey: ["/api/manager/department-info"],
    queryFn: async () => {
      const res = await fetch("/api/manager/department-info");
      if (!res.ok) throw new Error("Failed to fetch department info");
      return await res.json();
    }
  });

  const [profileSettings, setProfileSettings] = useState({
    fullName: user?.fullName || "",
    email: user?.username || "", // Use username as fallback for email
    role: user?.role || "manager",
    department: departmentInfo?.name || "",
    position: "Department Manager"
  });

  const [departmentSettings, setDepartmentSettings] = useState({
    workingHours: {
      start: "09:00",
      end: "18:00"
    },
    lateThreshold: "15", // minutes
    approvalWorkflow: true,
    attendanceTracking: true,
    overtimePolicy: "auto-approval"
  });

  const [notificationSettings, setNotificationSettings] = useState({
    teamAttendance: true,
    leaveRequests: true,
    lateArrivals: true,
    systemUpdates: false,
    weeklyReports: true,
    urgentAlerts: true
  });

  const [reportSettings, setReportSettings] = useState({
    autoGenerate: true,
    frequency: "weekly",
    format: "pdf",
    includeCharts: true,
    emailDistribution: true
  });

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleNotificationToggle = (setting: keyof typeof notificationSettings) => {
    setNotificationSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handleDepartmentToggle = (setting: keyof typeof departmentSettings) => {
    if (typeof departmentSettings[setting] === 'boolean') {
      setDepartmentSettings(prev => ({
        ...prev,
        [setting]: !prev[setting]
      }));
    }
  };

  const handleWorkingHoursChange = (type: 'start' | 'end', value: string) => {
    setDepartmentSettings(prev => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [type]: value
      }
    }));
  };

  const saveSettings = (type: string) => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
    }, 1000);
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-gradient-to-br from-slate-50 to-purple-50">
      <Header title="" />

      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 px-4 md:px-6 py-4">
        {/* Header Section */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div className="mb-4 md:mb-0">
                <h1 className="text-2xl font-bold mb-2 flex items-center">
                  <SettingsIcon className="mr-3 h-6 w-6" />
                  Manager Settings
                </h1>
                <p className="opacity-90">Configure your department and personal preferences</p>
              </div>
              <div className="text-right">
                <div className="text-sm opacity-75">Department</div>
                <div className="text-lg font-semibold">{departmentInfo?.name || 'Loading...'}</div>
                <div className="text-xs opacity-60">
                  {departmentInfo?.employeeCount || 0} team members
                </div>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="bg-white border border-purple-200">
            <TabsTrigger value="profile" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <User className="mr-2 h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="department" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <Building2 className="mr-2 h-4 w-4" />
              Department
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <BellRing className="mr-2 h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <Target className="mr-2 h-4 w-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="language" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <Globe className="mr-2 h-4 w-4" />
              Language
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="bg-white border-purple-200">
              <CardHeader>
                <CardTitle className="text-purple-800">Manager Profile</CardTitle>
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
                    value={profileSettings.fullName}
                    onChange={handleProfileChange}
                    className="border-purple-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={profileSettings.email}
                    onChange={handleProfileChange}
                    className="border-purple-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={departmentInfo?.name || 'Loading...'}
                    disabled
                    className="border-purple-200 bg-gray-50"
                  />
                  <p className="text-sm text-gray-500">Department assignment is managed by administrators</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    value="Department Manager"
                    disabled
                    className="border-purple-200 bg-gray-50"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="ml-auto bg-purple-600 hover:bg-purple-700"
                  onClick={() => saveSettings('profile')}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </span>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="department">
            <Card className="bg-white border-purple-200">
              <CardHeader>
                <CardTitle className="text-purple-800">Department Settings</CardTitle>
                <CardDescription>
                  Configure settings for your department team
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Work Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={departmentSettings.workingHours.start}
                      onChange={(e) => handleWorkingHoursChange('start', e.target.value)}
                      className="border-purple-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">Work End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={departmentSettings.workingHours.end}
                      onChange={(e) => handleWorkingHoursChange('end', e.target.value)}
                      className="border-purple-200"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lateThreshold">Late Arrival Threshold (minutes)</Label>
                  <Select
                    value={departmentSettings.lateThreshold}
                    onValueChange={(value) => setDepartmentSettings(prev => ({ ...prev, lateThreshold: value }))}
                  >
                    <SelectTrigger className="border-purple-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="20">20 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Approval Workflow</Label>
                      <p className="text-sm text-muted-foreground">
                        Require manager approval for leave requests
                      </p>
                    </div>
                    <Switch
                      checked={departmentSettings.approvalWorkflow}
                      onCheckedChange={() => handleDepartmentToggle('approvalWorkflow')}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Attendance Tracking</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable detailed attendance monitoring
                      </p>
                    </div>
                    <Switch
                      checked={departmentSettings.attendanceTracking}
                      onCheckedChange={() => handleDepartmentToggle('attendanceTracking')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Overtime Policy</Label>
                  <Select
                    value={departmentSettings.overtimePolicy}
                    onValueChange={(value) => setDepartmentSettings(prev => ({ ...prev, overtimePolicy: value }))}
                  >
                    <SelectTrigger className="border-purple-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto-approval">Auto Approval</SelectItem>
                      <SelectItem value="manual-approval">Manual Approval</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="ml-auto bg-purple-600 hover:bg-purple-700"
                  onClick={() => saveSettings('department')}
                  disabled={isLoading}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Department Settings
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="bg-white border-purple-200">
              <CardHeader>
                <CardTitle className="text-purple-800">Notification Preferences</CardTitle>
                <CardDescription>
                  Configure which notifications you want to receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Team Attendance Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about team attendance issues
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.teamAttendance}
                    onCheckedChange={() => handleNotificationToggle('teamAttendance')}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Leave Request Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications for new leave requests
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.leaveRequests}
                    onCheckedChange={() => handleNotificationToggle('leaveRequests')}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Late Arrival Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get alerted when team members arrive late
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.lateArrivals}
                    onCheckedChange={() => handleNotificationToggle('lateArrivals')}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Weekly Reports</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive weekly department performance reports
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.weeklyReports}
                    onCheckedChange={() => handleNotificationToggle('weeklyReports')}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Urgent Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get immediate notifications for urgent matters
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.urgentAlerts}
                    onCheckedChange={() => handleNotificationToggle('urgentAlerts')}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="ml-auto bg-purple-600 hover:bg-purple-700"
                  onClick={() => saveSettings('notifications')}
                  disabled={isLoading}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Preferences
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card className="bg-white border-purple-200">
              <CardHeader>
                <CardTitle className="text-purple-800">Report Settings</CardTitle>
                <CardDescription>
                  Configure automatic report generation and distribution
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-Generate Reports</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically generate department reports
                    </p>
                  </div>
                  <Switch
                    checked={reportSettings.autoGenerate}
                    onCheckedChange={(checked) => setReportSettings(prev => ({ ...prev, autoGenerate: checked }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Report Frequency</Label>
                  <Select
                    value={reportSettings.frequency}
                    onValueChange={(value) => setReportSettings(prev => ({ ...prev, frequency: value }))}
                  >
                    <SelectTrigger className="border-purple-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Report Format</Label>
                  <Select
                    value={reportSettings.format}
                    onValueChange={(value) => setReportSettings(prev => ({ ...prev, format: value }))}
                  >
                    <SelectTrigger className="border-purple-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Include Charts</Label>
                    <p className="text-sm text-muted-foreground">
                      Include visual charts in reports
                    </p>
                  </div>
                  <Switch
                    checked={reportSettings.includeCharts}
                    onCheckedChange={(checked) => setReportSettings(prev => ({ ...prev, includeCharts: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Distribution</Label>
                    <p className="text-sm text-muted-foreground">
                      Email reports to stakeholders automatically
                    </p>
                  </div>
                  <Switch
                    checked={reportSettings.emailDistribution}
                    onCheckedChange={(checked) => setReportSettings(prev => ({ ...prev, emailDistribution: checked }))}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="ml-auto bg-purple-600 hover:bg-purple-700"
                  onClick={() => saveSettings('reports')}
                  disabled={isLoading}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Report Settings
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="language">
            <Card className="bg-white border-purple-200">
              <CardHeader>
                <CardTitle className="text-purple-800">Language & Localization</CardTitle>
                <CardDescription>
                  Choose your preferred language and regional settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select
                    value={currentLanguage}
                    onValueChange={changeLanguage}
                  >
                    <SelectTrigger className="border-purple-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="vi">Tiếng Việt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="ml-auto bg-purple-600 hover:bg-purple-700"
                  onClick={() => saveSettings('language')}
                  disabled={isLoading}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Language Settings
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
