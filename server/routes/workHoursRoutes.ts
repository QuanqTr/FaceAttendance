import { Express } from "express";
import { ensureAuthenticated } from "../middlewares/auth";
import {
    updateWorkHours,
    getDailyWorkHours,
    getEmployeeWorkHours
} from "../controllers/workHoursController";

export function workHoursRoutes(app: Express) {
    app.post("/api/work-hours", ensureAuthenticated, updateWorkHours);
    app.get("/api/work-hours/daily", ensureAuthenticated, getDailyWorkHours);

    // Work hours endpoints from old server (no auth for testing)
    app.get("/api/work-hours/employee/:employeeId", getEmployeeWorkHours);
    app.get("/api/work-hours/employee/:id", getEmployeeWorkHours);

    // Test endpoint with different path
    app.get("/api/test/work-hours/employee/:id", getEmployeeWorkHours);
} 