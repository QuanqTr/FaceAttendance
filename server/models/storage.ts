import {
    type User,
    type InsertUser,
    type InsertDepartment,
    type Employee,
    type InsertEmployee,
    type LeaveRequest,
    type InsertLeaveRequest,
    type TimeLog,
    type InsertTimeLog,
    type AttendanceSummary,
    type InsertAttendanceSummary,
    users,
    departments,
    employees,
    leaveRequests,
    timeLogs,
    cachedWorkHours,
    workHours,
    attendanceSummary,
    notifications
} from "@shared/schema";
import { db } from "../db.js";
import { eq, and, desc, gte, lt, sql, count, isNotNull, asc, lte } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "../db.js";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
    // User methods
    getUser(id: number): Promise<User | undefined>;
    getUserByUsername(username: string): Promise<User | undefined>;
    getUserByEmployeeId(employeeId: number): Promise<User | undefined>;
    createUser(user: InsertUser): Promise<User>;
    updateUserPassword(userId: number, hashedPassword: string): Promise<void>;
    getAllUsers(page?: number, limit?: number): Promise<{ users: User[], total: number }>;
    getAllManagers(): Promise<User[]>;

    // Department methods
    getDepartment(id: number): Promise<any>;
    getAllDepartments(): Promise<any[]>;
    createDepartment(department: InsertDepartment): Promise<any>;
    updateDepartment(id: number, department: Partial<InsertDepartment>): Promise<any | undefined>;
    deleteDepartment(id: number): Promise<boolean>;

    // Employee methods
    getEmployee(id: number): Promise<Employee | undefined>;
    getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined>;
    getAllEmployees(page: number, limit: number, filters?: object): Promise<{ employees: Employee[], total: number }>;
    getEmployeesWithFaceDescriptor(): Promise<Employee[]>;
    createEmployee(employee: InsertEmployee): Promise<Employee>;
    updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee | undefined>;
    deleteEmployee(id: number): Promise<boolean>;

    // Time Log methods
    createTimeLog(timeLog: InsertTimeLog): Promise<TimeLog>;
    getEmployeeTimeLogs(employeeId: number, date: Date): Promise<TimeLog[]>;
    getEmployeeWorkHours(employeeId: number, date: Date): Promise<{
        regularHours: number;
        overtimeHours: number;
        regularHoursFormatted: string;
        overtimeHoursFormatted: string;
        totalHoursFormatted: string;
        checkinTime?: Date;
        checkoutTime?: Date;
        status?: string;
    }>;
    getDailyWorkHours(date: Date): Promise<{
        employeeId: number;
        employeeName: string;
        regularHours: number;
        overtimeHours: number;
        checkinTime?: Date;
        checkoutTime?: Date;
        status?: string;
    }[]>;

    // Leave Request methods
    getLeaveRequest(id: number): Promise<LeaveRequest | undefined>;
    getEmployeeLeaveRequests(employeeId: number, status?: string): Promise<LeaveRequest[]>;
    getAllLeaveRequests(page: number, limit: number, status?: string): Promise<LeaveRequest[]>;
    createLeaveRequest(leaveRequest: InsertLeaveRequest): Promise<LeaveRequest>;
    updateLeaveRequest(id: number, leaveRequest: Partial<LeaveRequest>): Promise<LeaveRequest | undefined>;
    deleteLeaveRequest(id: number): Promise<boolean>;

    // Statistics methods
    getDepartmentAttendanceStats(date: Date): Promise<{ departmentId: number; departmentName: string; presentPercentage: number }[]>;
    getDailyAttendanceSummary(date: Date): Promise<{ present: number; absent: number; late: number; total: number }>;
    getWeeklyAttendance(startDate: Date, endDate: Date): Promise<{ date: string; present: number; absent: number; late: number }[]>;

    // Attendance Summary methods
    createAttendanceSummary(summary: InsertAttendanceSummary): Promise<AttendanceSummary>;
    getAttendanceSummary(employeeId: number, month: number, year: number): Promise<AttendanceSummary | undefined>;
    getEmployeeAttendanceSummaries(employeeId: number, year?: number): Promise<AttendanceSummary[]>;
    updateAttendanceSummary(id: number, summary: Partial<AttendanceSummary>): Promise<AttendanceSummary | undefined>;
    calculateMonthlyAttendanceSummary(employeeId: number, month: number, year: number): Promise<void>;

    // Session store
    sessionStore: any;

    // Cache methods
    getCachedWorkHours(employeeId: number, date: Date): Promise<{
        regularHours: number;
        overtimeHours: number;
        regularHoursFormatted: string;
        overtimeHoursFormatted: string;
        totalHoursFormatted: string;
        checkinTime?: Date;
        checkoutTime?: Date;
    } | null>;
    cacheWorkHours(
        employeeId: number,
        date: Date,
        data: {
            regularHours: number;
            overtimeHours: number;
            regularHoursFormatted: string;
            overtimeHoursFormatted: string;
            totalHoursFormatted: string;
            checkinTime?: Date;
            checkoutTime?: Date;
        }
    ): Promise<void>;

    // New methods
    getAllLeaveRequestsWithEmployeeDetails(page: number, limit: number, status?: string): Promise<LeaveRequest[]>;
    getEmployeeByUserId(userId: number): Promise<Employee | undefined>;
    getEmployeeLeaveRequestsByYear(employeeId: number, year: number, status?: string): Promise<LeaveRequest[]>;
}

