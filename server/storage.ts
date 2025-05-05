import {
  type User,
  type InsertUser,
  type Department,
  type InsertDepartment,
  type Employee,
  type InsertEmployee,
  type AttendanceRecord,
  type InsertAttendanceRecord,
  type LeaveRequest,
  type InsertLeaveRequest,
  type SalaryRecord,
  type InsertSalaryRecord,
  users,
  departments,
  employees,
  attendanceRecords,
  leaveRequests,
  salaryRecords
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lt, sql, count } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Department methods
  getDepartment(id: number): Promise<Department | undefined>;
  getAllDepartments(): Promise<Department[]>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: number, department: Partial<InsertDepartment>): Promise<Department | undefined>;
  deleteDepartment(id: number): Promise<boolean>;

  // Employee methods
  getEmployee(id: number): Promise<Employee | undefined>;
  getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined>;
  getAllEmployees(page: number, limit: number, filters?: object): Promise<{ employees: Employee[], total: number }>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(id: number): Promise<boolean>;

  // Attendance methods
  getAttendanceRecord(id: number): Promise<AttendanceRecord | undefined>;
  getEmployeeAttendance(employeeId: number, startDate?: Date, endDate?: Date): Promise<AttendanceRecord[]>;
  createAttendanceRecord(attendance: InsertAttendanceRecord): Promise<AttendanceRecord>;
  getLatestAttendanceRecord(employeeId: number, date: Date): Promise<AttendanceRecord | undefined>;
  getDailyAttendance(date: Date): Promise<{ employee: Employee; attendance?: AttendanceRecord }[]>;

  // Leave Request methods
  getLeaveRequest(id: number): Promise<LeaveRequest | undefined>;
  getEmployeeLeaveRequests(employeeId: number, status?: string): Promise<LeaveRequest[]>;
  getAllLeaveRequests(page: number, limit: number, status?: string): Promise<LeaveRequest[]>;
  createLeaveRequest(leaveRequest: InsertLeaveRequest): Promise<LeaveRequest>;
  updateLeaveRequest(id: number, leaveRequest: Partial<LeaveRequest>): Promise<LeaveRequest | undefined>;
  deleteLeaveRequest(id: number): Promise<boolean>;

  // Salary methods
  getSalaryRecord(id: number): Promise<SalaryRecord | undefined>;
  getEmployeeSalaryRecords(employeeId: number, year?: number): Promise<SalaryRecord[]>;
  getAllSalaryRecords(page: number, limit: number, year?: number, month?: number): Promise<SalaryRecord[]>;
  createSalaryRecord(salaryRecord: InsertSalaryRecord): Promise<SalaryRecord>;
  updateSalaryRecord(id: number, salaryRecord: Partial<SalaryRecord>): Promise<SalaryRecord | undefined>;
  deleteSalaryRecord(id: number): Promise<boolean>;
  getSalaryStats(year: number): Promise<{ month: number; totalSalary: number; totalEmployees: number }[]>;

  // Statistics methods
  getDepartmentAttendanceStats(date: Date): Promise<{ departmentId: number; departmentName: string; presentPercentage: number }[]>;
  getDailyAttendanceSummary(date: Date): Promise<{ present: number; absent: number; late: number; total: number }>;
  getWeeklyAttendance(startDate: Date, endDate: Date): Promise<{ date: string; present: number; absent: number; late: number }[]>;

  // Session store
  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Department methods
  async getDepartment(id: number): Promise<Department | undefined> {
    try {
      const [department] = await db.select().from(departments).where(eq(departments.id, id));
      return department;
    } catch (error) {
      console.error("Error fetching department:", error);
      return undefined;
    }
  }

  async getAllDepartments(): Promise<Department[]> {
    try {
      console.log("Fetching departments from database");
      // Use ORM to fetch departments
      const result = await db.select().from(departments);
      console.log("Departments fetched:", JSON.stringify(result));
      return result;
    } catch (error) {
      console.error("Error fetching all departments:", error);
      return [];
    }
  }

  async createDepartment(department: InsertDepartment): Promise<Department> {
    const [newDepartment] = await db
      .insert(departments)
      .values(department)
      .returning();
    return newDepartment;
  }

  async updateDepartment(id: number, department: Partial<InsertDepartment>): Promise<Department | undefined> {
    const [updatedDepartment] = await db
      .update(departments)
      .set(department)
      .where(eq(departments.id, id))
      .returning();
    return updatedDepartment;
  }

  async deleteDepartment(id: number): Promise<boolean> {
    const result = await db
      .delete(departments)
      .where(eq(departments.id, id));
    return true;
  }

  // Employee methods
  async getEmployee(id: number): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee;
  }

  async getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.employeeId, employeeId));
    return employee;
  }

  async getAllEmployees(page: number = 1, limit: number = 10, filters?: object): Promise<{ employees: Employee[], total: number }> {
    const offset = (page - 1) * limit;

    // Ép kiểu filters để sử dụng đúng kiểu dữ liệu
    const filterOptions = filters as {
      search?: string;
      departmentId?: number;
      status?: string;
      position?: string;
      joinDate?: Date;
      sortBy?: string;
    } || {};

    // Lấy tất cả employees và xử lý bộ lọc trong memory để tránh lỗi SQL
    const allEmployees = await db.select().from(employees);

    // Lọc nhân viên theo các tiêu chí
    let filteredEmployees = [...allEmployees];

    // Áp dụng bộ lọc search
    if (filterOptions.search) {
      const searchTerm = filterOptions.search.toLowerCase();
      filteredEmployees = filteredEmployees.filter(emp =>
        emp.firstName.toLowerCase().includes(searchTerm) ||
        emp.lastName.toLowerCase().includes(searchTerm) ||
        emp.email.toLowerCase().includes(searchTerm) ||
        emp.employeeId.toLowerCase().includes(searchTerm) ||
        (emp.position && emp.position.toLowerCase().includes(searchTerm))
      );
    }

    // Lọc theo department
    if (filterOptions.departmentId) {
      filteredEmployees = filteredEmployees.filter(emp =>
        emp.departmentId === filterOptions.departmentId
      );
    }

    // Lọc theo status
    if (filterOptions.status) {
      filteredEmployees = filteredEmployees.filter(emp =>
        emp.status === filterOptions.status
      );
    }

    // Lọc theo position
    if (filterOptions.position) {
      const positionTerm = filterOptions.position.toLowerCase();
      filteredEmployees = filteredEmployees.filter(emp =>
        emp.position && emp.position.toLowerCase().includes(positionTerm)
      );
    }

    // Lọc theo joinDate
    if (filterOptions.joinDate) {
      const filterDate = new Date(filterOptions.joinDate);
      filterDate.setHours(0, 0, 0, 0);

      filteredEmployees = filteredEmployees.filter(emp => {
        const empJoinDate = new Date(emp.joinDate);
        empJoinDate.setHours(0, 0, 0, 0);
        return empJoinDate.getTime() === filterDate.getTime();
      });
    }

    // Sắp xếp kết quả
    if (filterOptions.sortBy) {
      switch (filterOptions.sortBy) {
        case 'newest':
          filteredEmployees.sort((a, b) =>
            new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime()
          );
          break;
        case 'oldest':
          filteredEmployees.sort((a, b) =>
            new Date(a.joinDate).getTime() - new Date(b.joinDate).getTime()
          );
          break;
        case 'name_asc':
          filteredEmployees.sort((a, b) =>
            `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
          );
          break;
        case 'name_desc':
          filteredEmployees.sort((a, b) =>
            `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`)
          );
          break;
        default:
          filteredEmployees.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    } else {
      // Mặc định sắp xếp theo thời gian tạo giảm dần
      filteredEmployees.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    // Tính tổng số kết quả
    const total = filteredEmployees.length;

    // Phân trang kết quả
    const paginatedEmployees = filteredEmployees.slice(offset, offset + limit);

    return {
      employees: paginatedEmployees,
      total
    };
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    // Convert joinDate from string to Date if needed
    const employeeData: any = { ...employee };

    // Format joinDate to date string without time component
    if (employee.joinDate) {
      const dateObj = new Date(employee.joinDate);
      if (!isNaN(dateObj.getTime())) {
        // Format as YYYY-MM-DD
        const dateStr = dateObj.toISOString().split('T')[0];
        employeeData.joinDate = dateStr;
      } else {
        // Default to today if invalid
        employeeData.joinDate = new Date().toISOString().split('T')[0];
      }
    } else {
      // Default to today if not provided
      employeeData.joinDate = new Date().toISOString().split('T')[0];
    }

    const [newEmployee] = await db
      .insert(employees)
      .values(employeeData)
      .returning();
    return newEmployee;
  }

  async updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee | undefined> {
    // Tạo bản sao dữ liệu để tránh thay đổi object gốc
    const employeeData: any = { ...employee };

    // Xử lý đặc biệt cho joinDate để đảm bảo nó được lưu đúng là date không phải timestamp
    if (employee.joinDate) {
      try {
        // Lấy đối tượng Date
        let dateObj: Date;
        if (typeof employee.joinDate === 'string') {
          dateObj = new Date(employee.joinDate);
        } else {
          // Nếu không phải string, gán nó là any để tránh lỗi kiểu dữ liệu
          dateObj = (employee.joinDate as any) instanceof Date
            ? (employee.joinDate as any)
            : new Date();
        }

        // Kiểm tra tính hợp lệ của ngày
        if (isNaN(dateObj.getTime())) {
          console.error("Invalid join date:", employee.joinDate);
        } else {
          // Chỉ lấy phần date và bỏ qua phần time
          const dateStr = dateObj.toISOString().split('T')[0]; // Format YYYY-MM-DD
          employeeData.joinDate = dateStr;
          console.log("Formatted join date for database:", dateStr);
        }
      } catch (error) {
        console.error("Error processing join date:", error);
      }
    }

    // Luôn cập nhật timestamp updated
    employeeData.updatedAt = new Date();

    const [updatedEmployee] = await db
      .update(employees)
      .set(employeeData)
      .where(eq(employees.id, id))
      .returning();
    return updatedEmployee;
  }

  async deleteEmployee(id: number): Promise<boolean> {
    await db
      .delete(employees)
      .where(eq(employees.id, id));
    return true;
  }

  // Attendance methods
  async getAttendanceRecord(id: number): Promise<AttendanceRecord | undefined> {
    const [record] = await db.select().from(attendanceRecords).where(eq(attendanceRecords.id, id));
    return record;
  }

  async getEmployeeAttendance(employeeId: number, startDate?: Date, endDate?: Date): Promise<AttendanceRecord[]> {
    // Instead of building the query, use a more direct approach
    const allRecords = await db
      .select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.employeeId, employeeId));

    // Filter records by date in memory
    return allRecords.filter(record => {
      const recordDate = new Date(record.date);

      if (startDate && recordDate < startDate) {
        return false;
      }

      if (endDate && recordDate >= endDate) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }

  async createAttendanceRecord(attendance: InsertAttendanceRecord): Promise<AttendanceRecord> {
    const [record] = await db
      .insert(attendanceRecords)
      .values(attendance)
      .returning();
    return record;
  }

  async getLatestAttendanceRecord(employeeId: number, date: Date): Promise<AttendanceRecord | undefined> {
    // Create start and end of the given date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [record] = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeId, employeeId),
          gte(attendanceRecords.date, startOfDay),
          lt(attendanceRecords.date, endOfDay)
        )
      )
      .orderBy(desc(attendanceRecords.time))
      .limit(1);

    return record;
  }

  async getDailyAttendance(date: Date): Promise<{ employee: Employee; attendance?: AttendanceRecord }[]> {
    // Create start and end of the given date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all employees
    const allEmployees = await db.select().from(employees);

    // Get attendance records for the day
    const dailyAttendance = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          gte(attendanceRecords.date, startOfDay),
          lt(attendanceRecords.date, endOfDay)
        )
      );

    // Map employees with their attendance records
    return allEmployees.map(employee => {
      const attendance = dailyAttendance.find(record =>
        record.employeeId === employee.id &&
        record.type === 'in'
      );

      return { employee, attendance };
    });
  }

  // Statistics methods
  async getDepartmentAttendanceStats(date: Date): Promise<{ departmentId: number; departmentName: string; presentPercentage: number }[]> {
    // Create start and end of the given date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const stats = await db.execute(sql`
      WITH department_employee_counts AS (
        SELECT 
          d.id AS department_id,
          d.name AS department_name,
          COUNT(e.id) AS total_employees
        FROM ${departments} d
        LEFT JOIN ${employees} e ON d.id = e.department_id
        GROUP BY d.id, d.name
      ),
      department_present_counts AS (
        SELECT 
          d.id AS department_id,
          COUNT(DISTINCT a.employee_id) AS present_employees
        FROM ${departments} d
        LEFT JOIN ${employees} e ON d.id = e.department_id
        LEFT JOIN ${attendanceRecords} a ON e.id = a.employee_id
        WHERE a.date >= ${startOfDay} AND a.date < ${endOfDay} AND a.status = 'present'
        GROUP BY d.id
      )
      SELECT 
        c.department_id,
        c.department_name,
        c.total_employees,
        COALESCE(p.present_employees, 0) AS present_employees,
        CASE 
          WHEN c.total_employees = 0 THEN 0
          ELSE ROUND((COALESCE(p.present_employees, 0)::FLOAT / c.total_employees) * 100)
        END AS present_percentage
      FROM department_employee_counts c
      LEFT JOIN department_present_counts p ON c.department_id = p.department_id
      ORDER BY present_percentage DESC
    `);

    return stats.rows.map(row => ({
      departmentId: row.department_id,
      departmentName: row.department_name,
      presentPercentage: row.present_percentage
    }));
  }

  async getDailyAttendanceSummary(date: Date): Promise<{ present: number; absent: number; late: number; total: number }> {
    // Create start and end of the given date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get total employees
    const [totalResult] = await db
      .select({ count: count() })
      .from(employees);

    const total = totalResult?.count || 0;

    // Get present employees
    const [presentResult] = await db
      .select({ count: count() })
      .from(attendanceRecords)
      .where(
        and(
          gte(attendanceRecords.date, startOfDay),
          lt(attendanceRecords.date, endOfDay),
          eq(attendanceRecords.status, 'present'),
          eq(attendanceRecords.type, 'in')
        )
      );

    const present = presentResult?.count || 0;

    // Get late employees
    const [lateResult] = await db
      .select({ count: count() })
      .from(attendanceRecords)
      .where(
        and(
          gte(attendanceRecords.date, startOfDay),
          lt(attendanceRecords.date, endOfDay),
          eq(attendanceRecords.status, 'late'),
          eq(attendanceRecords.type, 'in')
        )
      );

    const late = lateResult?.count || 0;

    // Calculate absent (total - present - late)
    const absent = total - present - late;

    return {
      present,
      absent: absent < 0 ? 0 : absent, // Ensure we don't get negative absences
      late,
      total
    };
  }

  async getWeeklyAttendance(startDate: Date, endDate: Date): Promise<{ date: string; present: number; absent: number; late: number }[]> {
    const results = await db.execute(sql`
      WITH date_range AS (
        SELECT generate_series(
          ${startDate}::date, 
          ${endDate}::date, 
          '1 day'::interval
        )::date AS day
      ),
      daily_stats AS (
        SELECT 
          date_trunc('day', a.date)::date AS day,
          a.status,
          COUNT(DISTINCT a.employee_id) AS count
        FROM ${attendanceRecords} a
        WHERE a.date >= ${startDate} AND a.date <= ${endDate} AND a.type = 'in'
        GROUP BY date_trunc('day', a.date)::date, a.status
      ),
      employee_count AS (
        SELECT COUNT(*) AS total FROM ${employees}
      )
      SELECT 
        dr.day::text AS date,
        COALESCE(SUM(CASE WHEN ds.status = 'present' THEN ds.count ELSE 0 END), 0) AS present,
        COALESCE(SUM(CASE WHEN ds.status = 'late' THEN ds.count ELSE 0 END), 0) AS late,
        (SELECT total FROM employee_count) - 
        COALESCE(SUM(CASE WHEN ds.status IN ('present', 'late') THEN ds.count ELSE 0 END), 0) AS absent
      FROM date_range dr
      LEFT JOIN daily_stats ds ON dr.day = ds.day
      GROUP BY dr.day
      ORDER BY dr.day
    `);

    return results.rows.map(row => ({
      date: row.date as string,
      present: Number(row.present) || 0,
      absent: Number(row.absent) || 0,
      late: Number(row.late) || 0
    }));
  }

  // Leave Request Methods
  async getLeaveRequest(id: number): Promise<LeaveRequest | undefined> {
    const [leaveRequest] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id));
    return leaveRequest;
  }

  async getEmployeeLeaveRequests(employeeId: number, status?: string): Promise<LeaveRequest[]> {
    let query = db.select().from(leaveRequests).where(eq(leaveRequests.employeeId, employeeId));

    if (status) {
      query = query.where(eq(leaveRequests.status, status as any));
    }

    return await query.orderBy(desc(leaveRequests.createdAt));
  }

  async getAllLeaveRequests(page: number = 1, limit: number = 10, status?: string): Promise<LeaveRequest[]> {
    const offset = (page - 1) * limit;

    // Lấy tất cả leave requests và lọc trong memory thay vì SQL
    let allLeaveRequests = await db.select().from(leaveRequests);

    // Lọc theo status nếu có
    if (status) {
      allLeaveRequests = allLeaveRequests.filter(req => req.status === status);
    }

    // Sắp xếp theo thứ tự tạo mới nhất
    allLeaveRequests.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Phân trang
    return allLeaveRequests.slice(offset, offset + limit);
  }

  async createLeaveRequest(leaveRequest: InsertLeaveRequest): Promise<LeaveRequest> {
    const [newLeaveRequest] = await db
      .insert(leaveRequests)
      .values({
        ...leaveRequest,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return newLeaveRequest;
  }

  async updateLeaveRequest(id: number, leaveRequest: Partial<LeaveRequest>): Promise<LeaveRequest | undefined> {
    const [updatedLeaveRequest] = await db
      .update(leaveRequests)
      .set({ ...leaveRequest, updatedAt: new Date() })
      .where(eq(leaveRequests.id, id))
      .returning();
    return updatedLeaveRequest;
  }

  async deleteLeaveRequest(id: number): Promise<boolean> {
    await db
      .delete(leaveRequests)
      .where(eq(leaveRequests.id, id));
    return true;
  }

  // Salary Methods
  async getSalaryRecord(id: number): Promise<SalaryRecord | undefined> {
    const [salaryRecord] = await db.select().from(salaryRecords).where(eq(salaryRecords.id, id));
    return salaryRecord;
  }

  async getEmployeeSalaryRecords(employeeId: number, year?: number): Promise<SalaryRecord[]> {
    let query = db.select().from(salaryRecords).where(eq(salaryRecords.employeeId, employeeId));

    if (year) {
      query = query.where(eq(salaryRecords.year, year));
    }

    return await query.orderBy(desc(salaryRecords.year), desc(salaryRecords.month));
  }

  async getAllSalaryRecords(page: number = 1, limit: number = 10, year?: number, month?: number): Promise<SalaryRecord[]> {
    const offset = (page - 1) * limit;

    // Lấy tất cả salary records và lọc trong memory
    let allSalaryRecords = await db.select().from(salaryRecords);

    // Lọc theo năm nếu có
    if (year) {
      allSalaryRecords = allSalaryRecords.filter(record => record.year === year);
    }

    // Lọc theo tháng nếu có
    if (month) {
      allSalaryRecords = allSalaryRecords.filter(record => record.month === month);
    }

    // Sắp xếp theo năm, tháng và thời gian tạo (giảm dần)
    allSalaryRecords.sort((a, b) => {
      // So sánh năm trước
      if (b.year !== a.year) {
        return b.year - a.year;
      }
      // Nếu cùng năm, so sánh tháng
      if (b.month !== a.month) {
        return b.month - a.month;
      }
      // Nếu cùng năm và tháng, so sánh thời gian tạo
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Phân trang
    return allSalaryRecords.slice(offset, offset + limit);
  }

  async createSalaryRecord(salaryRecord: InsertSalaryRecord): Promise<SalaryRecord> {
    // Calculate total salary
    const totalSalaryValue =
      Number(salaryRecord.basicSalary) +
      Number(salaryRecord.bonus || 0) -
      Number(salaryRecord.deduction || 0);

    // Tạo một bản sao của dữ liệu để tránh mutate object gốc
    const recordToInsert = {
      ...salaryRecord,
      // Chuyển totalSalary thành string để phù hợp với kiểu dữ liệu yêu cầu
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const [newSalaryRecord] = await db
      .insert(salaryRecords)
      .values(recordToInsert)
      .returning();

    // Cập nhật thủ công totalSalary
    const [updatedRecord] = await db
      .update(salaryRecords)
      .set({ totalSalary: String(totalSalaryValue) })
      .where(eq(salaryRecords.id, newSalaryRecord.id))
      .returning();

    return updatedRecord;
  }

  async updateSalaryRecord(id: number, salaryRecord: Partial<SalaryRecord>): Promise<SalaryRecord | undefined> {
    // Tính toán totalSalary nếu cần
    let totalSalaryValue: string | undefined = undefined;

    if (salaryRecord.basicSalary !== undefined ||
      salaryRecord.bonus !== undefined ||
      salaryRecord.deduction !== undefined) {

      // Lấy bản ghi hiện tại
      const currentRecord = await this.getSalaryRecord(id);
      if (!currentRecord) {
        return undefined;
      }

      // Tính toán giá trị mới
      const newTotalSalary =
        Number(salaryRecord.basicSalary || currentRecord.basicSalary) +
        Number(salaryRecord.bonus || currentRecord.bonus) -
        Number(salaryRecord.deduction || currentRecord.deduction);

      totalSalaryValue = String(newTotalSalary);
    }

    // Chuẩn bị dữ liệu cập nhật
    const updateData = {
      ...salaryRecord,
      updatedAt: new Date()
    };

    // Thực hiện cập nhật
    const [updatedSalaryRecord] = await db
      .update(salaryRecords)
      .set(updateData)
      .where(eq(salaryRecords.id, id))
      .returning();

    // Cập nhật totalSalary nếu cần
    if (totalSalaryValue !== undefined) {
      const [recordWithTotalSalary] = await db
        .update(salaryRecords)
        .set({ totalSalary: totalSalaryValue })
        .where(eq(salaryRecords.id, id))
        .returning();

      return recordWithTotalSalary;
    }

    return updatedSalaryRecord;
  }

  async deleteSalaryRecord(id: number): Promise<boolean> {
    await db
      .delete(salaryRecords)
      .where(eq(salaryRecords.id, id));
    return true;
  }

  async getSalaryStats(year: number): Promise<{ month: number; totalSalary: number; totalEmployees: number }[]> {
    const results = await db.execute(sql`
      WITH month_range AS (
        SELECT generate_series(1, 12) AS month
      )
      SELECT 
        mr.month,
        COALESCE(SUM(sr.total_salary), 0) AS total_salary,
        COUNT(DISTINCT sr.employee_id) AS total_employees
      FROM month_range mr
      LEFT JOIN ${salaryRecords} sr ON mr.month = sr.month AND sr.year = ${year}
      GROUP BY mr.month
      ORDER BY mr.month
    `);

    return results.rows.map(row => ({
      month: Number(row.month),
      totalSalary: Number(row.total_salary) || 0,
      totalEmployees: Number(row.total_employees) || 0
    }));
  }
}

export const storage = new DatabaseStorage();
