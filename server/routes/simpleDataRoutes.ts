import { Express } from "express";
import { ensureAuthenticated } from "../middlewares/auth";
import {
    getWorkHoursData,
    getAttendanceSummaryData,
    testDatabase,
    getDepartmentsData,
    getUsersData,
    debugDepartments,
    debugUsers,
    checkMissingManager,
    fixDepartmentManagers,
    checkEmployeeManagerStructure
} from "../controllers/simpleDataController";

export function simpleDataRoutes(app: Express) {
    // Simple work hours endpoint
    app.get("/api/simple/work-hours", ensureAuthenticated, getWorkHoursData);

    // Simple attendance summary endpoint  
    app.get("/api/simple/attendance-summary", ensureAuthenticated, getAttendanceSummaryData);

    // Simple departments endpoint
    app.get("/api/simple/departments", ensureAuthenticated, getDepartmentsData);

    // Simple users endpoint
    app.get("/api/simple/users", ensureAuthenticated, getUsersData);

    // Database test endpoint (development only)
    if (process.env.NODE_ENV === "development") {
        app.get("/api/simple/test", testDatabase);
        app.get("/api/simple/debug-departments", debugDepartments);
        app.get("/api/simple/debug-users", debugUsers);
        app.get("/api/simple/check-missing-manager", checkMissingManager);
        app.get("/api/simple/check-employee-manager", checkEmployeeManagerStructure);
        app.post("/api/simple/fix-departments", fixDepartmentManagers);
    }
} 