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
  getAllEmployees(page?: number, limit?: number): Promise<Employee[]>;
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
  getAllLeaveRequests(page?: number, limit?: number, status?: string): Promise<LeaveRequest[]>;
  createLeaveRequest(leaveRequest: InsertLeaveRequest): Promise<LeaveRequest>;
  updateLeaveRequest(id: number, leaveRequest: Partial<LeaveRequest>): Promise<LeaveRequest | undefined>;
  deleteLeaveRequest(id: number): Promise<boolean>;
  
  // Salary methods
  getSalaryRecord(id: number): Promise<SalaryRecord | undefined>;
  getEmployeeSalaryRecords(employeeId: number, year?: number): Promise<SalaryRecord[]>;
  getAllSalaryRecords(page?: number, limit?: number, year?: number, month?: number): Promise<SalaryRecord[]>;
  createSalaryRecord(salaryRecord: InsertSalaryRecord): Promise<SalaryRecord>;
  updateSalaryRecord(id: number, salaryRecord: Partial<SalaryRecord>): Promise<SalaryRecord | undefined>;
  deleteSalaryRecord(id: number): Promise<boolean>;
  getSalaryStats(year: number): Promise<{ month: number; totalSalary: number; totalEmployees: number }[]>;
  
  // Statistics methods
  getDepartmentAttendanceStats(date: Date): Promise<{ departmentId: number; departmentName: string; presentPercentage: number }[]>;
  getDailyAttendanceSummary(date: Date): Promise<{ present: number; absent: number; late: number; total: number }>;
  getWeeklyAttendance(startDate: Date, endDate: Date): Promise<{ date: string; present: number; absent: number; late: number }[]>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

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
    const [department] = await db.select().from(departments).where(eq(departments.id, id));
    return department;
  }

  async getAllDepartments(): Promise<Department[]> {
    return await db.select().from(departments);
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

  async getAllEmployees(page: number = 1, limit: number = 10): Promise<Employee[]> {
    const offset = (page - 1) * limit;
    return await db
      .select()
      .from(employees)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(employees.createdAt));
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [newEmployee] = await db
      .insert(employees)
      .values(employee)
      .returning();
    return newEmployee;
  }

  async updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const [updatedEmployee] = await db
      .update(employees)
      .set({ ...employee, updatedAt: new Date() })
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
    let query = db.select().from(attendanceRecords).where(eq(attendanceRecords.employeeId, employeeId));
    
    if (startDate) {
      query = query.where(gte(attendanceRecords.date, startDate));
    }
    
    if (endDate) {
      query = query.where(lt(attendanceRecords.date, endDate));
    }
    
    return await query.orderBy(desc(attendanceRecords.date));
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
    let query = db.select().from(leaveRequests);
    
    if (status) {
      query = query.where(eq(leaveRequests.status, status as any));
    }
    
    return await query
      .limit(limit)
      .offset(offset)
      .orderBy(desc(leaveRequests.createdAt));
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
    let query = db.select().from(salaryRecords);
    
    if (year) {
      query = query.where(eq(salaryRecords.year, year));
    }
    
    if (month) {
      query = query.where(eq(salaryRecords.month, month));
    }
    
    return await query
      .limit(limit)
      .offset(offset)
      .orderBy(desc(salaryRecords.year), desc(salaryRecords.month), desc(salaryRecords.createdAt));
  }

  async createSalaryRecord(salaryRecord: InsertSalaryRecord): Promise<SalaryRecord> {
    // Calculate total salary
    const totalSalary = 
      Number(salaryRecord.basicSalary) + 
      Number(salaryRecord.bonus || 0) - 
      Number(salaryRecord.deduction || 0);
    
    const [newSalaryRecord] = await db
      .insert(salaryRecords)
      .values({
        ...salaryRecord,
        totalSalary,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return newSalaryRecord;
  }

  async updateSalaryRecord(id: number, salaryRecord: Partial<SalaryRecord>): Promise<SalaryRecord | undefined> {
    // If salary components are changed, recalculate total
    let totalSalary = undefined;
    
    if (salaryRecord.basicSalary !== undefined || 
        salaryRecord.bonus !== undefined || 
        salaryRecord.deduction !== undefined) {
      
      // Get current record
      const currentRecord = await this.getSalaryRecord(id);
      if (!currentRecord) {
        return undefined;
      }
      
      // Calculate new total
      totalSalary = 
        Number(salaryRecord.basicSalary || currentRecord.basicSalary) + 
        Number(salaryRecord.bonus || currentRecord.bonus) - 
        Number(salaryRecord.deduction || currentRecord.deduction);
    }
    
    const [updatedSalaryRecord] = await db
      .update(salaryRecords)
      .set({ 
        ...salaryRecord, 
        ...(totalSalary !== undefined ? { totalSalary } : {}),
        updatedAt: new Date() 
      })
      .where(eq(salaryRecords.id, id))
      .returning();
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
