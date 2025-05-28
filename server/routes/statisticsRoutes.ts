import { Express } from "express";
import { ensureAuthenticated } from "../middlewares/auth";
import {
    getDepartmentStats,
    getDailyStats,
    getWeeklyStats
} from "../controllers/statisticsController";

export function statisticsRoutes(app: Express) {
    // Statistics endpoints

    // Get department attendance stats
    app.get("/api/stats/departments", ensureAuthenticated, getDepartmentStats);

    // Get daily stats
    app.get("/api/stats/daily", ensureAuthenticated, getDailyStats);

    // Get weekly stats
    app.get("/api/stats/weekly", ensureAuthenticated, getWeeklyStats);
} 