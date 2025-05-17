import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    Loader2,
    Bell,
    Globe,
    Shield,
    MonitorSmartphone,
    Terminal,
    LogOut
} from "lucide-react";

// Define the schema for notification settings form validation
const notificationSettingsSchema = z.object({
    emailNotifications: z.boolean(),
    newPayslip: z.boolean(),
    leaveRequestUpdates: z.boolean(),
    attendanceReminders: z.boolean(),
    announcements: z.boolean(),
    systemUpdates: z.boolean(),
});

// Define the schema for appearance settings form validation
const appearanceSettingsSchema = z.object({
    language: z.string(),
    theme: z.enum(["light", "dark", "system"]),
    compactMode: z.boolean(),
});

type NotificationSettingsFormValues = z.infer<typeof notificationSettingsSchema>;
type AppearanceSettingsFormValues = z.infer<typeof appearanceSettingsSchema>;

export default function SettingsPage() {
    const { t, i18n } = useTranslation();
    const { user, logoutMutation } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Query to get user settings
    const {
        data: settingsData,
        isLoading,
        error,
    } = useQuery({
        queryKey: ["/api/settings/user", user?.id],
        queryFn: async () => {
            if (!user?.id) return null;

            try {
                const response = await fetch(`/api/settings/user/${user.id}`, {
                    credentials: "include",
                });

                if (response.status === 404) {
                    // If settings not found, return default settings
                    return {
                        notifications: {
                            emailNotifications: true,
                            newPayslip: true,
                            leaveRequestUpdates: true,
                            attendanceReminders: true,
                            announcements: true,
                            systemUpdates: false,
                        },
                        appearance: {
                            language: i18n.language || "en",
                            theme: "system",
                            compactMode: false,
                        },
                    };
                }

                if (!response.ok) {
                    throw new Error(`Failed to fetch settings: ${response.statusText}`);
                }

                return await response.json();
            } catch (error) {
                console.error("Failed to fetch settings:", error);
                // Return default settings on error
                return {
                    notifications: {
                        emailNotifications: true,
                        newPayslip: true,
                        leaveRequestUpdates: true,
                        attendanceReminders: true,
                        announcements: true,
                        systemUpdates: false,
                    },
                    appearance: {
                        language: i18n.language || "en",
                        theme: "system",
                        compactMode: false,
                    },
                };
            }
        },
        enabled: !!user?.id,
    });

    // Form for notification settings
    const notificationForm = useForm<NotificationSettingsFormValues>({
        resolver: zodResolver(notificationSettingsSchema),
        defaultValues: {
            emailNotifications: true,
            newPayslip: true,
            leaveRequestUpdates: true,
            attendanceReminders: true,
            announcements: true,
            systemUpdates: false,
        },
        values: settingsData?.notifications,
    });

    // Form for appearance settings
    const appearanceForm = useForm<AppearanceSettingsFormValues>({
        resolver: zodResolver(appearanceSettingsSchema),
        defaultValues: {
            language: i18n.language || "en",
            theme: "system",
            compactMode: false,
        },
        values: settingsData?.appearance,
    });

    // Mutation to update user notification settings
    const updateNotificationSettingsMutation = useMutation({
        mutationFn: async (data: NotificationSettingsFormValues) => {
            if (!user?.id) throw new Error("User ID not found");

            const response = await fetch(`/api/settings/user/${user.id}/notifications`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error(`Failed to update settings: ${response.statusText}`);
            }

            return await response.json();
        },
        onSuccess: () => {
            toast({
                title: t("user.settings.notificationSettingsSaved"),
                description: t("user.settings.settingsUpdatedSuccessfully"),
            });
            queryClient.invalidateQueries({ queryKey: ["/api/settings/user", user?.id] });
        },
        onError: (error) => {
            toast({
                title: t("common.error"),
                description: error.message,
                variant: "destructive",
            });
        },
    });

    // Mutation to update user appearance settings
    const updateAppearanceSettingsMutation = useMutation({
        mutationFn: async (data: AppearanceSettingsFormValues) => {
            if (!user?.id) throw new Error("User ID not found");

            const response = await fetch(`/api/settings/user/${user.id}/appearance`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error(`Failed to update settings: ${response.statusText}`);
            }

            return await response.json();
        },
        onSuccess: (data, variables) => {
            toast({
                title: t("user.settings.appearanceSettingsSaved"),
                description: t("user.settings.settingsUpdatedSuccessfully"),
            });

            // Change language if it was updated
            if (variables.language !== i18n.language) {
                i18n.changeLanguage(variables.language);
            }

            queryClient.invalidateQueries({ queryKey: ["/api/settings/user", user?.id] });

            // Apply theme changes
            const htmlElement = document.documentElement;
            if (variables.theme === "dark") {
                htmlElement.classList.add("dark");
            } else if (variables.theme === "light") {
                htmlElement.classList.remove("dark");
            } else {
                // For "system", check prefers-color-scheme
                const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                if (prefersDark) {
                    htmlElement.classList.add("dark");
                } else {
                    htmlElement.classList.remove("dark");
                }
            }
        },
        onError: (error) => {
            toast({
                title: t("common.error"),
                description: error.message,
                variant: "destructive",
            });
        },
    });

    // Handle notification settings form submission
    const onNotificationSubmit = (data: NotificationSettingsFormValues) => {
        updateNotificationSettingsMutation.mutate(data);
    };

    // Handle appearance settings form submission
    const onAppearanceSubmit = (data: AppearanceSettingsFormValues) => {
        updateAppearanceSettingsMutation.mutate(data);
    };

    // Handle logout
    const handleLogout = () => {
        logoutMutation.mutate();
    };

    if (isLoading) {
        return (
            <>
                <Header
                    title={t("user.settings.title")}
                    description={t("user.settings.description")}
                />
                <div className="p-4 md:p-6">
                    <Card>
                        <CardContent className="p-6">
                            <div className="space-y-6">
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </>
        );
    }

    if (error) {
        return (
            <>
                <Header
                    title={t("user.settings.title")}
                    description={t("user.settings.description")}
                />
                <div className="p-4 md:p-6">
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-center py-4 text-destructive">
                                {t("common.errorOccurred")}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </>
        );
    }

    return (
        <>
            <Header
                title={t("user.settings.title")}
                description={t("user.settings.description")}
            />

            <div className="p-4 md:p-6 space-y-6">
                <Tabs defaultValue="notifications" className="w-full">
                    <TabsList className="grid grid-cols-3 w-full max-w-lg mb-4">
                        <TabsTrigger value="notifications">
                            <Bell className="h-4 w-4 mr-2" />
                            {t("user.settings.notifications")}
                        </TabsTrigger>
                        <TabsTrigger value="appearance">
                            <MonitorSmartphone className="h-4 w-4 mr-2" />
                            {t("user.settings.appearance")}
                        </TabsTrigger>
                        <TabsTrigger value="security">
                            <Shield className="h-4 w-4 mr-2" />
                            {t("user.settings.security")}
                        </TabsTrigger>
                    </TabsList>

                    {/* Notification Settings */}
                    <TabsContent value="notifications">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t("user.settings.notificationSettings")}</CardTitle>
                                <CardDescription>
                                    {t("user.settings.manageNotifications")}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Form {...notificationForm}>
                                    <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-4">
                                        <FormField
                                            control={notificationForm.control}
                                            name="emailNotifications"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                                    <div className="space-y-0.5">
                                                        <FormLabel className="text-base">
                                                            {t("user.settings.emailNotifications")}
                                                        </FormLabel>
                                                        <FormDescription>
                                                            {t("user.settings.receiveEmailNotifications")}
                                                        </FormDescription>
                                                    </div>
                                                    <FormControl>
                                                        <Switch
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        <div className="pl-6 space-y-4">
                                            <FormField
                                                control={notificationForm.control}
                                                name="newPayslip"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                                        <div className="space-y-0.5">
                                                            <FormLabel>
                                                                {t("user.settings.newPayslip")}
                                                            </FormLabel>
                                                            <FormDescription>
                                                                {t("user.settings.notifyNewPayslip")}
                                                            </FormDescription>
                                                        </div>
                                                        <FormControl>
                                                            <Switch
                                                                checked={field.value}
                                                                onCheckedChange={field.onChange}
                                                                disabled={!notificationForm.watch("emailNotifications")}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={notificationForm.control}
                                                name="leaveRequestUpdates"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                                        <div className="space-y-0.5">
                                                            <FormLabel>
                                                                {t("user.settings.leaveRequestUpdates")}
                                                            </FormLabel>
                                                            <FormDescription>
                                                                {t("user.settings.notifyLeaveRequestUpdates")}
                                                            </FormDescription>
                                                        </div>
                                                        <FormControl>
                                                            <Switch
                                                                checked={field.value}
                                                                onCheckedChange={field.onChange}
                                                                disabled={!notificationForm.watch("emailNotifications")}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={notificationForm.control}
                                                name="attendanceReminders"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                                        <div className="space-y-0.5">
                                                            <FormLabel>
                                                                {t("user.settings.attendanceReminders")}
                                                            </FormLabel>
                                                            <FormDescription>
                                                                {t("user.settings.notifyAttendanceReminders")}
                                                            </FormDescription>
                                                        </div>
                                                        <FormControl>
                                                            <Switch
                                                                checked={field.value}
                                                                onCheckedChange={field.onChange}
                                                                disabled={!notificationForm.watch("emailNotifications")}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={notificationForm.control}
                                                name="announcements"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                                        <div className="space-y-0.5">
                                                            <FormLabel>
                                                                {t("user.settings.announcements")}
                                                            </FormLabel>
                                                            <FormDescription>
                                                                {t("user.settings.notifyAnnouncements")}
                                                            </FormDescription>
                                                        </div>
                                                        <FormControl>
                                                            <Switch
                                                                checked={field.value}
                                                                onCheckedChange={field.onChange}
                                                                disabled={!notificationForm.watch("emailNotifications")}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={notificationForm.control}
                                                name="systemUpdates"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                                        <div className="space-y-0.5">
                                                            <FormLabel>
                                                                {t("user.settings.systemUpdates")}
                                                            </FormLabel>
                                                            <FormDescription>
                                                                {t("user.settings.notifySystemUpdates")}
                                                            </FormDescription>
                                                        </div>
                                                        <FormControl>
                                                            <Switch
                                                                checked={field.value}
                                                                onCheckedChange={field.onChange}
                                                                disabled={!notificationForm.watch("emailNotifications")}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <Button
                                            type="submit"
                                            className="mt-6"
                                            disabled={updateNotificationSettingsMutation.isPending}
                                        >
                                            {updateNotificationSettingsMutation.isPending && (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            )}
                                            {t("common.saveChanges")}
                                        </Button>
                                    </form>
                                </Form>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Appearance Settings */}
                    <TabsContent value="appearance">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t("user.settings.appearanceSettings")}</CardTitle>
                                <CardDescription>
                                    {t("user.settings.customizeAppearance")}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Form {...appearanceForm}>
                                    <form onSubmit={appearanceForm.handleSubmit(onAppearanceSubmit)} className="space-y-6">
                                        <FormField
                                            control={appearanceForm.control}
                                            name="language"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("user.settings.language")}</FormLabel>
                                                    <Select
                                                        onValueChange={field.onChange}
                                                        defaultValue={field.value}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder={t("user.settings.selectLanguage")} />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="en">English</SelectItem>
                                                            <SelectItem value="vi">Tiếng Việt</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormDescription>
                                                        {t("user.settings.languageDescription")}
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={appearanceForm.control}
                                            name="theme"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("user.settings.theme")}</FormLabel>
                                                    <Select
                                                        onValueChange={field.onChange}
                                                        defaultValue={field.value}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder={t("user.settings.selectTheme")} />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="light">{t("user.settings.light")}</SelectItem>
                                                            <SelectItem value="dark">{t("user.settings.dark")}</SelectItem>
                                                            <SelectItem value="system">{t("user.settings.system")}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormDescription>
                                                        {t("user.settings.themeDescription")}
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={appearanceForm.control}
                                            name="compactMode"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                                    <div className="space-y-0.5">
                                                        <FormLabel className="text-base">
                                                            {t("user.settings.compactMode")}
                                                        </FormLabel>
                                                        <FormDescription>
                                                            {t("user.settings.compactModeDescription")}
                                                        </FormDescription>
                                                    </div>
                                                    <FormControl>
                                                        <Switch
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        <Button
                                            type="submit"
                                            className="mt-6"
                                            disabled={updateAppearanceSettingsMutation.isPending}
                                        >
                                            {updateAppearanceSettingsMutation.isPending && (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            )}
                                            {t("common.saveChanges")}
                                        </Button>
                                    </form>
                                </Form>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Security & Account Settings */}
                    <TabsContent value="security">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t("user.settings.securitySettings")}</CardTitle>
                                <CardDescription>
                                    {t("user.settings.manageSecuritySettings")}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <Accordion type="single" collapsible className="w-full">
                                    <AccordionItem value="sessions">
                                        <AccordionTrigger className="text-base">
                                            {t("user.settings.activeSessions")}
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="space-y-4">
                                                <div className="rounded-lg border p-4">
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <p className="font-medium">Chrome on Windows</p>
                                                            <p className="text-sm text-muted-foreground">Current session</p>
                                                        </div>
                                                        <Button variant="outline" size="sm" disabled>
                                                            {t("user.settings.current")}
                                                        </Button>
                                                    </div>
                                                </div>
                                                <Button variant="destructive" size="sm">
                                                    {t("user.settings.logoutAllDevices")}
                                                </Button>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>

                                    <AccordionItem value="activity">
                                        <AccordionTrigger className="text-base">
                                            {t("user.settings.recentActivity")}
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="space-y-2">
                                                <div className="text-sm">
                                                    <div className="flex justify-between">
                                                        <span>{t("user.settings.passwordChanged")}</span>
                                                        <span className="text-muted-foreground">2 {t("common.daysAgo")}</span>
                                                    </div>
                                                </div>
                                                <div className="text-sm">
                                                    <div className="flex justify-between">
                                                        <span>{t("user.settings.profileUpdated")}</span>
                                                        <span className="text-muted-foreground">1 {t("common.weekAgo")}</span>
                                                    </div>
                                                </div>
                                                <div className="text-sm">
                                                    <div className="flex justify-between">
                                                        <span>{t("user.settings.loginFrom")} Chrome on Windows</span>
                                                        <span className="text-muted-foreground">{t("common.today")}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>

                                <div className="pt-6 border-t">
                                    <h3 className="font-medium mb-4">{t("user.settings.accountActions")}</h3>
                                    <div className="space-y-4">
                                        <Button
                                            variant="destructive"
                                            className="w-full"
                                            onClick={handleLogout}
                                            disabled={logoutMutation.isPending}
                                        >
                                            {logoutMutation.isPending ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <LogOut className="mr-2 h-4 w-4" />
                                            )}
                                            {t("auth.logout")}
                                        </Button>
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