export interface Department {
    id: number;
    name: string;
    description: string | null;
    managerId: number | null;
    managerName?: string | null;
    createdAt: Date;
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

    async getUserByEmployeeId(employeeId: number): Promise<User | undefined> {
        const [user] = await db.select().from(users).where(eq(users.employeeId, employeeId));
        return user;
    }

    async createUser(insertUser: InsertUser): Promise<User> {
        const [user] = await db
            .insert(users)
            .values(insertUser)
            .returning();
        return user;
    }

    async updateUserPassword(userId: number, hashedPassword: string): Promise<void> {
        await db
            .update(users)
            .set({ password: hashedPassword })
            .where(eq(users.id, userId));
    }

    async getAllUsers(page: number = 1, limit: number = 10): Promise<{ users: User[], total: number }> {
        try {
            const offset = (page - 1) * limit;

            // Get total count
            const totalResult = await db.select({ count: sql<number>`count(*)` }).from(users);
            const total = totalResult[0]?.count || 0;

            // Get paginated users without password
            const allUsers = await db.select({
                id: users.id,
                username: users.username,
                fullName: users.fullName,
                role: users.role,
                employeeId: users.employeeId,
                createdAt: users.createdAt
            }).from(users).limit(limit).offset(offset);

            return { users: allUsers as User[], total };
        } catch (error) {
            console.error('Error fetching all users:', error);
            return { users: [], total: 0 };
        }
    }

    async getAllManagers(): Promise<User[]> {
        try {
            // Join users with employees to get complete manager information
            const managers = await db.select({
                id: users.id,
                username: users.username,
                fullName: users.fullName,
                role: users.role,
                employeeId: users.employeeId,
                createdAt: users.createdAt,
                // Add employee details - named 'employeeData' to match frontend
                employeeData: {
                    id: employees.id,
                    firstName: employees.firstName,
                    lastName: employees.lastName,
                    email: employees.email,
                    phone: employees.phone,
                    departmentId: employees.departmentId,
                    position: employees.position,
                    status: employees.status
                }
            })
                .from(users)
                .leftJoin(employees, eq(users.employeeId, employees.id))
                .where(eq(users.role, 'manager'));

            return managers as any[];
        } catch (error) {
            console.error('Error fetching managers:', error);
            return [];
        }
    }

    // Department methods
    async getAllDepartments(): Promise<Department[]> {
        try {
            console.log("Getting all departments with manager names...");

            // Use direct PostgreSQL query to properly join departments -> employees -> users
            const { Pool } = await import('pg');
            const pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                connectionTimeoutMillis: 5000
            });

            const result = await pool.query(`
                SELECT 
                    d.id,
                    d.name,
                    d.description,
                    d.manager_id,
                    e.first_name || ' ' || e.last_name as manager_name,
                    d.created_at,
                    COUNT(emp.id) as employee_count
                FROM departments d
                LEFT JOIN employees e ON d.manager_id = e.id
                LEFT JOIN users u ON u.employee_id = e.id
                LEFT JOIN employees emp ON emp.department_id = d.id
                GROUP BY d.id, d.name, d.description, d.manager_id, e.first_name, e.last_name, d.created_at
                ORDER BY d.name
            `);

            const departments = result.rows.map(row => ({
                id: row.id,
                name: row.name,
                description: row.description,
                managerId: row.manager_id,
                managerName: row.manager_name,
                employeeCount: parseInt(row.employee_count) || 0,
                createdAt: new Date(row.created_at)
            }));

