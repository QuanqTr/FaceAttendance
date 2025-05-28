import { Router } from "express";
import {
    getMonthlyAttendanceReport,
    getDepartmentStats,
    getOverallStats,
    getTopPerformers,
    getAttendanceTrends,
    getPenaltyAnalysis
} from "../controllers/reportController.js";
import { ensureAuthenticated } from "../middlewares/auth.js";

const router = Router();

// Apply authentication middleware to all report routes
router.use(ensureAuthenticated);

// Monthly attendance summary report
router.get("/monthly-attendance", getMonthlyAttendanceReport);

// Department statistics 
router.get("/department-stats", getDepartmentStats);

// Overall statistics summary
router.get("/overall-stats", getOverallStats);

// Top performers
router.get("/top-performers", getTopPerformers);

// Attendance trends over multiple months
router.get("/attendance-trends", getAttendanceTrends);

// Penalty analysis
router.get("/penalty-analysis", getPenaltyAnalysis);

export default router; 