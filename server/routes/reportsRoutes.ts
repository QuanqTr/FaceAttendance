import { Express } from "express";
import { ensureAuthenticated } from "../middlewares/auth";
import {
    exportReports,
    getAttendanceSummaryReport,
    getStatisticsReport,
    getDepartmentSummaryReport
} from "../controllers/reportsController";

export function reportsRoutes(app: Express) {
    // Reports endpoints

    // Export reports in various formats
    app.post("/api/reports/export", ensureAuthenticated, exportReports);

    // Get attendance summary report
    app.get("/api/reports/attendance-summary", ensureAuthenticated, getAttendanceSummaryReport);

    // Get statistics report
    app.get("/api/reports/statistics", ensureAuthenticated, getStatisticsReport);

    // Get department summary report
    app.get("/api/reports/department-summary", ensureAuthenticated, getDepartmentSummaryReport);
} 