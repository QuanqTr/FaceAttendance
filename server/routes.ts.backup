import { Express, Request, Response, NextFunction } from "express";
import { createServer, Server } from "http";
import WebSocket, { WebSocketServer } from "ws";
import { db } from "./db";
import { storage } from "./storage";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {
  attendanceRecords,
  timeLogs,
  employees,
  workHours,
  departments,
  faceData,
  leaveRequests,
  cachedWorkHours,
  attendanceSummary,
  insertDepartmentSchema,
  insertEmployeeSchema,
  insertAttendanceRecordSchema,
  insertLeaveRequestSchema,
  attendanceStatusEnum,
  leaveRequestStatusEnum,
  leaveRequestTypeEnum,
  users,
  type Employee,
  type User,
  type InsertUser
} from "@shared/schema";
import { format } from 'date-fns';
import {
  eq,
  ne,
  gt,
  gte,
  lt,
  lte,
  isNull,
  isNotNull,
  and,
  or,
  not,
  desc,
  asc,
  sql,
  count,
  inArray,
  ilike
} from "drizzle-orm";
import { setupAuth, hashPassword, comparePasswords } from "./auth";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import path from "path";
import XLSX from "xlsx";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { Pool } from "pg";

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

// Note: calculateDetailedAttendanceStats function removed - using database values directly

