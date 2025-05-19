import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword, comparePasswords } from "./auth";
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
  workHours,
  type Employee,
  type User,
  type InsertUser
} from "@shared/schema";
import { eq, and, gte, lt, ne, asc, lte, sql } from "drizzle-orm";
import { db } from "./db";
import type { Request, Response, NextFunction } from "express";
import path from "path";

// Hàm điều chỉnh ngày theo múi giờ Việt Nam (UTC+7)
function adjustDateToVietnamTimezone(date: Date): Date {
  // Tạo một bản sao của ngày để không thay đổi ngày gốc
  const adjustedDate = new Date(date);
  return adjustedDate;
}

// Hàm lấy chuỗi ngày theo định dạng YYYY-MM-DD
function getDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Hàm log thông tin thời gian để debug
function logTimeInfo(label: string, date: Date | null | undefined): void {
  if (!date) {
    console.log(`[DEBUG] ${label}: null`);
    return;
  }
  console.log(`[DEBUG] ${label}:`);
  console.log(`  - Original: ${date.toString()}`);
  console.log(`  - ISO: ${date.toISOString()}`);
  console.log(`  - Date string: ${getDateString(date)}`);
  console.log(`  - Locale string: ${date.toLocaleString('vi-VN')}`);
}

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
        console.log(`[Face-Recognition] Không thể nhận diện khuôn mặt: ${bestMatch ? `Độ tin cậy thấp (${bestDistance})` : 'Không tìm thấy khuôn mặt phù hợp'}`);
        return res.status(401).json({
          success: false,
          message: "Không thể nhận diện khuôn mặt. Vui lòng đảm bảo khuôn mặt được nhìn thấy rõ trong khung hình."
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
      console.log(`[Face-Recognition] Đã lấy ${todayLogs.length} logs cho nhân viên ${employee.id}`);

      // Kiểm tra xem có thể thực hiện check-in/check-out không
      const logType = mode === 'check_in' ? 'checkin' as const : 'checkout' as const;

      // TẠO ĐỐI TƯỢNG time log mới, CHƯA LƯU vào database
      const timeLog = {
        employeeId: employee.id,
        type: logType,
        logTime: currentTime,
        source: 'face'
      };

      // Tạo thông tin để trả về cho client
      let responseMessage = `Đã ${mode === 'check_in' ? 'check in' : 'check out'} thành công`;
      const responseData: {
        success: boolean;
        message: string;
        employee: {
          id: number;
          name: string;
          department: { id: number; name: string } | null;
          position: string | null;
          confidence: number;
        };
        attendance?: {
          id: number;
          type: string;
          time: Date;
        };
      } = {
        success: true,
        message: responseMessage,
        employee: {
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          department: department ? {
            id: department.id,
            name: department.name
          } : null,
          position: employee.position,
          confidence: 1 - bestDistance
        }
      };

      if (logType === 'checkin') {
        // Kiểm tra xem nhân viên này đã check-in chưa check-out không
        // Chỉ kiểm tra nếu có >= 1 check-in chưa có check-out tương ứng
        const hasUnpairedCheckin = todayLogs.length > 0 && todayLogs.some(log => {
          // Kiểm tra các check-in trong khoảng thời gian hợp lệ
          if (log.type === 'checkin' && log.employeeId === employee.id &&
            // Chỉ xét các check-in cách đây dưới 12 giờ
            (currentTime.getTime() - log.logTime.getTime() < 12 * 60 * 60 * 1000)) {

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
          console.log(`[Face-Recognition] Nhân viên ${employee.id} đã có check-in chưa được ghép cặp`);
          return res.status(400).json({
            success: false,
            message: "Bạn đã check-in trước đó. Vui lòng check-out trước khi check-in lại."
          });
        }

        // Kiểm tra thời gian giữa các lần check-in của nhân viên này (tối thiểu 1 phút)
        const lastCheckin = todayLogs
          .filter(log => log.type === 'checkin' && log.employeeId === employee.id)
          .sort((a, b) => b.logTime.getTime() - a.logTime.getTime())[0];

        if (lastCheckin) {
          const timeDiff = currentTime.getTime() - lastCheckin.logTime.getTime();
          const minutesDiff = Math.floor(timeDiff / 60000);

          console.log(`[Face-Recognition] Nhân viên ${employee.id} check-in, khoảng cách từ lần check-in trước: ${minutesDiff} phút`);

          if (timeDiff < 60000) {
            return res.status(400).json({
              success: false,
              message: "Vui lòng đợi ít nhất 1 phút trước khi check-in lại."
            });
          }
        }
      } else if (logType === 'checkout') {
        // Kiểm tra xem nhân viên này đã check-in chưa
        const hasCheckinToday = todayLogs.some(log =>
          log.type === 'checkin' && log.employeeId === employee.id &&
          // Chỉ xét các check-in trong ngày hôm nay
          (currentTime.getTime() - log.logTime.getTime() < 24 * 60 * 60 * 1000)
        );

        if (!hasCheckinToday) {
          console.log(`[Face-Recognition] Nhân viên ${employee.id} cố check-out khi chưa check-in`);
          return res.status(400).json({
            success: false,
            message: "Bạn chưa check-in hôm nay. Vui lòng check-in trước khi check-out."
          });
        }

        // Kiểm tra xem nhân viên này có check-in chưa được ghép cặp với checkout không
        const hasUnpairedCheckin = todayLogs.some(log => {
          if (log.type === 'checkin' && log.employeeId === employee.id) {
            // Chỉ xét các check-in trong khoảng 16 giờ gần đây
            if (currentTime.getTime() - log.logTime.getTime() > 16 * 60 * 60 * 1000) {
              return false; // Bỏ qua check-in quá cũ
            }

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
          console.log(`[Face-Recognition] Nhân viên ${employee.id} không có check-in nào cần ghép cặp`);
          return res.status(400).json({
            success: false,
            message: "Không có check-in nào cần check-out. Vui lòng check-in trước."
          });
        }

        // Tìm check-in gần nhất chưa có check-out tương ứng để log 
        const lastUnpairedCheckin = todayLogs
          .filter(log => log.type === 'checkin' && log.employeeId === employee.id)
          .sort((a, b) => b.logTime.getTime() - a.logTime.getTime())
          .find(checkin => {
            // Kiểm tra xem đã có check-out sau check-in này chưa
            return !todayLogs.some(log =>
              log.type === 'checkout' &&
              log.logTime.getTime() > checkin.logTime.getTime()
            );
          });

        if (lastUnpairedCheckin) {
          const checkInTime = new Date(lastUnpairedCheckin.logTime);
          const hoursDiff = ((currentTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)).toFixed(2);
          console.log(`[Face-Recognition] Nhân viên ${employee.id} check-out cho check-in lúc ${checkInTime.toLocaleTimeString('vi-VN')} (${hoursDiff} giờ trước)`);
        }

        // Kiểm tra thời gian giữa các lần check-out của nhân viên này (tối thiểu 1 phút)
        const lastCheckout = todayLogs
          .filter(log => log.type === 'checkout' && log.employeeId === employee.id)
          .sort((a, b) => b.logTime.getTime() - a.logTime.getTime())[0];

        if (lastCheckout) {
          const timeDiff = currentTime.getTime() - lastCheckout.logTime.getTime();
          const minutesDiff = Math.floor(timeDiff / 60000);

          console.log(`[Face-Recognition] Nhân viên ${employee.id} check-out, khoảng cách từ lần check-out trước: ${minutesDiff} phút`);

          if (timeDiff < 60000) {
            return res.status(400).json({
              success: false,
              message: "Vui lòng đợi ít nhất 1 phút trước khi check-out lại."
            });
          }
        }
      }

      console.log(`[Face-Recognition] Tạo time log mới: Nhân viên ${employee.id}, loại ${logType}, thời gian ${currentTime.toISOString()}`);

      try {
        // LƯU time log vào database
        const createdTimeLog = await storage.createTimeLog(timeLog);
        console.log(`[Face-Recognition] Đã tạo time log: ID=${createdTimeLog.id}, thành công`);

        // Cập nhật work_hours nếu cần
        let workHoursUpdated = true;
        try {
          // Logic cập nhật work_hours có thể thêm ở đây nếu cần
        } catch (workHoursError) {
          console.error(`[Face-Recognition] Lỗi khi cập nhật work_hours: ${workHoursError}`);
          workHoursUpdated = false;
          // Vẫn tiếp tục vì time log đã lưu thành công
        }

        // Nếu có tạo time log thành công thì return thành công
        if (createdTimeLog && createdTimeLog.id) {
          // Nếu cập nhật work hours thất bại, thêm cảnh báo nhưng vẫn là thành công
          if (!workHoursUpdated) {
            responseData.message += " (có cảnh báo: thông tin giờ làm có thể chưa được cập nhật đầy đủ)";
          }

          // Thêm thông tin attendance vào response
          responseData.attendance = {
            id: createdTimeLog.id,
            type: createdTimeLog.type,
            time: createdTimeLog.logTime
          };

          // Trả về kết quả thành công
          return res.status(201).json(responseData);
        } else {
          // Nếu không có ID của time log, xem như thất bại
          throw new Error("Không thể tạo bản ghi điểm danh");
        }
      } catch (timeLogError) {
        console.error(`[Face-Recognition] Lỗi nghiêm trọng khi lưu time log: ${timeLogError}`);
        return res.status(500).json({
          success: false,
          message: "Đã xảy ra lỗi khi xử lý. Vui lòng thử lại sau."
        });
      }
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
          name: "DS",
          description: "Phòng Design",
          managerId: null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 2,
          name: "HR",
          description: "Phòng Nhân sự",
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

  // API endpoint để khởi tạo dữ liệu phòng ban mặc định nếu chưa có
  app.post("/api/departments/initialize", async (req, res, next) => {
    try {
      // Kiểm tra xem đã có phòng ban nào chưa
      const existingDepartments = await storage.getAllDepartments();

      if (existingDepartments && existingDepartments.length > 0) {
        return res.status(200).json({
          message: "Dữ liệu phòng ban đã tồn tại",
          departments: existingDepartments
        });
      }

      // Tạo các phòng ban mặc định
      const defaultDepartments = [
        {
          name: "DS",
          description: "Phòng Design",
        },
        {
          name: "HR",
          description: "Phòng Nhân sự",
        },
        {
          name: "IT",
          description: "Phòng Công nghệ Thông tin",
        },
        {
          name: "MKT",
          description: "Phòng Marketing",
        }
      ];

      // Lưu các phòng ban vào cơ sở dữ liệu
      const createdDepartments = [];

      for (const dept of defaultDepartments) {
        try {
          const createdDept = await storage.createDepartment(dept);
          createdDepartments.push(createdDept);
        } catch (error) {
          console.error(`Error creating department ${dept.name}:`, error);
        }
      }

      res.status(201).json({
        message: "Đã khởi tạo dữ liệu phòng ban mặc định",
        departments: createdDepartments
      });
    } catch (error) {
      console.error("Error initializing departments:", error);
      res.status(500).json({ message: "Failed to initialize departments" });
    }
  });

  // Thêm API endpoint để tạo phòng ban trực tiếp (KHÔNG yêu cầu đăng nhập)
  app.post("/api/departments/create-simple", async (req, res, next) => {
    try {
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Tên phòng ban là bắt buộc" });
      }

      console.log(`Attempting to create department: ${name}, ${description}`);

      // Dùng truy vấn SQL trực tiếp để tạo phòng ban
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 5000
      });

      const result = await pool.query(
        'INSERT INTO departments (name, description, created_at) VALUES ($1, $2, NOW()) RETURNING *',
        [name, description || null]
      );

      if (result.rows && result.rows.length > 0) {
        const newDepartment = {
          id: Number(result.rows[0].id),
          name: result.rows[0].name,
          description: result.rows[0].description,
          managerId: result.rows[0].manager_id,
          createdAt: result.rows[0].created_at
        };

        console.log("Department created successfully:", newDepartment);
        return res.status(201).json(newDepartment);
      } else {
        throw new Error("Không thể tạo phòng ban");
      }
    } catch (error) {
      console.error("Error creating department:", error);
      res.status(500).json({
        message: "Không thể tạo phòng ban",
        error: error instanceof Error ? error.message : String(error)
      });
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
      return res.status(201).json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Lỗi khi tạo nhân viên:", error);
      return res.status(500).json({ message: "Không thể tạo nhân viên" });
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

      return res.json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Lỗi khi cập nhật nhân viên:", error);
      return res.status(500).json({ message: "Không thể cập nhật nhân viên" });
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

      // Lấy các time logs của nhân viên trong ngày hôm nay TRƯỚC KHI tạo log mới
      const todayLogs = await storage.getEmployeeTimeLogs(bestMatch.id, currentTime);
      console.log(`[TimeLogs] Đã lấy ${todayLogs.length} logs cho nhân viên ${bestMatch.id}`);

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

        if (lastCheckin) {
          const timeDiff = currentTime.getTime() - lastCheckin.logTime.getTime();
          const minutesDiff = Math.floor(timeDiff / 60000);

          console.log(`[Face-Recognition] Nhân viên ${bestMatch.id} check-in, khoảng cách từ lần check-in trước: ${minutesDiff} phút`);

          if (timeDiff < 60000) {
            return res.status(400).json({
              success: false,
              message: "Vui lòng đợi ít nhất 1 phút trước khi check-in lại."
            });
          }
        }
      } else if (type === 'checkout') {
        // Kiểm tra xem nhân viên này đã check-in chưa
        const hasCheckinToday = todayLogs.some(log =>
          log.type === 'checkin' && log.employeeId === bestMatch.id &&
          // Chỉ xét các check-in trong ngày hôm nay
          (currentTime.getTime() - log.logTime.getTime() < 24 * 60 * 60 * 1000)
        );

        if (!hasCheckinToday) {
          console.log(`[Face-Recognition] Nhân viên ${bestMatch.id} cố check-out khi chưa check-in`);
          return res.status(400).json({
            success: false,
            message: "Bạn chưa check-in hôm nay. Vui lòng check-in trước khi check-out."
          });
        }

        // Kiểm tra xem nhân viên này có check-in chưa được ghép cặp với checkout không
        const hasUnpairedCheckin = todayLogs.some(log => {
          if (log.type === 'checkin' && log.employeeId === bestMatch.id) {
            // Chỉ xét các check-in trong khoảng 16 giờ gần đây
            if (currentTime.getTime() - log.logTime.getTime() > 16 * 60 * 60 * 1000) {
              return false; // Bỏ qua check-in quá cũ
            }

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

        if (lastCheckout) {
          const timeDiff = currentTime.getTime() - lastCheckout.logTime.getTime();
          const minutesDiff = Math.floor(timeDiff / 60000);

          console.log(`[Face-Recognition] Nhân viên ${bestMatch.id} check-out, khoảng cách từ lần check-out trước: ${minutesDiff} phút`);

          if (timeDiff < 60000) {
            return res.status(400).json({
              success: false,
              message: "Vui lòng đợi ít nhất 1 phút trước khi check-out lại."
            });
          }
        }
      }

      try {
        // Tạo time log mới
        const timeLog = {
          employeeId: bestMatch.id,
          type: type === 'checkout' ? 'checkout' as const : 'checkin' as const,
          logTime: currentTime,
          source: 'face'
        };

        const createdTimeLog = await storage.createTimeLog(timeLog);

        if (!createdTimeLog || !createdTimeLog.id) {
          throw new Error("Không thể tạo bản ghi chấm công");
        }

        // Lấy thông tin nhân viên để trả về
        const employee = await storage.getEmployee(bestMatch.id);

        // Nếu tạo time log thành công, trả về thành công
        return res.status(201).json({
          success: true,
          message: `Đã ${type === 'checkout' ? 'check-out' : 'check-in'} thành công`,
          ...createdTimeLog,
          employee: {
            id: employee?.id,
            employeeId: employee?.employeeId,
            firstName: employee?.firstName,
            lastName: employee?.lastName,
            department: employee?.departmentId ? await storage.getDepartment(employee.departmentId) : null
          }
        });
      } catch (timeLogError) {
        console.error(`[Time-Logs] Lỗi khi lưu time log: ${timeLogError}`);
        return res.status(500).json({
          success: false,
          message: "Đã xảy ra lỗi khi xử lý dữ liệu. Vui lòng thử lại sau."
        });
      }
    } catch (error) {
      console.error("Error creating time log:", error);
      next(error);
    }
  });

  app.get("/api/work-hours/employee/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID nhân viên không hợp lệ" });
      }

      // Kiểm tra xem có yêu cầu phạm vi ngày không
      if (req.query.startDate && req.query.endDate) {
        const startDate = new Date(req.query.startDate as string);
        const endDate = new Date(req.query.endDate as string);

        console.log(`[API] Lấy dữ liệu giờ làm cho nhân viên ${id} từ ${startDate.toISOString()} đến ${endDate.toISOString()}`);

        // Kiểm tra tính hợp lệ của ngày
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return res.status(400).json({ message: "Phạm vi ngày không hợp lệ" });
        }

        try {
          // Lấy tất cả dữ liệu giờ làm của nhân viên
          const allWorkHours = await db
            .select()
            .from(workHours)
            .where(eq(workHours.employeeId, id))
            .orderBy(asc(workHours.workDate));

          console.log(`[API] Tìm thấy ${allWorkHours.length} bản ghi cho nhân viên ${id}`);

          // Lọc kết quả theo khoảng thời gian trong JavaScript
          const startTimestamp = startDate.getTime();
          const endTimestamp = endDate.getTime();

          // Lọc kết quả chỉ lấy các bản ghi trong khoảng thời gian yêu cầu
          const workHoursData = allWorkHours.filter(record => {
            const recordDate = new Date(record.workDate);
            const recordTimestamp = recordDate.getTime();
            return recordTimestamp >= startTimestamp && recordTimestamp <= endTimestamp;
          });

          console.log(`[API] Sau khi lọc theo phạm vi ngày: ${workHoursData.length} bản ghi`);

          // Định dạng giờ thành "hours:minutes"
          const formatHoursMinutes = (decimalHours: number): string => {
            const hours = Math.floor(decimalHours);
            const minutes = Math.round((decimalHours - hours) * 60);
            return `${hours}:${minutes.toString().padStart(2, '0')}`;
          };

          // Định dạng kết quả
          const results = workHoursData.map(record => {
            const regularHours = record.regularHours ? parseFloat(record.regularHours.toString()) : 0;
            const overtimeHours = record.otHours ? parseFloat(record.otHours.toString()) : 0;

            // Chuyển đổi thời gian check-in và check-out thành chuỗi ISO
            const checkinTime = record.firstCheckin
              ? new Date(record.firstCheckin).toISOString()
              : null;
            const checkoutTime = record.lastCheckout
              ? new Date(record.lastCheckout).toISOString()
              : null;

            return {
              date: getDateString(new Date(record.workDate)),
              regularHours,
              overtimeHours,
              regularHoursFormatted: formatHoursMinutes(regularHours),
              overtimeHoursFormatted: formatHoursMinutes(overtimeHours),
              totalHoursFormatted: formatHoursMinutes(regularHours + overtimeHours),
              checkinTime,
              checkoutTime,
              status: record.status || "normal"
            };
          });

          return res.json(results);
        } catch (error) {
          console.error(`[API] Lỗi khi lấy dữ liệu giờ làm: ${error}`);
          return res.status(500).json({ message: "Lỗi khi lấy dữ liệu giờ làm" });
        }
      }

      // Trường hợp chỉ lấy dữ liệu cho một ngày
      const dateStr = req.query.date as string;
      const date = dateStr ? new Date(dateStr) : new Date();

      console.log(`[API] Lấy dữ liệu giờ làm cho nhân viên ${id} vào ngày ${date.toISOString().split('T')[0]}`);

      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: "Ngày không hợp lệ" });
      }

      try {
        // Định dạng ngày theo múi giờ Việt Nam
        const formattedDate = new Date(date);
        formattedDate.setHours(0, 0, 0, 0);

        // Chuyển đổi ngày thành chuỗi YYYY-MM-DD
        const formattedDateStr = getDateString(formattedDate);

        console.log(`[API] Đang tìm dữ liệu cho nhân viên ${id} vào ngày ${formattedDateStr}`);
        logTimeInfo("Ngày tìm kiếm", formattedDate);

        // Lấy dữ liệu giờ làm của nhân viên
        const workHoursData = await db
          .select()
          .from(workHours)
          .where(eq(workHours.employeeId, id));

        console.log(`[API] Đã tìm thấy ${workHoursData.length} bản ghi cho nhân viên ${id}`);
        if (workHoursData.length > 0) {
          console.log(`[API] Mẫu dữ liệu:`, JSON.stringify(workHoursData[0]));
          const sampleDate = new Date(workHoursData[0].workDate);
          logTimeInfo("Ngày trong database", sampleDate);

          if (workHoursData[0].firstCheckin) {
            logTimeInfo("Giờ vào trong database", workHoursData[0].firstCheckin);
          }

          if (workHoursData[0].lastCheckout) {
            logTimeInfo("Giờ ra trong database", workHoursData[0].lastCheckout);
          }
        }

        // Lọc theo ngày
        const filteredData = workHoursData.filter(record => {
          // Lấy ngày từ workDate và chuyển thành chuỗi YYYY-MM-DD
          const recordDate = new Date(record.workDate);
          const recordDateStr = getDateString(recordDate);
          console.log(`[API] So sánh ngày: ${recordDateStr} với ${formattedDateStr}`);
          return recordDateStr === formattedDateStr;
        });

        console.log(`[API] Sau khi lọc theo ngày: ${filteredData.length} bản ghi`);

        // Kiểm tra ngày có phải là quá khứ không
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isDateInPast = date < today;

        // Định dạng giờ thành "hours:minutes"
        const formatHoursMinutes = (decimalHours: number): string => {
          const hours = Math.floor(decimalHours);
          const minutes = Math.round((decimalHours - hours) * 60);
          return `${hours}:${minutes.toString().padStart(2, '0')}`;
        };

        if (filteredData.length > 0) {
          // Đã có dữ liệu
          const record = filteredData[0];
          console.log(`[API] Dữ liệu tìm thấy: ${JSON.stringify(record)}`);
          const regularHours = record.regularHours ? parseFloat(record.regularHours.toString()) : 0;
          const overtimeHours = record.otHours ? parseFloat(record.otHours.toString()) : 0;

          // Chuyển đổi thời gian check-in và check-out thành chuỗi có thể đọc được
          // Thay vì dùng toISOString() (sẽ chuyển về UTC), ta tạo chuỗi giữ nguyên giờ
          const formatTimeToString = (date: Date | null): string | null => {
            if (!date) return null;

            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');

            return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000Z`;
          };

          const firstCheckin = record.firstCheckin ? new Date(record.firstCheckin) : null;
          const lastCheckout = record.lastCheckout ? new Date(record.lastCheckout) : null;

          const checkinTime = formatTimeToString(firstCheckin);
          const checkoutTime = formatTimeToString(lastCheckout);

          return res.json({
            regularHours,
            overtimeHours,
            regularHoursFormatted: formatHoursMinutes(regularHours),
            overtimeHoursFormatted: formatHoursMinutes(overtimeHours),
            totalHoursFormatted: formatHoursMinutes(regularHours + overtimeHours),
            checkinTime,
            checkoutTime,
            status: record.status || "normal"
          });
        } else {
          // Không có dữ liệu
          console.log(`[API] Không tìm thấy dữ liệu cho ngày ${formattedDateStr}, trả về absent cho ngày quá khứ`);
          return res.json({
            regularHours: 0,
            overtimeHours: 0,
            regularHoursFormatted: "0:00",
            overtimeHoursFormatted: "0:00",
            totalHoursFormatted: "0:00",
            checkinTime: null,
            checkoutTime: null,
            status: isDateInPast ? "absent" : "normal"
          });
        }
      } catch (error) {
        console.error(`[API] Lỗi khi lấy chi tiết giờ làm: ${error}`);
        console.error(`[API] Chi tiết lỗi:`, error);
        // Trả về phản hồi mặc định thay vì lỗi
        return res.json({
          regularHours: 0,
          overtimeHours: 0,
          regularHoursFormatted: "0:00",
          overtimeHoursFormatted: "0:00",
          totalHoursFormatted: "0:00",
          checkinTime: null,
          checkoutTime: null,
          status: "error"
        });
      }
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/work-hours/daily", async (req, res, next) => {
    try {
      const date = req.query.date ? new Date(req.query.date as string) : new Date();

      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: "Ngày không hợp lệ" });
      }

      try {
        // Định dạng ngày theo múi giờ Việt Nam
        const formattedDate = new Date(date);
        formattedDate.setHours(0, 0, 0, 0);
        const dateStr = getDateString(formattedDate);

        console.log(`[API] Lấy dữ liệu giờ làm cho ngày ${dateStr}`);

        // Lấy tất cả nhân viên
        const allEmployees = await db.select().from(employees);

        // Lấy tất cả bản ghi work_hours cho ngày đó
        const allWorkHours = await db
          .select()
          .from(workHours);

        // Lọc chỉ lấy dữ liệu của ngày được chọn
        const workHoursData = allWorkHours.filter(record => {
          const recordDate = new Date(record.workDate);
          const recordDateStr = getDateString(recordDate);
          return recordDateStr === dateStr;
        });

        console.log(`[API] Tìm thấy ${workHoursData.length} bản ghi cho ngày ${dateStr}`);

        // Kiểm tra ngày quá khứ để thiết lập trạng thái absent
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isDateInPast = date < today;

        // Định dạng giờ thành "hours:minutes"
        const formatHoursMinutes = (decimalHours: number): string => {
          const hours = Math.floor(decimalHours);
          const minutes = Math.round((decimalHours - hours) * 60);
          return `${hours}:${minutes.toString().padStart(2, '0')}`;
        };

        // Tạo kết quả cho tất cả nhân viên
        const results = allEmployees.map(employee => {
          // Tìm dữ liệu giờ làm của nhân viên nếu có
          const employeeHours = workHoursData.find(wh => wh.employeeId === employee.id);

          if (employeeHours) {
            // Đã có dữ liệu
            const regularHours = employeeHours.regularHours ? parseFloat(employeeHours.regularHours.toString()) : 0;
            const overtimeHours = employeeHours.otHours ? parseFloat(employeeHours.otHours.toString()) : 0;

            // Chuyển đổi thời gian check-in và check-out thành chuỗi có thể đọc được
            const formatTimeToString = (date: Date | null): string | null => {
              if (!date) return null;

              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const hours = String(date.getHours()).padStart(2, '0');
              const minutes = String(date.getMinutes()).padStart(2, '0');
              const seconds = String(date.getSeconds()).padStart(2, '0');

              return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000Z`;
            };

            // Chuyển đổi giờ vào và giờ ra thành chuỗi
            const firstCheckin = employeeHours.firstCheckin ? new Date(employeeHours.firstCheckin) : null;
            const lastCheckout = employeeHours.lastCheckout ? new Date(employeeHours.lastCheckout) : null;

            const checkinTime = firstCheckin ? formatTimeToString(firstCheckin) : null;
            const checkoutTime = lastCheckout ? formatTimeToString(lastCheckout) : null;

            return {
              employeeId: employee.id,
              employeeName: `${employee.firstName} ${employee.lastName}`,
              regularHours,
              overtimeHours,
              checkinTime,
              checkoutTime,
              status: employeeHours.status || "normal"
            };
          } else {
            // Không có dữ liệu
            return {
              employeeId: employee.id,
              employeeName: `${employee.firstName} ${employee.lastName}`,
              regularHours: 0,
              overtimeHours: 0,
              checkinTime: null,
              checkoutTime: null,
              status: isDateInPast ? "absent" : "normal"
            };
          }
        });

        return res.json(results);
      } catch (error) {
        console.error(`[API] Lỗi khi lấy dữ liệu giờ làm hàng ngày: ${error}`);
        return res.status(500).json({ message: "Lỗi khi lấy dữ liệu giờ làm" });
      }
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

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const search = req.query.search as string | undefined;
      const status = req.query.status as string | undefined;

      console.log(`[API] Fetching attendance records for employee ${id} from ${startDate?.toISOString() || 'all time'} to ${endDate?.toISOString() || 'present'}`);
      console.log(`[API] Page: ${page}, Limit: ${limit}, Search: ${search}, Status: ${status}`);

      const records = await storage.getEmployeeAttendance(id, startDate, endDate);

      // Ghi log số lượng bản ghi điểm danh tìm thấy và thông tin mẫu
      console.log(`[API] Found ${records.length} attendance records for employee ${id}`);
      if (records.length > 0) {
        console.log(`[API] Sample record:`, JSON.stringify(records[0], null, 2));
      }

      // Lọc theo status nếu có
      let filteredRecords = records;
      if (status && status !== 'all') {
        filteredRecords = records.filter(record => record.status === status);
      }

      // Lọc theo search term nếu có
      if (search) {
        const searchLower = search.toLowerCase();
        filteredRecords = filteredRecords.filter(record => {
          const dateStr = new Date(record.date).toLocaleDateString();
          const timeStr = new Date(record.time).toLocaleTimeString();
          return dateStr.includes(searchLower) || timeStr.includes(searchLower);
        });
      }

      // Tính toán phân trang
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

      res.json({
        items: paginatedRecords,
        total: filteredRecords.length,
        page,
        limit,
        totalPages: Math.ceil(filteredRecords.length / limit)
      });
    } catch (error) {
      console.error(`[API] Error fetching attendance records:`, error);
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

  // API endpoints dành riêng cho quản lý - MUST COME BEFORE PARAMETERIZED ROUTES
  app.get("/api/leave-requests/manager", ensureAuthenticated, async (req, res, next) => {
    try {
      // Kiểm tra xem người dùng có quyền quản lý không
      const user = req.user as Express.User;
      if (!user || (user.role !== 'manager' && user.role !== 'admin')) {
        return res.status(403).json({ message: "Access denied. Manager or admin role required." });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const status = req.query.status as string | undefined;

      // Lấy tất cả đơn nghỉ phép và join với thông tin nhân viên để hiển thị
      const leaveRequests = await storage.getAllLeaveRequestsWithEmployeeDetails(page, limit, status);
      res.json(leaveRequests);
    } catch (error) {
      next(error);
    }
  });

  // API duyệt đơn nghỉ phép
  app.put("/api/leave-requests/:id/approve", ensureAuthenticated, async (req, res, next) => {
    try {
      // Kiểm tra quyền hạn (chỉ manager hoặc admin mới được duyệt)
      const user = req.user as Express.User;
      if (!user || (user.role !== 'manager' && user.role !== 'admin')) {
        return res.status(403).json({ message: "Access denied. Manager or admin role required." });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid leave request ID" });
      }

      // Kiểm tra xem đơn nghỉ phép có tồn tại không
      const existingRequest = await storage.getLeaveRequest(id);
      if (!existingRequest) {
        return res.status(404).json({ message: "Leave request not found" });
      }

      // Kiểm tra trạng thái hiện tại của đơn
      if (existingRequest.status !== 'pending') {
        return res.status(400).json({
          message: `Cannot approve leave request that is ${existingRequest.status}. Only pending requests can be approved.`
        });
      }

      // Cập nhật trạng thái đơn nghỉ phép
      const updatedRequest = await storage.updateLeaveRequest(id, {
        status: 'approved',
        approvedById: user.id,
        approvedAt: new Date()
      });

      // Cập nhật số ngày nghỉ phép đã sử dụng của nhân viên (nếu cần)
      // TODO: Implement leave balance update logic here

      res.json({
        success: true,
        message: "Leave request approved successfully",
        request: updatedRequest
      });
    } catch (error) {
      next(error);
    }
  });

  // API từ chối đơn nghỉ phép
  app.put("/api/leave-requests/:id/reject", ensureAuthenticated, async (req, res, next) => {
    try {
      // Kiểm tra quyền hạn (chỉ manager hoặc admin mới được từ chối)
      const user = req.user as Express.User;
      if (!user || (user.role !== 'manager' && user.role !== 'admin')) {
        return res.status(403).json({ message: "Access denied. Manager or admin role required." });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid leave request ID" });
      }

      // Kiểm tra nội dung yêu cầu
      const rejectionSchema = z.object({
        reason: z.string().optional()
      });

      const { reason } = rejectionSchema.parse(req.body);

      // Kiểm tra xem đơn nghỉ phép có tồn tại không
      const existingRequest = await storage.getLeaveRequest(id);
      if (!existingRequest) {
        return res.status(404).json({ message: "Leave request not found" });
      }

      // Kiểm tra trạng thái hiện tại của đơn
      if (existingRequest.status !== 'pending') {
        return res.status(400).json({
          message: `Cannot reject leave request that is ${existingRequest.status}. Only pending requests can be rejected.`
        });
      }

      // Cập nhật trạng thái đơn nghỉ phép
      const updatedRequest = await storage.updateLeaveRequest(id, {
        status: 'rejected',
        approvedById: user.id,
        approvedAt: new Date(),
        // Lưu lý do từ chối vào trường reason của đơn
        reason: reason || "No reason provided"
      });

      res.json({
        success: true,
        message: "Leave request rejected successfully",
        request: updatedRequest
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });

  // API hủy đơn nghỉ phép (dành cho nhân viên)
  app.patch("/api/leave-requests/:id/cancel", ensureAuthenticated, async (req, res, next) => {
    try {
      const user = req.user as Express.User;
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid leave request ID" });
      }

      // Kiểm tra xem đơn nghỉ phép có tồn tại không
      const existingRequest = await storage.getLeaveRequest(id);
      if (!existingRequest) {
        return res.status(404).json({ message: "Leave request not found" });
      }

      // Kiểm tra quyền hủy đơn (chỉ người tạo đơn hoặc admin mới được hủy)
      const employee = await storage.getEmployeeByUserId(user.id);

      if (!employee && user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied." });
      }

      if (user.role !== 'admin' && employee && employee.id !== existingRequest.employeeId) {
        return res.status(403).json({ message: "You can only cancel your own leave requests." });
      }

      // Kiểm tra trạng thái hiện tại của đơn
      if (existingRequest.status !== 'pending') {
        return res.status(400).json({
          message: `Cannot cancel leave request that is ${existingRequest.status}. Only pending requests can be cancelled.`
        });
      }

      // Cập nhật trạng thái đơn nghỉ phép
      const updatedRequest = await storage.updateLeaveRequest(id, {
        // Sử dụng giá trị 'pending' để tạm thời fix lỗi TypeScript, sau này cần cập nhật schema để hỗ trợ 'cancelled'
        status: 'pending' as any,
        // Thêm ghi chú là đơn đã bị hủy vào trường reason
        reason: "*** CANCELLED BY USER ***" + (existingRequest.reason ? ` - Original reason: ${existingRequest.reason}` : "")
      });

      res.json({
        success: true,
        message: "Leave request cancelled successfully",
        request: updatedRequest
      });
    } catch (error: any) {
      next(error);
    }
  });

  // API lấy thông tin số ngày nghỉ phép còn lại
  app.get("/api/leave-balance/:employeeId", ensureAuthenticated, async (req, res, next) => {
    try {
      const employeeId = parseInt(req.params.employeeId);
      if (isNaN(employeeId)) {
        return res.status(400).json({ message: "Invalid employee ID" });
      }

      // Kiểm tra quyền truy cập
      const user = req.user as Express.User;
      const employee = await storage.getEmployeeByUserId(user.id);

      // Chỉ cho phép người dùng xem thông tin của chính họ hoặc quản lý/admin
      if (user.role !== 'manager' && user.role !== 'admin') {
        if (!employee || employee.id !== employeeId) {
          return res.status(403).json({ message: "Access denied." });
        }
      }

      // TODO: Implement actual leave balance calculation logic
      // Đây là data mẫu, cần thay thế bằng logic thực tế từ cơ sở dữ liệu
      const currentYear = new Date().getFullYear();

      // Lấy tất cả đơn nghỉ phép đã được duyệt của nhân viên trong năm hiện tại
      const approvedLeaves = await storage.getEmployeeLeaveRequestsByYear(employeeId, currentYear, 'approved');

      // Tính tổng số ngày đã nghỉ
      let usedDays = 0;
      for (const leave of approvedLeaves) {
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        usedDays += days;
      }

      // Giả sử mỗi nhân viên có 12 ngày nghỉ phép một năm
      const totalDays = 12;
      const availableDays = Math.max(0, totalDays - usedDays);

      res.json({
        employeeId,
        year: currentYear,
        total: totalDays,
        used: usedDays,
        available: availableDays
      });
    } catch (error: any) {
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

      try {
        // Cập nhật thông tin nhân viên với descriptor
        const updatedEmployee = await storage.updateEmployee(employeeId, {
          faceDescriptor: descriptorJson as any // Use type assertion to bypass TypeScript error
        });

        if (!updatedEmployee) {
          throw new Error("Không thể cập nhật dữ liệu nhân viên");
        }

        console.log("Đã cập nhật thành công nhân viên ID:", employeeId);

        return res.status(201).json({
          success: true,
          message: "Đã lưu dữ liệu khuôn mặt thành công",
          employee: updatedEmployee
        });
      } catch (updateError) {
        console.error("Lỗi khi cập nhật dữ liệu nhân viên:", updateError);
        return res.status(500).json({
          success: false,
          message: "Không thể lưu dữ liệu khuôn mặt vào hệ thống"
        });
      }
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

  // User face profile endpoints
  // Get user face profile data
  app.get("/api/users/:id/face-profile", ensureAuthenticated, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID người dùng không hợp lệ" });
      }

      // Kiểm tra đã đăng nhập và chỉ cho phép người dùng xem thông tin của chính họ
      if (!req.user || req.user.id !== userId) {
        return res.status(403).json({ message: "Không có quyền truy cập" });
      }

      // Lấy thông tin người dùng
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }

      // Kiểm tra xem người dùng có liên kết với nhân viên không
      const employee = user.employeeId ? await storage.getEmployee(user.employeeId) : null;

      // Trả về thông tin face profile
      res.json({
        hasFaceProfile: employee ? !!employee.faceDescriptor : false,
        message: employee?.faceDescriptor
          ? "Đã đăng ký dữ liệu khuôn mặt"
          : "Chưa đăng ký dữ liệu khuôn mặt"
      });
    } catch (error) {
      next(error);
    }
  });

  // Save user face profile data
  app.post("/api/users/:id/face-profile", ensureAuthenticated, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID người dùng không hợp lệ" });
      }

      // Kiểm tra đã đăng nhập và chỉ cho phép người dùng cập nhật thông tin của chính họ
      if (!req.user || req.user.id !== userId) {
        return res.status(403).json({ message: "Không có quyền truy cập" });
      }

      // Kiểm tra xem có descriptor không
      const { faceDescriptor } = req.body;

      if (!faceDescriptor) {
        return res.status(400).json({ message: "Cần có dữ liệu khuôn mặt" });
      }

      // Lấy thông tin người dùng
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }

      // Kiểm tra xem người dùng có liên kết với nhân viên không
      if (!user.employeeId) {
        return res.status(400).json({ message: "Tài khoản không liên kết với nhân viên" });
      }

      // Lấy thông tin nhân viên
      const employee = await storage.getEmployee(user.employeeId);

      if (!employee) {
        return res.status(404).json({ message: "Không tìm thấy thông tin nhân viên" });
      }

      console.log("Đã tìm thấy nhân viên ID:", employee.id);
      console.log("Kiểu dữ liệu faceDescriptor:", typeof faceDescriptor);

      // Xử lý descriptor từ chuỗi thành mảng nếu cần
      let descriptorArray = faceDescriptor;

      // Kiểm tra nếu descriptor là chuỗi, thì parse thành mảng
      if (typeof faceDescriptor === 'string') {
        try {
          // Nếu đó là chuỗi JSON, parse thành mảng
          if (faceDescriptor.startsWith('[') && faceDescriptor.endsWith(']')) {
            descriptorArray = JSON.parse(faceDescriptor);
          } else {
            // Nếu đó là chuỗi số phân tách bởi dấu phẩy, chuyển thành mảng số
            descriptorArray = faceDescriptor.split(',').map(Number);
          }
          console.log("Đã parse chuỗi faceDescriptor thành mảng");
        } catch (e) {
          console.error("Lỗi khi parse faceDescriptor:", e);
          return res.status(400).json({ message: "Dữ liệu khuôn mặt không hợp lệ" });
        }
      }

      // Chuyển descriptor thành chuỗi JSON để lưu vào database
      const descriptorJson = JSON.stringify(descriptorArray);

      try {
        // Cập nhật thông tin nhân viên với descriptor
        const updatedEmployee = await storage.updateEmployee(employee.id, {
          faceDescriptor: descriptorJson as any // Use type assertion to bypass TypeScript error
        });

        if (!updatedEmployee) {
          throw new Error("Không thể cập nhật dữ liệu nhân viên");
        }

        console.log("Đã cập nhật thành công dữ liệu khuôn mặt cho nhân viên ID:", employee.id);

        return res.status(201).json({
          success: true,
          message: "Đã lưu dữ liệu khuôn mặt thành công",
          employee: updatedEmployee
        });
      } catch (updateError) {
        console.error("Lỗi khi cập nhật dữ liệu khuôn mặt:", updateError);
        return res.status(500).json({
          success: false,
          message: "Không thể lưu dữ liệu khuôn mặt vào hệ thống"
        });
      }
    } catch (error) {
      console.error("Lỗi khi lưu dữ liệu khuôn mặt người dùng:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Không thể lưu dữ liệu khuôn mặt"
      });
    }
  });

  // Delete user face profile data
  app.delete("/api/users/:id/face-profile", ensureAuthenticated, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID người dùng không hợp lệ" });
      }

      // Kiểm tra đã đăng nhập và chỉ cho phép người dùng xóa thông tin của chính họ
      if (!req.user || req.user.id !== userId) {
        return res.status(403).json({ message: "Không có quyền truy cập" });
      }

      // Lấy thông tin người dùng
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }

      // Kiểm tra xem người dùng có liên kết với nhân viên không
      if (!user.employeeId) {
        return res.status(400).json({ message: "Tài khoản không liên kết với nhân viên" });
      }

      try {
        // Xóa dữ liệu khuôn mặt của nhân viên
        const updated = await storage.updateEmployee(user.employeeId, {
          faceDescriptor: null
        });

        if (!updated) {
          throw new Error("Không thể cập nhật dữ liệu nhân viên");
        }

        console.log("Đã xóa dữ liệu khuôn mặt cho nhân viên ID:", user.employeeId);

        return res.status(200).json({
          success: true,
          message: "Đã xóa dữ liệu khuôn mặt thành công"
        });
      } catch (deleteError) {
        console.error("Lỗi khi xóa dữ liệu khuôn mặt:", deleteError);
        return res.status(500).json({
          success: false,
          message: "Không thể xóa dữ liệu khuôn mặt"
        });
      }
    } catch (error) {
      console.error("Lỗi khi xóa dữ liệu khuôn mặt người dùng:", error);
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

  // Update user password (for regular users to update their own password)
  app.put("/api/users/:id/password", ensureAuthenticated, async (req, res, next) => {
    try {
      const currentUser = req.user as Express.User;
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Users can only update their own password unless they are admin
      if (currentUser.id !== userId && currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: You can only update your own password" });
      }

      // Get the user to update
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Validate input
      const updatePasswordSchema = z.object({
        currentPassword: z.string().min(6),
        newPassword: z.string().min(6),
      });

      const passwordData = updatePasswordSchema.parse(req.body);

      // Verify the current password is correct
      const isPasswordValid = await comparePasswords(passwordData.currentPassword, existingUser.password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(passwordData.newPassword);

      // Update password in database
      const updatedUser = await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser || updatedUser.length === 0) {
        return res.status(500).json({ message: "Failed to update password" });
      }

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error(`Error updating password for user with ID ${req.params.id}:`, error);
      res.status(500).json({ message: `Failed to update password` });
    }
  });

  // Same endpoint but with PATCH method for flexibility
  app.patch("/api/users/:id/password", ensureAuthenticated, async (req, res, next) => {
    try {
      const currentUser = req.user as Express.User;
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Users can only update their own password unless they are admin
      if (currentUser.id !== userId && currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: You can only update your own password" });
      }

      // Get the user to update
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Validate input
      const updatePasswordSchema = z.object({
        currentPassword: z.string().min(6),
        newPassword: z.string().min(6),
      });

      const passwordData = updatePasswordSchema.parse(req.body);

      // Verify the current password is correct
      const isPasswordValid = await comparePasswords(passwordData.currentPassword, existingUser.password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(passwordData.newPassword);

      // Update password in database
      const updatedUser = await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser || updatedUser.length === 0) {
        return res.status(500).json({ message: "Failed to update password" });
      }

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error(`Error updating password for user with ID ${req.params.id}:`, error);
      res.status(500).json({ message: `Failed to update password` });
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

  // Leave Request Routes
  app.get('/api/leave-requests', ensureAuthenticated, async (req, res) => {
    try {
      const { status } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const employee = await storage.getEmployeeByUserId(userId);
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      const leaveRequests = await storage.getEmployeeLeaveRequests(employee.id, status as string);
      res.json(leaveRequests);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      res.status(500).json({ error: 'Failed to fetch leave requests' });
    }
  });

  // Add these new endpoints for manager approval/rejection
  app.get('/api/leave-requests/manager', ensureAuthenticated, async (req, res) => {
    try {
      const { status } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Check if user is admin or manager
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin' && user?.role !== 'manager') {
        return res.status(403).json({ error: 'Unauthorized. Only managers can view all leave requests' });
      }

      // Get all leave requests with employee details
      const leaveRequests = await storage.getAllLeaveRequestsWithEmployeeDetails(1, 100, status as string);

      // For each request, fetch the employee details
      const enrichedRequests = await Promise.all(leaveRequests.map(async (request) => {
        const employee = await storage.getEmployee(request.employeeId);
        return {
          ...request,
          employee: {
            id: employee?.id,
            firstName: employee?.firstName,
            lastName: employee?.lastName,
            department: employee?.departmentId ? await storage.getDepartment(employee.departmentId) : null
          }
        };
      }));

      res.json(enrichedRequests);
    } catch (error) {
      console.error('Error fetching leave requests for manager:', error);
      res.status(500).json({ error: 'Failed to fetch leave requests' });
    }
  });

  // Endpoint to approve a leave request
  app.put('/api/leave-requests/:id/approve', ensureAuthenticated, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Check if user is admin or manager
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin' && user?.role !== 'manager') {
        return res.status(403).json({ error: 'Unauthorized. Only managers can approve leave requests' });
      }

      // Get the leave request
      const leaveRequest = await storage.getLeaveRequest(requestId);
      if (!leaveRequest) {
        return res.status(404).json({ error: 'Leave request not found' });
      }

      // Only pending requests can be approved
      if (leaveRequest.status !== 'pending') {
        return res.status(400).json({ error: 'Only pending requests can be approved' });
      }

      // Update the leave request
      const updatedRequest = await storage.updateLeaveRequest(requestId, {
        status: 'approved',
        approvedById: userId,
        approvedAt: new Date()
      });

      res.json(updatedRequest);
    } catch (error) {
      console.error('Error approving leave request:', error);
      res.status(500).json({ error: 'Failed to approve leave request' });
    }
  });

  // Endpoint to reject a leave request
  app.put('/api/leave-requests/:id/reject', ensureAuthenticated, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const userId = req.user?.id;
      const { reason } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Check if user is admin or manager
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin' && user?.role !== 'manager') {
        return res.status(403).json({ error: 'Unauthorized. Only managers can reject leave requests' });
      }

      // Get the leave request
      const leaveRequest = await storage.getLeaveRequest(requestId);
      if (!leaveRequest) {
        return res.status(404).json({ error: 'Leave request not found' });
      }

      // Only pending requests can be rejected
      if (leaveRequest.status !== 'pending') {
        return res.status(400).json({ error: 'Only pending requests can be rejected' });
      }

      // Update the leave request
      const updatedRequest = await storage.updateLeaveRequest(requestId, {
        status: 'rejected',
        approvedById: userId, // Storing the manager who rejected it
        approvedAt: new Date(),
        rejectionReason: reason || null
      });

      res.json(updatedRequest);
    } catch (error) {
      console.error('Error rejecting leave request:', error);
      res.status(500).json({ error: 'Failed to reject leave request' });
    }
  });

  // Endpoint for employee to cancel their pending leave request
  app.patch('/api/leave-requests/:id/cancel', ensureAuthenticated, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Get employee by user ID
      const employee = await storage.getEmployeeByUserId(userId);
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      // Get the leave request
      const leaveRequest = await storage.getLeaveRequest(requestId);
      if (!leaveRequest) {
        return res.status(404).json({ error: 'Leave request not found' });
      }

      // Verify that this leave request belongs to the employee
      if (leaveRequest.employeeId !== employee.id) {
        return res.status(403).json({ error: 'Unauthorized. This is not your leave request' });
      }

      // Only pending requests can be cancelled
      if (leaveRequest.status !== 'pending') {
        return res.status(400).json({ error: 'Only pending requests can be cancelled' });
      }

      // Update the leave request
      const updatedRequest = await storage.updateLeaveRequest(requestId, {
        status: 'cancelled'
      });

      res.json(updatedRequest);
    } catch (error) {
      console.error('Error cancelling leave request:', error);
      res.status(500).json({ error: 'Failed to cancel leave request' });
    }
  });

  // Endpoint to check leave balance for an employee
  app.get('/api/leave-balance/:employeeId', ensureAuthenticated, async (req, res) => {
    try {
      const employeeId = parseInt(req.params.employeeId);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Get the current year
      const currentYear = new Date().getFullYear();

      // Get all approved leave requests for the employee in the current year
      const leaveRequests = await storage.getEmployeeLeaveRequestsByYear(employeeId, currentYear, 'approved');

      // Calculate used leave days
      const usedDays = leaveRequests.reduce((total, request) => {
        const startDate = new Date(request.startDate);
        const endDate = new Date(request.endDate);
        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return total + days;
      }, 0);

      // Assume a total of 15 days per year (you can adjust this based on your business rules)
      const totalDays = 15;
      const availableDays = Math.max(0, totalDays - usedDays);

      res.json({
        total: totalDays,
        used: usedDays,
        available: availableDays
      });
    } catch (error) {
      console.error('Error checking leave balance:', error);
      res.status(500).json({ error: 'Failed to check leave balance' });
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

      try {
        // Cập nhật thông tin nhân viên với descriptor
        const updatedEmployee = await storage.updateEmployee(employeeId, {
          faceDescriptor: descriptorJson as any // Use type assertion to bypass TypeScript error
        });

        if (!updatedEmployee) {
          throw new Error("Không thể cập nhật dữ liệu nhân viên");
        }

        console.log("Đã cập nhật thành công nhân viên ID:", employeeId);

        return res.status(201).json({
          success: true,
          message: "Đã lưu dữ liệu khuôn mặt thành công",
          employee: updatedEmployee
        });
      } catch (updateError) {
        console.error("Lỗi khi cập nhật dữ liệu nhân viên:", updateError);
        return res.status(500).json({
          success: false,
          message: "Không thể lưu dữ liệu khuôn mặt vào hệ thống"
        });
      }
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

  // User face profile endpoints
  // Get user face profile data
  app.get("/api/users/:id/face-profile", ensureAuthenticated, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID người dùng không hợp lệ" });
      }

      // Kiểm tra đã đăng nhập và chỉ cho phép người dùng xem thông tin của chính họ
      if (!req.user || req.user.id !== userId) {
        return res.status(403).json({ message: "Không có quyền truy cập" });
      }

      // Lấy thông tin người dùng
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }

      // Kiểm tra xem người dùng có liên kết với nhân viên không
      const employee = user.employeeId ? await storage.getEmployee(user.employeeId) : null;

      // Trả về thông tin face profile
      res.json({
        hasFaceProfile: employee ? !!employee.faceDescriptor : false,
        message: employee?.faceDescriptor
          ? "Đã đăng ký dữ liệu khuôn mặt"
          : "Chưa đăng ký dữ liệu khuôn mặt"
      });
    } catch (error) {
      next(error);
    }
  });

  // Save user face profile data
  app.post("/api/users/:id/face-profile", ensureAuthenticated, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID người dùng không hợp lệ" });
      }

      // Kiểm tra đã đăng nhập và chỉ cho phép người dùng cập nhật thông tin của chính họ
      if (!req.user || req.user.id !== userId) {
        return res.status(403).json({ message: "Không có quyền truy cập" });
      }

      // Kiểm tra xem có descriptor không
      const { faceDescriptor } = req.body;

      if (!faceDescriptor) {
        return res.status(400).json({ message: "Cần có dữ liệu khuôn mặt" });
      }

      // Lấy thông tin người dùng
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }

      // Kiểm tra xem người dùng có liên kết với nhân viên không
      if (!user.employeeId) {
        return res.status(400).json({ message: "Tài khoản không liên kết với nhân viên" });
      }

      // Lấy thông tin nhân viên
      const employee = await storage.getEmployee(user.employeeId);

      if (!employee) {
        return res.status(404).json({ message: "Không tìm thấy thông tin nhân viên" });
      }

      console.log("Đã tìm thấy nhân viên ID:", employee.id);
      console.log("Kiểu dữ liệu faceDescriptor:", typeof faceDescriptor);

      // Xử lý descriptor từ chuỗi thành mảng nếu cần
      let descriptorArray = faceDescriptor;

      // Kiểm tra nếu descriptor là chuỗi, thì parse thành mảng
      if (typeof faceDescriptor === 'string') {
        try {
          // Nếu đó là chuỗi JSON, parse thành mảng
          if (faceDescriptor.startsWith('[') && faceDescriptor.endsWith(']')) {
            descriptorArray = JSON.parse(faceDescriptor);
          } else {
            // Nếu đó là chuỗi số phân tách bởi dấu phẩy, chuyển thành mảng số
            descriptorArray = faceDescriptor.split(',').map(Number);
          }
          console.log("Đã parse chuỗi faceDescriptor thành mảng");
        } catch (e) {
          console.error("Lỗi khi parse faceDescriptor:", e);
          return res.status(400).json({ message: "Dữ liệu khuôn mặt không hợp lệ" });
        }
      }

      // Chuyển descriptor thành chuỗi JSON để lưu vào database
      const descriptorJson = JSON.stringify(descriptorArray);

      try {
        // Cập nhật thông tin nhân viên với descriptor
        const updatedEmployee = await storage.updateEmployee(employee.id, {
          faceDescriptor: descriptorJson as any // Use type assertion to bypass TypeScript error
        });

        if (!updatedEmployee) {
          throw new Error("Không thể cập nhật dữ liệu nhân viên");
        }

        console.log("Đã cập nhật thành công dữ liệu khuôn mặt cho nhân viên ID:", employee.id);

        return res.status(201).json({
          success: true,
          message: "Đã lưu dữ liệu khuôn mặt thành công",
          employee: updatedEmployee
        });
      } catch (updateError) {
        console.error("Lỗi khi cập nhật dữ liệu khuôn mặt:", updateError);
        return res.status(500).json({
          success: false,
          message: "Không thể lưu dữ liệu khuôn mặt vào hệ thống"
        });
      }
    } catch (error) {
      console.error("Lỗi khi lưu dữ liệu khuôn mặt người dùng:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Không thể lưu dữ liệu khuôn mặt"
      });
    }
  });

  // Delete user face profile data
  app.delete("/api/users/:id/face-profile", ensureAuthenticated, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID người dùng không hợp lệ" });
      }

      // Kiểm tra đã đăng nhập và chỉ cho phép người dùng xóa thông tin của chính họ
      if (!req.user || req.user.id !== userId) {
        return res.status(403).json({ message: "Không có quyền truy cập" });
      }

      // Lấy thông tin người dùng
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }

      // Kiểm tra xem người dùng có liên kết với nhân viên không
      if (!user.employeeId) {
        return res.status(400).json({ message: "Tài khoản không liên kết với nhân viên" });
      }

      try {
        // Xóa dữ liệu khuôn mặt của nhân viên
        const updated = await storage.updateEmployee(user.employeeId, {
          faceDescriptor: null
        });

        if (!updated) {
          throw new Error("Không thể cập nhật dữ liệu nhân viên");
        }

        console.log("Đã xóa dữ liệu khuôn mặt cho nhân viên ID:", user.employeeId);

        return res.status(200).json({
          success: true,
          message: "Đã xóa dữ liệu khuôn mặt thành công"
        });
      } catch (deleteError) {
        console.error("Lỗi khi xóa dữ liệu khuôn mặt:", deleteError);
        return res.status(500).json({
          success: false,
          message: "Không thể xóa dữ liệu khuôn mặt"
        });
      }
    } catch (error) {
      console.error("Lỗi khi xóa dữ liệu khuôn mặt người dùng:", error);
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

  // Update user password (for regular users to update their own password)
  app.put("/api/users/:id/password", ensureAuthenticated, async (req, res, next) => {
    try {
      const currentUser = req.user as Express.User;
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Users can only update their own password unless they are admin
      if (currentUser.id !== userId && currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: You can only update your own password" });
      }

      // Get the user to update
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Validate input
      const updatePasswordSchema = z.object({
        currentPassword: z.string().min(6),
        newPassword: z.string().min(6),
      });

      const passwordData = updatePasswordSchema.parse(req.body);

      // Verify the current password is correct
      const isPasswordValid = await comparePasswords(passwordData.currentPassword, existingUser.password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(passwordData.newPassword);

      // Update password in database
      const updatedUser = await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser || updatedUser.length === 0) {
        return res.status(500).json({ message: "Failed to update password" });
      }

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error(`Error updating password for user with ID ${req.params.id}:`, error);
      res.status(500).json({ message: `Failed to update password` });
    }
  });

  // Same endpoint but with PATCH method for flexibility
  app.patch("/api/users/:id/password", ensureAuthenticated, async (req, res, next) => {
    try {
      const currentUser = req.user as Express.User;
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Users can only update their own password unless they are admin
      if (currentUser.id !== userId && currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: You can only update your own password" });
      }

      // Get the user to update
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Validate input
      const updatePasswordSchema = z.object({
        currentPassword: z.string().min(6),
        newPassword: z.string().min(6),
      });

      const passwordData = updatePasswordSchema.parse(req.body);

      // Verify the current password is correct
      const isPasswordValid = await comparePasswords(passwordData.currentPassword, existingUser.password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(passwordData.newPassword);

      // Update password in database
      const updatedUser = await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser || updatedUser.length === 0) {
        return res.status(500).json({ message: "Failed to update password" });
      }

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error(`Error updating password for user with ID ${req.params.id}:`, error);
      res.status(500).json({ message: `Failed to update password` });
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

  // Leave Request Routes
  app.get('/api/leave-requests', ensureAuthenticated, async (req, res) => {
    try {
      const { status } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const employee = await storage.getEmployeeByUserId(userId);
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      const leaveRequests = await storage.getEmployeeLeaveRequests(employee.id, status as string);
      res.json(leaveRequests);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      res.status(500).json({ error: 'Failed to fetch leave requests' });
    }
  });

  // Add these new endpoints for manager approval/rejection
  app.get('/api/leave-requests/manager', ensureAuthenticated, async (req, res) => {
    try {
      const { status } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Check if user is admin or manager
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin' && user?.role !== 'manager') {
        return res.status(403).json({ error: 'Unauthorized. Only managers can view all leave requests' });
      }

      // Get all leave requests with employee details
      const leaveRequests = await storage.getAllLeaveRequestsWithEmployeeDetails(1, 100, status as string);

      // For each request, fetch the employee details
      const enrichedRequests = await Promise.all(leaveRequests.map(async (request) => {
        const employee = await storage.getEmployee(request.employeeId);
        return {
          ...request,
          employee: {
            id: employee?.id,
            firstName: employee?.firstName,
            lastName: employee?.lastName,
            department: employee?.departmentId ? await storage.getDepartment(employee.departmentId) : null
          }
        };
      }));

      res.json(enrichedRequests);
    } catch (error) {
      console.error('Error fetching leave requests for manager:', error);
      res.status(500).json({ error: 'Failed to fetch leave requests' });
    }
  });

  // Endpoint to approve a leave request
  app.put('/api/leave-requests/:id/approve', ensureAuthenticated, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Check if user is admin or manager
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin' && user?.role !== 'manager') {
        return res.status(403).json({ error: 'Unauthorized. Only managers can approve leave requests' });
      }

      // Get the leave request
      const leaveRequest = await storage.getLeaveRequest(requestId);
      if (!leaveRequest) {
        return res.status(404).json({ error: 'Leave request not found' });
      }

      // Only pending requests can be approved
      if (leaveRequest.status !== 'pending') {
        return res.status(400).json({ error: 'Only pending requests can be approved' });
      }

      // Update the leave request
      const updatedRequest = await storage.updateLeaveRequest(requestId, {
        status: 'approved',
        approvedById: userId,
        approvedAt: new Date()
      });

      res.json(updatedRequest);
    } catch (error) {
      console.error('Error approving leave request:', error);
      res.status(500).json({ error: 'Failed to approve leave request' });
    }
  });

  // Endpoint to reject a leave request
  app.put('/api/leave-requests/:id/reject', ensureAuthenticated, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const userId = req.user?.id;
      const { reason } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Check if user is admin or manager
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin' && user?.role !== 'manager') {
        return res.status(403).json({ error: 'Unauthorized. Only managers can reject leave requests' });
      }

      // Get the leave request
      const leaveRequest = await storage.getLeaveRequest(requestId);
      if (!leaveRequest) {
        return res.status(404).json({ error: 'Leave request not found' });
      }

      // Only pending requests can be rejected
      if (leaveRequest.status !== 'pending') {
        return res.status(400).json({ error: 'Only pending requests can be rejected' });
      }

      // Update the leave request
      const updatedRequest = await storage.updateLeaveRequest(requestId, {
        status: 'rejected',
        approvedById: userId, // Storing the manager who rejected it
        approvedAt: new Date(),
        rejectionReason: reason || null
      });

      res.json(updatedRequest);
    } catch (error) {
      console.error('Error rejecting leave request:', error);
      res.status(500).json({ error: 'Failed to reject leave request' });
    }
  });

  // Endpoint for employee to cancel their pending leave request
  app.patch('/api/leave-requests/:id/cancel', ensureAuthenticated, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Get employee by user ID
      const employee = await storage.getEmployeeByUserId(userId);
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      // Get the leave request
      const leaveRequest = await storage.getLeaveRequest(requestId);
      if (!leaveRequest) {
        return res.status(404).json({ error: 'Leave request not found' });
      }

      // Verify that this leave request belongs to the employee
      if (leaveRequest.employeeId !== employee.id) {
        return res.status(403).json({ error: 'Unauthorized. This is not your leave request' });
      }

      // Only pending requests can be cancelled
      if (leaveRequest.status !== 'pending') {
        return res.status(400).json({ error: 'Only pending requests can be cancelled' });
      }

      // Update the leave request
      const updatedRequest = await storage.updateLeaveRequest(requestId, {
        status: 'cancelled'
      });

      res.json(updatedRequest);
    } catch (error) {
      console.error('Error cancelling leave request:', error);
      res.status(500).json({ error: 'Failed to cancel leave request' });
    }
  });

  // Endpoint to check leave balance for an employee
  app.get('/api/leave-balance/:employeeId', ensureAuthenticated, async (req, res) => {
    try {
      const employeeId = parseInt(req.params.employeeId);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Get the current year
      const currentYear = new Date().getFullYear();

      // Get all approved leave requests for the employee in the current year
      const leaveRequests = await storage.getEmployeeLeaveRequestsByYear(employeeId, currentYear, 'approved');

      // Calculate used leave days
      const usedDays = leaveRequests.reduce((total, request) => {
        const startDate = new Date(request.startDate);
        const endDate = new Date(request.endDate);
        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return total + days;
      }, 0);

      // Assume a total of 15 days per year (you can adjust this based on your business rules)
      const totalDays = 15;
      const availableDays = Math.max(0, totalDays - usedDays);

      res.json({
        total: totalDays,
        used: usedDays,
        available: availableDays
      });
    } catch (error) {
      console.error('Error checking leave balance:', error);
      res.status(500).json({ error: 'Failed to check leave balance' });
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

      try {
        // Cập nhật thông tin nhân viên với descriptor
        const updatedEmployee = await storage.updateEmployee(employeeId, {
          faceDescriptor: descriptorJson as any // Use type assertion to bypass TypeScript error
        });

        if (!updatedEmployee) {
          throw new Error("Không thể cập nhật dữ liệu nhân viên");
        }

        console.log("Đã cập nhật thành công nhân viên ID:", employeeId);

        return res.status(201).json({
          success: true,
          message: "Đã lưu dữ liệu khuôn mặt thành công",
          employee: updatedEmployee
        });
      } catch (updateError) {
        console.error("Lỗi khi cập nhật dữ liệu nhân viên:", updateError);
        return res.status(500).json({
          success: false,
          message: "Không thể lưu dữ liệu khuôn mặt vào hệ thống"
        });
      }
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

  // User face profile endpoints
  // Get user face profile data
  app.get("/api/users/:id/face-profile", ensureAuthenticated, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID người dùng không hợp lệ" });
      }

      // Kiểm tra đã đăng nhập và chỉ cho phép người dùng xem thông tin của chính họ
      if (!req.user || req.user.id !== userId) {
        return res.status(403).json({ message: "Không có quyền truy cập" });
      }

      // Lấy thông tin người dùng
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }

      // Kiểm tra xem người dùng có liên kết với nhân viên không
      const employee = user.employeeId ? await storage.getEmployee(user.employeeId) : null;

      // Trả về thông tin face profile
      res.json({
        hasFaceProfile: employee ? !!employee.faceDescriptor : false,
        message: employee?.faceDescriptor
          ? "Đã đăng ký dữ liệu khuôn mặt"
          : "Chưa đăng ký dữ liệu khuôn mặt"
      });
    } catch (error) {
      next(error);
    }
  });

  // Save user face profile data
  app.post("/api/users/:id/face-profile", ensureAuthenticated, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID người dùng không hợp lệ" });
      }

      // Kiểm tra đã đăng nhập và chỉ cho phép người dùng cập nhật thông tin của chính họ
      if (!req.user || req.user.id !== userId) {
        return res.status(403).json({ message: "Không có quyền truy cập" });
      }

      // Kiểm tra xem có descriptor không
      const { faceDescriptor } = req.body;

      if (!faceDescriptor) {
        return res.status(400).json({ message: "Cần có dữ liệu khuôn mặt" });
      }

      // Lấy thông tin người dùng
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }

      // Kiểm tra xem người dùng có liên kết với nhân viên không
      if (!user.employeeId) {
        return res.status(400).json({ message: "Tài khoản không liên kết với nhân viên" });
      }

      // Lấy thông tin nhân viên
      const employee = await storage.getEmployee(user.employeeId);

      if (!employee) {
        return res.status(404).json({ message: "Không tìm thấy thông tin nhân viên" });
      }

      console.log("Đã tìm thấy nhân viên ID:", employee.id);
      console.log("Kiểu dữ liệu faceDescriptor:", typeof faceDescriptor);

      // Xử lý descriptor từ chuỗi thành mảng nếu cần
      let descriptorArray = faceDescriptor;

      // Kiểm tra nếu descriptor là chuỗi, thì parse thành mảng
      if (typeof faceDescriptor === 'string') {
        try {
          // Nếu đó là chuỗi JSON, parse thành mảng
          if (faceDescriptor.startsWith('[') && faceDescriptor.endsWith(']')) {
            descriptorArray = JSON.parse(faceDescriptor);
          } else {
            // Nếu đó là chuỗi số phân tách bởi dấu phẩy, chuyển thành mảng số
            descriptorArray = faceDescriptor.split(',').map(Number);
          }
          console.log("Đã parse chuỗi faceDescriptor thành mảng");
        } catch (e) {
          console.error("Lỗi khi parse faceDescriptor:", e);
          return res.status(400).json({ message: "Dữ liệu khuôn mặt không hợp lệ" });
        }
      }

      // Chuyển descriptor thành chuỗi JSON để lưu vào database
      const descriptorJson = JSON.stringify(descriptorArray);

      try {
        // Cập nhật thông tin nhân viên với descriptor
        const updatedEmployee = await storage.updateEmployee(employee.id, {
          faceDescriptor: descriptorJson as any // Use type assertion to bypass TypeScript error
        });

        if (!updatedEmployee) {
          throw new Error("Không thể cập nhật dữ liệu nhân viên");
        }

        console.log("Đã cập nhật thành công dữ liệu khuôn mặt cho nhân viên ID:", employee.id);

        return res.status(201).json({
          success: true,
          message: "Đã lưu dữ liệu khuôn mặt thành công",
          employee: updatedEmployee
        });
      } catch (updateError) {
        console.error("Lỗi khi cập nhật dữ liệu khuôn mặt:", updateError);
        return res.status(500).json({
          success: false,
          message: "Không thể lưu dữ liệu khuôn mặt vào hệ thống"
        });
      }
    } catch (error) {
      console.error("Lỗi khi lưu dữ liệu khuôn mặt người dùng:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Không thể lưu dữ liệu khuôn mặt"
      });
    }
  });

  // Delete user face profile data
  app.delete("/api/users/:id/face-profile", ensureAuthenticated, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID người dùng không hợp lệ" });
      }

      // Kiểm tra đã đăng nhập và chỉ cho phép người dùng xóa thông tin của chính họ
      if (!req.user || req.user.id !== userId) {
        return res.status(403).json({ message: "Không có quyền truy cập" });
      }

      // Lấy thông tin người dùng
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "Không tìm thấy người dùng" });
      }

      // Kiểm tra xem người dùng có liên kết với nhân viên không
      if (!user.employeeId) {
        return res.status(400).json({ message: "Tài khoản không liên kết với nhân viên" });
      }

      try {
        // Xóa dữ liệu khuôn mặt của nhân viên
        const updated = await storage.updateEmployee(user.employeeId, {
          faceDescriptor: null
        });

        if (!updated) {
          throw new Error("Không thể cập nhật dữ liệu nhân viên");
        }

        console.log("Đã xóa dữ liệu khuôn mặt cho nhân viên ID:", user.employeeId);

        return res.status(200).json({
          success: true,
          message: "Đã xóa dữ liệu khuôn mặt thành công"
        });
      } catch (deleteError) {
        console.error("Lỗi khi xóa dữ liệu khuôn mặt:", deleteError);
        return res.status(500).json({
          success: false,
          message: "Không thể xóa dữ liệu khuôn mặt"
        });
      }
    } catch (error) {
      console.error("Lỗi khi xóa dữ liệu khuôn mặt người dùng:", error);
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

  // Update user password (for regular users to update their own password)
  app.put("/api/users/:id/password", ensureAuthenticated, async (req, res, next) => {
    try {
      const currentUser = req.user as Express.User;
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Users can only update their own password unless they are admin
      if (currentUser.id !== userId && currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: You can only update your own password" });
      }

      // Get the user to update
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Validate input
      const updatePasswordSchema = z.object({
        currentPassword: z.string().min(6),
        newPassword: z.string().min(6),
      });

      const passwordData = updatePasswordSchema.parse(req.body);

      // Verify the current password is correct
      const isPasswordValid = await comparePasswords(passwordData.currentPassword, existingUser.password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(passwordData.newPassword);

      // Update password in database
      const updatedUser = await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser || updatedUser.length === 0) {
        return res.status(500).json({ message: "Failed to update password" });
      }

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error(`Error updating password for user with ID ${req.params.id}:`, error);
      res.status(500).json({ message: `Failed to update password` });
    }
  });

  // Same endpoint but with PATCH method for flexibility
  app.patch("/api/users/:id/password", ensureAuthenticated, async (req, res, next) => {
    try {
      const currentUser = req.user as Express.User;
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Users can only update their own password unless they are admin
      if (currentUser.id !== userId && currentUser.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: You can only update your own password" });
      }

      // Get the user to update
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Validate input
      const updatePasswordSchema = z.object({
        currentPassword: z.string().min(6),
        newPassword: z.string().min(6),
      });

      const passwordData = updatePasswordSchema.parse(req.body);

      // Verify the current password is correct
      const isPasswordValid = await comparePasswords(passwordData.currentPassword, existingUser.password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(passwordData.newPassword);

      // Update password in database
      const updatedUser = await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser || updatedUser.length === 0) {
        return res.status(500).json({ message: "Failed to update password" });
      }

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error(`Error updating password for user with ID ${req.params.id}:`, error);
      res.status(500).json({ message: `Failed to update password` });
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

  // Leave Request Routes
  app.get('/api/leave-requests', ensureAuthenticated, async (req, res) => {
    try {
      const { status } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const employee = await storage.getEmployeeByUserId(userId);
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      const leaveRequests = await storage.getEmployeeLeaveRequests(employee.id, status as string);
      res.json(leaveRequests);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      res.status(500).json({ error: 'Failed to fetch leave requests' });
    }
  });

  // Add these new endpoints for manager approval/rejection
  app.get('/api/leave-requests/manager', ensureAuthenticated, async (req, res) => {
    try {
      const { status } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Check if user is admin or manager
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin' && user?.role !== 'manager') {
        return res.status(403).json({ error: 'Unauthorized. Only managers can view all leave requests' });
      }

      // Get all leave requests with employee details
      const leaveRequests = await storage.getAllLeaveRequestsWithEmployeeDetails(1, 100, status as string);

      // For each request, fetch the employee details
      const enrichedRequests = await Promise.all(leaveRequests.map(async (request) => {
        const employee = await storage.getEmployee(request.employeeId);
        return {
          ...request,
          employee: {
            id: employee?.id,
            firstName: employee?.firstName,
            lastName: employee?.lastName,
            department: employee?.departmentId ? await storage.getDepartment(employee.departmentId) : null
          }
        };
      }));

      res.json(enrichedRequests);
    } catch (error) {
      console.error('Error fetching leave requests for manager:', error);
      res.status(500).json({ error: 'Failed to fetch leave requests' });
    }
  });

  // Endpoint to approve a leave request
  app.put('/api/leave-requests/:id/approve', ensureAuthenticated, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Check if user is admin or manager
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin' && user?.role !== 'manager') {
        return res.status(403).json({ error: 'Unauthorized. Only managers can approve leave requests' });
      }

      // Get the leave request
      const leaveRequest = await storage.getLeaveRequest(requestId);
      if (!leaveRequest) {
        return res.status(404).json({ error: 'Leave request not found' });
      }

      // Only pending requests can be approved
      if (leaveRequest.status !== 'pending') {
        return res.status(400).json({ error: 'Only pending requests can be approved' });
      }

      // Update the leave request
      const updatedRequest = await storage.updateLeaveRequest(requestId, {
        status: 'approved',
        approvedById: userId,
        approvedAt: new Date()
      });

      res.json(updatedRequest);
    } catch (error) {
      console.error('Error approving leave request:', error);
      res.status(500).json({ error: 'Failed to approve leave request' });
    }
  });

  // Endpoint to reject a leave request
  app.put('/api/leave-requests/:id/reject', ensureAuthenticated, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const userId = req.user?.id;
      const { reason } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Check if user is admin or manager
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin' && user?.role !== 'manager') {
        return res.status(403).json({ error: 'Unauthorized. Only managers can reject leave requests' });
      }

      // Get the leave request
      const leaveRequest = await storage.getLeaveRequest(requestId);
      if (!leaveRequest) {
        return res.status(404).json({ error: 'Leave request not found' });
      }

      // Only pending requests can be rejected
      if (leaveRequest.status !== 'pending') {
        return res.status(400).json({ error: 'Only pending requests can be rejected' });
      }

      // Update the leave request
      const updatedRequest = await storage.updateLeaveRequest(requestId, {
        status: 'rejected',
        approvedById: userId, // Storing the manager who rejected it
        approvedAt: new Date(),
        rejectionReason: reason || null
      });

      res.json(updatedRequest);
    } catch (error) {
      console.error('Error rejecting leave request:', error);
      res.status(500).json({ error: 'Failed to reject leave request' });
    }
  });

  // Endpoint for employee to cancel their pending leave request
  app.patch('/api/leave-requests/:id/cancel', ensureAuthenticated, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Get employee by user ID
      const employee = await storage.getEmployeeByUserId(userId);
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      // Get the leave request
      const leaveRequest = await storage.getLeaveRequest(requestId);
      if (!leaveRequest) {
        return res.status(404).json({ error: 'Leave request not found' });
      }

      // Verify that this leave request belongs to the employee
      if (leaveRequest.employeeId !== employee.id) {
        return res.status(403).json({ error: 'Unauthorized. This is not your leave request' });
      }

      // Only pending requests can be cancelled
      if (leaveRequest.status !== 'pending') {
        return res.status(400).json({ error: 'Only pending requests can be cancelled' });
      }

      // Update the leave request
      const updatedRequest = await storage.updateLeaveRequest(requestId, {
        status: 'cancelled'
      });

      res.json(updatedRequest);
    } catch (error) {
      console.error('Error cancelling leave request:', error);
      res.status(500).json({ error: 'Failed to cancel leave request' });
    }
  });

  // Endpoint to check leave balance for an employee
  app.get('/api/leave-balance/:employeeId', ensureAuthenticated, async (req, res) => {
    try {
      const employeeId = parseInt(req.params.employeeId);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Get the current year
      const currentYear = new Date().getFullYear();

      // Get all approved leave requests for the employee in the current year
      const leaveRequests = await storage.getEmployeeLeaveRequestsByYear(employeeId, currentYear, 'approved');

      // Calculate used leave days
      const usedDays = leaveRequests.reduce((total, request) => {
        const startDate = new Date(request.startDate);
        const endDate = new Date(request.endDate);
        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return total + days;
      }, 0);

      // Assume a total of 15 days per year (you can adjust this based on your business rules)
      const totalDays = 15;
      const availableDays = Math.max(0, totalDays - usedDays);

      res.json({
        total: totalDays,
        used: usedDays,
        available: availableDays
      });
    } catch (error) {
      console.error('Error checking leave balance:', error);
      res.status(500).json({ error: 'Failed to check leave balance' });
    }
  });

  // Endpoint kiểm tra phòng ban trực tiếp với SQL để debug
  app.get("/api/departments/direct/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid department ID" });
      }

      // Dùng truy vấn SQL trực tiếp để lấy thông tin phòng ban
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 5000
      });

      console.log(`Executing direct SQL query for department ID: ${id}`);
      const result = await pool.query('SELECT * FROM departments WHERE id = $1', [id]);

      if (result.rows && result.rows.length > 0) {
        const department = {
          id: Number(result.rows[0].id),
          name: result.rows[0].name,
          description: result.rows[0].description,
          managerId: result.rows[0].manager_id,
          createdAt: result.rows[0].created_at,
          updatedAt: result.rows[0].updated_at
        };

        console.log("Department found by direct SQL:", department);
        return res.json(department);
      } else {
        console.log(`No department found with ID ${id} by direct SQL`);
        return res.status(404).json({ message: "Department not found" });
      }
    } catch (error) {
      console.error(`Error retrieving department with direct SQL, ID ${req.params.id}:`, error);
      res.status(500).json({ message: `Failed to retrieve department with ID ${req.params.id}` });
    }
  });

  // Endpoint kiểm tra kết nối trực tiếp với SQL để debug
  app.get("/api/debug/test-db-connection", async (req, res, next) => {
    try {
      console.log("Testing direct database connection");
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 5000
      });

      // Log cấu hình kết nối
      console.log("Database connection config:", {
        connectionString: process.env.DATABASE_URL && process.env.DATABASE_URL.split('@')[1], // Chỉ hiển thị hostname, không hiển thị password
        config: pool.options
      });

      // Kiểm tra kết nối
      const client = await pool.connect();
      console.log("Database connection successful");

      // Kiểm tra truy vấn đơn giản
      const departmentResult = await client.query('SELECT * FROM departments WHERE id = 1');
      console.log("Department query result:", departmentResult.rows);

      client.release();

      res.json({
        connectionSuccess: true,
        departments: departmentResult.rows,
        config: {
          url: process.env.DATABASE_URL ? `...@${process.env.DATABASE_URL.split('@')[1]}` : 'not set',
          host: pool.options.host,
          database: pool.options.database,
          port: pool.options.port
        }
      });
    } catch (error) {
      console.error("Database connection error:", error);
      res.status(500).json({
        connectionSuccess: false,
        error: error.message,
        stack: error.stack,
        config: {
          url: process.env.DATABASE_URL ? `...@${process.env.DATABASE_URL.split('@')[1]}` : 'not set'
        }
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}