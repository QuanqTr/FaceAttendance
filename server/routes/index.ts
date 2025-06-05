import { Express } from "express";
import { healthRoutes } from "./healthRoutes.js";
import { authRoutes } from "./authRoutes.js";
import { leaveRequestRoutes } from "./leaveRequestRoutes.js";
import { employeeRoutes } from "./employeeRoutes.js";
import { departmentRoutes } from "./departmentRoutes.js";
import { faceRecognitionRoutes } from "./faceRecognitionRoutes.js";
import { attendanceRoutes } from "./attendanceRoutes.js";
import { attendanceSummaryRoutes } from "./attendanceSummaryRoutes.js";
import { userRoutes } from "./userRoutes.js";
import { statisticsRoutes } from "./statisticsRoutes.js";
import { managerRoutes } from "./managerRoutes.js";
import { managerStatsRoutes } from "./managerStatsRoutes.js";
import { managerReportsRoutes } from "./managerReportsRoutes.js";
import { advancedFaceRoutes } from "./advancedFaceRoutes.js";
import { workHoursRoutes } from "./workHoursRoutes.js";
import { adminRoutes } from "./adminRoutes.js";
import { simpleDataRoutes } from "./simpleDataRoutes.js";
import reportRoutes from "./reportRoutes.js";
import { faceRoutes } from "./faceRoutes.js";
import { screenshotRoutes } from "./screenshotRoutes.js";

export function registerRoutes(app: Express) {
    // Development shutdown endpoint
    if (process.env.NODE_ENV === "development") {
        app.post("/api/shutdown", (req, res) => {
            res.json({ message: "Server shutting down..." });
            setTimeout(() => process.exit(0), 1000);
        });
    }

    // Health check
    healthRoutes(app);

    // Simple data routes (direct PostgreSQL)
    simpleDataRoutes(app);

    // Authentication
    authRoutes(app);

    // Core entities
    departmentRoutes(app);
    employeeRoutes(app);
    userRoutes(app);

    // Leave management
    leaveRequestRoutes(app);

    // Attendance and time tracking
    attendanceRoutes(app);
    attendanceSummaryRoutes(app);
    workHoursRoutes(app);

    // Face recognition
    faceRecognitionRoutes(app);
    advancedFaceRoutes(app);

    // Statistics and reports
    statisticsRoutes(app);

    // Reports API
    app.use("/api/reports", reportRoutes);

    // Manager functions
    managerRoutes(app);
    managerStatsRoutes(app);
    managerReportsRoutes(app);

    // Admin functions
    adminRoutes(app);

    // Public route for face recognition live - only in production
    if (process.env.NODE_ENV === "production") {
        app.get("/face-recognition-live", (req, res) => {
            const path = require('path');
            const { fileURLToPath } = require('url');
            const { dirname } = require('path');
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = dirname(__filename);

            const clientDistPath = path.resolve(__dirname, '../../client/dist/index.html');
            res.sendFile(clientDistPath);
        });
    }

    // Face management routes
    faceRoutes(app);

    // Screenshot routes for Firebase
    screenshotRoutes(app);
}