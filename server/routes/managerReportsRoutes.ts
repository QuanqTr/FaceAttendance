import { Express } from "express";
import { ensureManager } from "../middlewares/auth";
import {
  getManagerOverallStats,
  getManagerAttendanceRecords,
  getManagerTopPerformers,
  getManagerPenaltyAnalysis,
  getManagerEmployeeAttendanceHistory
} from "../controllers/managerReportsController";

export function managerReportsRoutes(app: Express) {
  // Manager Reports endpoints - department specific (based on admin reports)
  app.get("/api/manager/reports/overall-stats", ensureManager, getManagerOverallStats);
  app.get("/api/manager/reports/attendance-records", ensureManager, getManagerAttendanceRecords);
  app.get("/api/manager/reports/top-performers", ensureManager, getManagerTopPerformers);
  app.get("/api/manager/reports/penalty-analysis", ensureManager, getManagerPenaltyAnalysis);

  // Employee specific attendance history
  app.get("/api/manager/reports/employee/:employeeId/attendance-history", ensureManager, getManagerEmployeeAttendanceHistory);
}
