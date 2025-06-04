import { Express } from "express";
import { ensureManager } from "../middlewares/auth";
import {
  getDepartmentInfo,
  getDailyStats,
  getPendingCounts,
  getDepartmentEmployees,
  getDepartmentOverallStats,
  getDepartmentAttendanceRecords,
  getDepartmentTopPerformers,
  getDepartmentPenaltyAnalysis,
  getDepartmentAttendanceTrends
} from "../controllers/managerStatsController";

export function managerStatsRoutes(app: Express) {
  // Manager department info
  app.get("/api/manager/department-info", ensureManager, getDepartmentInfo);
  app.get("/api/manager/stats/daily", ensureManager, getDailyStats);
  app.get("/api/manager/pending-counts", ensureManager, getPendingCounts);
  app.get("/api/manager/employees", ensureManager, getDepartmentEmployees);

  // Manager stats endpoints - department specific
  app.get("/api/manager/stats/department-overall", ensureManager, getDepartmentOverallStats);
  app.get("/api/manager/stats/attendance-records", ensureManager, getDepartmentAttendanceRecords);
  app.get("/api/manager/stats/top-performers", ensureManager, getDepartmentTopPerformers);
  app.get("/api/manager/stats/penalty-analysis", ensureManager, getDepartmentPenaltyAnalysis);
  app.get("/api/manager/stats/attendance-trends", ensureManager, getDepartmentAttendanceTrends);
}
