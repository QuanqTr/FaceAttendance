import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
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
  users,
  type Employee,
  type User,
  type InsertUser
} from "@shared/schema";
import { eq, and, gte, lt, ne } from "drizzle-orm";
import { db } from "./db";
import type { Request, Response, NextFunction } from "express";
import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Thêm endpoint health check
  app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Public route for face recognition live - không cần xác thực
  app.get("/face-recognition-live", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
  });

  // API endpoint để xử lý nhận diện khuôn mặt và điểm danh tự động
  app.post("/api/face-recognition/verify", async (req, res) => {
    try {
      const faceDescriptorSchema = z.object({
        descriptor: z.string(),
        mode: z.enum(['check_in', 'check_out']).optional().default('check_in')
      });

      const { descriptor, mode } = faceDescriptorSchema.parse(req.body);

      // Chuyển đổi descriptor từ string về array
      const descriptorArray = descriptor.split(',').map(Number);

      // Lấy danh sách tất cả nhân viên có face descriptor
      const employeesWithFace = await storage.getEmployeesWithFaceDescriptor();

      if (!employeesWithFace || employeesWithFace.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy nhân viên nào có dữ liệu khuôn mặt"
        });
      }

      // Tìm nhân viên phù hợp nhất với descriptor
      let bestMatch = null;
      let bestDistance = 1.0; // Giá trị ban đầu cao

      for (const employee of employeesWithFace) {
        if (!employee.faceDescriptor) continue;

        // Chuyển đổi descriptor của nhân viên từ string về array
        let employeeDescriptor;
        try {
          // Thử parse JSON nếu là chuỗi JSON
          if (employee.faceDescriptor.startsWith('[') || employee.faceDescriptor.startsWith('{')) {
            employeeDescriptor = JSON.parse(employee.faceDescriptor);
          } else {
            // Nếu không phải JSON, giả định là chuỗi phân tách bằng dấu phẩy
            employeeDescriptor = employee.faceDescriptor.split(',').map(Number);
          }
        } catch (error) {
          console.error(`Error parsing face descriptor for employee ${employee.id}:`, error);
          continue;
        }

        // Tính khoảng cách Euclidean giữa hai descriptor
        const distance = calculateEuclideanDistance(descriptorArray, employeeDescriptor);

        // Nếu khoảng cách nhỏ hơn, cập nhật best match
        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = employee;
        }
      }

      // Threshold cho việc nhận diện (giá trị 0.4 có thể điều chỉnh)
      const threshold = 0.4;
      if (!bestMatch || bestDistance > threshold) {
        return res.status(401).json({
          success: false,
          message: "Không thể nhận diện khuôn mặt. Vui lòng thử lại."
        });
      }

      // Lấy thông tin nhân viên đầy đủ
      const employee = await storage.getEmployee(bestMatch.id);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy thông tin nhân viên"
        });
      }

      // Lấy thông tin phòng ban nếu có
      const department = employee.departmentId ?
        await storage.getDepartment(employee.departmentId) : null;

      // Lấy thời gian hiện tại
      const currentTime = new Date();

      // Tạo startOfDay và endOfDay cho ngày hiện tại
      const startOfDay = new Date(currentTime);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(currentTime);
      endOfDay.setHours(23, 59, 59, 999);

      // Lấy các time logs của nhân viên trong ngày hôm nay
      const todayLogs = await storage.getEmployeeTimeLogs(employee.id, currentTime);

      // Kiểm tra xem có thể thực hiện check-in/check-out không
      const logType = mode === 'check_in' ? 'checkin' as const : 'checkout' as const;

      if (logType === 'checkin') {
        // Kiểm tra xem nhân viên này đã check-in chưa check-out không
        const hasUnpairedCheckin = todayLogs.some(log => {
          if (log.type === 'checkin' && log.employeeId === employee.id) {
            // Kiểm tra xem có checkout sau check-in này không
            const hasMatchingCheckout = todayLogs.some(checkout =>
              checkout.type === 'checkout' &&
              checkout.employeeId === employee.id &&
              checkout.logTime.getTime() > log.logTime.getTime()
            );
            // Nếu không có checkout tương ứng, đây là check-in chưa được ghép cặp
            return !hasMatchingCheckout;
          }
          return false;
        });

        if (hasUnpairedCheckin) {
          return res.status(400).json({
            success: false,
            message: "Bạn đã check-in trước đó. Vui lòng check-out trước khi check-in lại."
          });
        }

        // Kiểm tra thời gian giữa các lần check-in của nhân viên này (tối thiểu 1 phút)
        const lastCheckin = todayLogs
          .filter(log => log.type === 'checkin' && log.employeeId === employee.id)
          .sort((a, b) => b.logTime.getTime() - a.logTime.getTime())[0];

        if (lastCheckin && (currentTime.getTime() - lastCheckin.logTime.getTime() < 60000)) {
          return res.status(400).json({
            success: false,
            message: "Vui lòng đợi ít nhất 1 phút trước khi check-in lại."
          });
        }
      } else if (logType === 'checkout') {
        // Kiểm tra xem nhân viên này đã check-in chưa
        const hasCheckinToday = todayLogs.some(log =>
          log.type === 'checkin' && log.employeeId === employee.id
        );

        if (!hasCheckinToday) {
          return res.status(400).json({
            success: false,
            message: "Bạn chưa check-in hôm nay. Vui lòng check-in trước khi check-out."
          });
        }

        // Kiểm tra xem nhân viên này có check-in chưa được ghép cặp với checkout không
        const hasUnpairedCheckin = todayLogs.some(log => {
          if (log.type === 'checkin' && log.employeeId === employee.id) {
            const hasMatchingCheckout = todayLogs.some(checkout =>
              checkout.type === 'checkout' &&
              checkout.employeeId === employee.id &&
              checkout.logTime.getTime() > log.logTime.getTime()
            );
            return !hasMatchingCheckout;
          }
          return false;
        });

        if (!hasUnpairedCheckin) {
          return res.status(400).json({
            success: false,
            message: "Không có check-in nào cần check-out. Vui lòng check-in trước."
          });
        }

        // Kiểm tra thời gian giữa các lần check-out của nhân viên này (tối thiểu 1 phút)
        const lastCheckout = todayLogs
          .filter(log => log.type === 'checkout' && log.employeeId === employee.id)
          .sort((a, b) => b.logTime.getTime() - a.logTime.getTime())[0];

        if (lastCheckout && (currentTime.getTime() - lastCheckout.logTime.getTime() < 60000)) {
          return res.status(400).json({
            success: false,
            message: "Vui lòng đợi ít nhất 1 phút trước khi check-out lại."
          });
        }
      }

      // Tạo time log mới
      const timeLog = {
        employeeId: employee.id,
        type: logType,
        logTime: currentTime,
        source: 'face'
      };

      // Lưu time log
      const createdTimeLog = await storage.createTimeLog(timeLog);

      // Trả về kết quả
      res.json({
        success: true,
        message: `Đã ${mode === 'check_in' ? 'check in' : 'check out'} thành công`,
        employee: {
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          department: department ? {
            id: department.id,
            name: department.name
          } : null,
          position: employee.position,
          confidence: 1 - bestDistance
        },
        attendance: {
          id: createdTimeLog.id,
          type: createdTimeLog.type,
          time: createdTimeLog.logTime
        }
      });
    } catch (error) {
      console.error("Lỗi xử lý nhận diện khuôn mặt:", error);

      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({
          success: false,
          message: validationError.message
        });
      }

      res.status(500).json({
        success: false,
        message: "Lỗi máy chủ khi xử lý nhận diện khuôn mặt"
      });
    }
  });

  // Helper function để tính khoảng cách Euclidean
  function calculateEuclideanDistance(vec1: number[], vec2: number[]): number {
    if (!Array.isArray(vec1) || !Array.isArray(vec2)) {
      console.error("Invalid vectors:", { vec1Type: typeof vec1, vec2Type: typeof vec2 });
      return Number.MAX_VALUE; // Trả về giá trị lớn để không match
    }

    if (vec1.length !== vec2.length) {
      console.error(`Vector length mismatch: ${vec1.length} vs ${vec2.length}`);
      return Number.MAX_VALUE; // Trả về giá trị lớn để không match
    }

    let sum = 0;
    for (let i = 0; i < vec1.length; i++) {
      // Kiểm tra xem các giá trị có phải là số hợp lệ không
      if (isNaN(vec1[i]) || isNaN(vec2[i])) {
        console.error(`NaN detected at index ${i}: ${vec1[i]} vs ${vec2[i]}`);
        return Number.MAX_VALUE;
      }
      const diff = vec1[i] - vec2[i];
      sum += diff * diff;
    }

    const result = Math.sqrt(sum);
    if (isNaN(result)) {
      console.error("Result is NaN, sum =", sum);
      return Number.MAX_VALUE;
    }

    return result;
  }

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

  // API endpoint để lấy danh sách nhân viên có face descriptor - đặt trước các route có tham số
  app.get("/api/employees/with-face-descriptor", async (req, res, next) => {
    try {
      // Lấy danh sách nhân viên có face descriptor
      const employeesWithFace = await storage.getEmployeesWithFaceDescriptor();

      if (!employeesWithFace || employeesWithFace.length === 0) {
        return res.json([]);
      }

      // Chỉ trả về các thông tin cần thiết
      const simplifiedEmployees = employeesWithFace.map(emp => ({
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        faceDescriptor: emp.faceDescriptor
      }));

      res.json(simplifiedEmployees);
    } catch (error) {
      console.error("Error fetching employees with face descriptor:", error);
      next(error);
    }
  });

  // This specific route must come before the generic /:id route
  app.get("/api/employees/without-accounts", ensureAuthenticated, async (req, res, next) => {
    try {
      // Check if user is admin
      const user = req.user as Express.User;
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }

      // First, get all employees
      const allEmployees = await db.select().from(employees);

      // Get all users with associated employee IDs
      const usersWithEmployee = await db
        .select()
        .from(users)
        .where(ne(users.employeeId, null));

      // Get employeeIds that are already associated with accounts
      const employeeIdsWithAccounts = new Set(
        usersWithEmployee.map(user => user.employeeId).filter(Boolean)
      );

      // Filter employees that don't have associated accounts
      const employeesWithoutAccounts = allEmployees.filter(
        employee => !employeeIdsWithAccounts.has(employee.id)
      );

      res.json(employeesWithoutAccounts);
    } catch (error) {
      console.error("Error fetching employees without accounts:", error);
      res.status(500).json({ message: "Failed to fetch employees without accounts" });
    }
  });

  // Get employee by account ID - must come before the generic /:id route
  app.get("/api/employees/by-account/:id", ensureAuthenticated, async (req, res, next) => {
    try {
      const accountId = parseInt(req.params.id);

      if (isNaN(accountId)) {
        return res.status(400).json({ message: "Invalid account ID" });
      }

      // Get user account
      const userAccount = await storage.getUser(accountId);

      if (!userAccount || !userAccount.employeeId) {
        return res.status(404).json({ message: "No employee associated with this account" });
      }

      // Get employee data
      const employee = await storage.getEmployee(userAccount.employeeId);

      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      res.json(employee);
    } catch (error) {
      console.error(`Error fetching employee for account ID ${req.params.id}:`, error);
      res.status(500).json({ message: `Failed to fetch employee data` });
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

  // Time Logs routes - new endpoints for clock-in/clock-out
  app.post("/api/time-logs", async (req, res, next) => {
    try {
      const { faceDescriptor, type } = req.body;

      if (!faceDescriptor) {
        return res.status(400).json({ message: "Face descriptor is required" });
      }

      // Chuyển đổi descriptor từ string về array
      let descriptorArray: number[];
      try {
        if (typeof faceDescriptor === 'string') {
          // Kiểm tra xem có phải là JSON string không
          if (faceDescriptor.startsWith('[') || faceDescriptor.startsWith('{')) {
            descriptorArray = JSON.parse(faceDescriptor);
          } else {
            // Nếu không phải JSON, giả định là chuỗi phân tách bằng dấu phẩy
            descriptorArray = faceDescriptor.split(',').map(Number);
          }
        } else if (Array.isArray(faceDescriptor)) {
          // Nếu đã là array thì sử dụng trực tiếp
          descriptorArray = faceDescriptor;
        } else {
          throw new Error("Invalid face descriptor format");
        }

        // Kiểm tra xem mảng có hợp lệ không
        if (!Array.isArray(descriptorArray) || descriptorArray.length === 0 || descriptorArray.some(isNaN)) {
          throw new Error("Invalid face descriptor data");
        }

        console.log(`Parsed descriptor array with length: ${descriptorArray.length}`);
      } catch (error) {
        console.error("Error parsing face descriptor:", error);
        return res.status(400).json({ message: "Invalid face descriptor format" });
      }

      // Lấy danh sách tất cả nhân viên có face descriptor
      const employeesWithFace = await storage.getEmployeesWithFaceDescriptor();

      if (!employeesWithFace || employeesWithFace.length === 0) {
        return res.status(404).json({
          message: "Không tìm thấy nhân viên nào có dữ liệu khuôn mặt"
        });
      }

      // Tìm nhân viên phù hợp nhất với descriptor
      let bestMatch = null;
      let bestDistance = Number.MAX_VALUE; // Giá trị ban đầu cao (khoảng cách lớn)

      for (const employee of employeesWithFace) {
        if (!employee.faceDescriptor) continue;

        // Chuyển đổi descriptor của nhân viên từ string về array
        let employeeDescriptor;
        try {
          // Thử parse JSON nếu là chuỗi JSON
          if (typeof employee.faceDescriptor === 'string') {
            if (employee.faceDescriptor.startsWith('[') || employee.faceDescriptor.startsWith('{')) {
              employeeDescriptor = JSON.parse(employee.faceDescriptor);
            } else {
              // Nếu không phải JSON, giả định là chuỗi phân tách bằng dấu phẩy
              employeeDescriptor = employee.faceDescriptor.split(',').map(Number);
            }
          } else {
            employeeDescriptor = employee.faceDescriptor;
          }

          // Kiểm tra tính hợp lệ của mảng
          if (!Array.isArray(employeeDescriptor) || employeeDescriptor.length === 0 || employeeDescriptor.some(isNaN)) {
            console.error(`Invalid descriptor for employee ${employee.id}`);
            continue;
          }
        } catch (error) {
          console.error(`Error parsing face descriptor for employee ${employee.id}:`, error);
          continue;
        }

        // Tính khoảng cách Euclidean giữa hai descriptor
        const distance = calculateEuclideanDistance(descriptorArray, employeeDescriptor);

        console.log(`Employee ID ${employee.id}: distance = ${distance}`);

        // Nếu khoảng cách nhỏ hơn, cập nhật best match
        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = employee;
        }
      }

      console.log(`Best match: Employee ID ${bestMatch?.id}, distance = ${bestDistance}`);

      // Threshold cho việc nhận diện (giá trị cao hơn)
      const threshold = 100.0;
      if (!bestMatch || bestDistance > threshold) {
        return res.status(401).json({
          message: "Không thể nhận diện khuôn mặt. Vui lòng thử lại."
        });
      }

      // Lấy thời gian hiện tại
      const currentTime = new Date();

      // Tạo startOfDay và endOfDay cho ngày hiện tại
      const startOfDay = new Date(currentTime);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(currentTime);
      endOfDay.setHours(23, 59, 59, 999);

      // Lấy các time logs của nhân viên trong ngày hôm nay
      const todayLogs = await storage.getEmployeeTimeLogs(bestMatch.id, currentTime);

      // Kiểm tra xem có thể thực hiện check-in/check-out không
      if (type === 'checkin') {
        // Kiểm tra xem nhân viên này đã check-in chưa check-out không
        const hasUnpairedCheckin = todayLogs.some(log => {
          if (log.type === 'checkin' && log.employeeId === bestMatch.id) {
            // Kiểm tra xem có checkout sau check-in này không
            const hasMatchingCheckout = todayLogs.some(checkout =>
              checkout.type === 'checkout' &&
              checkout.employeeId === bestMatch.id &&
              checkout.logTime.getTime() > log.logTime.getTime()
            );
            // Nếu không có checkout tương ứng, đây là check-in chưa được ghép cặp
            return !hasMatchingCheckout;
          }
          return false;
        });

        if (hasUnpairedCheckin) {
          return res.status(400).json({
            message: "Bạn đã check-in trước đó. Vui lòng check-out trước khi check-in lại."
          });
        }

        // Kiểm tra thời gian giữa các lần check-in của nhân viên này (tối thiểu 1 phút)
        const lastCheckin = todayLogs
          .filter(log => log.type === 'checkin' && log.employeeId === bestMatch.id)
          .sort((a, b) => b.logTime.getTime() - a.logTime.getTime())[0];

        if (lastCheckin && (currentTime.getTime() - lastCheckin.logTime.getTime() < 60000)) {
          return res.status(400).json({
            message: "Vui lòng đợi ít nhất 1 phút trước khi check-in lại."
          });
        }
      } else if (type === 'checkout') {
        // Kiểm tra xem nhân viên này đã check-in chưa
        const hasCheckinToday = todayLogs.some(log =>
          log.type === 'checkin' && log.employeeId === bestMatch.id
        );

        if (!hasCheckinToday) {
          return res.status(400).json({
            message: "Bạn chưa check-in hôm nay. Vui lòng check-in trước khi check-out."
          });
        }

        // Kiểm tra xem nhân viên này có check-in chưa được ghép cặp với checkout không
        const hasUnpairedCheckin = todayLogs.some(log => {
          if (log.type === 'checkin' && log.employeeId === bestMatch.id) {
            const hasMatchingCheckout = todayLogs.some(checkout =>
              checkout.type === 'checkout' &&
              checkout.employeeId === bestMatch.id &&
              checkout.logTime.getTime() > log.logTime.getTime()
            );
            return !hasMatchingCheckout;
          }
          return false;
        });

        if (!hasUnpairedCheckin) {
          return res.status(400).json({
            message: "Không có check-in nào cần check-out. Vui lòng check-in trước."
          });
        }

        // Kiểm tra thời gian giữa các lần check-out của nhân viên này (tối thiểu 1 phút)
        const lastCheckout = todayLogs
          .filter(log => log.type === 'checkout' && log.employeeId === bestMatch.id)
          .sort((a, b) => b.logTime.getTime() - a.logTime.getTime())[0];

        if (lastCheckout && (currentTime.getTime() - lastCheckout.logTime.getTime() < 60000)) {
          return res.status(400).json({
            message: "Vui lòng đợi ít nhất 1 phút trước khi check-out lại."
          });
        }
      }

      // Tạo time log mới
      const timeLog = {
        employeeId: bestMatch.id,
        type: type === 'checkout' ? 'checkout' as const : 'checkin' as const,
        logTime: currentTime,
        source: 'face'
      };

      const createdTimeLog = await storage.createTimeLog(timeLog);

      // Lấy thông tin nhân viên để trả về
      const employee = await storage.getEmployee(bestMatch.id);

      res.status(201).json({
        ...createdTimeLog,
        employee: {
          id: employee?.id,
          employeeId: employee?.employeeId,
          firstName: employee?.firstName,
          lastName: employee?.lastName,
          department: employee?.departmentId ? await storage.getDepartment(employee.departmentId) : null
        }
      });
    } catch (error) {
      console.error("Error creating time log:", error);
      next(error);
    }
  });

  app.get("/api/time-logs/employee/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid employee ID" });
      }

      const date = req.query.date ? new Date(req.query.date as string) : new Date();
      const logs = await storage.getEmployeeTimeLogs(id, date);
      res.json(logs);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/work-hours/employee/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid employee ID" });
      }

      const date = req.query.date ? new Date(req.query.date as string) : new Date();
      const workHours = await storage.getEmployeeWorkHours(id, date);

      // Format times for the response
      const response = {
        ...workHours,
        checkinTime: workHours.checkinTime ? workHours.checkinTime.toISOString() : null,
        checkoutTime: workHours.checkoutTime ? workHours.checkoutTime.toISOString() : null,
        // Format hours to 2 decimal places
        regularHours: parseFloat(workHours.regularHours.toFixed(2)),
        overtimeHours: parseFloat(workHours.overtimeHours.toFixed(2))
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/work-hours/daily", async (req, res, next) => {
    try {
      const date = req.query.date ? new Date(req.query.date as string) : new Date();
      const dailyHours = await storage.getDailyWorkHours(date);

      // Format times for the response
      const response = dailyHours.map(record => ({
        ...record,
        checkinTime: record.checkinTime ? record.checkinTime.toISOString() : null,
        checkoutTime: record.checkoutTime ? record.checkoutTime.toISOString() : null,
        // Format hours to 2 decimal places
        regularHours: parseFloat(record.regularHours.toFixed(2)),
        overtimeHours: parseFloat(record.overtimeHours.toFixed(2))
      }));

      res.json(response);
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

  // Upload face image and save face profile
  app.post("/api/employees/:id/face-profile", async (req, res, next) => {
    try {
      const employeeId = parseInt(req.params.id);

      console.log("Nhận request upload khuôn mặt cho nhân viên:", employeeId);
      // Xóa log request body để không hiện thông tin nhạy cảm

      if (isNaN(employeeId)) {
        return res.status(400).json({ message: "ID nhân viên không hợp lệ" });
      }

      // Kiểm tra xem có descriptor không
      const { descriptor } = req.body;

      if (!descriptor) {
        return res.status(400).json({ message: "Cần có dữ liệu khuôn mặt" });
      }

      // Tìm nhân viên
      const employee = await storage.getEmployee(employeeId);

      if (!employee) {
        return res.status(404).json({ message: "Không tìm thấy nhân viên" });
      }

      console.log("Đã tìm thấy nhân viên:", employee.firstName, employee.lastName);
      console.log("Kiểu dữ liệu descriptor:", typeof descriptor);

      // Không cần parse nếu descriptor đã là array
      let descriptorArray = descriptor;

      // Kiểm tra nếu descriptor là chuỗi, thì parse
      if (typeof descriptor === 'string') {
        try {
          descriptorArray = JSON.parse(descriptor);
          console.log("Đã parse chuỗi descriptor thành mảng");
        } catch (e) {
          console.error("Lỗi khi parse descriptor:", e);
          return res.status(400).json({ message: "Dữ liệu khuôn mặt không hợp lệ" });
        }
      }

      console.log("Thông tin descriptor:", {
        type: typeof descriptorArray,
        isArray: Array.isArray(descriptorArray),
        length: Array.isArray(descriptorArray) ? descriptorArray.length : 'N/A'
      });

      // Chuyển descriptor thành chuỗi JSON để lưu vào database
      const descriptorJson = JSON.stringify(descriptorArray);

      // Cập nhật thông tin nhân viên với descriptor
      const updatedEmployee = await storage.updateEmployee(employeeId, {
        faceDescriptor: descriptorJson as any // Use type assertion to bypass TypeScript error
      });

      console.log("Đã cập nhật thành công nhân viên ID:", employeeId);

      return res.status(201).json({
        message: "Đã lưu dữ liệu khuôn mặt thành công",
        employee: updatedEmployee
      });
    } catch (error) {
      console.error("Lỗi khi lưu dữ liệu khuôn mặt:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Không thể lưu dữ liệu khuôn mặt"
      });
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

      // Chuyển đổi descriptor từ string về array
      const descriptorArray = faceDescriptor.split(',').map(Number);

      // Lấy danh sách tất cả nhân viên có face descriptor
      const employeesWithFace = await storage.getEmployeesWithFaceDescriptor();

      if (!employeesWithFace || employeesWithFace.length === 0) {
        return res.status(404).json({
          message: "Không tìm thấy nhân viên nào có dữ liệu khuôn mặt"
        });
      }

      // Tìm nhân viên phù hợp nhất với descriptor
      let bestMatch = null;
      let bestDistance = 1.0; // Giá trị ban đầu cao (khoảng cách lớn)

      for (const employee of employeesWithFace) {
        if (!employee.faceDescriptor) continue;

        // Chuyển đổi descriptor của nhân viên từ string về array
        let employeeDescriptor;
        try {
          // Thử parse JSON nếu là chuỗi JSON
          if (employee.faceDescriptor.startsWith('[') || employee.faceDescriptor.startsWith('{')) {
            employeeDescriptor = JSON.parse(employee.faceDescriptor);
          } else {
            // Nếu không phải JSON, giả định là chuỗi phân tách bằng dấu phẩy
            employeeDescriptor = employee.faceDescriptor.split(',').map(Number);
          }
        } catch (error) {
          console.error(`Error parsing face descriptor for employee ${employee.id}:`, error);
          continue;
        }

        // Tính khoảng cách Euclidean giữa hai descriptor
        const distance = calculateEuclideanDistance(descriptorArray, employeeDescriptor);

        // Nếu khoảng cách nhỏ hơn, cập nhật best match
        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = employee;
        }
      }

      // Threshold cho việc nhận diện (giá trị 0.6 có thể điều chỉnh)
      const threshold = 0.6;
      if (!bestMatch || bestDistance > threshold) {
        return res.status(401).json({
          message: "Không thể nhận diện khuôn mặt. Vui lòng thử lại."
        });
      }

      res.json({
        verified: true,
        employee: {
          id: bestMatch.id,
          firstName: bestMatch.firstName,
          lastName: bestMatch.lastName,
          employeeId: bestMatch.employeeId,
          confidence: 1 - bestDistance
        }
      });
    } catch (error) {
      console.error("Error verifying face:", error);
      next(error);
    }
  });

  // User/Account management routes
  app.get("/api/users", ensureAuthenticated, async (req, res, next) => {
    try {
      // Check if user is admin
      const user = req.user as Express.User;
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }

      // Get all user accounts
      const userAccounts = await db.select().from(users);

      // Remove password field from response
      const safeUserAccounts = userAccounts.map(({ password, ...userData }) => userData);

      res.json(safeUserAccounts);
    } catch (error) {
      console.error("Error fetching user accounts:", error);
      res.status(500).json({ message: "Failed to fetch user accounts" });
    }
  });

  app.get("/api/users/:id", ensureAuthenticated, async (req, res, next) => {
    try {
      // Check if user is admin or the user is fetching their own data
      const user = req.user as Express.User;
      const requestedId = parseInt(req.params.id);

      if (isNaN(requestedId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      if (user.role !== "admin" && user.id !== requestedId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Get user account
      const userAccount = await storage.getUser(requestedId);

      if (!userAccount) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove password field from response
      const { password, ...safeUserData } = userAccount;

      res.json(safeUserData);
    } catch (error) {
      console.error(`Error fetching user with ID ${req.params.id}:`, error);
      res.status(500).json({ message: `Failed to fetch user with ID ${req.params.id}` });
    }
  });

  // Create user account
  app.post("/api/users", ensureAuthenticated, async (req, res, next) => {
    try {
      // Check if user is admin
      const currentUser = req.user as Express.User;
      if (currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }

      // Validate input
      const userSchema = z.object({
        username: z.string().min(3).max(50),
        password: z.string().min(6),
        role: z.enum(["admin", "manager", "employee"]),
        employeeId: z.number().optional().nullable(),
      });

      const userData = userSchema.parse(req.body);

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // If employeeId is provided, check if it exists
      let fullName = "System User";
      if (userData.employeeId !== undefined && userData.employeeId !== null) {
        const employee = await storage.getEmployee(userData.employeeId);
        if (!employee) {
          return res.status(400).json({ message: "Employee not found" });
        }
        fullName = `${employee.lastName} ${employee.firstName}`;
      }

      // Hash password
      const hashedPassword = await hashPassword(userData.password);

      // Create user account with proper typing
      const newUser = {
        username: userData.username,
        password: hashedPassword,
        role: userData.role,
        employeeId: userData.employeeId,
        fullName: fullName,
        createdAt: new Date(),
      } as any; // Use type assertion to bypass TypeScript error

      const createdUser = await storage.createUser(newUser);

      // Remove password from response
      const { password, ...safeUserData } = createdUser;

      res.status(201).json(safeUserData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user account" });
    }
  });

  // Update user account
  app.put("/api/users/:id", ensureAuthenticated, async (req, res, next) => {
    try {
      // Check if user is admin
      const currentUser = req.user as Express.User;
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      if (currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }

      // Get the user to update
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Validate input
      const updateUserSchema = z.object({
        username: z.string().min(3).max(50).optional(),
        password: z.string().min(6).optional(),
        role: z.enum(["admin", "manager", "employee"]).optional(),
        employeeId: z.number().optional().nullable(),
      });

      const userData = updateUserSchema.parse(req.body);

      // Check if username is being changed and already exists
      if (userData.username && userData.username !== existingUser.username) {
        const userWithSameUsername = await storage.getUserByUsername(userData.username);
        if (userWithSameUsername && userWithSameUsername.id !== userId) {
          return res.status(400).json({ message: "Username already exists" });
        }
      }

      // Prepare update data
      const updateData: Partial<User> = {};

      if (userData.username) updateData.username = userData.username;
      if (userData.role) updateData.role = userData.role;

      // Only update employeeId if it changed
      if (userData.employeeId !== undefined) {
        // If employeeId is provided, check if it exists
        if (userData.employeeId !== null) {
          const employee = await storage.getEmployee(userData.employeeId);
          if (!employee) {
            return res.status(400).json({ message: "Employee not found" });
          }
          updateData.employeeId = userData.employeeId;
          updateData.fullName = `${employee.lastName} ${employee.firstName}`;
        } else {
          // Remove employee association
          updateData.employeeId = null;
          updateData.fullName = existingUser.fullName; // Keep existing name
        }
      }

      // Hash password if provided
      if (userData.password) {
        updateData.password = await hashPassword(userData.password);
      }

      // Update user in database
      const updatedUser = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser || updatedUser.length === 0) {
        return res.status(500).json({ message: "Failed to update user" });
      }

      // Remove password from response
      const { password, ...safeUserData } = updatedUser[0];

      res.json(safeUserData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error(`Error updating user with ID ${req.params.id}:`, error);
      res.status(500).json({ message: `Failed to update user with ID ${req.params.id}` });
    }
  });

  // Delete user account
  app.delete("/api/users/:id", ensureAuthenticated, async (req, res, next) => {
    try {
      // Check if user is admin
      const currentUser = req.user as Express.User;
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      if (currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }

      // Prevent deleting your own account
      if (currentUser.id === userId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      // Check if user exists
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Delete user
      await db.delete(users).where(eq(users.id, userId));

      res.status(200).json({ message: "User account deleted successfully" });
    } catch (error) {
      console.error(`Error deleting user with ID ${req.params.id}:`, error);
      res.status(500).json({ message: `Failed to delete user with ID ${req.params.id}` });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
