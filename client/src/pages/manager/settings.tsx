import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/use-language";
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
import { useI18nToast } from "@/hooks/use-i18n-toast";
import { BellRing, Clock, Database, Globe, Key, Save, User } from "lucide-react";
import { useLocation } from "wouter";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useI18nToast();
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();

  if (!user || user.role !== "manager") {
    navigate("/");
    return null;
  }

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
      toast.success('common.success', 'common.changesSaved');
    }, 1000);
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title={t('settings.title')} />

      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 px-4 md:px-6 py-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">{t('settings.companyProfile')}</TabsTrigger>
            <TabsTrigger value="notifications">{t('settings.generalSettings')}</TabsTrigger>
            <TabsTrigger value="system">{t('settings.systemSettings')}</TabsTrigger>
            <TabsTrigger value="language">{t('settings.language')}</TabsTrigger>
            <TabsTrigger value="security">{t('settings.securitySettings')}</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.companyProfile')}</CardTitle>
                <CardDescription>
                  {t('settings.companyProfile')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">{t('employees.name')}</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    value={profileSettings.fullName}
                    onChange={handleProfileChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('settings.email')}</Label>
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
                      <SelectValue placeholder={t('common.search')} />
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
                      {t('common.loading')}
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Save className="mr-2 h-4 w-4" />
                      {t('settings.saveChanges')}
                    </span>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.generalSettings')}</CardTitle>
                <CardDescription>
                  {t('settings.generalSettings')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="emailNotifications">{t('settings.emailNotifications')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.emailNotificationsDescription')}
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
                    <Label htmlFor="loginAlerts">{t('settings.loginAlerts')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.loginAlertsDescription')}
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
                    <Label htmlFor="attendanceReports">{t('settings.attendanceReports')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.attendanceReportsDescription')}
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
                    <Label htmlFor="systemUpdates">{t('settings.systemUpdates')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.systemUpdatesDescription')}
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
                  {isLoading ? t('common.loading') : t('settings.saveChanges')}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.systemSettings')}</CardTitle>
                <CardDescription>
                  {t('settings.systemSettings')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="workingHoursStart">{t('settings.workingHoursStart')}</Label>
                    <Input
                      id="workingHoursStart"
                      type="time"
                      value={systemSettings.workingHours.start}
                      onChange={(e) => handleWorkingHoursChange('start', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="workingHoursEnd">{t('settings.workingHoursEnd')}</Label>
                    <Input
                      id="workingHoursEnd"
                      type="time"
                      value={systemSettings.workingHours.end}
                      onChange={(e) => handleWorkingHoursChange('end', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lateThreshold">{t('settings.lateThreshold')}</Label>
                  <Input
                    id="lateThreshold"
                    type="number"
                    min="0"
                    max="60"
                    value={systemSettings.lateThreshold}
                    onChange={(e) => handleSystemChange('lateThreshold', e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    {t('settings.lateThresholdDescription')}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="attendanceReminders">{t('settings.attendanceReminders')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.attendanceRemindersDescription')}
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
                  <Label htmlFor="exportFormat">{t('settings.exportFormat')}</Label>
                  <Select
                    value={systemSettings.exportFormat}
                    onValueChange={(value) => handleSystemChange('exportFormat', value)}
                  >
                    <SelectTrigger id="exportFormat">
                      <SelectValue placeholder={t('common.search')} />
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
                  {isLoading ? t('common.loading') : t('settings.saveChanges')}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="language">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
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
                    <SelectTrigger id="language">
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
                <p className="text-sm text-muted-foreground">
                  {t('settings.language')} {currentLanguage === 'en' ? t('settings.english') : t('settings.vietnamese')}
                </p>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.securitySettings')}</CardTitle>
                <CardDescription>
                  {t('settings.securitySettings')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">{t('settings.currentPassword')}</Label>
                  <Input id="currentPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">{t('settings.newPassword')}</Label>
                  <Input id="newPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('settings.confirmPassword')}</Label>
                  <Input id="confirmPassword" type="password" />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>{t('settings.twoFactorAuthentication')}</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    {t('settings.twoFactorAuthenticationDescription')}
                  </p>
                  <Button variant="outline" className="w-full">
                    <Key className="mr-2 h-4 w-4" />
                    {t('settings.enableTwoFactorAuthentication')}
                  </Button>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="ml-auto"
                  onClick={() => saveSettings('security')}
                  disabled={isLoading}
                >
                  {isLoading ? t('common.loading') : t('settings.saveChanges')}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
