import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
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
import { useToast } from "@/hooks/use-toast";
import { BellRing, Clock, Database, Key, Save, User } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [profileSettings, setProfileSettings] = useState({
    fullName: user?.fullName || "",
    email: "",
    role: user?.role || "admin"
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    loginAlerts: true,
    attendanceReports: true,
    systemUpdates: false
  });

  const [systemSettings, setSystemSettings] = useState({
    workingHours: {
      start: "09:00",
      end: "18:00"
    },
    lateThreshold: "10", // minutes
    attendanceReminders: true,
    exportFormat: "csv"
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

  const handleSystemChange = (setting: string, value: string) => {
    setSystemSettings(prev => ({
      ...prev,
      [setting]: value
    }));
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
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Settings Saved",
        description: `Your ${type} settings have been updated successfully.`,
      });
    }, 1000);
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Settings" />
      
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 px-4 md:px-6 py-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-2xl font-bold">System Settings</h1>
        </div>
        
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="system">System Settings</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>
                  Manage your account details and preferences
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    name="email"
                    type="email" 
                    value={profileSettings.email} 
                    onChange={handleProfileChange} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select 
                    value={profileSettings.role} 
                    onValueChange={(value) => setProfileSettings(prev => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrator</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="hr">HR Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="ml-auto" 
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
          
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Configure your notification preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="emailNotifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive email notifications for important events
                    </p>
                  </div>
                  <Switch 
                    id="emailNotifications"
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={() => handleNotificationToggle('emailNotifications')}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="loginAlerts">Login Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when someone logs into the system
                    </p>
                  </div>
                  <Switch 
                    id="loginAlerts"
                    checked={notificationSettings.loginAlerts}
                    onCheckedChange={() => handleNotificationToggle('loginAlerts')}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="attendanceReports">Attendance Reports</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive daily and weekly attendance reports
                    </p>
                  </div>
                  <Switch 
                    id="attendanceReports"
                    checked={notificationSettings.attendanceReports}
                    onCheckedChange={() => handleNotificationToggle('attendanceReports')}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="systemUpdates">System Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about system updates and maintenance
                    </p>
                  </div>
                  <Switch 
                    id="systemUpdates"
                    checked={notificationSettings.systemUpdates}
                    onCheckedChange={() => handleNotificationToggle('systemUpdates')}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="ml-auto" 
                  onClick={() => saveSettings('notification')}
                  disabled={isLoading}
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>
                  Configure application settings and behavior
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="workingHoursStart">Working Hours (Start)</Label>
                    <Input 
                      id="workingHoursStart" 
                      type="time" 
                      value={systemSettings.workingHours.start} 
                      onChange={(e) => handleWorkingHoursChange('start', e.target.value)} 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="workingHoursEnd">Working Hours (End)</Label>
                    <Input 
                      id="workingHoursEnd" 
                      type="time" 
                      value={systemSettings.workingHours.end} 
                      onChange={(e) => handleWorkingHoursChange('end', e.target.value)} 
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lateThreshold">Late Arrival Threshold (minutes)</Label>
                  <Input 
                    id="lateThreshold" 
                    type="number" 
                    min="0" 
                    max="60" 
                    value={systemSettings.lateThreshold} 
                    onChange={(e) => handleSystemChange('lateThreshold', e.target.value)} 
                  />
                  <p className="text-sm text-muted-foreground">
                    Employees arriving after this many minutes past the start time will be marked as late
                  </p>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="attendanceReminders">Attendance Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Send reminders to employees who haven't clocked in
                    </p>
                  </div>
                  <Switch 
                    id="attendanceReminders"
                    checked={systemSettings.attendanceReminders}
                    onCheckedChange={() => setSystemSettings(prev => ({
                      ...prev,
                      attendanceReminders: !prev.attendanceReminders
                    }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="exportFormat">Default Export Format</Label>
                  <Select 
                    value={systemSettings.exportFormat} 
                    onValueChange={(value) => handleSystemChange('exportFormat', value)}
                  >
                    <SelectTrigger id="exportFormat">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="ml-auto" 
                  onClick={() => saveSettings('system')}
                  disabled={isLoading}
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage your security settings and password
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input id="currentPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input id="newPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input id="confirmPassword" type="password" />
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Add an extra layer of security to your account
                  </p>
                  <Button variant="outline" className="w-full">
                    <Key className="mr-2 h-4 w-4" />
                    Enable Two-Factor Authentication
                  </Button>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="ml-auto" 
                  onClick={() => saveSettings('security')}
                  disabled={isLoading}
                >
                  {isLoading ? "Saving..." : "Change Password"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
