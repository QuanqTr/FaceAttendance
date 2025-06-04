import { Express } from "express";
import { ensureAdmin } from "../middlewares/auth";
import {
    getAttendanceSummary,
    updateAttendanceSummary,
    getCompanyInfo,
    updateCompanySettings,
    getSystemSettings,
    updateSystemSettings,
    getNotificationSettings,
    updateNotificationSettings
} from "../controllers/adminController";

export function adminRoutes(app: Express) {
    // Admin endpoints

    // Attendance summary management
    app.get("/api/attendance-summary", ensureAdmin, getAttendanceSummary);
    app.post("/api/attendance-summary/update", ensureAdmin, updateAttendanceSummary);

    // Admin settings management
    app.get("/api/admin/company-info", ensureAdmin, getCompanyInfo);
    app.put("/api/admin/company-settings", ensureAdmin, updateCompanySettings);

    app.get("/api/admin/system-settings", ensureAdmin, getSystemSettings);
    app.put("/api/admin/system-settings", ensureAdmin, updateSystemSettings);

    app.get("/api/admin/notification-settings", ensureAdmin, getNotificationSettings);
    app.put("/api/admin/notification-settings", ensureAdmin, updateNotificationSettings);
}