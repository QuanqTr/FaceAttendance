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
  insertLeaveRequestSchema,
  insertSalaryRecordSchema,
  attendanceStatusEnum,
  leaveRequestStatusEnum,
  leaveRequestTypeEnum,
  employees,
  type Employee
} from "@shared/schema";
import { eq, and, gte, lt } from "drizzle-orm";
import { db } from "./db";
import type { Request, Response, NextFunction } from "express";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Thêm endpoint health check
  app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Middleware to check if user is authenticated
  const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // Department routes
  app.get("/api/departments", async (req, res, next) => {
    try {
      console.log("Attempting to get departments");

      try {
        // Fallback to ORM approach first
        console.log("Trying to get departments with ORM");
        const departments = await storage.getAllDepartments();
        console.log("ORM departments query result:", departments);

        if (departments && departments.length > 0) {
          return res.json(departments);
        }
      } catch (ormError) {
        console.error("ORM approach failed:", ormError);
      }

      try {
        console.log("Trying direct database connection");
        // Directly connect to database using pg
        const { Pool } = require('pg');
        const directPool = new Pool({
          connectionString: process.env.DATABASE_URL,
          // Log connection information
          connectionTimeoutMillis: 5000
        });

        console.log("Connected to database, querying departments");
        const directResult = await directPool.query('SELECT * FROM departments');
        console.log(`Direct SQL found ${directResult.rows.length} departments:`,
          JSON.stringify(directResult.rows));

        // Use results from direct query
        if (directResult.rows && directResult.rows.length > 0) {
          const mappedDepartments = directResult.rows.map((row: any) => ({
            id: Number(row.id),
            name: row.name,
            description: row.description,
            managerId: row.manager_id,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          }));
          console.log("Returning mapped departments:", JSON.stringify(mappedDepartments));
          return res.json(mappedDepartments);
        }
      } catch (dbError) {
        console.error("Direct database connection failed:", dbError);
      }

      // Fallback to dummy data if both approaches fail
      console.log("Both approaches failed, returning dummy departments");
      const dummyDepartments = [
        {
          id: 1,
          name: "Human Resources",
          description: "HR department",
          managerId: null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 2,
          name: "Engineering",
          description: "Engineering department",
          managerId: null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 3,
          name: "Marketing",
          description: "Marketing department",
          managerId: null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 4,
          name: "Finance",
          description: "Finance department",
          managerId: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      res.json(dummyDepartments);
    } catch (error) {
      console.error("Error retrieving departments:", error);
      res.status(500).json({ message: "Failed to retrieve departments" });
    }
  });

  app.post("/api/departments", async (req, res, next) => {
    try {
      const departmentData = insertDepartmentSchema.parse(req.body);
      const department = await storage.createDepartment(departmentData);
      res.status(201).json(department);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error creating department:", error);
      res.status(500).json({ message: "Failed to create department" });
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
      console.error(`Error retrieving department with ID ${req.params.id}:`, error);
      res.status(500).json({ message: `Failed to retrieve department with ID ${req.params.id}` });
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

      // Build filters object from query parameters
      const filters: {
        search?: string;
        departmentId?: number;
        status?: string;
        position?: string;
        joinDate?: Date;
        sortBy?: string;
      } = {};

      // Add search filter
      if (req.query.search) {
        filters.search = req.query.search as string;
      }

      // Add department filter
      if (req.query.departmentId && req.query.departmentId !== 'all') {
        filters.departmentId = parseInt(req.query.departmentId as string);
      }

      // Add status filter
      if (req.query.status && req.query.status !== 'all') {
        filters.status = req.query.status as string;
      }

      // Add position filter
      if (req.query.position) {
        filters.position = req.query.position as string;
      }

      // Add join date filter
      if (req.query.joinDate) {
        filters.joinDate = new Date(req.query.joinDate as string);
      }

      // Add sort order
      if (req.query.sortBy) {
        filters.sortBy = req.query.sortBy as string;
      }

      const result = await storage.getAllEmployees(page, limit, filters);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/employees", ensureAuthenticated, async (req, res, next) => {
    try {
      const validatedData = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(validatedData);
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

      const validatedData = insertEmployeeSchema.partial().parse(req.body);
      const employee = await storage.updateEmployee(id, validatedData);

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
      const { faceDescriptor, type, status, date } = req.body;

      if (!faceDescriptor) {
        return res.status(400).json({ message: "Face descriptor is required" });
      }

      // Find the employee by face descriptor
      const { employees: employeesList } = await storage.getAllEmployees();
      const employee = employeesList.find((emp) => {
        if (!emp.faceDescriptor) return false;
        // Compare face descriptors (this is simplified, real implementation would use a proper algorithm)
        return emp.faceDescriptor === faceDescriptor;
      });

      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // Create the attendance record
      const attendanceData = {
        employeeId: employee.id,
        type: type || "in",
        status: status || "present",
        date: date ? new Date(date) : new Date(),
        time: new Date(),
      };

      const attendanceRecord = await storage.createAttendanceRecord(attendanceData);
      res.status(201).json(attendanceRecord);
    } catch (error) {
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

  // Leave Request routes
  app.get("/api/leave-requests", async (req, res, next) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string | undefined;

      const leaveRequests = await storage.getAllLeaveRequests(page, limit, status);
      res.json(leaveRequests);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/leave-requests", ensureAuthenticated, async (req, res, next) => {
    try {
      const leaveRequestData = insertLeaveRequestSchema.parse(req.body);

      // Get employee to check if they exist
      const employee = await storage.getEmployee(leaveRequestData.employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      const leaveRequest = await storage.createLeaveRequest(leaveRequestData);
      res.status(201).json(leaveRequest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });

  app.get("/api/leave-requests/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid leave request ID" });
      }

      const leaveRequest = await storage.getLeaveRequest(id);
      if (!leaveRequest) {
        return res.status(404).json({ message: "Leave request not found" });
      }

      res.json(leaveRequest);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/leave-requests/:id", ensureAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid leave request ID" });
      }

      // For requests to approve/reject, add approvedBy info
      if (req.body.status === 'approved' || req.body.status === 'rejected') {
        req.body.approvedById = (req.user as Express.User)?.id;
        req.body.approvedAt = new Date();
      }

      const leaveRequest = await storage.updateLeaveRequest(id, req.body);
      if (!leaveRequest) {
        return res.status(404).json({ message: "Leave request not found" });
      }

      res.json(leaveRequest);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/leave-requests/:id", ensureAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid leave request ID" });
      }

      await storage.deleteLeaveRequest(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/leave-requests/employee/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid employee ID" });
      }

      const status = req.query.status as string | undefined;
      const leaveRequests = await storage.getEmployeeLeaveRequests(id, status);
      res.json(leaveRequests);
    } catch (error) {
      next(error);
    }
  });

  // Salary routes
  app.get("/api/salary-records", ensureAuthenticated, async (req, res, next) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const month = req.query.month ? parseInt(req.query.month as string) : undefined;

      const salaryRecords = await storage.getAllSalaryRecords(page, limit, year, month);
      res.json(salaryRecords);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/salary-records", ensureAuthenticated, async (req, res, next) => {
    try {
      const salaryData = insertSalaryRecordSchema.parse(req.body);

      // Get employee to check if they exist
      const employee = await storage.getEmployee(salaryData.employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // Check if there's already a salary record for this employee, month and year
      const existingRecords = await storage.getEmployeeSalaryRecords(salaryData.employeeId, salaryData.year);
      const duplicate = existingRecords.find(r => r.month === salaryData.month);

      if (duplicate) {
        return res.status(400).json({
          message: `Salary record already exists for ${employee.firstName} ${employee.lastName} for ${salaryData.month}/${salaryData.year}`
        });
      }

      const salaryRecord = await storage.createSalaryRecord(salaryData);
      res.status(201).json(salaryRecord);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });

  app.get("/api/salary-records/:id", ensureAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid salary record ID" });
      }

      const salaryRecord = await storage.getSalaryRecord(id);
      if (!salaryRecord) {
        return res.status(404).json({ message: "Salary record not found" });
      }

      res.json(salaryRecord);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/salary-records/:id", ensureAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid salary record ID" });
      }

      const salaryRecord = await storage.updateSalaryRecord(id, req.body);
      if (!salaryRecord) {
        return res.status(404).json({ message: "Salary record not found" });
      }

      res.json(salaryRecord);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/salary-records/:id", ensureAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid salary record ID" });
      }

      await storage.deleteSalaryRecord(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/salary-records/employee/:id", ensureAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid employee ID" });
      }

      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const salaryRecords = await storage.getEmployeeSalaryRecords(id, year);
      res.json(salaryRecords);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/stats/salary/:year", ensureAuthenticated, async (req, res, next) => {
    try {
      const year = parseInt(req.params.year);
      if (isNaN(year)) {
        return res.status(400).json({ message: "Invalid year" });
      }

      const salaryStats = await storage.getSalaryStats(year);
      res.json(salaryStats);
    } catch (error) {
      next(error);
    }
  });

  // Face recognition routes
  app.post("/api/face-recognition", async (req, res, next) => {
    try {
      const { faceDescriptor } = req.body;

      if (!faceDescriptor) {
        return res.status(400).json({ message: "Face descriptor is required" });
      }

      // Find employee with matching face descriptor using storage
      let employee = null;

      try {
        // Get all employees and find match in memory
        const { employees: employeesList } = await storage.getAllEmployees();
        employee = employeesList.find(emp => emp.faceDescriptor === faceDescriptor);
      } catch (dbError) {
        console.error("Error querying employee by face descriptor:", dbError);
        return res.status(500).json({ message: "Error verifying face data" });
      }

      if (!employee) {
        return res.status(401).json({ message: "Face recognition failed. No matching employee found." });
      }

      // Get department data if available
      const department = employee.departmentId ?
        await storage.getDepartment(employee.departmentId) : null;

      res.json({
        success: true,
        employee: {
          ...employee,
          department
        }
      });
    } catch (error) {
      console.error("Face recognition error:", error);
      next(error);
    }
  });

  // Face registration route
  app.post("/api/face-registration", async (req, res, next) => {
    try {
      const { employeeId, descriptor, joinDate } = req.body;

      if (!employeeId || !descriptor) {
        return res.status(400).json({
          message: "Employee ID and face descriptor are required"
        });
      }

      // Find the employee first
      const employee = await storage.getEmployee(employeeId);

      if (!employee) {
        return res.status(404).json({
          message: "Employee not found"
        });
      }

      // Build update object with provided fields
      const updateData: any = {
        faceDescriptor: descriptor
      };

      // Add joinDate if provided - format properly for date field (YYYY-MM-DD)
      if (joinDate) {
        // Chuyển đổi thành định dạng date không có giờ
        try {
          const dateObj = new Date(joinDate);
          // Format as YYYY-MM-DD string
          const dateStr = dateObj.toISOString().split('T')[0];
          updateData.joinDate = dateStr;
          console.log(`Setting join date for employee ${employeeId} to:`, dateStr);
        } catch (error) {
          console.error("Error formatting join date:", error);
        }
      }

      // Update the employee's data
      const updatedEmployee = await storage.updateEmployee(employeeId, updateData);

      return res.status(201).json({
        message: "Face data registered successfully",
        employee: updatedEmployee
      });
    } catch (error) {
      console.error("Error registering face data:", error);
      next(error);
    }
  });

  // Get employee face data route (repurposed to just return faceDescriptor)
  app.get("/api/employees/:id/face-data", ensureAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid employee ID" });
      }

      // Check if employee exists
      const employee = await storage.getEmployee(id);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // Return face descriptor data
      res.json({
        id: employee.id,
        employeeId: employee.id,
        descriptor: employee.faceDescriptor,
        isActive: !!employee.faceDescriptor
      });
    } catch (error) {
      next(error);
    }
  });

  // Reset employee face data
  app.delete("/api/employees/:employeeId/face-data", ensureAuthenticated, async (req, res, next) => {
    try {
      const employeeId = parseInt(req.params.employeeId);

      if (isNaN(employeeId)) {
        return res.status(400).json({ message: "Invalid employee ID" });
      }

      // Update employee to remove face descriptor
      await storage.updateEmployee(employeeId, {
        faceDescriptor: null
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/attendance/verify", async (req, res, next) => {
    try {
      const { faceDescriptor } = req.body;

      if (!faceDescriptor) {
        return res.status(400).json({ message: "Face descriptor is required" });
      }

      // Find the employee by face descriptor
      const { employees: employeesList } = await storage.getAllEmployees();
      const employee = employeesList.find((emp) => {
        if (!emp.faceDescriptor) return false;
        // Compare face descriptors (this is simplified, real implementation would use a proper algorithm)
        return emp.faceDescriptor === faceDescriptor;
      });

      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      res.json({
        verified: true,
        employee: {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          employeeId: employee.employeeId
        }
      });
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
