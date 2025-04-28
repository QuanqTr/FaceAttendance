import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { 
  insertDepartmentSchema, 
  insertEmployeeSchema, 
  insertAttendanceRecordSchema,
  attendanceStatusEnum
} from "@shared/schema";
import { eq } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Middleware to check if user is authenticated
  const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // Department routes
  app.get("/api/departments", async (req, res, next) => {
    try {
      const departments = await storage.getAllDepartments();
      res.json(departments);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/departments", ensureAuthenticated, async (req, res, next) => {
    try {
      const departmentData = insertDepartmentSchema.parse(req.body);
      const department = await storage.createDepartment(departmentData);
      res.status(201).json(department);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });

  app.get("/api/departments/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid department ID" });
      }
      
      const department = await storage.getDepartment(id);
      if (!department) {
        return res.status(404).json({ message: "Department not found" });
      }
      
      res.json(department);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/departments/:id", ensureAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid department ID" });
      }
      
      const departmentData = insertDepartmentSchema.partial().parse(req.body);
      const department = await storage.updateDepartment(id, departmentData);
      
      if (!department) {
        return res.status(404).json({ message: "Department not found" });
      }
      
      res.json(department);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });

  app.delete("/api/departments/:id", ensureAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid department ID" });
      }
      
      await storage.deleteDepartment(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Employee routes
  app.get("/api/employees", async (req, res, next) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const employees = await storage.getAllEmployees(page, limit);
      res.json(employees);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/employees", ensureAuthenticated, async (req, res, next) => {
    try {
      const employeeData = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(employeeData);
      res.status(201).json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });

  app.get("/api/employees/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid employee ID" });
      }
      
      const employee = await storage.getEmployee(id);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      res.json(employee);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/employees/:id", ensureAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid employee ID" });
      }
      
      const employeeData = insertEmployeeSchema.partial().parse(req.body);
      const employee = await storage.updateEmployee(id, employeeData);
      
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      res.json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });

  app.delete("/api/employees/:id", ensureAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid employee ID" });
      }
      
      await storage.deleteEmployee(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Attendance routes
  app.post("/api/attendance", async (req, res, next) => {
    try {
      const attendanceData = insertAttendanceRecordSchema.parse(req.body);
      
      // Get employee to check if they exist
      const employee = await storage.getEmployee(attendanceData.employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // For clock in, check if there's already a clock in for today
      if (attendanceData.type === 'in') {
        const existingRecord = await storage.getLatestAttendanceRecord(attendanceData.employeeId, today);
        if (existingRecord && existingRecord.type === 'in') {
          return res.status(400).json({ message: "Employee has already clocked in today" });
        }
      } else if (attendanceData.type === 'out') {
        // For clock out, check if there's a clock in first
        const existingRecord = await storage.getLatestAttendanceRecord(attendanceData.employeeId, today);
        if (!existingRecord || existingRecord.type === 'out') {
          return res.status(400).json({ message: "Employee has not clocked in today yet" });
        }
      }
      
      const record = await storage.createAttendanceRecord(attendanceData);
      res.status(201).json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });

  app.get("/api/attendance/employee/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid employee ID" });
      }
      
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const records = await storage.getEmployeeAttendance(id, startDate, endDate);
      res.json(records);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/attendance/daily", async (req, res, next) => {
    try {
      const date = req.query.date ? new Date(req.query.date as string) : new Date();
      const records = await storage.getDailyAttendance(date);
      res.json(records);
    } catch (error) {
      next(error);
    }
  });

  // Statistics routes
  app.get("/api/stats/departments", async (req, res, next) => {
    try {
      const date = req.query.date ? new Date(req.query.date as string) : new Date();
      const stats = await storage.getDepartmentAttendanceStats(date);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/stats/daily", async (req, res, next) => {
    try {
      const date = req.query.date ? new Date(req.query.date as string) : new Date();
      const summary = await storage.getDailyAttendanceSummary(date);
      res.json(summary);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/stats/weekly", async (req, res, next) => {
    try {
      // Default to current week if not specified
      const today = new Date();
      const dayOfWeek = today.getDay();
      
      // Calculate start of week (Sunday)
      const startDate = req.query.startDate 
        ? new Date(req.query.startDate as string) 
        : new Date(today.setDate(today.getDate() - dayOfWeek));
      
      // Calculate end of week (Saturday)
      const endDate = req.query.endDate 
        ? new Date(req.query.endDate as string) 
        : new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      
      const weeklyStats = await storage.getWeeklyAttendance(startDate, endDate);
      res.json(weeklyStats);
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
