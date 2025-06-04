import { Request, Response } from "express";
import { storage } from "../models/storage";
import { z } from "zod";

// Get attendance summary (admin only)
export const getAttendanceSummary = async (req: Request, res: Response) => {
    try {
        const { date } = req.query;
        const targetDate = date ? new Date(date as string) : new Date();

        const summary = await storage.getDailyAttendanceSummary(targetDate);

        res.json(summary);
    } catch (error) {
        console.error('Error fetching attendance summary:', error);
        res.status(500).json({ error: 'Failed to fetch attendance summary' });
    }
};

// Update attendance summary (admin only)
export const updateAttendanceSummary = async (req: Request, res: Response) => {
    try {
        const { date, summary } = req.body;

        if (!date || !summary) {
            return res.status(400).json({ error: 'Date and summary data are required' });
        }

        // This would implement attendance summary update logic
        res.json({
            success: true,
            message: 'Attendance summary updated successfully',
            data: { date, summary }
        });
    } catch (error) {
        console.error('Error updating attendance summary:', error);
        res.status(500).json({ error: 'Failed to update attendance summary' });
    }
};

// Schema for company settings
const CompanySettingsSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  companyAddress: z.string().min(1, "Company address is required"),
  companyPhone: z.string().min(1, "Company phone is required"),
  companyEmail: z.string().email("Invalid email format"),
  taxCode: z.string().min(1, "Tax code is required"),
  website: z.string().url("Invalid website URL").optional().or(z.literal(""))
});

// Schema for system settings
const SystemSettingsSchema = z.object({
  workingHours: z.object({
    start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format")
  }),
  lateThreshold: z.string().transform(val => parseInt(val)),
  attendanceReminders: z.boolean(),
  exportFormat: z.enum(["csv", "xlsx", "pdf"]),
  backupFrequency: z.enum(["daily", "weekly", "monthly"]),
  maintenanceMode: z.boolean()
});

// Schema for notification settings
const NotificationSettingsSchema = z.object({
  systemAlerts: z.boolean(),
  userRegistrations: z.boolean(),
  attendanceReports: z.boolean(),
  systemUpdates: z.boolean(),
  securityAlerts: z.boolean(),
  backupNotifications: z.boolean()
});

// Get company info
export const getCompanyInfo = async (req: Request, res: Response) => {
  try {
    const { getCompanySettings } = await import("../data/settings");
    const companyInfo = getCompanySettings();
    res.json(companyInfo);
  } catch (error) {
    console.error("Error fetching company info:", error);
    res.status(500).json({ error: "Failed to fetch company info" });
  }
};

// Update company settings
export const updateCompanySettings = async (req: Request, res: Response) => {
  try {
    const validatedData = CompanySettingsSchema.parse(req.body);
    const { updateCompanySettings } = await import("../data/settings");
    const updatedSettings = updateCompanySettings(validatedData);
    res.json({ message: "Company settings updated successfully", data: updatedSettings });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error("Error updating company settings:", error);
    res.status(500).json({ error: "Failed to update company settings" });
  }
};

// Get system settings
export const getSystemSettings = async (req: Request, res: Response) => {
  try {
    const { getSystemSettings } = await import("../data/settings");
    const systemSettings = getSystemSettings();
    res.json(systemSettings);
  } catch (error) {
    console.error("Error fetching system settings:", error);
    res.status(500).json({ error: "Failed to fetch system settings" });
  }
};

// Update system settings
export const updateSystemSettings = async (req: Request, res: Response) => {
  try {
    const validatedData = SystemSettingsSchema.parse(req.body);
    const { updateSystemSettings } = await import("../data/settings");
    const updatedSettings = updateSystemSettings(validatedData);
    res.json({ message: "System settings updated successfully", data: updatedSettings });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error("Error updating system settings:", error);
    res.status(500).json({ error: "Failed to update system settings" });
  }
};

// Get notification settings
export const getNotificationSettings = async (req: Request, res: Response) => {
  try {
    const { getNotificationSettings } = await import("../data/settings");
    const notificationSettings = getNotificationSettings();
    res.json(notificationSettings);
  } catch (error) {
    console.error("Error fetching notification settings:", error);
    res.status(500).json({ error: "Failed to fetch notification settings" });
  }
};

// Update notification settings
export const updateNotificationSettings = async (req: Request, res: Response) => {
  try {
    const validatedData = NotificationSettingsSchema.parse(req.body);
    const { updateNotificationSettings } = await import("../data/settings");
    const updatedSettings = updateNotificationSettings(validatedData);
    res.json({ message: "Notification settings updated successfully", data: updatedSettings });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error("Error updating notification settings:", error);
    res.status(500).json({ error: "Failed to update notification settings" });
  }
};