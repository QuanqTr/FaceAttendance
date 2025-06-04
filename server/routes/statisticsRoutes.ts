import { Express } from "express";
import { ensureAuthenticated } from "../middlewares/auth";
import {
    getDepartmentStats,
    getDailyStats,
    getWeeklyStats,
    getMonthlyTrends
} from "../controllers/statisticsController";

export function statisticsRoutes(app: Express) {
    // Statistics endpoints

    // Get department attendance stats
    app.get("/api/stats/departments", ensureAuthenticated, getDepartmentStats);

    // Get daily stats
    app.get("/api/stats/daily", ensureAuthenticated, getDailyStats);

    // Get weekly stats
    app.get("/api/stats/weekly", ensureAuthenticated, getWeeklyStats);

    // Get monthly trends
    app.get("/api/stats/monthly", ensureAuthenticated, getMonthlyTrends);

    // Development endpoint to create sample data
    if (process.env.NODE_ENV === 'development') {
        app.post("/api/stats/create-sample-data", ensureAuthenticated, async (req, res) => {
            try {
                const { pool } = await import("../db.js");

                // Read and execute the SQL script
                const fs = await import("fs");
                const path = await import("path");
                const sqlScript = fs.readFileSync(
                    path.join(process.cwd(), "scripts", "create-sample-data.sql"),
                    "utf8"
                );

                await pool.query(sqlScript);

                res.json({ success: true, message: "Sample data created successfully" });
            } catch (error) {
                console.error("Error creating sample data:", error);
                res.status(500).json({ error: "Failed to create sample data" });
            }
        });
    }
}