            console.log(`Found ${departments.length} departments with manager info`);
            await pool.end();
            return departments;
        } catch (error) {
            console.error("Error in getAllDepartments:", error);
            return [];
        }
    }

    async getDepartment(id: number): Promise<Department | undefined> {
        const [department] = await db
            .select({
                id: departments.id,
                name: departments.name,
                description: departments.description,
                managerId: departments.managerId,
                managerName: users.fullName,
                createdAt: departments.createdAt
            })
            .from(departments)
            .leftJoin(users, eq(departments.managerId, users.id))
            .where(eq(departments.id, id));

        if (!department) return undefined;

        // Ensure consistent manager information
        return {
            ...department,
            managerId: department.managerId || null,
            managerName: department.managerName || null
        };
    }

    async createDepartment(department: InsertDepartment): Promise<Department> {
        try {
            console.log(`Creating department: ${JSON.stringify(department)}`);

            // Sử dụng pool PostgreSQL trực tiếp để tránh lỗi type
            // Import modules thay vì sử dụng require
            const { Pool } = await import('pg');
            const pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                connectionTimeoutMillis: 5000
            });

            const result = await pool.query(
                'INSERT INTO departments (name, description, manager_id, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id, name, description, manager_id, created_at',
                [department.name, department.description || null, department.managerId || null]
            );

            if (!result.rows || result.rows.length === 0) {
                throw new Error("Không thể tạo phòng ban");
            }

            // Map kết quả trả về từ DB sang đúng kiểu Department
            const newDepartment: Department = {
                id: Number(result.rows[0].id),
                name: result.rows[0].name,
                description: result.rows[0].description,
                managerId: result.rows[0].manager_id,
                createdAt: new Date(result.rows[0].created_at)
            };

            console.log(`Department created: ${JSON.stringify(newDepartment)}`);
            return newDepartment;
        } catch (error) {
            console.error("Error creating department:", error);
            throw error;
        }
    }

    async updateDepartment(id: number, department: Partial<InsertDepartment>): Promise<Department | undefined> {
        try {
            const [updatedDepartment] = await db
                .update(departments)
                .set({
                    ...department,
                    managerId: department.managerId || null // Ensure null for empty manager
                })
                .where(eq(departments.id, id))
                .returning();

            if (!updatedDepartment) {
                return undefined;
            }

            // Fetch manager information if exists
            if (updatedDepartment.managerId) {
                const [manager] = await db
                    .select({
                        fullName: users.fullName
                    })
                    .from(users)
                    .where(eq(users.id, updatedDepartment.managerId));

                return {
                    ...updatedDepartment,
                    managerName: manager?.fullName || null
                };
            }

            return {
                ...updatedDepartment,
                managerName: null
            };
        } catch (error) {
            console.error("Error updating department:", error);
            return undefined;
        }
    }

    async deleteDepartment(id: number): Promise<boolean> {
        try {
            console.log(`Deleting department: ${id}`);

            // Sử dụng pool PostgreSQL trực tiếp để tránh lỗi type
            const { Pool } = await import('pg');
            const pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                connectionTimeoutMillis: 5000
            });

            const result = await pool.query('DELETE FROM departments WHERE id = $1 RETURNING id', [id]);

            const isDeleted = result.rows && result.rows.length > 0;
            console.log(`Department deletion result: ${isDeleted ? 'success' : 'not found'}`);

            return isDeleted;
        } catch (error) {
            console.error(`Error deleting department ${id}:`, error);
            return false;
        }
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

    async getEmployeesWithFaceDescriptor(): Promise<Employee[]> {
        try {
            // Lấy tất cả nhân viên có trường faceDescriptor không null và không rỗng
            const allEmployees = await db.select().from(employees);

            // Lọc trong memory thay vì SQL để tránh các vấn đề với điều kiện phức tạp
            const employeesWithFace = allEmployees.filter(employee =>
                employee.faceDescriptor !== null &&
                employee.faceDescriptor !== ''
            );

            console.log(`Found ${employeesWithFace.length} employees with face descriptors`);
            return employeesWithFace;
        } catch (error) {
            console.error("Error fetching employees with face descriptors:", error);
            return [];
        }
    }

    async getAllEmployees(page: number = 1, limit: number = 10, filters?: object): Promise<{ employees: (Employee & { departmentName?: string | null })[], total: number }> {
        const offset = (page - 1) * limit;

        // Ép kiểu filters để sử dụng đúng kiểu dữ liệu
        const filterOptions = filters as {
            search?: string;
            departmentId?: number;
            departmentIds?: number[]; // Support multiple departments
            status?: string;
            position?: string;
            joinDate?: Date;
            sortBy?: string;
        } || {};

        // Lấy tất cả employees với thông tin department
        const allEmployees = await db
            .select({
                id: employees.id,
                employeeId: employees.employeeId,
                firstName: employees.firstName,
                lastName: employees.lastName,
                email: employees.email,
                phone: employees.phone,
                createdAt: employees.createdAt,
                departmentId: employees.departmentId,
                position: employees.position,
                status: employees.status,
                faceDescriptor: employees.faceDescriptor,
                joinDate: employees.joinDate,
                updatedAt: employees.updatedAt,
                departmentName: departments.name,
                departmentDescription: departments.description
            })
            .from(employees)
            .leftJoin(departments, eq(employees.departmentId, departments.id));

        // Lọc nhân viên theo các tiêu chí
        let filteredEmployees = [...allEmployees];

        // Áp dụng bộ lọc search
        if (filterOptions.search) {
            const searchTerm = filterOptions.search.toLowerCase();
            filteredEmployees = filteredEmployees.filter(emp => {
                // Prioritize name matches first
                const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
                const reverseName = `${emp.lastName} ${emp.firstName}`.toLowerCase();

                // Check if search term matches full name or parts of the name
                if (
                    fullName.includes(searchTerm) ||
                    reverseName.includes(searchTerm) ||
                    emp.firstName.toLowerCase().includes(searchTerm) ||
                    emp.lastName.toLowerCase().includes(searchTerm)
                ) {
                    return true;
                }

                // Then check other fields
                return (
                    emp.email.toLowerCase().includes(searchTerm) ||
                    emp.employeeId.toLowerCase().includes(searchTerm) ||
                    (emp.position && emp.position.toLowerCase().includes(searchTerm)) ||
                    (emp.departmentName && emp.departmentName.toLowerCase().includes(searchTerm))
                );
            });
        }

        // Lọc theo multiple departments (priority over single department)
        if (filterOptions.departmentIds && filterOptions.departmentIds.length > 0) {
            filteredEmployees = filteredEmployees.filter(emp =>
                emp.departmentId && filterOptions.departmentIds!.includes(emp.departmentId)
            );
        } else if (filterOptions.departmentId) {
            // Fallback to single department filter for backward compatibility
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
                        `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)
                    );
                    break;
                case 'name_desc':
                    filteredEmployees.sort((a, b) =>
                        `${b.lastName} ${b.firstName}`.localeCompare(`${a.lastName} ${a.firstName}`)
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
        try {
            console.log(`Attempting to delete employee with ID: ${id}`);

            // Check if employee exists
            const employee = await this.getEmployee(id);
            if (!employee) {
                console.log(`Employee with ID ${id} not found`);
                return false;
            }

            console.log(`Found employee: ${employee.firstName} ${employee.lastName}`);

            await db
                .delete(employees)
                .where(eq(employees.id, id));

            console.log(`Successfully deleted employee ${id}`);
            return true;
        } catch (error) {
            console.error('Error deleting employee:', error);
            throw error;
        }
    }

    async safeDeleteEmployee(id: number): Promise<{ success: boolean; message?: string }> {
        try {
            console.log(`Safe delete: Attempting to delete employee with ID: ${id}`);

            // Check if employee exists
            const employee = await this.getEmployee(id);
            if (!employee) {
                console.log(`Employee with ID ${id} not found`);
                return { success: false, message: "Không tìm thấy nhân viên" };
            }

            console.log(`Found employee: ${employee.firstName} ${employee.lastName}`);

            try {
                // Use individual delete operations with better error handling instead of a transaction
                // This helps avoid transaction rollback issues

                // 1. Delete face descriptor to avoid reference errors
                if (employee.faceDescriptor) {
                    console.log(`Clearing face descriptor for employee ${id}`);
                    try {
                        await db.update(employees)
                            .set({ faceDescriptor: null })
                            .where(eq(employees.id, id));
                    } catch (error) {
                        console.warn(`Warning: Could not clear face descriptor: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    }
                }

                // 2. Delete time logs
                console.log(`Deleting time logs for employee ${id}`);
                try {
                    await db.delete(timeLogs).where(eq(timeLogs.employeeId, id));
                } catch (error) {
                    console.warn(`Warning: Could not delete time logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }

                // 3. Delete notifications first (least dependencies)
                console.log(`Deleting notifications for employee ${id}`);
                try {
                    await db.delete(notifications).where(eq(notifications.employeeId, id));
                } catch (error) {
                    console.warn(`Warning: Could not delete notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }

                // 4. Delete attendance summary records
                console.log(`Deleting attendance summary records for employee ${id}`);
                try {
                    await db.delete(attendanceSummary).where(eq(attendanceSummary.employeeId, id));
                } catch (error) {
                    console.warn(`Warning: Could not delete attendance summary records: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }

                // 5. Delete cached work hours
                console.log(`Deleting cached work hours for employee ${id}`);
                try {
                    await db.delete(cachedWorkHours).where(eq(cachedWorkHours.employeeId, id));
                } catch (error) {
                    console.warn(`Warning: Could not delete cached work hours: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }

                // 6. Delete work hours
                console.log(`Deleting work hours for employee ${id}`);
                try {
                    await db.delete(workHours).where(eq(workHours.employeeId, id));
                } catch (error) {
                    console.warn(`Warning: Could not delete work hours: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }

                // 7. Delete leave requests
                console.log(`Deleting leave requests for employee ${id}`);
                try {
                    await db.delete(leaveRequests).where(eq(leaveRequests.employeeId, id));
                } catch (error) {
                    console.warn(`Warning: Could not delete leave requests: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }

                // 8. Update users to remove employee association
                console.log(`Updating users with employeeId ${id} to remove association`);
                try {
                    await db.update(users).set({ employeeId: null }).where(eq(users.employeeId, id));
                } catch (error) {
                    console.warn(`Warning: Could not update users: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }

                // 9. Finally, delete the employee
                console.log(`Deleting employee ${id}`);
                await db.delete(employees).where(eq(employees.id, id));

                console.log(`Successfully deleted employee ${id} and all related records`);
                return { success: true };
            } catch (error) {
                console.error('Error in safeDeleteEmployee operations:', error);
                return {
                    success: false,
                    message: `Không thể xóa nhân viên: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`
                };
            }
        } catch (error) {
            console.error('Error in safeDeleteEmployee:', error);
            return {
                success: false,
                message: `Lỗi xóa nhân viên: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`
            };
        }
    }

    // Time Log methods
    async createTimeLog(timeLog: InsertTimeLog): Promise<TimeLog> {
        const [record] = await db
            .insert(timeLogs)
            .values({
                employeeId: timeLog.employeeId,
                type: timeLog.type,
                logTime: timeLog.logTime || new Date(),
                source: timeLog.source || 'face'
            })
            .returning();
        return record;
    }

    async getEmployeeTimeLogs(employeeId: number, date: Date): Promise<TimeLog[]> {
        // Create start and end of the given date
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        console.log(`[TimeLogs] Tìm logs cho nhân viên ${employeeId} ngày ${date.toISOString()}`);
        console.log(`[TimeLogs] Khoảng thời gian: ${startOfDay.toISOString()} đến ${endOfDay.toISOString()}`);

        try {
            const records = await db
                .select()
                .from(timeLogs)
                .where(
                    and(
                        eq(timeLogs.employeeId, employeeId),
                        gte(timeLogs.logTime, startOfDay),
                        lte(timeLogs.logTime, endOfDay)
                    )
                )
                .orderBy(asc(timeLogs.logTime));

            console.log(`[TimeLogs] Tìm thấy ${records.length} bản ghi`);

            // Log all records for debugging
            records.forEach((record, index) => {
                console.log(`[TimeLogs] Bản ghi ${index + 1}: ${record.type} lúc ${record.logTime.toISOString()} (${record.logTime.getHours()}:${record.logTime.getMinutes()})`);
            });

            return records;
        } catch (error) {
            console.error(`[TimeLogs] Lỗi khi truy vấn dữ liệu time logs: ${error}`);
            return [];
        }
    }

    async getEmployeeWorkHours(employeeId: number, date: Date): Promise<{
        regularHours: number;
        overtimeHours: number;
        regularHoursFormatted: string;
        overtimeHoursFormatted: string;
        totalHoursFormatted: string;
        checkinTime?: Date;
        checkoutTime?: Date;
        status?: string;
    }> {
        console.log(`[WorkHours] Lấy giờ làm việc cho nhân viên ${employeeId} vào ngày ${date.toISOString().split('T')[0]}`);

        try {
            // Lấy dữ liệu trực tiếp từ bảng work_hours
            const formattedDate = new Date(date);
            formattedDate.setHours(0, 0, 0, 0);

            const workHoursData = await db
                .select()
                .from(workHours)
                .where(
                    and(
                        eq(workHours.employeeId, employeeId),
                        eq(workHours.workDate, formattedDate.toISOString().split('T')[0])
                    )
                )
                .limit(1);

            if (workHoursData.length === 0) {
                // Kiểm tra ngày quá khứ để thiết lập trạng thái absent
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isDateInPast = date < today;

                console.log(`[WorkHours] Không tìm thấy dữ liệu, trả về giờ làm bằng 0`);
                return {
                    regularHours: 0,
                    overtimeHours: 0,
                    regularHoursFormatted: "0:00",
                    overtimeHoursFormatted: "0:00",
                    totalHoursFormatted: "0:00",
                    status: isDateInPast ? 'absent' : undefined
                };
            }

            const record = workHoursData[0];

            // Format giờ làm thành "hours:minutes"
            const formatHoursMinutes = (decimalHours: number): string => {
                const hours = Math.floor(decimalHours);
                const minutes = Math.round((decimalHours - hours) * 60);
                return `${hours}:${minutes.toString().padStart(2, '0')}`;
            };

            const regularHours = parseFloat((record.regularHours || "0").toString());
            const overtimeHours = parseFloat((record.otHours || "0").toString());
            const regularHoursFormatted = formatHoursMinutes(regularHours);
            const overtimeHoursFormatted = formatHoursMinutes(overtimeHours);
            const totalHoursFormatted = formatHoursMinutes(regularHours + overtimeHours);

            console.log(`[WorkHours] Đã tìm thấy dữ liệu: Regular=${regularHours}, Overtime=${overtimeHours}, Status=${record.status}`);

            return {
                regularHours,
                overtimeHours,
                regularHoursFormatted,
                overtimeHoursFormatted,
                totalHoursFormatted,
                checkinTime: record.firstCheckin || undefined,
                checkoutTime: record.lastCheckout || undefined,
                status: record.status || undefined
            };
        } catch (error) {
            console.error(`[WorkHours] Lỗi khi lấy giờ làm việc: ${error}`);

            // Kiểm tra ngày quá khứ để thiết lập trạng thái absent
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isDateInPast = date < today;

            return {
                regularHours: 0,
                overtimeHours: 0,
                regularHoursFormatted: "0:00",
                overtimeHoursFormatted: "0:00",
                totalHoursFormatted: "0:00",
                status: isDateInPast ? 'absent' : 'error'
            };
        }
    }

    async getDailyWorkHours(date: Date): Promise<{
        employeeId: number;
        employeeName: string;
        regularHours: number;
        overtimeHours: number;
        checkinTime?: Date;
        checkoutTime?: Date;
        status?: string;
    }[]> {
        try {
            const formattedDate = new Date(date);
            formattedDate.setHours(0, 0, 0, 0);

            console.log(`[WorkHours] Lấy giờ làm việc hàng ngày cho ngày ${formattedDate.toISOString().split('T')[0]}`);

            // Lấy danh sách tất cả nhân viên
            const allEmployees = await db.select().from(employees);

            // Lấy dữ liệu từ bảng work_hours cho ngày được chỉ định
            const workHoursData = await db
                .select()
                .from(workHours)
                .where(eq(workHours.workDate, formattedDate.toISOString().split('T')[0]));

            // Kiểm tra ngày quá khứ để thiết lập trạng thái absent
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isDateInPast = date < today;

            // Tạo kết quả cho tất cả nhân viên
            return allEmployees.map(employee => {
                // Tìm dữ liệu giờ làm của nhân viên nếu có
                const employeeHours = workHoursData.find(wh => wh.employeeId === employee.id);

                if (employeeHours) {
                    // Nếu nhân viên có dữ liệu trong bảng work_hours
                    return {
                        employeeId: employee.id,
                        employeeName: `${employee.firstName} ${employee.lastName}`,
                        regularHours: parseFloat((employeeHours.regularHours || "0").toString()),
                        overtimeHours: parseFloat((employeeHours.otHours || "0").toString()),
                        checkinTime: employeeHours.firstCheckin || undefined,
                        checkoutTime: employeeHours.lastCheckout || undefined,
                        status: employeeHours.status || undefined
                    };
                } else {
                    // Nếu nhân viên không có dữ liệu
                    return {
                        employeeId: employee.id,
                        employeeName: `${employee.firstName} ${employee.lastName}`,
                        regularHours: 0,
                        overtimeHours: 0,
                        // Thiết lập trạng thái 'absent' cho ngày trong quá khứ
                        status: isDateInPast ? 'absent' : undefined
                    };
                }
            });
        } catch (error) {
            console.error(`[WorkHours] Lỗi khi lấy dữ liệu giờ làm việc hàng ngày: ${error}`);
            return [];
        }
    }

    // Statistics methods
    async getDepartmentAttendanceStats(date: Date): Promise<{ departmentId: number; departmentName: string; presentPercentage: number }[]> {
        // Note: This method has been modified since the attendance_records table no longer exists
        // It now returns a simplified result based only on employee count per department

        const stats = await db.execute(sql`
      WITH department_employee_counts AS (
        SELECT 
          d.id AS department_id,
          d.name AS department_name,
          COUNT(e.id) AS total_employees
        FROM ${departments} d
        LEFT JOIN ${employees} e ON d.id = e.department_id
        GROUP BY d.id, d.name
      )
      SELECT 
        department_id,
        department_name,
        total_employees,
        0 AS present_percentage
      FROM department_employee_counts
      ORDER BY total_employees DESC
    `);

        return stats.rows.map(row => ({
            departmentId: row.department_id,
            departmentName: row.department_name,
            presentPercentage: 0 // Always return 0 since we can't calculate actual presence
        }));
    }

    async getDailyAttendanceSummary(date: Date): Promise<{ present: number; absent: number; late: number; total: number }> {
        // Note: This method has been modified since the attendance_records table no longer exists

        // Get total employees
        const [totalResult] = await db
            .select({ count: count() })
            .from(employees);

        const total = totalResult?.count || 0;

        // Since we can't get actual attendance data, return simplified data
        return {
            present: 0,
            absent: total, // Assume all employees are absent since we can't check attendance
            late: 0,
            total
        };
    }

    async getWeeklyAttendance(startDate: Date, endDate: Date): Promise<{ date: string; present: number; absent: number; late: number }[]> {
        // Note: This method has been modified since the attendance_records table no longer exists

        const results = await db.execute(sql`
      WITH date_range AS (
        SELECT generate_series(
          ${startDate}::date, 
          ${endDate}::date, 
          '1 day'::interval
        )::date AS day
      ),
      employee_count AS (
        SELECT COUNT(*) AS total FROM ${employees}
      )
      SELECT 
        dr.day::text AS date,
        0 AS present,
        (SELECT total FROM employee_count) AS absent,
        0 AS late
      FROM date_range dr
      ORDER BY dr.day
    `);

        return results.rows.map(row => ({
            date: row.date as string,
            present: 0, // No attendance data available
            absent: Number(row.absent) || 0,
            late: 0 // No attendance data available
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

    // Implement the methods for leave request management with employee details
    async getAllLeaveRequestsWithEmployeeDetails(page: number = 1, limit: number = 10, status?: string): Promise<LeaveRequest[]> {
        try {
            const offset = (page - 1) * limit;

            // Create a base query with join to employees table
            let query = db
                .select({
                    lr: leaveRequests,
                    e: {
                        id: employees.id,
                        firstName: employees.firstName,
                        lastName: employees.lastName,
                        departmentId: employees.departmentId,
                        position: employees.position,
                    },
                })
                .from(leaveRequests)
                .leftJoin(employees, eq(leaveRequests.employeeId, employees.id))
                .orderBy(desc(leaveRequests.createdAt))
                .limit(limit)
                .offset(offset);

            // Apply status filter if provided
            if (status && status !== 'all') {
                query = query.where(eq(leaveRequests.status, status));
            }

            const results = await query;

            // Transform results to match expected LeaveRequest type
            return results.map(row => ({
                ...row.lr,
                employee: {
                    id: row.e.id,
                    firstName: row.e.firstName,
                    lastName: row.e.lastName,
                    departmentId: row.e.departmentId,
                    position: row.e.position
                }
            }));
        } catch (error) {
            console.error('Error fetching leave requests with employee details:', error);
            return [];
        }
    }

    // Lấy nhân viên theo user ID
    async getEmployeeByUserId(userId: number): Promise<Employee | undefined> {
        try {
            const [user] = await db.select().from(users).where(eq(users.id, userId));

            if (!user || !user.employeeId) {
                return undefined;
            }

            const [employee] = await db.select().from(employees).where(eq(employees.id, user.employeeId));
            return employee;
        } catch (error) {
            console.error('Error fetching employee by user ID:', error);
            return undefined;
        }
    }

    // Lấy đơn nghỉ phép của nhân viên theo năm và trạng thái
    async getEmployeeLeaveRequestsByYear(employeeId: number, year: number, status?: string): Promise<LeaveRequest[]> {
        try {
            // Create start and end date for the specified year
            const startDate = new Date(year, 0, 1);  // January 1
            const endDate = new Date(year + 1, 0, 1); // January 1 of next year

            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];

            let query = db
                .select()
                .from(leaveRequests)
                .where(
                    and(
                        eq(leaveRequests.employeeId, employeeId),
                        gte(leaveRequests.startDate, startDateStr),
                        lt(leaveRequests.startDate, endDateStr)
                    )
                )
                .orderBy(desc(leaveRequests.startDate));

            // Add status filter if provided
            if (status) {
                query = query.where(eq(leaveRequests.status, status));
            }

            return await query;
        } catch (error) {
            console.error('Error fetching employee leave requests by year:', error);
            return [];
        }
    }

    // Cache methods
    async getCachedWorkHours(employeeId: number, date: Date): Promise<{
        regularHours: number;
        overtimeHours: number;
        regularHoursFormatted: string;
        overtimeHoursFormatted: string;
        totalHoursFormatted: string;
        checkinTime?: Date;
        checkoutTime?: Date;
    } | null> {
        console.log(`[Cache] Tìm kiếm dữ liệu giờ làm việc đã lưu cho nhân viên ${employeeId} vào ngày ${date.toISOString().split('T')[0]}`);

        // Format date to yyyy-mm-dd to match with database date column
        const formattedDate = new Date(date);
        formattedDate.setHours(0, 0, 0, 0);

        try {
            const result = await db
                .select()
                .from(cachedWorkHours)
                .where(
                    and(
                        eq(cachedWorkHours.employeeId, employeeId),
                        eq(cachedWorkHours.date, formattedDate.toISOString().split('T')[0])
                    )
                )
                .limit(1);

            if (result.length === 0) {
                console.log(`[Cache] Không tìm thấy dữ liệu cache cho nhân viên ${employeeId} vào ngày ${formattedDate.toISOString().split('T')[0]}`);
                return null;
            }

            console.log(`[Cache] Đã tìm thấy dữ liệu cache: ${JSON.stringify(result[0])}`);

            return {
                regularHours: Number(result[0].regularHours),
                overtimeHours: Number(result[0].overtimeHours),
                regularHoursFormatted: result[0].regularHoursFormatted,
                overtimeHoursFormatted: result[0].overtimeHoursFormatted,
                totalHoursFormatted: result[0].totalHoursFormatted,
                checkinTime: result[0].checkinTime ? new Date(result[0].checkinTime) : undefined,
                checkoutTime: result[0].checkoutTime ? new Date(result[0].checkoutTime) : undefined
            };
        } catch (error) {
            console.error(`[Cache] Lỗi khi truy vấn dữ liệu cache: ${error}`);
            return null;
        }
    }

    async cacheWorkHours(
        employeeId: number,
        date: Date,
        data: {
            regularHours: number;
            overtimeHours: number;
            regularHoursFormatted: string;
            overtimeHoursFormatted: string;
            totalHoursFormatted: string;
            checkinTime?: Date;
            checkoutTime?: Date;
        }
    ): Promise<void> {
        console.log(`[Cache] Lưu dữ liệu giờ làm việc cho nhân viên ${employeeId} vào ngày ${date.toISOString().split('T')[0]}`);

        // Format date to yyyy-mm-dd
        const formattedDate = new Date(date);
        formattedDate.setHours(0, 0, 0, 0);

        try {
            // Kiểm tra xem đã có dữ liệu trong cache chưa
            const existingData = await db
                .select({ id: cachedWorkHours.id })
                .from(cachedWorkHours)
                .where(
                    and(
                        eq(cachedWorkHours.employeeId, employeeId),
                        eq(cachedWorkHours.date, formattedDate.toISOString().split('T')[0])
                    )
                )
                .limit(1);

            if (existingData.length > 0) {
                // Cập nhật dữ liệu hiện có
                console.log(`[Cache] Cập nhật dữ liệu cache cho nhân viên ${employeeId} vào ngày ${formattedDate.toISOString().split('T')[0]}`);

                await db
                    .update(cachedWorkHours)
                    .set({
                        regularHours: data.regularHours,
                        overtimeHours: data.overtimeHours,
                        regularHoursFormatted: data.regularHoursFormatted,
                        overtimeHoursFormatted: data.overtimeHoursFormatted,
                        totalHoursFormatted: data.totalHoursFormatted,
                        checkinTime: data.checkinTime,
                        checkoutTime: data.checkoutTime,
                        updatedAt: new Date()
                    })
                    .where(eq(cachedWorkHours.id, existingData[0].id));
            } else {
                // Thêm dữ liệu mới
                console.log(`[Cache] Thêm dữ liệu cache mới cho nhân viên ${employeeId} vào ngày ${formattedDate.toISOString().split('T')[0]}`);

                await db.insert(cachedWorkHours).values({
                    employeeId,
                    date: formattedDate.toISOString().split('T')[0],
                    regularHours: data.regularHours.toString(),
                    overtimeHours: data.overtimeHours.toString(),
                    regularHoursFormatted: data.regularHoursFormatted,
                    overtimeHoursFormatted: data.overtimeHoursFormatted,
                    totalHoursFormatted: data.totalHoursFormatted,
                    checkinTime: data.checkinTime,
                    checkoutTime: data.checkoutTime,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }

            console.log(`[Cache] Đã lưu dữ liệu cache thành công`);
        } catch (error) {
            console.error(`[Cache] Lỗi khi lưu dữ liệu cache: ${error}`);
            throw error;
        }
    }

    // Attendance Summary methods
    async createAttendanceSummary(summary: InsertAttendanceSummary): Promise<AttendanceSummary> {
        const [newSummary] = await db
            .insert(attendanceSummary)
            .values(summary)
            .returning();
        return newSummary;
    }

    async getAttendanceSummary(employeeId: number, month: number, year: number): Promise<AttendanceSummary | undefined> {
        const [summary] = await db
            .select()
            .from(attendanceSummary)
            .where(
                and(
                    eq(attendanceSummary.employeeId, employeeId),
                    eq(attendanceSummary.month, month),
                    eq(attendanceSummary.year, year)
                )
            )
            .limit(1);
        return summary;
    }

    async getEmployeeAttendanceSummaries(employeeId: number, year?: number): Promise<AttendanceSummary[]> {
        const query = db.select().from(attendanceSummary).where(eq(attendanceSummary.employeeId, employeeId));

        if (year) {
            query.where(eq(attendanceSummary.year, year));
        }

        return await query;
    }

    async updateAttendanceSummary(id: number, summary: Partial<AttendanceSummary>): Promise<AttendanceSummary | undefined> {
        const [updatedSummary] = await db
            .update(attendanceSummary)
            .set(summary)
            .where(eq(attendanceSummary.id, id))
            .returning();
        return updatedSummary;
    }

    async calculateMonthlyAttendanceSummary(employeeId: number, month: number, year: number): Promise<void> {
        // Implementation of calculateMonthlyAttendanceSummary method
    }
}

export const storage = new DatabaseStorage();

