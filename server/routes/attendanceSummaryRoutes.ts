import { Express } from "express";
import { ensureAuthenticated } from "../middlewares/auth";
import {
    getAllEmployeesAttendanceSummary,
    getEmployeeAttendanceSummary,
    createAttendanceSummary,
    updateAttendanceSummary,
    calculateMonthlyAttendanceSummary
} from "../controllers/attendanceSummaryController";

export function attendanceSummaryRoutes(app: Express) {
    // Get all employees attendance summaries for a specific month/year
    app.get("/api/attendance-summary", ensureAuthenticated, getAllEmployeesAttendanceSummary);

    // Employee-specific attendance summary routes
    app.get("/api/attendance-summary/employee/:employeeId", ensureAuthenticated, getEmployeeAttendanceSummary);
    app.post("/api/attendance-summary", ensureAuthenticated, createAttendanceSummary);
    app.put("/api/attendance-summary/:id", ensureAuthenticated, updateAttendanceSummary);
    app.post("/api/attendance-summary/calculate/:employeeId", ensureAuthenticated, calculateMonthlyAttendanceSummary);
} 