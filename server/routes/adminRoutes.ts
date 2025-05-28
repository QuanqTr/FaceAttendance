import { Express } from "express";
import { ensureAdmin } from "../middlewares/auth";
import { getAttendanceSummary, updateAttendanceSummary } from "../controllers/adminController";

export function adminRoutes(app: Express) {
    // Admin endpoints

    // Attendance summary management
    app.get("/api/attendance-summary", ensureAdmin, getAttendanceSummary);
    app.post("/api/attendance-summary/update", ensureAdmin, updateAttendanceSummary);
} 