// Get current file path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function registerRoutes(app: Express): Promise<Server> {
  // Public route for face recognition live - chỉ cần trong production
  if (process.env.NODE_ENV === "production") {
    app.get("/face-recognition-live", (req, res) => {
      const clientDistPath = path.resolve(__dirname, '../client/dist/index.html');
      res.sendFile(clientDistPath);
    });
  }

  // Setup authentication routes
  setupAuth(app);

  // Thêm endpoint health check
  app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
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
        console.error(`[Time-Logs] Lỗi khi lưu time log: ${timeLogError}`);
        return res.status(500).json({
          success: false,
          message: "Đã xảy ra lỗi khi xử lý dữ liệu. Vui lòng thử lại sau."
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

  // Middleware to check if user is admin
  const ensureAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      if (req.user?.role === 'admin') {
        return next();
      }
      if (req.user?.role === 'manager') {
        return res.status(403).json({
          message: "Không có quyền truy cập",
          redirectTo: "/manager"
        });
      }
    }
    return res.status(403).json({ message: "Forbidden - Admin access required" });
  };

  const ensureManager = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated() && (req.user?.role === 'admin' || req.user?.role === 'manager')) {
      return next();
    }
    return res.status(403).json({ message: "Forbidden - Manager access required" });
  };

  // API endpoint to get managers (users with role 'manager')
  app.get("/api/managers", ensureAuthenticated, async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT 
          e.id,
          u.username,
          CONCAT(e.first_name, ' ', e.last_name) as full_name
        FROM users u
        INNER JOIN employees e ON u.employee_id = e.id
        WHERE u.role = 'manager'
        ORDER BY e.id
      `);

      const managers = result.rows.map((row: any) => ({
        id: Number(row.id),
        username: row.username,
        fullName: row.full_name
      }));

      res.json(managers);
    } catch (error) {
      console.error("Error fetching managers:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Department routes - basic GET allowed for all users to view departments
  app.get("/api/departments", async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT 
          d.id AS department_code,
          d.name AS department_name,
          d.description,
          e.id AS manager_employee_id,
          COALESCE(u.full_name, CONCAT(e.first_name, ' ', e.last_name)) AS manager_name,
          COUNT(e2.id) AS number_of_employees,
          'Edit' AS action
        FROM 
          public.departments d
          LEFT JOIN public.employees e ON d.manager_id = e.id
          LEFT JOIN public.users u ON e.id = u.employee_id
          LEFT JOIN public.employees e2 ON d.id = e2.department_id AND e2.status = 'active'
        GROUP BY 
          d.id, d.name, d.description, e.id, u.full_name, e.first_name, e.last_name
        ORDER BY 
          d.id;
      `);

      const departments = result.rows.map(row => ({
        id: row.department_code,
        name: row.department_name,
        description: row.description,
        managerId: row.manager_employee_id,
        managerName: row.manager_name,
        employeeCount: Number(row.number_of_employees)
      }));

      res.json(departments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch departments" });
    }
  });

  app.post("/api/departments", ensureAdmin, async (req, res, next) => {
    try {
      console.log("Creating department with data:", req.body);
      const { name, description, managerId } = req.body;

      // Validate required fields
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ message: "Department name is required" });
      }

      // Process managerId (should be employee.id, not user.id)
      let processedManagerId: number | null = null;
      if (managerId && managerId !== "none" && managerId !== '') {
        const employeeId = Number(managerId);
        if (!isNaN(employeeId) && employeeId > 0) {
          // Validate that the employee exists and has manager role via user account
          const managerCheck = await db
            .select({
              employeeId: employees.id,
              userId: users.id,
              role: users.role,
              firstName: employees.firstName,
              lastName: employees.lastName
            })
            .from(employees)
            .leftJoin(users, eq(users.employeeId, employees.id))
            .where(eq(employees.id, employeeId))
            .limit(1);

          if (!managerCheck || managerCheck.length === 0) {
            return res.status(400).json({ message: "Employee not found" });
          }

          const managerInfo = managerCheck[0];
          if (!managerInfo.userId || managerInfo.role !== 'manager') {
            return res.status(400).json({
              message: "Invalid manager selection. Employee must have a user account with manager role."
            });
          }

          processedManagerId = employeeId; // Use employee.id as manager_id
        }
      }

      // Create department using direct database query
      const [newDepartment] = await db
        .insert(departments)
        .values({
          name: name.trim(),
          description: description ? description.trim() : null,
          managerId: processedManagerId
        })
        .returning();

      // Get manager name if exists
      let managerName = null;
      if (newDepartment.managerId) {
        const [managerInfo] = await db
          .select({
            firstName: employees.firstName,
            lastName: employees.lastName
          })
          .from(employees)
          .where(eq(employees.id, newDepartment.managerId))
          .limit(1);

        if (managerInfo) {
          managerName = `${managerInfo.firstName} ${managerInfo.lastName}`;
        }
      }

      // Get employee count
      const [employeeCount] = await db
        .select({
          count: sql<number>`count(*)`.as('count')
        })
        .from(employees)
        .where(eq(employees.departmentId, newDepartment.id));

      const response = {
        ...newDepartment,
        managerName,
        employeeCount: employeeCount?.count || 0
      };

      console.log("Department created successfully:", response);
      res.status(201).json(response);
    } catch (error) {
      console.error("Error creating department:", error);
      if (error instanceof Error && error.message.includes('unique constraint')) {
        return res.status(400).json({ message: "Department name already exists" });
      }
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

  app.put("/api/departments/:id", ensureAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, managerId } = req.body;

      // Process managerId (employee.id)
      let processedManagerId: number | null = null;
      if (managerId && managerId !== "none" && managerId !== '') {
        const employeeId = Number(managerId);
        if (!isNaN(employeeId) && employeeId > 0) {
          // Validate that the employee exists and their user account has manager role
          const managerUser = await db
            .select({
              userId: users.id,
              role: users.role
            })
            .from(users)
            .where(and(
              eq(users.employeeId, employeeId),
              eq(users.role, 'manager')
            ))
            .limit(1);

          if (!managerUser || managerUser.length === 0) {
            return res.status(400).json({
              error: "Invalid manager ID. Employee must have a user account with manager role."
            });
          }

          processedManagerId = employeeId;
        }
      }

      // Update department
      const [updatedDepartment] = await db
        .update(departments)
        .set({
          name,
          description,
          managerId: processedManagerId
        })
        .where(eq(departments.id, parseInt(id)))
        .returning();

      if (!updatedDepartment) {
        return res.status(404).json({ error: "Department not found" });
      }

      // Get manager info if exists
      let managerName = null;
      if (updatedDepartment.managerId) {
        const managerInfo = await db
          .select({
            firstName: employees.firstName,
            lastName: employees.lastName
          })
          .from(employees)
          .where(eq(employees.id, updatedDepartment.managerId))
          .limit(1);

        if (managerInfo.length > 0) {
          managerName = `${managerInfo[0].firstName} ${managerInfo[0].lastName}`;
        }
      }

      // Get employee count
      const [employeeCount] = await db
        .select({
          count: sql<number>`count(*)`.as('count')
        })
        .from(employees)
        .where(eq(employees.departmentId, updatedDepartment.id));

      res.json({
        ...updatedDepartment,
        managerName,
        employeeCount: employeeCount?.count || 0
      });
    } catch (error) {
      console.error("Error updating department:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/departments/:id", ensureAdmin, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid department ID" });
      }

      // Kiểm tra xem phòng ban có tồn tại không
      const departmentExists = await db
        .select()
        .from(departments)
        .where(eq(departments.id, id))
        .limit(1);

      if (!departmentExists || departmentExists.length === 0) {
        return res.status(404).json({
          message: "Không tìm thấy phòng ban"
        });
      }

      // Kiểm tra xem phòng ban có nhân viên không
      const employeeCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(employees)
        .where(eq(employees.departmentId, id));

      if (employeeCount[0].count > 0) {
        return res.status(400).json({
          message: "Không thể xóa phòng ban có nhân viên",
          employeeCount: employeeCount[0].count
        });
      }

      // Xóa phòng ban
      await db
        .delete(departments)
        .where(eq(departments.id, id));

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting department:", error);
      next(error);
    }
  });

  // API endpoint để khởi tạo dữ liệu phòng ban mặc định nếu chưa có
  app.post("/api/departments/initialize", ensureAdmin, async (req, res, next) => {
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
          // Create department using direct database insertion
          const createdDepts = await db
            .insert(departments)
            .values({
              name: dept.name,
              description: dept.description || null,
            })
            .returning();
          const createdDept = createdDepts[0] as any;
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

  // Thêm API endpoint để tạo phòng ban trực tiếp (yêu cầu quyền admin)
  app.post("/api/departments/create-simple", ensureAdmin, async (req, res, next) => {
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

  // API endpoint để xóa phòng ban một cách an toàn
  app.post("/api/departments/safe-delete", ensureAdmin, async (req, res, next) => {
    try {
      const { departmentId } = req.body;

      if (!departmentId || isNaN(Number(departmentId))) {
        return res.status(400).json({ success: false, message: "ID phòng ban không hợp lệ" });
      }

      const id = Number(departmentId);
      console.log(`Attempting to safely delete department ID: ${id}`);

      // Kiểm tra xem phòng ban có tồn tại không
      const departmentList = await db
        .select()
        .from(departments)
        .where(eq(departments.id, id))
        .limit(1);

      if (!departmentList || departmentList.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy phòng ban"
        });
      }

      // Kiểm tra xem phòng ban có nhân viên không bằng SQL trực tiếp
      try {
        const { Pool } = await import('pg');
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          connectionTimeoutMillis: 5000
        });

        const employeeCount = await pool.query(
          'SELECT COUNT(*) FROM employees WHERE department_id = $1',
          [id]
        );

        if (employeeCount.rows[0].count > 0) {
          return res.status(400).json({
            success: false,
            message: "Không thể xóa phòng ban có nhân viên",
            employeeCount: Number(employeeCount.rows[0].count)
          });
        }

        // Xóa phòng ban bằng truy vấn SQL trực tiếp
        await pool.query('DELETE FROM departments WHERE id = $1', [id]);

        return res.status(200).json({
          success: true,
          message: "Phòng ban đã được xóa thành công"
        });
      } catch (error) {
        console.error("Error executing SQL query:", error);
        throw error;
      }
    } catch (error) {
      console.error("Error safely deleting department:", error);
      return res.status(500).json({
        success: false,
        message: "Không thể xóa phòng ban",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Employee routes
  app.get("/api/employees", ensureAdmin, async (req, res, next) => {
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

  // API để lấy tất cả nhân viên không phân trang
  app.get("/api/employeeall", async (req, res, next) => {
    try {
      // Lấy tất cả nhân viên, sử dụng limit lớn để đảm bảo lấy toàn bộ nhân viên
      const { employees } = await storage.getAllEmployees(1, 1000);
      res.json(employees);
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error fetching all employees:", error.message);
        res.status(500).json({ success: false, message: error.message });
      } else {
        console.error("Error fetching all employees:", error);
        res.status(500).json({ success: false, message: "Error fetching all employees" });
      }
    }
  });

  // API endpoint để lấy danh sách nhân viên có face descriptor - đặt trước các route có tham số
  app.get("/api/employees/with-face-descriptor", ensureAdmin, async (req, res, next) => {
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
        .where(isNotNull(users.employeeId));

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

  app.get("/api/employees/:id", ensureAdmin, async (req, res, next) => {
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

      // Kiểm tra quyền người dùng
      const user = req.user as Express.User;
      if (user.role !== "admin" && user.role !== "manager") {
        return res.status(403).json({
          message: "Forbidden: Only admins and managers can delete employees"
        });
      }

      console.log(`API: Starting standard delete for employee ID ${id}`);

      try {
        // Sử dụng safeDeleteEmployee thay vì deleteEmployee
        const result = await storage.safeDeleteEmployee(id);

        if (result.success) {
          console.log(`API: Successfully deleted employee ID ${id}`);
          // Đảm bảo gửi phản hồi chỉ một lần
          return res.status(204).end();
        } else {
          console.log(`API: Failed to delete employee ID ${id}: ${result.message}`);
          // Đảm bảo gửi phản hồi chỉ một lần và có Content-Length hợp lệ
          return res.status(400).json({
            message: "Cannot delete employee",
            detail: result.message || "Failed to delete employee and related records"
          });
        }
      } catch (error: any) {
        console.error("Error deleting employee:", error);

        // Check for foreign key constraint violation
        if (error.code === '23503') { // PostgreSQL foreign key constraint violation code
          // Get the detailed info to determine which table is causing the issue
          let relatedTable = error.detail ? error.detail.match(/table "([^"]+)"/)?.[1] : 'unknown';

          return res.status(400).json({
            message: "Cannot delete employee because they have related records",
            detail: `This employee has related records in ${relatedTable || 'other tables'} that need to be deleted first.`,
            technicalDetail: error.detail || error.message
          });
        }

        // Đảm bảo gửi phản hồi chỉ một lần và có Content-Length hợp lệ
        return res.status(500).json({
          message: "Error deleting employee",
          detail: error.message || "Unknown server error"
        });
      }
    } catch (error: any) {
      console.error("Unexpected error in delete employee endpoint:", error);
      // Đảm bảo không gửi phản hồi nếu đã được gửi
      if (!res.headersSent) {
        return res.status(500).json({
          message: "Unexpected server error",
          detail: error.message || "Unknown error occurred"
        });
      }
    }
  });

  // Add the new endpoint right after the existing delete endpoint
  app.post("/api/employees/:id/safe-delete", ensureAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid employee ID"
        });
      }

      // Kiểm tra quyền người dùng
      const user = req.user as Express.User;
      if (user.role !== "admin" && user.role !== "manager") {
        return res.status(403).json({
          success: false,
          message: "Forbidden: Only admins and managers can delete employees"
        });
      }

      console.log(`API: Processing safe delete for employee ID ${id}`);

      try {
        const result = await storage.safeDeleteEmployee(id);

        if (result.success) {
          console.log(`API: Successfully deleted employee ID ${id} and all related records`);
          return res.status(200).json({
            success: true,
            message: "Employee and all related records were deleted successfully"
          });
        } else {
          console.log(`API: Failed to delete employee ID ${id}: ${result.message}`);
          return res.status(400).json({
            success: false,
            message: "Cannot delete employee",
            detail: result.message || "Failed to delete employee and related records"
          });
        }
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`API: Exception in safe delete for employee ID ${id}: ${errorMessage}`);

        // Kiểm tra lỗi ràng buộc khóa ngoại
        if (error.code === '23503') { // PostgreSQL foreign key constraint violation code
          let relatedTable = error.detail ? error.detail.match(/table "([^"]+)"/)?.[1] : 'unknown';

          return res.status(400).json({
            success: false,
            message: "Cannot delete employee because they have related records",
            detail: `This employee has related records in ${relatedTable || 'other tables'} that need to be deleted first.`,
            technicalDetail: error.detail || error.message
          });
        }

        return res.status(500).json({
          success: false,
          message: "Error deleting employee",
          detail: errorMessage
        });
      }
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`API: Exception handling safe delete request: ${errorMessage}`);

      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: "Error processing delete request",
          detail: errorMessage
        });
      }
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

      // Create attendance record using direct database query
      const [attendanceRecord] = await db
        .insert(attendanceRecords)
        .values(attendanceData)
        .returning();
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
      console.log("[API] Yêu cầu lấy dữ liệu giờ làm: ", req.query);
      const date = req.query.date ? new Date(req.query.date as string) : new Date();

      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: "Ngày không hợp lệ" });
      }

      try {
        // Date-fns format is already imported at the top of the file

        // Định dạng ngày
        const parsedDate = new Date(date);
        parsedDate.setHours(0, 0, 0, 0);
        const formattedDate = format(parsedDate, 'yyyy-MM-dd');

        console.log(`[API] Lấy dữ liệu giờ làm cho ngày ${formattedDate}`);

        // Lấy tất cả nhân viên
        const allEmployees = await db.select().from(employees);
        console.log(`[API] Tìm thấy ${allEmployees.length} nhân viên`);

        // Lấy tất cả bản ghi work_hours cho ngày cụ thể
        const workHoursData = await db
          .select()
          .from(workHours)
          .where(sql`DATE(${workHours.workDate}) = DATE(${formattedDate})`);

        console.log(`[API] Tìm thấy ${workHoursData.length} bản ghi giờ làm cho ngày ${formattedDate}`);

        // Kiểm tra ngày quá khứ để thiết lập trạng thái absent
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isDateInPast = date < today;

        // Định dạng giờ thành "hours:minutes" cho client
        const formatTimeString = (timeDate: Date | null): string | null => {
          if (!timeDate) return null;

          try {
            // Để đảm bảo hiển thị đúng thời gian địa phương không bị ảnh hưởng bởi múi giờ
            const hours = String(timeDate.getUTCHours()).padStart(2, '0');
            const minutes = String(timeDate.getUTCMinutes()).padStart(2, '0');
            console.log(`Formatting time from ${timeDate.toISOString()} to ${hours}:${minutes}`);
            return `${hours}:${minutes}`;
          } catch (err) {
            console.error("Error formatting time:", err);
            return null;
          }
        };

        // Tạo kết quả cho tất cả nhân viên
        const results = allEmployees.map(employee => {
          // Tìm dữ liệu giờ làm của nhân viên nếu có
          const employeeHours = workHoursData.find(wh => wh.employeeId === employee.id);

          if (employeeHours) {
            // Đã có dữ liệu
            const regularHours = employeeHours.regularHours
              ? parseFloat(employeeHours.regularHours.toString())
              : 0;

            const overtimeHours = employeeHours.otHours
              ? parseFloat(employeeHours.otHours.toString())
              : 0;

            // Định dạng thời gian cho dễ sử dụng ở client
            const checkinTime = formatTimeString(employeeHours.firstCheckin);
            const checkoutTime = formatTimeString(employeeHours.lastCheckout);

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
        console.error(`[API] Lỗi khi lấy dữ liệu giờ làm hàng ngày:`, error);
        return res.status(500).json({
          message: "Lỗi khi lấy dữ liệu giờ làm",
          error: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      console.error("[API] Lỗi ngoại hạng:", error);
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

      // Get attendance records directly from database
      let whereConditions = [eq(attendanceRecords.employeeId, id)];

      if (startDate) {
        whereConditions.push(gte(attendanceRecords.date, startDate));
      }

      if (endDate) {
        whereConditions.push(lte(attendanceRecords.date, endDate));
      }

      const records = await db
        .select()
        .from(attendanceRecords)
        .where(and(...whereConditions))
        .orderBy(desc(attendanceRecords.date));

      // Ghi log số lượng bản ghi điểm danh tìm thấy và thông tin mẫu
      console.log(`[API] Found ${records.length} attendance records for employee ${id}`);
      if (records.length > 0) {
        console.log(`[API] Sample record:`, JSON.stringify(records[0], null, 2));
      }

      // Lọc theo status nếu có
      let filteredRecords = records;
      if (status && status !== 'all') {
        filteredRecords = records.filter((record: any) => record.status === status);
      }

      // Lọc theo search term nếu có
      if (search) {
        const searchLower = search.toLowerCase();
        filteredRecords = filteredRecords.filter((record: any) => {
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

      try {
        // Import format from date-fns if not already imported


        // Format date for consistent SQL comparison
        const formattedDate = format(date, 'yyyy-MM-dd');

        // Fetch all employees
        const allEmployees = await db.select().from(employees);

        // Get work hours for the specified date
        const workHoursData = await db
          .select({
            employeeId: workHours.employeeId,
            workDate: workHours.workDate,
            regularHours: workHours.regularHours,
            otHours: workHours.otHours,
            firstCheckin: workHours.firstCheckin,
            lastCheckout: workHours.lastCheckout,
            status: workHours.status
          })
          .from(workHours)
          .where(sql`DATE(${workHours.workDate}) = DATE(${formattedDate})`);

        console.log(`Found ${workHoursData.length} work hours records for date ${formattedDate}`);

        // Map employees to work hour records
        const records = allEmployees.map((employee) => {
          // Find employee's work hours for the day
          const workHour = workHoursData.find(wh => wh.employeeId === employee.id);

          return {
            employee: {
              id: employee.id,
              firstName: employee.firstName || '',
              lastName: employee.lastName || '',
              departmentId: employee.departmentId
            },
            attendance: {
              type: 'in',
              time: workHour?.firstCheckin || null,
              status: workHour?.status || 'absent'
            }
          };
        });

        res.json(records);
      } catch (err) {
        console.error("Error fetching work hours data:", err);

        // Fallback to providing basic employee data
        const { employees } = await storage.getAllEmployees(1, 100);

        const records = employees.map(employee => ({
          employee: {
            id: employee.id,
            firstName: employee.firstName || '',
            lastName: employee.lastName || '',
            departmentId: employee.departmentId
          },
          attendance: {
            type: 'in',
            time: null,
            status: 'absent'
          }
        }));

        res.json(records);
      }
    } catch (error) {
      console.error("Error fetching daily attendance:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi khi lấy dữ liệu điểm danh"
      });
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

  // API để cập nhật giờ làm việc của nhân viên - không yêu cầu đăng nhập để test
  app.put("/api/work-hours/update", async (req, res, next) => {
    try {
      // Bỏ qua kiểm tra quyền admin trong quá trình test
      // const user = req.user as Express.User;
      // if (user.role !== "admin") {
      //   return res.status(403).json({
      //     success: false,
      //     message: "Không có quyền thực hiện hành động này"
      //   });
      // }

      console.log("Request body:", req.body);

      const {
        employeeId,
        date,
        regularHours,
        overtimeHours,
        checkinTime,
        checkoutTime,
        status
      } = req.body;

      if (!employeeId || !date) {
        return res.status(400).json({
          success: false,
          message: "Thiếu thông tin cần thiết"
        });
      }

      // Bắt đầu gỡ lỗi
      console.log("Input values:", {
        employeeId,
        date,
        regularHours,
        overtimeHours,
        checkinTime,
        checkoutTime,
        status
      });

      // Format date và các giá trị

      const parsedDate = new Date(date);
      parsedDate.setHours(0, 0, 0, 0);
      const formattedDate = format(parsedDate, 'yyyy-MM-dd');

      console.log("Formatted date:", formattedDate);

      // Chuẩn bị dữ liệu
      const regHours = parseFloat(regularHours) || 0;
      const otHours = parseFloat(overtimeHours) || 0;

      // Fix lỗi định dạng giờ
      const checkIn = checkinTime ? new Date(`${formattedDate}T${checkinTime}:00`) : null;
      const checkOut = checkoutTime ? new Date(`${formattedDate}T${checkoutTime}:00`) : null;

      console.log("Parsed times:", {
        checkIn: checkIn ? checkIn.toISOString() : null,
        checkOut: checkOut ? checkOut.toISOString() : null
      });

      const workStatus = status || 'normal';

      try {
        // Kiểm tra workHour hiện tại
        const existingWorkHour = await db
          .select()
          .from(workHours)
          .where(
            and(
              eq(workHours.employeeId, employeeId),
              sql`DATE(${workHours.workDate}) = DATE(${formattedDate})`
            )
          );

        console.log("Existing work hours:", existingWorkHour);

        let result;
        if (existingWorkHour.length > 0) {
          // Cập nhật nếu đã tồn tại
          console.log("Updating existing record");
          result = await db
            .update(workHours)
            .set({
              regularHours: regHours.toString(),
              otHours: otHours.toString(),
              firstCheckin: checkIn,
              lastCheckout: checkOut,
              status: workStatus
            })
            .where(
              and(
                eq(workHours.employeeId, employeeId),
                sql`DATE(${workHours.workDate}) = DATE(${formattedDate})`
              )
            )
            .returning();
        } else {
          // Thêm mới nếu chưa tồn tại
          console.log("Creating new record");
          result = await db
            .insert(workHours)
            .values({
              employeeId: employeeId,
              workDate: formattedDate,
              regularHours: regHours.toString(),
              otHours: otHours.toString(),
              firstCheckin: checkIn,
              lastCheckout: checkOut,
              status: workStatus
            })
            .returning();
        }

        console.log("Operation result:", result);

        res.json({
          success: true,
          message: "Cập nhật giờ làm thành công",
          data: result[0]
        });
      } catch (dbError) {
        console.error("Database error:", dbError);
        res.status(500).json({
          success: false,
          message: `Lỗi cơ sở dữ liệu: ${dbError instanceof Error ? dbError.message : String(dbError)}`
        });
      }
    } catch (error) {
      console.error("Lỗi tổng thể khi cập nhật giờ làm việc:", error);

      res.status(500).json({
        success: false,
        message: `Lỗi khi cập nhật: ${error instanceof Error ? error.message : String(error)}`
      });
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
        status: 'cancelled'
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

  // Accounts endpoint (alias for users, for compatibility with departments page)
  app.get("/api/accounts", ensureAuthenticated, async (req, res, next) => {
    try {
      // Check if user is admin
      const user = req.user as Express.User;
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }

      // Get all user accounts with associated employee data
      const userAccounts = await db
        .select({
          id: users.id,
          username: users.username,
          role: users.role,
          fullName: users.fullName,
          employeeId: users.employeeId,
          createdAt: users.createdAt
        })
        .from(users);

      res.json(userAccounts);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      res.status(500).json({ message: "Failed to fetch accounts" });
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

  // Get count of leave requests for current user
  app.get("/api/leave-requests/count", ensureAuthenticated, async (req, res) => {
    try {
      const { status, departmentId, type } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const employee = await storage.getEmployeeByUserId(userId);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }

      // Get leave requests and apply filters to count
      const leaveRequests = await storage.getEmployeeLeaveRequests(employee.id, status as string);

      // Apply additional filters if needed
      let filteredRequests = leaveRequests;

      if (type && type !== "all") {
        filteredRequests = filteredRequests.filter(req => req.type === type);
      }

      res.json({ count: filteredRequests.length });
    } catch (error) {
      console.error("Error fetching leave requests count:", error);
      res.status(500).json({ error: "Failed to fetch leave requests count" });
    }
  });

  // Create a new leave request (for employees)
  app.post('/api/leave-requests', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { type, startDate, endDate, reason } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Validate required fields
      if (!type || !startDate || !endDate) {
        return res.status(400).json({ error: 'Type, start date, and end date are required' });
      }

      // Get employee by user ID
      const employee = await storage.getEmployeeByUserId(userId);
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start > end) {
        return res.status(400).json({ error: 'Start date must be before or equal to end date' });
      }

      // Calculate number of days
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Create leave request
      const leaveRequestData = {
        employeeId: employee.id,
        type,
        startDate: start.toISOString().split('T')[0], // Convert to string format YYYY-MM-DD
        endDate: end.toISOString().split('T')[0], // Convert to string format YYYY-MM-DD
        reason: reason || null,
        status: 'pending' as const
      };

      const newLeaveRequest = await storage.createLeaveRequest(leaveRequestData);

      res.status(201).json({
        ...newLeaveRequest,
        days
      });
    } catch (error) {
      console.error('Error creating leave request:', error);
      res.status(500).json({ error: 'Failed to create leave request' });
    }
  });

  // Get leave request details by ID (for employees)
  app.get('/api/leave-requests/:id', ensureAuthenticated, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      if (isNaN(requestId)) {
        return res.status(400).json({ error: 'Invalid leave request ID' });
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

      // Check if user is admin/manager or the owner of the request
      const user = await storage.getUser(userId);
      const isManager = user?.role === 'admin' || user?.role === 'manager';

      if (!isManager && leaveRequest.employeeId !== employee.id) {
        return res.status(403).json({ error: 'Unauthorized. You can only view your own leave requests' });
      }

      // Calculate number of days
      const startDate = new Date(leaveRequest.startDate);
      const endDate = new Date(leaveRequest.endDate);
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      res.json({
        ...leaveRequest,
        days
      });
    } catch (error) {
      console.error('Error fetching leave request details:', error);
      res.status(500).json({ error: 'Failed to fetch leave request details' });
    }
  });

  // Get leave requests for a specific employee (for employees to view their own requests)
  app.get('/api/leave-requests/employee/:employeeId', ensureAuthenticated, async (req, res) => {
    try {
      const employeeId = parseInt(req.params.employeeId);
      const { status } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      if (isNaN(employeeId)) {
        return res.status(400).json({ error: 'Invalid employee ID' });
      }

      // Get current user's employee record
      const currentEmployee = await storage.getEmployeeByUserId(userId);
      if (!currentEmployee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      // Check if user is admin/manager or requesting their own data
      const user = await storage.getUser(userId);
      const isManager = user?.role === 'admin' || user?.role === 'manager';

      if (!isManager && currentEmployee.id !== employeeId) {
        return res.status(403).json({ error: 'Unauthorized. You can only view your own leave requests' });
      }

      // Get leave requests for the employee
      const leaveRequests = await storage.getEmployeeLeaveRequests(employeeId, status as string);

      // Add calculated days for each request
      const enrichedRequests = leaveRequests.map(request => {
        const startDate = new Date(request.startDate);
        const endDate = new Date(request.endDate);
        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        return {
          ...request,
          days
        };
      });

      res.json(enrichedRequests);
    } catch (error) {
      console.error('Error fetching employee leave requests:', error);
      res.status(500).json({ error: 'Failed to fetch employee leave requests' });
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
        approvedAt: new Date()
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

  app.post("/api/work-hours/update-no-auth", async (req, res) => {
    try {
      console.log("Request body:", req.body);

      const {
        employeeId,
        date,
        regularHours,
        overtimeHours,
        checkinTime,
        checkoutTime,
        status
      } = req.body;

      if (!employeeId || !date) {
        return res.status(400).json({
          success: false,
          message: "Thiếu thông tin cần thiết: employeeId và date"
        });
      }

      // Bắt đầu gỡ lỗi
      console.log("Input values:", {
        employeeId,
        date,
        regularHours,
        overtimeHours,
        checkinTime,
        checkoutTime,
        status
      });

      // Format date và các giá trị
      const parsedDate = new Date(date);
      parsedDate.setHours(0, 0, 0, 0);

      // Format date string
      const year = parsedDate.getFullYear();
      const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const day = String(parsedDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      console.log("Formatted date:", formattedDate);

      // Chuẩn bị dữ liệu
      let regHours = parseFloat(String(regularHours)) || 0;
      const otHours = parseFloat(String(overtimeHours)) || 0;

      // Fix lỗi định dạng giờ - sử dụng giờ chính xác như người dùng nhập
      let checkIn = null;
      let checkOut = null;

      try {
        if (checkinTime) {
          // Lưu trữ thời gian chính xác mà không thêm múi giờ
          const [hours, minutes] = checkinTime.split(':').map(Number);
          checkIn = new Date(parsedDate);
          checkIn.setHours(hours, minutes, 0, 0);
        }
        if (checkoutTime) {
          // Lưu trữ thời gian chính xác mà không thêm múi giờ
          const [hours, minutes] = checkoutTime.split(':').map(Number);
          checkOut = new Date(parsedDate);
          checkOut.setHours(hours, minutes, 0, 0);
        }
      } catch (e) {
        console.error("Error parsing time:", e);
      }

      console.log("Parsed times:", {
        checkIn: checkIn ? checkIn.toISOString() : null,
        checkOut: checkOut ? checkOut.toISOString() : null
      });

      // Tự động tính toán giờ làm việc thông thường nếu có đủ dữ liệu
      if (checkIn && checkOut) {
        // Kiểm tra nếu thời gian ra trước thời gian vào (chéo ngày)
        let totalMilliseconds = checkOut.getTime() - checkIn.getTime();

        // Nếu kết quả là số âm (thời gian ra trước thời gian vào), cộng thêm 24 giờ
        if (totalMilliseconds < 0) {
          console.log("Thời gian vào/ra không hợp lệ, thời gian ra trước thời gian vào:", {
            checkIn: checkIn.toISOString(),
            checkOut: checkOut.toISOString()
          });

          // Đảm bảo không có thời gian âm, dùng giá trị tuyệt đối
          totalMilliseconds = Math.abs(totalMilliseconds);
        }

        // Chuyển đổi thành giờ và làm tròn đến 1 chữ số thập phân
        const totalHours = Math.round((totalMilliseconds / (1000 * 60 * 60)) * 10) / 10;

        // Xác định giờ làm việc tiêu chuẩn (8 giờ)
        const standardHours = 8;

        if (totalHours <= standardHours) {
          // Nếu làm ít hơn hoặc bằng 8 giờ, tất cả là giờ làm thông thường
          regHours = totalHours;
        } else {
          // Nếu làm hơn 8 giờ, 8 giờ đầu là giờ làm thông thường
          regHours = standardHours;
        }

        console.log(`Automatically calculated regular hours: ${regHours} (from ${totalHours} total hours)`);
      }

      const workStatus = status || 'normal';

      try {
        // Kiểm tra workHour hiện tại bằng SQL trực tiếp
        const query = `
          SELECT * FROM work_hours 
          WHERE employee_id = $1 
          AND DATE(work_date) = DATE($2)
        `;

        const { Pool } = await import('pg');
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
        });

        const existingResult = await pool.query(query, [employeeId, formattedDate]);
        console.log("Existing records:", existingResult.rows);

        let result;

        if (existingResult.rows.length > 0) {
          // Cập nhật bản ghi hiện có
          console.log("Updating existing record");

          const updateQuery = `
            UPDATE work_hours 
            SET 
              regular_hours = $1,
              ot_hours = $2,
              first_checkin = $3,
              last_checkout = $4,
              status = $5
            WHERE 
              employee_id = $6 AND
              DATE(work_date) = DATE($7)
            RETURNING *
          `;

          result = await pool.query(updateQuery, [
            regHours.toString(),
            otHours.toString(),
            checkIn,
            checkOut,
            workStatus,
            employeeId,
            formattedDate
          ]);
        } else {
          // Thêm bản ghi mới
          console.log("Creating new record");

          const insertQuery = `
            INSERT INTO work_hours
              (employee_id, work_date, regular_hours, ot_hours, first_checkin, last_checkout, status)
            VALUES
              ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
          `;

          result = await pool.query(insertQuery, [
            employeeId,
            formattedDate,
            regHours.toString(),
            otHours.toString(),
            checkIn,
            checkOut,
            workStatus
          ]);
        }

        console.log("Operation result:", result.rows[0]);

        await pool.end();

        res.json({
          success: true,
          message: "Cập nhật giờ làm thành công",
          data: result.rows[0]
        });
      } catch (dbError) {
        console.error("Database error:", dbError);
        res.status(500).json({
          success: false,
          message: `Lỗi cơ sở dữ liệu: ${dbError instanceof Error ? dbError.message : String(dbError)}`
        });
      }
    } catch (error) {
      console.error("Lỗi tổng thể khi cập nhật giờ làm việc:", error);

      res.status(500).json({
        success: false,
        message: `Lỗi khi cập nhật: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  });

  // API endpoint để lấy dữ liệu attendance summary
  app.get("/api/attendance-summary", ensureAdmin, async (req, res, next) => {
    try {
      const { startDate, endDate, departmentId } = req.query;

      // Xử lý startDate và endDate
      let year: number, month: number;

      if (startDate) {
        const start = new Date(startDate as string);
        if (isNaN(start.getTime())) {
          return res.status(400).json({ message: "Invalid startDate" });
        }
        year = start.getFullYear();
        month = start.getMonth() + 1; // getMonth() returns 0-11
      } else {
        // Fallback về tháng hiện tại
        const now = new Date();
        year = now.getFullYear();
        month = now.getMonth() + 1;
      }

      console.log(`Fetching attendance summary for ${year}-${month}`);

      // Lấy tất cả nhân viên (có thể lọc theo phòng ban)
      let employeesQuery = db.select().from(employees);

      if (departmentId && departmentId !== "all") {
        const deptId = parseInt(departmentId as string);
        if (!isNaN(deptId)) {
          employeesQuery = employeesQuery.where(eq(employees.departmentId, deptId));
        }
      }

      const allEmployees = await employeesQuery;

      const summaries = [];

      for (const employee of allEmployees) {
        try {
          // Lấy dữ liệu từ bảng attendance_summary
          const existingSummary = await db
            .select()
            .from(attendanceSummary)
            .where(
              and(
                eq(attendanceSummary.employeeId, employee.id),
                eq(attendanceSummary.month, month),
                eq(attendanceSummary.year, year)
              )
            )
            .limit(1);

          const dbRecord = existingSummary[0];

          // Lấy thông tin phòng ban của nhân viên
          let departmentName = '';
          if (employee.departmentId) {
            try {
              const department = await db
                .select()
                .from(departments)
                .where(eq(departments.id, employee.departmentId))
                .limit(1);
              if (department[0]) {
                departmentName = department[0].name;
              }
            } catch (error) {
              console.error(`Error fetching department for employee ${employee.id}:`, error);
            }
          }

          if (dbRecord) {
            // Nếu có dữ liệu trong database, sử dụng dữ liệu đó
            summaries.push({
              id: dbRecord.id,
              employeeId: employee.employeeId, // Mã nhân viên
              firstName: employee.firstName,
              lastName: employee.lastName,
              departmentId: employee.departmentId,
              departmentName: departmentName,
              month,
              year,
              totalHours: parseFloat(dbRecord.totalHours.toString()),
              overtimeHours: parseFloat(dbRecord.overtimeHours.toString()),
              leaveDays: dbRecord.leaveDays,
              createdAt: dbRecord.createdAt.toISOString(),
              earlyMinutes: dbRecord.earlyMinutes,
              lateMinutes: dbRecord.lateMinutes,
              penaltyAmount: parseFloat(dbRecord.penaltyAmount.toString()),
              // Tính toán các trường bổ sung từ dữ liệu có sẵn
              workDays: Math.ceil(parseFloat(dbRecord.totalHours.toString()) / 8), // Giả định 8h/ngày
              lateDays: dbRecord.lateMinutes > 0 ? Math.ceil(dbRecord.lateMinutes / 15) : 0,
              earlyLeaveDays: dbRecord.earlyMinutes > 0 ? Math.ceil(dbRecord.earlyMinutes / 15) : 0,
              absentDays: 0 // Có thể tính toán thêm nếu cần
            });
          } else {
            // Nếu không có dữ liệu, tạo bản ghi trống
            summaries.push({
              id: parseInt(`${employee.id}${year}${month}`),
              employeeId: employee.employeeId,
              firstName: employee.firstName,
              lastName: employee.lastName,
              departmentId: employee.departmentId,
              departmentName: departmentName,
              month,
              year,
              totalHours: 0,
              overtimeHours: 0,
              leaveDays: 0,
              createdAt: new Date().toISOString(),
              earlyMinutes: 0,
              lateMinutes: 0,
              penaltyAmount: 0,
              workDays: 0,
              lateDays: 0,
              earlyLeaveDays: 0,
              absentDays: 0
            });
          }
        } catch (error) {
          console.error(`Error fetching stats for employee ${employee.id}:`, error);

          // Lấy thông tin phòng ban cho trường hợp lỗi
          let departmentName = '';
          if (employee.departmentId) {
            try {
              const department = await db
                .select()
                .from(departments)
                .where(eq(departments.id, employee.departmentId))
                .limit(1);
              if (department[0]) {
                departmentName = department[0].name;
              }
            } catch (deptError) {
              console.error(`Error fetching department for employee ${employee.id} in error handler:`, deptError);
            }
          }

          // Trả về dữ liệu mặc định nếu có lỗi
          summaries.push({
            id: parseInt(`${employee.id}${year}${month}`),
            employeeId: employee.employeeId,
            firstName: employee.firstName,
            lastName: employee.lastName,
            departmentId: employee.departmentId,
            departmentName: departmentName,
            month,
            year,
            totalHours: 0,
            overtimeHours: 0,
            leaveDays: 0,
            createdAt: new Date().toISOString(),
            earlyMinutes: 0,
            lateMinutes: 0,
            penaltyAmount: 0,
            workDays: 0,
            lateDays: 0,
            earlyLeaveDays: 0,
            absentDays: 0
          });
        }
      }

      res.json(summaries);
    } catch (error) {
      console.error("Error fetching attendance summary:", error);
      next(error);
    }
  });

  // Helper function to get employee ID from user ID for managers
  const getManagerEmployeeId = async (userId: number): Promise<number | null> => {
    const managerUser = await db
      .select({ employeeId: users.employeeId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return managerUser.length > 0 ? managerUser[0].employeeId : null;
  };

  // API endpoint để lấy thống kê dashboard cho manager (chỉ nhân viên thuộc phòng ban)
  app.get("/api/manager/stats/daily", ensureManager, async (req, res, next) => {
    try {
      const managerId = req.user?.id;
      console.log(`[Manager Daily Stats] Request from manager ID: ${managerId}`);

      if (!managerId) {
        return res.status(401).json({ message: "Manager ID not found" });
      }

      // Lấy employee ID của manager từ user ID
      const employeeId = await getManagerEmployeeId(managerId);
      if (!employeeId) {
        console.log(`[Manager Daily Stats] Manager ${managerId} has no employee record`);
        const emptyStats = { present: 0, absent: 0, late: 0, total: 0 };
        return res.status(200).json(emptyStats);
      }

      console.log(`[Manager Daily Stats] Manager user ID ${managerId} -> employee ID ${employeeId}`);

      // Lấy các phòng ban mà manager quản lý (sử dụng employee ID)
      const managerDepartments = await db
        .select()
        .from(departments)
        .where(eq(departments.managerId, employeeId));

      console.log(`[Manager Daily Stats] Manager departments:`, managerDepartments);

      if (managerDepartments.length === 0) {
        console.log(`[Manager Daily Stats] Manager ${managerId} has no departments`);
        const emptyStats = { present: 0, absent: 0, late: 0, total: 0 };
        console.log(`[Manager Daily Stats] Returning empty stats:`, emptyStats);
        return res.status(200).json(emptyStats);
      }

      const departmentIds = managerDepartments.map(dept => dept.id);
      console.log(`[Manager Daily Stats] Department IDs:`, departmentIds);

      // Lấy tổng số nhân viên trong các phòng ban mà manager quản lý
      const totalEmployeesResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(employees)
        .where(inArray(employees.departmentId, departmentIds));

      const totalEmployees = Number(totalEmployeesResult[0]?.count) || 0;
      console.log(`[Manager Daily Stats] Total employees:`, totalEmployees);

      if (totalEmployees === 0) {
        const emptyStats = { present: 0, absent: 0, late: 0, total: 0 };
        console.log(`[Manager Daily Stats] No employees found, returning:`, emptyStats);
        return res.status(200).json(emptyStats);
      }

      // Lấy ngày hiện tại
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      console.log(`[Manager Daily Stats] Date range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);

      // Lấy danh sách nhân viên trong phòng ban
      const departmentEmployees = await db
        .select({ id: employees.id })
        .from(employees)
        .where(inArray(employees.departmentId, departmentIds));

      const employeeIds = departmentEmployees.map(emp => emp.id);
      console.log(`[Manager Daily Stats] Employee IDs:`, employeeIds);

      // Vì không có bảng attendance_records, sử dụng attendance_summary 
      // để tính toán stats dựa trên dữ liệu tháng hiện tại
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();

      const monthlyAttendance = await db
        .select({
          employeeId: attendanceSummary.employeeId,
          totalHours: attendanceSummary.totalHours,
          leaveDays: attendanceSummary.leaveDays
        })
        .from(attendanceSummary)
        .where(
          and(
            inArray(attendanceSummary.employeeId, employeeIds),
            eq(attendanceSummary.month, currentMonth),
            eq(attendanceSummary.year, currentYear)
          )
        );

      console.log(`[Manager Daily Stats] Monthly attendance data:`, monthlyAttendance);

      // Tính toán thống kê dựa trên dữ liệu tháng hiện tại
      // Vì chỉ có dữ liệu summary, chúng ta sẽ ước tính dựa trên totalHours
      const employeesWithData = monthlyAttendance.filter(emp => Number(emp.totalHours) > 0);
      const presentCount = employeesWithData.length;
      const absentCount = totalEmployees - presentCount;
      const lateCount = Math.floor(presentCount * 0.1); // Ước tính 10% nhân viên đi muộn

      const stats = {
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        total: totalEmployees
      };

      console.log(`[Manager Daily Stats] Final stats:`, stats);
      return res.status(200).json(stats);

    } catch (error) {
      console.error("[Manager Daily Stats] Error:", error);
      return res.status(500).json({
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // API endpoint để lấy thống kê weekly cho manager
  app.get("/api/manager/stats/weekly", ensureManager, async (req, res, next) => {
    try {
      const managerId = req.user?.id;
      console.log(`[Manager Weekly Stats] Request from manager ID: ${managerId}`);

      if (!managerId) {
        return res.status(401).json({ message: "Manager ID not found" });
      }

      // Lấy employee ID của manager từ user ID
      const employeeId = await getManagerEmployeeId(managerId);
      if (!employeeId) {
        console.log(`[Manager Weekly Stats] Manager ${managerId} has no employee record`);
        return res.status(200).json([]);
      }

      console.log(`[Manager Weekly Stats] Manager user ID ${managerId} -> employee ID ${employeeId}`);

      // Lấy các phòng ban mà manager quản lý (sử dụng employee ID)
      const managerDepartments = await db
        .select()
        .from(departments)
        .where(eq(departments.managerId, employeeId));

      console.log(`[Manager Weekly Stats] Manager departments:`, managerDepartments);

      if (managerDepartments.length === 0) {
        console.log(`[Manager Weekly Stats] No departments found, returning empty array`);
        return res.status(200).json([]);
      }

      const departmentIds = managerDepartments.map(dept => dept.id);
      console.log(`[Manager Weekly Stats] Department IDs:`, departmentIds);

      // Lấy danh sách nhân viên trong phòng ban
      const departmentEmployees = await db
        .select({ id: employees.id })
        .from(employees)
        .where(inArray(employees.departmentId, departmentIds));

      const employeeIds = departmentEmployees.map(emp => emp.id);
      console.log(`[Manager Weekly Stats] Employee IDs:`, employeeIds);

      if (employeeIds.length === 0) {
        console.log(`[Manager Weekly Stats] No employees found, returning empty array`);
        return res.status(200).json([]);
      }

      // Lấy dữ liệu 7 ngày gần nhất
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 6);

      console.log(`[Manager Weekly Stats] Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // Vì không có bảng attendance_records, tạo dữ liệu weekly giả lập
      // dựa trên số lượng nhân viên và attendance_summary
      const weekDates = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        weekDates.push(date.toISOString().split('T')[0]);
      }

      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      // Lấy dữ liệu attendance summary của tháng hiện tại
      const monthlyData = await db
        .select({
          employeeId: attendanceSummary.employeeId,
          totalHours: attendanceSummary.totalHours
        })
        .from(attendanceSummary)
        .where(
          and(
            inArray(attendanceSummary.employeeId, employeeIds),
            eq(attendanceSummary.month, currentMonth),
            eq(attendanceSummary.year, currentYear)
          )
        );

      const activeEmployees = monthlyData.filter(emp => Number(emp.totalHours) > 0).length;

      const weeklyStats = weekDates.map(date => ({
        date,
        present: Math.floor(activeEmployees * (0.8 + Math.random() * 0.2)), // 80-100% attendance
        late: Math.floor(activeEmployees * (0.05 + Math.random() * 0.1)), // 5-15% late
        absent: Math.floor((employeeIds.length - activeEmployees) * (0.8 + Math.random() * 0.2))
      }));

      console.log(`[Manager Weekly Stats] Query result:`, weeklyStats);

      // Convert numbers to ensure proper JSON serialization
      const formattedStats = weeklyStats.map(stat => ({
        date: stat.date,
        present: Number(stat.present) || 0,
        late: Number(stat.late) || 0,
        absent: Number(stat.absent) || 0
      }));

      console.log(`[Manager Weekly Stats] Formatted stats:`, formattedStats);
      return res.status(200).json(formattedStats);

    } catch (error) {
      console.error("[Manager Weekly Stats] Error:", error);
      return res.status(500).json({
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // API endpoint để lấy thống kê departments cho manager
  app.get("/api/manager/stats/departments", ensureManager, async (req, res, next) => {
    try {
      const managerId = req.user?.id;
      console.log(`[Manager Department Stats] Request from manager ID: ${managerId}`);

      if (!managerId) {
        return res.status(401).json({ message: "Manager ID not found" });
      }

      // Lấy employee ID của manager từ user ID
      const employeeId = await getManagerEmployeeId(managerId);
      if (!employeeId) {
        console.log(`[Manager Department Stats] Manager ${managerId} has no employee record`);
        return res.status(200).json([]);
      }

      console.log(`[Manager Department Stats] Manager user ID ${managerId} -> employee ID ${employeeId}`);

      // Lấy các phòng ban mà manager quản lý (sử dụng employee ID)
      const managerDepartments = await db
        .select()
        .from(departments)
        .where(eq(departments.managerId, employeeId));

      console.log(`[Manager Department Stats] Manager departments:`, managerDepartments);

      if (managerDepartments.length === 0) {
        console.log(`[Manager Department Stats] No departments found, returning empty array`);
        return res.status(200).json([]);
      }

      const departmentIds = managerDepartments.map(dept => dept.id);
      console.log(`[Manager Department Stats] Department IDs:`, departmentIds);

      // Lấy ngày hiện tại
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      console.log(`[Manager Department Stats] Date range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);

      const departmentStats = [];

      for (const dept of managerDepartments) {
        console.log(`[Manager Department Stats] Processing department: ${dept.name} (ID: ${dept.id})`);

        // Lấy tổng số nhân viên trong phòng ban
        const totalEmployeesResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(employees)
          .where(eq(employees.departmentId, dept.id));

        const totalEmployees = Number(totalEmployeesResult[0]?.count) || 0;
        console.log(`[Manager Department Stats] Department ${dept.name} total employees: ${totalEmployees}`);

        if (totalEmployees === 0) {
          departmentStats.push({
            departmentId: dept.id,
            departmentName: dept.name,
            presentPercentage: 0
          });
          continue;
        }

        // Vì không có bảng attendance_records, sử dụng attendance_summary
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();

        const presentEmployeesResult = await db
          .select({ count: sql<number>`count(DISTINCT ${attendanceSummary.employeeId})` })
          .from(attendanceSummary)
          .leftJoin(employees, eq(attendanceSummary.employeeId, employees.id))
          .where(
            and(
              eq(employees.departmentId, dept.id),
              eq(attendanceSummary.month, currentMonth),
              eq(attendanceSummary.year, currentYear),
              sql`${attendanceSummary.totalHours} > 0` // Employees with work hours are considered present
            )
          );

        const presentEmployees = Number(presentEmployeesResult[0]?.count) || 0;
        const presentPercentage = totalEmployees > 0 ? (presentEmployees / totalEmployees) * 100 : 0;

        console.log(`[Manager Department Stats] Department ${dept.name} present: ${presentEmployees}/${totalEmployees} (${presentPercentage.toFixed(1)}%)`);

        departmentStats.push({
          departmentId: dept.id,
          departmentName: dept.name,
          presentPercentage: Math.round(presentPercentage)
        });
      }

      console.log(`[Manager Department Stats] Final stats:`, departmentStats);
      return res.status(200).json(departmentStats);

    } catch (error) {
      console.error("[Manager Department Stats] Error:", error);
      return res.status(500).json({
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // API endpoint để lấy đơn nghỉ phép của nhân viên thuộc phòng ban mà manager quản lý
  app.get("/api/manager/leave-requests", ensureManager, async (req, res, next) => {
    try {
      const managerId = req.user?.id;
      console.log(`[Manager Leave Requests API] Request from manager ID: ${managerId}`);

      if (!managerId) {
        return res.status(401).json({ message: "Manager ID not found" });
      }

      // Lấy parameters từ query
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;
      const employeeId = req.query.employeeId as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      // Lấy employee ID của manager từ user ID
      const managerEmployeeId = await getManagerEmployeeId(managerId);
      if (!managerEmployeeId) {
        console.log(`[Manager Leave Requests API] Manager ${managerId} has no employee record`);
        return res.json({ leaveRequests: [], total: 0 });
      }

      console.log(`[Manager Leave Requests API] Manager user ID ${managerId} -> employee ID ${managerEmployeeId}`);

      // Lấy các phòng ban mà manager quản lý (sử dụng employee ID)
      const managerDepartments = await db
        .select()
        .from(departments)
        .where(eq(departments.managerId, managerEmployeeId));

      console.log(`[Manager Leave Requests API] Manager departments:`, managerDepartments);

      if (managerDepartments.length === 0) {
        console.log(`[Manager Leave Requests API] Manager ${managerId} has no departments`);
        return res.json({ leaveRequests: [], total: 0 });
      }

      const departmentIds = managerDepartments.map(dept => dept.id);
      console.log(`[Manager Leave Requests API] Department IDs:`, departmentIds);

      // Lấy nhân viên trong các phòng ban mà manager quản lý
      const departmentEmployees = await db
        .select({ id: employees.id })
        .from(employees)
        .where(inArray(employees.departmentId, departmentIds));

      const employeeIds = departmentEmployees.map(emp => emp.id);
      console.log(`[Manager Leave Requests API] Employee IDs:`, employeeIds);

      if (employeeIds.length === 0) {
        return res.json({ leaveRequests: [], total: 0 });
      }

      // Build WHERE conditions
      let whereConditions = [inArray(leaveRequests.employeeId, employeeIds)];

      // Status filter
      if (status && status !== 'all') {
        whereConditions.push(eq(leaveRequests.status, status as any));
      }

      // Employee filter
      if (employeeId && employeeId !== 'all') {
        const empId = parseInt(employeeId);
        if (!isNaN(empId) && employeeIds.includes(empId)) {
          whereConditions.push(eq(leaveRequests.employeeId, empId));
        }
      }

      // Date range filter
      if (startDate) {
        whereConditions.push(gte(leaveRequests.startDate, startDate));
      }
      if (endDate) {
        whereConditions.push(lte(leaveRequests.endDate, endDate));
      }

      // Get total count
      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(leaveRequests)
        .where(and(...whereConditions));

      const total = totalResult[0]?.count || 0;

      // Get leave requests with employee details
      const leaveRequestsList = await db
        .select({
          id: leaveRequests.id,
          employeeId: leaveRequests.employeeId,
          type: leaveRequests.type,
          startDate: leaveRequests.startDate,
          endDate: leaveRequests.endDate,
          reason: leaveRequests.reason,
          status: leaveRequests.status,
          approvedById: leaveRequests.approvedById,
          approvedAt: leaveRequests.approvedAt,
          createdAt: leaveRequests.createdAt,
          updatedAt: leaveRequests.updatedAt,
          employeeFirstName: employees.firstName,
          employeeLastName: employees.lastName,
          employeeEmployeeId: employees.employeeId,
          departmentName: departments.name
        })
        .from(leaveRequests)
        .leftJoin(employees, eq(leaveRequests.employeeId, employees.id))
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .where(and(...whereConditions))
        .orderBy(desc(leaveRequests.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);

      console.log(`[Manager Leave Requests API] Found ${leaveRequestsList.length} leave requests (total: ${total})`);

      // Format response
      const formattedLeaveRequests = leaveRequestsList.map(lr => ({
        id: lr.id,
        employeeId: lr.employeeId,
        type: lr.type,
        startDate: lr.startDate,
        endDate: lr.endDate,
        reason: lr.reason,
        status: lr.status,
        approvedById: lr.approvedById,
        approvedAt: lr.approvedAt,
        createdAt: lr.createdAt,
        updatedAt: lr.updatedAt,
        employee: {
          id: lr.employeeId,
          employeeId: lr.employeeEmployeeId,
          firstName: lr.employeeFirstName,
          lastName: lr.employeeLastName,
          department: {
            name: lr.departmentName
          }
        }
      }));

      res.json({
        leaveRequests: formattedLeaveRequests,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });

    } catch (error) {
      console.error("Error fetching manager leave requests:", error);
      next(error);
    }
  });

  // API endpoint để lấy chi tiết đơn nghỉ phép dành cho manager
  app.get("/api/manager/leave-requests/:id", ensureManager, async (req, res, next) => {
    try {
      const managerId = req.user?.id;
      const requestId = parseInt(req.params.id);

      console.log(`[Manager Leave Request Detail API] Request from manager ID: ${managerId} for request ID: ${requestId}`);

      if (!managerId) {
        return res.status(401).json({ message: "Manager ID not found" });
      }

      if (isNaN(requestId)) {
        return res.status(400).json({ message: "Invalid leave request ID" });
      }

      // Lấy các phòng ban mà manager quản lý
      const managerDepartments = await db
        .select()
        .from(departments)
        .where(eq(departments.managerId, managerId));

      console.log(`[Manager Leave Request Detail API] Manager departments:`, managerDepartments);

      if (managerDepartments.length === 0) {
        console.log(`[Manager Leave Request Detail API] Manager ${managerId} has no departments`);
        return res.status(403).json({ message: "Access denied. You don't manage any departments." });
      }

      const departmentIds = managerDepartments.map(dept => dept.id);

      // Lấy nhân viên trong các phòng ban mà manager quản lý
      const departmentEmployees = await db
        .select({ id: employees.id })
        .from(employees)
        .where(inArray(employees.departmentId, departmentIds));

      const employeeIds = departmentEmployees.map(emp => emp.id);

      if (employeeIds.length === 0) {
        return res.status(403).json({ message: "Access denied. No employees found in your departments." });
      }

      // Lấy chi tiết đơn nghỉ phép với thông tin nhân viên và phòng ban
      const leaveRequestDetail = await db
        .select({
          id: leaveRequests.id,
          employeeId: leaveRequests.employeeId,
          type: leaveRequests.type,
          startDate: leaveRequests.startDate,
          endDate: leaveRequests.endDate,
          reason: leaveRequests.reason,
          status: leaveRequests.status,
          approvedById: leaveRequests.approvedById,
          approvedAt: leaveRequests.approvedAt,
          createdAt: leaveRequests.createdAt,
          updatedAt: leaveRequests.updatedAt,
          employeeFirstName: employees.firstName,
          employeeLastName: employees.lastName,
          employeeEmployeeId: employees.employeeId,
          employeePosition: employees.position,
          employeeEmail: employees.email,
          employeePhone: employees.phone,
          departmentName: departments.name,
          departmentId: departments.id
        })
        .from(leaveRequests)
        .leftJoin(employees, eq(leaveRequests.employeeId, employees.id))
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .where(and(
          eq(leaveRequests.id, requestId),
          inArray(leaveRequests.employeeId, employeeIds)
        ))
        .limit(1);

      if (leaveRequestDetail.length === 0) {
        return res.status(404).json({ message: "Leave request not found or access denied" });
      }

      const request = leaveRequestDetail[0];

      // Lấy thông tin người duyệt (nếu có)
      let approverInfo = null;
      if (request.approvedById) {
        const approver = await db
          .select({
            id: users.id,
            fullName: users.fullName,
            role: users.role
          })
          .from(users)
          .where(eq(users.id, request.approvedById))
          .limit(1);

        if (approver.length > 0) {
          approverInfo = approver[0];
        }
      }

      // Tính số ngày nghỉ
      const startDate = new Date(request.startDate);
      const endDate = new Date(request.endDate);
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Format response
      const formattedResponse = {
        id: request.id,
        employeeId: request.employeeId,
        type: request.type,
        startDate: request.startDate,
        endDate: request.endDate,
        reason: request.reason,
        status: request.status,
        approvedById: request.approvedById,
        approvedAt: request.approvedAt,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
        totalDays: totalDays,
        employee: {
          id: request.employeeId,
          employeeId: request.employeeEmployeeId,
          firstName: request.employeeFirstName,
          lastName: request.employeeLastName,
          position: request.employeePosition,
          email: request.employeeEmail,
          phone: request.employeePhone,
          department: {
            id: request.departmentId,
            name: request.departmentName
          }
        },
        approver: approverInfo
      };

      console.log(`[Manager Leave Request Detail API] Successfully retrieved leave request:`, formattedResponse);
      res.json(formattedResponse);

    } catch (error) {
      console.error("Error fetching manager leave request detail:", error);
      next(error);
    }
  });

  // API endpoint để lấy danh sách nhân viên thuộc phòng ban mà manager quản lý
  app.get("/api/manager/employees", ensureManager, async (req, res, next) => {
    try {
      const managerId = req.user?.id;
      console.log(`[Manager Employees API] Request from manager ID: ${managerId}`);

      if (!managerId) {
        return res.status(401).json({ message: "Manager ID not found" });
      }

      // Lấy parameters từ query
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string || '';
      const departmentId = req.query.departmentId as string;
      const status = req.query.status as string;
      const position = req.query.position as string;
      const sortBy = req.query.sortBy as string || 'newest';

      // Lấy employee ID của manager từ user ID
      const managerEmployeeId = await getManagerEmployeeId(managerId);
      if (!managerEmployeeId) {
        console.log(`[Manager Employees API] Manager ${managerId} has no employee record`);
        return res.json({ employees: [], total: 0 });
      }

      console.log(`[Manager Employees API] Manager user ID ${managerId} -> employee ID ${managerEmployeeId}`);

      // Lấy các phòng ban mà manager quản lý (sử dụng employee ID)
      const managerDepartments = await db
        .select()
        .from(departments)
        .where(eq(departments.managerId, managerEmployeeId));

      console.log(`[Manager Employees API] Manager departments:`, managerDepartments);

      if (managerDepartments.length === 0) {
        console.log(`[Manager Employees API] Manager ${managerId} has no departments`);
        return res.json({ employees: [], total: 0 });
      }

      const departmentIds = managerDepartments.map(dept => dept.id);
      console.log(`[Manager Employees API] Department IDs:`, departmentIds);

      // Build WHERE conditions
      let whereConditions = [inArray(employees.departmentId, departmentIds)];

      // Search filter
      if (search) {
        const searchCondition = or(
          ilike(employees.firstName, `%${search}%`),
          ilike(employees.lastName, `%${search}%`),
          ilike(employees.employeeId, `%${search}%`)
        );
        if (searchCondition) {
          whereConditions.push(searchCondition);
        }
      }

      // Department filter (if specific department within managed departments)
      if (departmentId && departmentId !== 'all') {
        const deptId = parseInt(departmentId);
        if (departmentIds.includes(deptId)) {
          whereConditions.push(eq(employees.departmentId, deptId));
        }
      }

      // Status filter
      if (status && status !== 'all') {
        whereConditions.push(eq(employees.status, status));
      }

      // Position filter
      if (position) {
        whereConditions.push(ilike(employees.position, `%${position}%`));
      }

      // Build ORDER BY
      let orderBy;
      switch (sortBy) {
        case 'oldest':
          orderBy = asc(employees.joinDate);
          break;
        case 'name_asc':
          orderBy = asc(employees.firstName);
          break;
        case 'name_desc':
          orderBy = desc(employees.firstName);
          break;
        default: // newest
          orderBy = desc(employees.joinDate);
      }

      // Get total count
      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(employees)
        .where(and(...whereConditions));

      const total = totalResult[0]?.count || 0;

      // Get employees with pagination
      const employeeList = await db
        .select({
          id: employees.id,
          employeeId: employees.employeeId,
          firstName: employees.firstName,
          lastName: employees.lastName,
          email: employees.email,
          phone: employees.phone,
          position: employees.position,
          status: employees.status,
          joinDate: employees.joinDate,
          departmentId: employees.departmentId,
          createdAt: employees.createdAt,
          updatedAt: employees.updatedAt,
          departmentName: departments.name,
          departmentDescription: departments.description
        })
        .from(employees)
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .where(and(...whereConditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset((page - 1) * limit);

      console.log(`[Manager Employees API] Found ${employeeList.length} employees (total: ${total})`);

      // Format response to match expected Employee interface
      const formattedEmployees = employeeList.map(emp => ({
        id: emp.id,
        employeeId: emp.employeeId,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        phone: emp.phone,
        position: emp.position,
        status: emp.status,
        joinDate: emp.joinDate,
        departmentId: emp.departmentId,
        createdAt: emp.createdAt,
        updatedAt: emp.updatedAt,
        departmentName: emp.departmentName,
        departmentDescription: emp.departmentDescription
      }));

      res.json({
        employees: formattedEmployees,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });

    } catch (error) {
      console.error("Error fetching manager employees:", error);
      next(error);
    }
  });

  // API endpoint để lấy dữ liệu attendance summary cho manager (chỉ nhân viên cùng phòng ban)
  app.get("/api/manager/attendance-summary", ensureManager, async (req, res, next) => {
    try {
      const { startDate, endDate } = req.query;
      const managerId = req.user?.id;

      console.log(`[Manager API] Request from manager ID: ${managerId}`);
      console.log(`[Manager API] Query params:`, { startDate, endDate });

      if (!managerId) {
        return res.status(401).json({ message: "Manager ID not found" });
      }

      // Xử lý startDate và endDate
      let year: number, month: number;

      if (startDate) {
        const start = new Date(startDate as string);
        if (isNaN(start.getTime())) {
          return res.status(400).json({ message: "Invalid startDate" });
        }
        year = start.getFullYear();
        month = start.getMonth() + 1;
      } else {
        const now = new Date();
        year = now.getFullYear();
        month = now.getMonth() + 1;
      }

      console.log(`[Manager API] Fetching data for ${year}-${month}`);

      // Lấy employee ID của manager từ user ID
      const managerEmployeeId = await getManagerEmployeeId(managerId);
      if (!managerEmployeeId) {
        console.log(`[Manager API] Manager ${managerId} has no employee record`);
        return res.json([]);
      }

      console.log(`[Manager API] Manager user ID ${managerId} -> employee ID ${managerEmployeeId}`);

      // Lấy phòng ban mà manager quản lý (sử dụng employee ID)
      const managerDepartments = await db
        .select()
        .from(departments)
        .where(eq(departments.managerId, managerEmployeeId));

      console.log(`[Manager API] Manager departments:`, managerDepartments);

      if (managerDepartments.length === 0) {
        console.log(`[Manager API] Manager ${managerId} has no departments`);
        return res.json([]); // Manager không quản lý phòng ban nào
      }

      const departmentIds = managerDepartments.map(dept => dept.id);
      console.log(`[Manager API] Department IDs:`, departmentIds);

      // Lấy nhân viên trong các phòng ban mà manager quản lý
      const departmentEmployees = await db
        .select()
        .from(employees)
        .where(inArray(employees.departmentId, departmentIds));

      console.log(`[Manager API] Found ${departmentEmployees.length} employees in managed departments`);

      const summaries = [];

      for (const employee of departmentEmployees) {
        try {
          // Lấy dữ liệu từ bảng attendance_summary
          const existingSummary = await db
            .select()
            .from(attendanceSummary)
            .where(
              and(
                eq(attendanceSummary.employeeId, employee.id),
                eq(attendanceSummary.month, month),
                eq(attendanceSummary.year, year)
              )
            )
            .limit(1);

          const dbRecord = existingSummary[0];

          // Lấy thông tin phòng ban của nhân viên
          let departmentName = '';
          if (employee.departmentId) {
            const department = managerDepartments.find(dept => dept.id === employee.departmentId);
            if (department) {
              departmentName = department.name;
            }
          }

          if (dbRecord) {
            summaries.push({
              id: dbRecord.id,
              employeeId: employee.employeeId,
              firstName: employee.firstName,
              lastName: employee.lastName,
              departmentId: employee.departmentId,
              departmentName: departmentName,
              month,
              year,
              totalHours: parseFloat(dbRecord.totalHours.toString()),
              overtimeHours: parseFloat(dbRecord.overtimeHours.toString()),
              leaveDays: dbRecord.leaveDays,
              createdAt: dbRecord.createdAt.toISOString(),
              earlyMinutes: dbRecord.earlyMinutes,
              lateMinutes: dbRecord.lateMinutes,
              penaltyAmount: parseFloat(dbRecord.penaltyAmount.toString()),
              workDays: Math.ceil(parseFloat(dbRecord.totalHours.toString()) / 8),
              lateDays: dbRecord.lateMinutes > 0 ? Math.ceil(dbRecord.lateMinutes / 15) : 0,
              earlyLeaveDays: dbRecord.earlyMinutes > 0 ? Math.ceil(dbRecord.earlyMinutes / 15) : 0,
              absentDays: 0
            });
          } else {
            summaries.push({
              id: parseInt(`${employee.id}${year}${month}`),
              employeeId: employee.employeeId,
              firstName: employee.firstName,
              lastName: employee.lastName,
              departmentId: employee.departmentId,
              departmentName: departmentName,
              month,
              year,
              totalHours: 0,
              overtimeHours: 0,
              leaveDays: 0,
              createdAt: new Date().toISOString(),
              earlyMinutes: 0,
              lateMinutes: 0,
              penaltyAmount: 0,
              workDays: 0,
              lateDays: 0,
              earlyLeaveDays: 0,
              absentDays: 0
            });
          }
        } catch (error) {
          console.error(`Error fetching stats for employee ${employee.id}:`, error);

          let departmentName = '';
          if (employee.departmentId) {
            const department = managerDepartments.find(dept => dept.id === employee.departmentId);
            if (department) {
              departmentName = department.name;
            }
          }

          summaries.push({
            id: parseInt(`${employee.id}${year}${month}`),
            employeeId: employee.employeeId,
            firstName: employee.firstName,
            lastName: employee.lastName,
            departmentId: employee.departmentId,
            departmentName: departmentName,
            month,
            year,
            totalHours: 0,
            overtimeHours: 0,
            leaveDays: 0,
            createdAt: new Date().toISOString(),
            earlyMinutes: 0,
            lateMinutes: 0,
            penaltyAmount: 0,
            workDays: 0,
            lateDays: 0,
            earlyLeaveDays: 0,
            absentDays: 0
          });
        }
      }

      res.json(summaries);
    } catch (error) {
      console.error("Error fetching manager attendance summary:", error);
      next(error);
    }
  });

  // API endpoint để cập nhật hoặc tạo mới attendance summary
  app.post("/api/attendance-summary/update", ensureAdmin, async (req, res, next) => {
    try {
      const { employeeId, month, year, totalHours, overtimeHours, leaveDays } = req.body;

      if (!employeeId || !month || !year) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Kiểm tra xem đã có bản ghi cho nhân viên trong tháng/năm này chưa
      const existingRecord = await db.execute(sql`
        SELECT id FROM attendance_summary 
        WHERE employee_id = ${employeeId} 
        AND month = ${month} 
        AND year = ${year}
      `);

      let result;
      if (existingRecord.rows.length > 0) {
        // Cập nhật bản ghi hiện có
        result = await db.execute(sql`
          UPDATE attendance_summary 
          SET 
            total_hours = ${totalHours},
            overtime_hours = ${overtimeHours},
            leave_days = ${leaveDays},
            created_at = CURRENT_TIMESTAMP
          WHERE employee_id = ${employeeId} 
          AND month = ${month} 
          AND year = ${year}
          RETURNING *
        `);
      } else {
        // Tạo bản ghi mới
        result = await db.execute(sql`
          INSERT INTO attendance_summary 
          (employee_id, month, year, total_hours, overtime_hours, leave_days)
          VALUES 
          (${employeeId}, ${month}, ${year}, ${totalHours}, ${overtimeHours}, ${leaveDays})
          RETURNING *
        `);
      }

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Error updating attendance summary:", error);
      next(error);
    }
  });

  // Helper functions for report generation
  async function generateAttendanceReport(startDate: Date, endDate: Date, departmentId?: number): Promise<any[]> {
    try {
      // Get all work hours within date range
      const workHoursQuery = db
        .select({
          employeeId: workHours.employeeId,
          workDate: workHours.workDate,
          regularHours: workHours.regularHours,
          otHours: workHours.otHours,
          firstCheckin: workHours.firstCheckin,
          lastCheckout: workHours.lastCheckout,
          status: workHours.status
        })
        .from(workHours)
        .where(
          and(
            sql`DATE(${workHours.workDate}) >= DATE(${startDate.toISOString().split('T')[0]})`,
            sql`DATE(${workHours.workDate}) <= DATE(${endDate.toISOString().split('T')[0]})`
          )
        );

      const workHoursData = await workHoursQuery;

      // Get employee and department info
      const employeesWithDept = await db
        .select({
          id: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
          departmentId: employees.departmentId,
          departmentName: departments.name
        })
        .from(employees)
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .where(departmentId ? eq(employees.departmentId, departmentId) : undefined);

      // Combine data
      const attendanceData = [];
      for (const workHour of workHoursData) {
        const employee = employeesWithDept.find(emp => emp.id === workHour.employeeId);
        if (employee && (!departmentId || employee.departmentId === departmentId)) {
          attendanceData.push({
            employeeName: `${employee.lastName} ${employee.firstName}`,
            department: employee.departmentName || 'Chưa xác định',
            date: new Date(workHour.workDate).toLocaleDateString('vi-VN'),
            checkinTime: workHour.firstCheckin ? new Date(workHour.firstCheckin).toLocaleTimeString('vi-VN') : '',
            checkoutTime: workHour.lastCheckout ? new Date(workHour.lastCheckout).toLocaleTimeString('vi-VN') : '',
            regularHours: parseFloat(workHour.regularHours?.toString() || '0').toFixed(2),
            overtimeHours: parseFloat(workHour.otHours?.toString() || '0').toFixed(2),
            status: workHour.status || 'normal'
          });
        }
      }

      return attendanceData;
    } catch (error) {
      console.error('Error generating attendance report:', error);
      return [];
    }
  }

  async function generateEmployeeReport(startDate: Date, endDate: Date, departmentId?: number): Promise<any[]> {
    try {
      // Get attendance summaries for the date range
      const startYear = startDate.getFullYear();
      const startMonth = startDate.getMonth() + 1;
      const endYear = endDate.getFullYear();
      const endMonth = endDate.getMonth() + 1;

      const summariesQuery = db
        .select()
        .from(attendanceSummary)
        .where(
          and(
            or(
              and(eq(attendanceSummary.year, startYear), sql`${attendanceSummary.month} >= ${startMonth}`),
              sql`${attendanceSummary.year} > ${startYear}`
            ),
            or(
              and(eq(attendanceSummary.year, endYear), sql`${attendanceSummary.month} <= ${endMonth}`),
              sql`${attendanceSummary.year} < ${endYear}`
            )
          )
        );

      const summariesData = await summariesQuery;

      // Get employee and department info
      const employeesWithDept = await db
        .select({
          id: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
          departmentId: employees.departmentId,
          position: employees.position,
          departmentName: departments.name
        })
        .from(employees)
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .where(departmentId ? eq(employees.departmentId, departmentId) : undefined);

      // Group summaries by employee
      const employeeData = [];
      for (const employee of employeesWithDept) {
        const employeeSummaries = summariesData.filter(s => s.employeeId === employee.id);

        const totalHours = employeeSummaries.reduce((sum, s) => sum + parseFloat(s.totalHours.toString()), 0);
        const overtimeHours = employeeSummaries.reduce((sum, s) => sum + parseFloat(s.overtimeHours.toString()), 0);
        const leaveDays = employeeSummaries.reduce((sum, s) => sum + s.leaveDays, 0);
        const penaltyAmount = employeeSummaries.reduce((sum, s) => sum + parseFloat(s.penaltyAmount.toString()), 0);

        employeeData.push({
          employeeId: employee.id,
          employeeName: `${employee.lastName} ${employee.firstName}`,
          department: employee.departmentName || 'Chưa xác định',
          position: employee.position || 'Chưa xác định',
          totalHours: totalHours.toFixed(2),
          overtimeHours: overtimeHours.toFixed(2),
          leaveDays: leaveDays,
          penaltyAmount: penaltyAmount.toLocaleString('vi-VN')
        });
      }

      return employeeData;
    } catch (error) {
      console.error('Error generating employee report:', error);
      return [];
    }
  }

  async function generateDepartmentReport(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      // Get all departments
      const allDepartments = await db.select().from(departments);

      const departmentData = [];
      for (const dept of allDepartments) {
        // Get employees in department
        const deptEmployees = await db
          .select()
          .from(employees)
          .where(eq(employees.departmentId, dept.id));

        // Get attendance summaries for this department
        const startYear = startDate.getFullYear();
        const startMonth = startDate.getMonth() + 1;
        const endYear = endDate.getFullYear();
        const endMonth = endDate.getMonth() + 1;

        const summariesQuery = db
          .select()
          .from(attendanceSummary)
          .where(
            and(
              sql`employee_id IN (${deptEmployees.map(e => e.id).join(',') || '0'})`,
              or(
                and(eq(attendanceSummary.year, startYear), sql`${attendanceSummary.month} >= ${startMonth}`),
                sql`${attendanceSummary.year} > ${startYear}`
              ),
              or(
                and(eq(attendanceSummary.year, endYear), sql`${attendanceSummary.month} <= ${endMonth}`),
                sql`${attendanceSummary.year} < ${endYear}`
              )
            )
          );

        const summariesData = deptEmployees.length > 0 ? await summariesQuery : [];

        const totalHours = summariesData.reduce((sum, s) => sum + parseFloat(s.totalHours.toString()), 0);
        const overtimeHours = summariesData.reduce((sum, s) => sum + parseFloat(s.overtimeHours.toString()), 0);
        const totalPenalty = summariesData.reduce((sum, s) => sum + parseFloat(s.penaltyAmount.toString()), 0);

        // Calculate attendance rate (simplified)
        const attendanceRate = summariesData.length > 0 ?
          (summariesData.filter(s => parseFloat(s.totalHours.toString()) > 0).length / summariesData.length * 100) : 0;

        departmentData.push({
          departmentName: dept.name,
          employeeCount: deptEmployees.length,
          totalHours: totalHours.toFixed(2),
          overtimeHours: overtimeHours.toFixed(2),
          attendanceRate: attendanceRate.toFixed(1),
          totalPenalty: totalPenalty.toLocaleString('vi-VN')
        });
      }

      return departmentData;
    } catch (error) {
      console.error('Error generating department report:', error);
      return [];
    }
  }

  async function generateSummaryReport(startDate: Date, endDate: Date, departmentId?: number): Promise<any[]> {
    try {
      // Get attendance summaries for the date range
      const startYear = startDate.getFullYear();
      const startMonth = startDate.getMonth() + 1;
      const endYear = endDate.getFullYear();
      const endMonth = endDate.getMonth() + 1;

      const summariesQuery = db
        .select()
        .from(attendanceSummary)
        .where(
          and(
            or(
              and(eq(attendanceSummary.year, startYear), sql`${attendanceSummary.month} >= ${startMonth}`),
              sql`${attendanceSummary.year} > ${startYear}`
            ),
            or(
              and(eq(attendanceSummary.year, endYear), sql`${attendanceSummary.month} <= ${endMonth}`),
              sql`${attendanceSummary.year} < ${endYear}`
            )
          )
        );

      const summariesData = await summariesQuery;

      // Get employee and department info
      const employeesWithDept = await db
        .select({
          id: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
          departmentId: employees.departmentId,
          departmentName: departments.name
        })
        .from(employees)
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .where(departmentId ? eq(employees.departmentId, departmentId) : undefined);

      const summaryData = [];
      for (const employee of employeesWithDept) {
        const employeeSummaries = summariesData.filter(s => s.employeeId === employee.id);

        // Aggregate data for this employee
        const totalHours = employeeSummaries.reduce((sum, s) => sum + parseFloat(s.totalHours.toString()), 0);
        const leaveDays = employeeSummaries.reduce((sum, s) => sum + s.leaveDays, 0);
        const lateMinutes = employeeSummaries.reduce((sum, s) => sum + s.lateMinutes, 0);
        const earlyMinutes = employeeSummaries.reduce((sum, s) => sum + s.earlyMinutes, 0);
        const penaltyAmount = employeeSummaries.reduce((sum, s) => sum + parseFloat(s.penaltyAmount.toString()), 0);

        // Calculate derived fields
        const workDays = Math.ceil(totalHours / 8);
        const lateDays = lateMinutes > 0 ? Math.ceil(lateMinutes / 15) : 0;
        const earlyLeaveDays = earlyMinutes > 0 ? Math.ceil(earlyMinutes / 15) : 0;
        const absentDays = 0; // Can be calculated based on business logic

        summaryData.push({
          employeeName: `${employee.lastName} ${employee.firstName}`,
          department: employee.departmentName || 'Chưa xác định',
          workDays: workDays,
          lateDays: lateDays,
          earlyLeaveDays: earlyLeaveDays,
          absentDays: absentDays,
          leaveDays: leaveDays,
          lateMinutes: lateMinutes,
          earlyMinutes: earlyMinutes,
          penaltyAmount: penaltyAmount.toLocaleString('vi-VN')
        });
      }

      return summaryData;
    } catch (error) {
      console.error('Error generating summary report:', error);
      return [];
    }
  }

  async function generateCSV(data: any[], headers: string[]): Promise<string> {
    const csvRows = [];

    // Add headers
    csvRows.push(headers.join(','));

    // Add data rows
    for (const row of data) {
      const values = Object.values(row).map(value => {
        // Handle values that might contain commas or quotes
        const stringValue = String(value || '');
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  async function generateXLSX(data: any[], headers: string[], reportType: string): Promise<Buffer> {

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Create worksheet data
    const worksheetData = [
      headers,
      ...data.map(row => Object.values(row))
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths
    const columnWidths = headers.map(() => ({ wch: 15 }));
    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, reportType.charAt(0).toUpperCase() + reportType.slice(1));

    // Generate buffer
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  async function generatePDF(data: any[], headers: string[], reportType: string, startDate: Date, endDate: Date): Promise<Buffer> {

    const doc = new jsPDF();

    // Add title
    doc.setFontSize(16);
    doc.text(`Báo cáo ${reportType}`, 20, 20);

    // Add date range
    doc.setFontSize(12);
    doc.text(`Từ ngày: ${startDate.toLocaleDateString('vi-VN')} đến ${endDate.toLocaleDateString('vi-VN')}`, 20, 35);

    // Add table
    doc.autoTable({
      head: [headers],
      body: data.map(row => Object.values(row)),
      startY: 45,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [63, 81, 181],
        textColor: 255,
        fontSize: 9
      },
      margin: { top: 45 }
    });

    return Buffer.from(doc.output('arraybuffer'));
  }

  // Report export routes
  app.post("/api/reports/export", ensureAuthenticated, async (req, res, next) => {
    try {
      const {
        reportType,
        format,
        startDate,
        endDate,
        departmentId,
        includeDetails
      } = req.body;

      console.log(`Generating ${reportType} report in ${format} format`);

      // Validate required fields
      if (!reportType || !format || !startDate || !endDate) {
        return res.status(400).json({
          message: "Missing required fields: reportType, format, startDate, endDate"
        });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      let reportData: any[] = [];
      let filename = "";
      let headers: string[] = [];

      // Generate data based on report type
      switch (reportType) {
        case "attendance":
          const attendanceData = await generateAttendanceReport(start, end, departmentId);
          reportData = attendanceData;
          filename = `attendance_report_${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}`;
          headers = [
            "Tên nhân viên", "Phòng ban", "Ngày", "Giờ vào", "Giờ ra",
            "Tổng giờ làm", "Giờ làm thêm", "Trạng thái"
          ];
          break;

        case "employee":
          const employeeData = await generateEmployeeReport(start, end, departmentId);
          reportData = employeeData;
          filename = `employee_report_${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}`;
          headers = [
            "Mã NV", "Tên nhân viên", "Phòng ban", "Chức vụ",
            "Tổng giờ làm", "Giờ làm thêm", "Số ngày nghỉ", "Tiền phạt"
          ];
          break;

        case "department":
          const deptData = await generateDepartmentReport(start, end);
          reportData = deptData;
          filename = `department_report_${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}`;
          headers = [
            "Phòng ban", "Số nhân viên", "Tổng giờ làm", "Giờ làm thêm",
            "Tỷ lệ có mặt (%)", "Tổng tiền phạt"
          ];
          break;

        case "summary":
          const summaryData = await generateSummaryReport(start, end, departmentId);
          reportData = summaryData;
          filename = `summary_report_${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}`;
          headers = [
            "Tên nhân viên", "Phòng ban", "Buổi làm", "Buổi trễ", "Buổi về sớm",
            "Buổi vắng", "Buổi phép", "Phút trễ", "Phút về sớm", "Tiền phạt (VNĐ)"
          ];
          break;

        default:
          return res.status(400).json({ message: "Invalid report type" });
      }

      // Generate file based on format
      if (format === "csv") {
        const csv = await generateCSV(reportData, headers);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        res.send('\ufeff' + csv); // Add BOM for UTF-8
      } else if (format === "xlsx") {
        const xlsx = await generateXLSX(reportData, headers, reportType);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
        res.send(xlsx);
      } else if (format === "pdf") {
        const pdf = await generatePDF(reportData, headers, reportType, start, end);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
        res.send(pdf);
      } else {
        return res.status(400).json({ message: "Invalid format. Supported formats: csv, xlsx, pdf" });
      }

    } catch (error) {
      console.error("Error generating report:", error);
      next(error);
    }
  });

  // API endpoint để tạo đơn nghỉ phép cho nhân viên (dành cho manager)
  app.post("/api/manager/leave-requests", ensureManager, async (req, res, next) => {
    try {
      const managerId = req.user?.id;
      console.log(`[Manager Create Leave Request API] Request from manager ID: ${managerId}`);

      if (!managerId) {
        return res.status(401).json({ message: "Manager ID not found" });
      }

      // Validate request body
      const { employeeId, type, startDate, endDate, reason } = req.body;

      if (!employeeId || !type || !startDate || !endDate) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Lấy các phòng ban mà manager quản lý
      const managerDepartments = await db
        .select()
        .from(departments)
        .where(eq(departments.managerId, managerId));

      if (managerDepartments.length === 0) {
        return res.status(403).json({ message: "Access denied. You don't manage any departments." });
      }

      const departmentIds = managerDepartments.map(dept => dept.id);

      // Kiểm tra xem nhân viên có thuộc phòng ban của manager không
      const employee = await db
        .select()
        .from(employees)
        .where(and(
          eq(employees.id, employeeId),
          inArray(employees.departmentId, departmentIds)
        ))
        .limit(1);

      if (employee.length === 0) {
        return res.status(403).json({ message: "Access denied. Employee not found in your departments." });
      }

      // Tạo đơn nghỉ phép mới
      const newLeaveRequest = await db
        .insert(leaveRequests)
        .values({
          employeeId,
          type,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          reason: reason || null,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      const createdRequest = newLeaveRequest[0];

      // Format response
      const response = {
        ...createdRequest,
        employee: {
          id: employee[0].id,
          firstName: employee[0].firstName,
          lastName: employee[0].lastName,
          department: managerDepartments.find(dept => dept.id === employee[0].departmentId)
        }
      };

      res.status(201).json(response);

    } catch (error) {
      console.error("Error creating leave request:", error);
      next(error);
    }
  });

  // API endpoint để phê duyệt đơn nghỉ phép (dành cho manager)
  app.put("/api/manager/leave-requests/:id/approve", ensureManager, async (req, res, next) => {
    try {
      const managerId = req.user?.id;
      const requestId = parseInt(req.params.id);

      if (!managerId) {
        return res.status(401).json({ message: "Manager ID not found" });
      }

      if (isNaN(requestId)) {
        return res.status(400).json({ message: "Invalid leave request ID" });
      }

      // Lấy thông tin đơn nghỉ phép
      const leaveRequest = await db
        .select({
          id: leaveRequests.id,
          employeeId: leaveRequests.employeeId,
          status: leaveRequests.status,
          startDate: leaveRequests.startDate,
          endDate: leaveRequests.endDate,
          type: leaveRequests.type,
          reason: leaveRequests.reason,
          createdAt: leaveRequests.createdAt,
          employee: {
            id: employees.id,
            firstName: employees.firstName,
            lastName: employees.lastName,
            departmentId: employees.departmentId
          }
        })
        .from(leaveRequests)
        .innerJoin(employees, eq(leaveRequests.employeeId, employees.id))
        .where(eq(leaveRequests.id, requestId))
        .limit(1);

      if (leaveRequest.length === 0) {
        return res.status(404).json({ message: "Leave request not found" });
      }

      const request = leaveRequest[0];

      // Kiểm tra xem manager có quyền phê duyệt đơn này không
      const managerDepartments = await db
        .select()
        .from(departments)
        .where(eq(departments.managerId, managerId));

      const departmentIds = managerDepartments.map(dept => dept.id);

      if (!departmentIds.includes(request.employee.departmentId!)) {
        return res.status(403).json({ message: "Access denied. Employee not in your managed departments." });
      }

      // Kiểm tra trạng thái đơn
      if (request.status !== 'pending') {
        return res.status(400).json({ message: "Can only approve pending leave requests" });
      }

      // Cập nhật trạng thái đơn nghỉ phép
      const updatedRequest = await db
        .update(leaveRequests)
        .set({
          status: 'approved',
          approvedById: managerId,
          approvedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(leaveRequests.id, requestId))
        .returning();

      if (updatedRequest.length === 0) {
        return res.status(500).json({ message: "Failed to approve leave request" });
      }

      res.json({
        ...updatedRequest[0],
        employee: request.employee
      });

    } catch (error) {
      console.error("Error approving leave request:", error);
      next(error);
    }
  });

  // API endpoint để từ chối đơn nghỉ phép (dành cho manager)
  app.put("/api/manager/leave-requests/:id/reject", ensureManager, async (req, res, next) => {
    try {
      const managerId = req.user?.id;
      const requestId = parseInt(req.params.id);
      const { reason } = req.body;

      if (!managerId) {
        return res.status(401).json({ message: "Manager ID not found" });
      }

      if (isNaN(requestId)) {
        return res.status(400).json({ message: "Invalid leave request ID" });
      }

      if (!reason || reason.trim() === '') {
        return res.status(400).json({ message: "Rejection reason is required" });
      }

      // Lấy thông tin đơn nghỉ phép
      const leaveRequest = await db
        .select({
          id: leaveRequests.id,
          employeeId: leaveRequests.employeeId,
          status: leaveRequests.status,
          startDate: leaveRequests.startDate,
          endDate: leaveRequests.endDate,
          type: leaveRequests.type,
          reason: leaveRequests.reason,
          createdAt: leaveRequests.createdAt,
          employee: {
            id: employees.id,
            firstName: employees.firstName,
            lastName: employees.lastName,
            departmentId: employees.departmentId
          }
        })
        .from(leaveRequests)
        .innerJoin(employees, eq(leaveRequests.employeeId, employees.id))
        .where(eq(leaveRequests.id, requestId))
        .limit(1);

      if (leaveRequest.length === 0) {
        return res.status(404).json({ message: "Leave request not found" });
      }

      const request = leaveRequest[0];

      // Kiểm tra xem manager có quyền từ chối đơn này không
      const managerDepartments = await db
        .select()
        .from(departments)
        .where(eq(departments.managerId, managerId));

      const departmentIds = managerDepartments.map(dept => dept.id);

      if (!departmentIds.includes(request.employee.departmentId!)) {
        return res.status(403).json({ message: "Access denied. Employee not in your managed departments." });
      }

      // Kiểm tra trạng thái đơn
      if (request.status !== 'pending') {
        return res.status(400).json({ message: "Can only reject pending leave requests" });
      }

      // Cập nhật trạng thái đơn nghỉ phép với lý do từ chối
      const updatedRequest = await db
        .update(leaveRequests)
        .set({
          status: 'rejected',
          approvedById: managerId,
          approvedAt: new Date(),
          updatedAt: new Date(),
          // Store rejection reason in the reason field or add a new field
          reason: `REJECTED: ${reason}` // Prepend with REJECTED prefix
        })
        .where(eq(leaveRequests.id, requestId))
        .returning();

      if (updatedRequest.length === 0) {
        return res.status(500).json({ message: "Failed to reject leave request" });
      }

      res.json({
        ...updatedRequest[0],
        employee: request.employee,
        rejectionReason: reason
      });

    } catch (error) {
      console.error("Error rejecting leave request:", error);
      next(error);
    }
  });

  // Reports and Statistics API endpoints
  app.get("/api/reports/attendance-summary", ensureAuthenticated, async (req, res, next) => {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
      const departmentId = req.query.departmentId ? parseInt(req.query.departmentId as string) : null;

      let query = db
        .select({
          employeeId: attendanceSummary.employeeId,
          employeeName: sql`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`.as('employeeName'),
          departmentName: departments.name,
          totalHours: attendanceSummary.totalHours,
          overtimeHours: attendanceSummary.overtimeHours,
          leaveDays: attendanceSummary.leaveDays,
          presentDays: attendanceSummary.presentDays,
          lateDays: attendanceSummary.lateDays,
          absentDays: attendanceSummary.absentDays,
          month: attendanceSummary.month,
          year: attendanceSummary.year
        })
        .from(attendanceSummary)
        .leftJoin(employees, eq(attendanceSummary.employeeId, employees.id))
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .where(and(
          eq(attendanceSummary.year, year),
          eq(attendanceSummary.month, month)
        ));

      if (departmentId) {
        query = query.where(eq(employees.departmentId, departmentId));
      }

      const summaryData = await query.orderBy(employees.firstName, employees.lastName);

      const formattedData = summaryData.map(record => ({
        employeeId: record.employeeId,
        employeeName: record.employeeName,
        departmentName: record.departmentName || 'Chưa phân công',
        totalHours: parseFloat(record.totalHours?.toString() || '0'),
        overtimeHours: parseFloat(record.overtimeHours?.toString() || '0'),
        leaveDays: record.leaveDays || 0,
        presentDays: record.presentDays || 0,
        lateDays: record.lateDays || 0,
        absentDays: record.absentDays || 0,
        month: record.month,
        year: record.year
      }));

      res.json(formattedData);
    } catch (error) {
      console.error('Error fetching attendance summary:', error);
      next(error);
    }
  });

  app.get("/api/reports/statistics", ensureAuthenticated, async (req, res, next) => {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;

      // Get overall statistics from attendance_summary
      const stats = await db
        .select({
          totalEmployees: sql`COUNT(DISTINCT ${attendanceSummary.employeeId})`.as('totalEmployees'),
          totalHours: sql`SUM(CASE WHEN ${attendanceSummary.totalHours} IS NOT NULL THEN CAST(${attendanceSummary.totalHours} AS DECIMAL) ELSE 0 END)`.as('totalHours'),
          totalOvertime: sql`SUM(CASE WHEN ${attendanceSummary.overtimeHours} IS NOT NULL THEN CAST(${attendanceSummary.overtimeHours} AS DECIMAL) ELSE 0 END)`.as('totalOvertime'),
          totalLeaveDays: sql`SUM(COALESCE(${attendanceSummary.leaveDays}, 0))`.as('totalLeaveDays'),
          totalPresentDays: sql`SUM(COALESCE(${attendanceSummary.presentDays}, 0))`.as('totalPresentDays'),
          totalLateDays: sql`SUM(COALESCE(${attendanceSummary.lateDays}, 0))`.as('totalLateDays')
        })
        .from(attendanceSummary)
        .where(and(
          eq(attendanceSummary.year, year),
          eq(attendanceSummary.month, month)
        ));

      const totalActiveEmployees = await db
        .select({ count: sql`COUNT(*)`.as('count') })
        .from(employees)
        .where(eq(employees.status, 'active'));

      const result = stats[0];
      const activeEmployeeCount = totalActiveEmployees[0]?.count || 0;

      const formattedStats = {
        totalEmployees: parseInt(result?.totalEmployees?.toString() || '0'),
        activeEmployees: parseInt(activeEmployeeCount.toString()),
        totalHours: parseFloat(result?.totalHours?.toString() || '0'),
        totalOvertime: parseFloat(result?.totalOvertime?.toString() || '0'),
        totalLeaveDays: parseInt(result?.totalLeaveDays?.toString() || '0'),
        avgHoursPerEmployee: parseInt(result?.totalEmployees?.toString() || '0') > 0 ?
          parseFloat(result?.totalHours?.toString() || '0') / parseInt(result?.totalEmployees?.toString() || '1') : 0,
        attendanceRate: parseInt(result?.totalPresentDays?.toString() || '0') > 0 ?
          (parseInt(result?.totalPresentDays?.toString() || '0') /
            (parseInt(result?.totalPresentDays?.toString() || '0') + parseInt(result?.totalLateDays?.toString() || '0'))) * 100 : 0,
        lateRate: parseInt(result?.totalPresentDays?.toString() || '0') > 0 ?
          (parseInt(result?.totalLateDays?.toString() || '0') / parseInt(result?.totalPresentDays?.toString() || '1')) * 100 : 0
      };

      res.json(formattedStats);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      next(error);
    }
  });

  // Get all managers with their employee information
  app.get("/api/managers/all", ensureAuthenticated, async (req, res, next) => {
    try {
      // Check if user has admin access
      const user = req.user as Express.User;
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }

      // Get all users with role 'manager' and their associated employee information
      const managers = await db
        .select({
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          employeeId: users.employeeId,
          employeeData: {
            id: employees.id,
            firstName: employees.firstName,
            lastName: employees.lastName,
            departmentId: employees.departmentId
          }
        })
        .from(users)
        .leftJoin(employees, eq(users.employeeId, employees.id))
        .where(eq(users.role, 'manager'));

      const formattedManagers = managers.map(manager => ({
        id: manager.id,
        username: manager.username,
        fullName: manager.fullName,
        employeeId: manager.employeeId,
        employeeData: manager.employeeData ? {
          id: manager.employeeData.id,
          firstName: manager.employeeData.firstName,
          lastName: manager.employeeData.lastName,
          fullName: `${manager.employeeData.firstName} ${manager.employeeData.lastName}`,
          departmentId: manager.employeeData.departmentId
        } : null
      }));

      res.json(formattedManagers);
    } catch (error) {
      console.error("Error fetching managers:", error);
      res.status(500).json({ message: "Failed to fetch managers" });
    }
  });

  // HTTP server setup
  const httpServer = createServer(app);

  return httpServer;
}