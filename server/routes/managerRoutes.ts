import { Express } from "express";
import { ensureAuthenticated, ensureManager } from "../middlewares/auth";
import {
    getAllManagers,
    getManagerDailyStats,
    getManagerWeeklyStats,
    getManagerDepartmentStats,
    getManagerLeaveRequests,
    getManagerLeaveRequest,
    getManagerEmployees,
    getManagerAttendanceSummary,
    createManagerLeaveRequest,
    approveLeaveRequest,
    rejectLeaveRequest
} from "../controllers/managerController";

export function managerRoutes(app: Express) {
    // Manager endpoints

    // Get all managers
    app.get("/api/managers", ensureAuthenticated, getAllManagers);
    app.get("/api/managers/all", ensureAuthenticated, getAllManagers);

    // Manager statistics
    app.get("/api/manager/stats/daily", ensureManager, getManagerDailyStats);
    app.get("/api/manager/stats/weekly", ensureManager, getManagerWeeklyStats);
    app.get("/api/manager/stats/departments", ensureManager, getManagerDepartmentStats);

    // Manager leave requests
    app.get("/api/manager/leave-requests", ensureManager, getManagerLeaveRequests);
    app.get("/api/manager/leave-requests/:id", ensureManager, getManagerLeaveRequest);
    app.post("/api/manager/leave-requests", ensureManager, createManagerLeaveRequest);
    app.put("/api/manager/leave-requests/:id/approve", ensureManager, approveLeaveRequest);
    app.put("/api/manager/leave-requests/:id/reject", ensureManager, rejectLeaveRequest);

    // Manager employee management
    app.get("/api/manager/employees", ensureManager, getManagerEmployees);

    // Manager attendance
    app.get("/api/manager/attendance-summary", ensureManager, getManagerAttendanceSummary);
} 