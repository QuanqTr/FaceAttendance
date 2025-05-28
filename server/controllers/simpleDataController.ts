import { Request, Response } from "express";
import { pool } from "../db.js";

// Get work hours for a specific date
export const getWorkHoursData = async (req: Request, res: Response) => {
    try {
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ error: 'Date parameter is required' });
        }

        console.log(`[Simple] Getting work hours for date: ${date}`);

        const query = `
            SELECT 
                wh.employee_id,
                e.first_name || ' ' || e.last_name as employee_name,
                wh.regular_hours,
                wh.ot_hours as overtime_hours,
                wh.first_checkin as checkin_time,
                wh.last_checkout as checkout_time,
                wh.status
            FROM work_hours wh
            JOIN employees e ON wh.employee_id = e.id
            WHERE wh.work_date = $1
            ORDER BY e.first_name, e.last_name
        `;

        const result = await pool.query(query, [date]);

        const results = result.rows.map((row: any) => ({
            employeeId: row.employee_id,
            employeeName: row.employee_name,
            regularHours: parseFloat(row.regular_hours || 0),
            overtimeHours: parseFloat(row.overtime_hours || 0),
            checkinTime: row.checkin_time,
            checkoutTime: row.checkout_time,
            status: row.status
        }));

        console.log(`[Simple] Found ${results.length} work hour records`);
        res.json(results);

    } catch (error) {
        console.error('[Simple] Error fetching work hours:', error);
        res.status(500).json({ error: 'Failed to fetch work hours' });
    }
};

// Get attendance summary for specific month/year
export const getAttendanceSummaryData = async (req: Request, res: Response) => {
    try {
        const { month, year } = req.query;

        if (!month || !year) {
            return res.status(400).json({
                error: 'Month and year are required'
            });
        }

        console.log(`[Simple] Getting attendance summary for ${month}/${year}`);

        const query = `
            SELECT 
                ats.id,
                ats.employee_id,
                e.first_name || ' ' || e.last_name as employee_name,
                ats.month,
                ats.year,
                ats.total_hours,
                ats.overtime_hours,
                ats.leave_days,
                ats.early_minutes,
                ats.late_minutes,
                ats.penalty_amount,
                ats.created_at
            FROM attendance_summary ats
            JOIN employees e ON ats.employee_id = e.id
            WHERE ats.month = $1 AND ats.year = $2
            ORDER BY e.first_name, e.last_name
        `;

        const result = await pool.query(query, [month, year]);

        const results = result.rows.map((row: any) => ({
            id: row.id,
            employeeId: row.employee_id,
            employeeName: row.employee_name,
            month: row.month,
            year: row.year,
            totalHours: parseFloat(row.total_hours || 0),
            overtimeHours: parseFloat(row.overtime_hours || 0),
            leaveDays: row.leave_days || 0,
            earlyMinutes: row.early_minutes || 0,
            lateMinutes: row.late_minutes || 0,
            penaltyAmount: parseFloat(row.penalty_amount || 0),
            createdAt: row.created_at
        }));

        console.log(`[Simple] Found ${results.length} attendance summary records`);
        res.json(results);

    } catch (error) {
        console.error('[Simple] Error fetching attendance summary:', error);
        res.status(500).json({ error: 'Failed to fetch attendance summary' });
    }
};

// Simple test endpoint
export const testDatabase = async (req: Request, res: Response) => {
    try {
        console.log("🔍 Testing database connection...");

        // Test simple counts
        const workHoursCount = await pool.query('SELECT COUNT(*) as count FROM work_hours');
        const attendanceCount = await pool.query('SELECT COUNT(*) as count FROM attendance_summary');

        // Test specific data
        const workHoursData = await pool.query(`
            SELECT employee_id, work_date, regular_hours, ot_hours 
            FROM work_hours 
            WHERE work_date = '2025-05-27'
        `);

        const attendanceData = await pool.query(`
            SELECT employee_id, month, year, total_hours 
            FROM attendance_summary 
            WHERE month = 5 AND year = 2025
        `);

        // Check departments and users structure
        const departmentsData = await pool.query(`
            SELECT d.id, d.name, d.manager_id, u.full_name, u.username
            FROM departments d
            LEFT JOIN users u ON d.manager_id = u.id
        `);

        const usersData = await pool.query(`
            SELECT id, username, full_name, role, employee_id
            FROM users
            WHERE role = 'manager'
        `);

        res.json({
            success: true,
            workHoursCount: workHoursCount.rows[0].count,
            attendanceCount: attendanceCount.rows[0].count,
            workHoursSample: workHoursData.rows,
            attendanceSample: attendanceData.rows,
            departmentsSample: departmentsData.rows,
            managersSample: usersData.rows
        });

    } catch (error) {
        console.error("Database test error:", error);
        res.status(500).json({ error: 'Database test failed' });
    }
};

// Get departments with manager names
export const getDepartmentsData = async (req: Request, res: Response) => {
    try {
        console.log(`[Simple] Getting departments with manager names`);

        const query = `
            SELECT 
                d.id,
                d.name,
                d.description,
                d.manager_id,
                e.first_name || ' ' || e.last_name as manager_name,
                u.username as manager_username,
                u.role as manager_role,
                d.created_at
            FROM departments d
            LEFT JOIN employees e ON d.manager_id = e.id
            LEFT JOIN users u ON u.employee_id = e.id
            ORDER BY d.name
        `;

        const result = await pool.query(query);

        const results = result.rows.map((row: any) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            managerId: row.manager_id,
            managerName: row.manager_name,
            managerUsername: row.manager_username,
            managerRole: row.manager_role,
            createdAt: row.created_at
        }));

        console.log(`[Simple] Found ${results.length} departments`);
        res.json(results);

    } catch (error) {
        console.error('[Simple] Error fetching departments:', error);
        res.status(500).json({ error: 'Failed to fetch departments' });
    }
};

// Get users/accounts data
export const getUsersData = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;

        console.log(`[Simple] Getting users page ${page}`);

        // Get total count
        const countQuery = 'SELECT COUNT(*) as count FROM users';
        const countResult = await pool.query(countQuery);
        const total = parseInt(countResult.rows[0].count);

        // Get users with pagination
        const query = `
            SELECT 
                u.id,
                u.username,
                u.full_name,
                u.role,
                u.employee_id,
                u.created_at,
                e.first_name || ' ' || e.last_name as employee_name
            FROM users u
            LEFT JOIN employees e ON u.employee_id = e.id
            ORDER BY u.created_at DESC
            LIMIT $1 OFFSET $2
        `;

        const result = await pool.query(query, [limit, offset]);

        const results = result.rows.map((row: any) => ({
            id: row.id,
            username: row.username,
            fullName: row.full_name,
            role: row.role,
            employeeId: row.employee_id,
            employeeName: row.employee_name,
            createdAt: row.created_at
        }));

        console.log(`[Simple] Found ${results.length} users of ${total} total`);

        res.json({
            users: results,
            total: total,
            page: page,
            limit: limit,
            totalPages: Math.ceil(total / limit)
        });

    } catch (error) {
        console.error('[Simple] Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

// Debug departments structure
export const debugDepartments = async (req: Request, res: Response) => {
    try {
        const departmentsData = await pool.query(`
            SELECT d.id, d.name, d.manager_id, u.full_name, u.username, u.role
            FROM departments d
            LEFT JOIN users u ON d.manager_id = u.id
        `);

        res.json({
            departments: departmentsData.rows
        });

    } catch (error) {
        console.error('[Debug] Error fetching departments:', error);
        res.status(500).json({ error: 'Failed to debug departments' });
    }
};

// Debug users structure
export const debugUsers = async (req: Request, res: Response) => {
    try {
        const usersData = await pool.query(`
            SELECT id, username, full_name, role, employee_id
            FROM users
            ORDER BY id
        `);

        res.json({
            users: usersData.rows
        });

    } catch (error) {
        console.error('[Debug] Error fetching users:', error);
        res.status(500).json({ error: 'Failed to debug users' });
    }
};

// Check missing manager issue
export const checkMissingManager = async (req: Request, res: Response) => {
    try {
        // Check if user id 16 exists
        const user16 = await pool.query('SELECT * FROM users WHERE id = 16');

        // Get all manager users
        const managers = await pool.query(`
            SELECT id, username, full_name, role 
            FROM users 
            WHERE role = 'manager' OR role = 'admin'
            ORDER BY id
        `);

        // Get departments with missing managers
        const departmentsWithMissingManagers = await pool.query(`
            SELECT d.id, d.name, d.manager_id, u.full_name
            FROM departments d
            LEFT JOIN users u ON d.manager_id = u.id
            WHERE d.manager_id IS NOT NULL AND u.id IS NULL
        `);

        res.json({
            user16Exists: user16.rows.length > 0,
            user16Data: user16.rows[0] || null,
            availableManagers: managers.rows,
            departmentsWithMissingManagers: departmentsWithMissingManagers.rows
        });

    } catch (error) {
        console.error('[Debug] Error checking missing manager:', error);
        res.status(500).json({ error: 'Failed to check missing manager' });
    }
};

// Fix departments with missing managers
export const fixDepartmentManagers = async (req: Request, res: Response) => {
    try {
        console.log("🔧 Reverting departments manager_id back to original values...");

        // Revert departments with manager_id = 2 back to 16 if they were originally 16
        const updateResult = await pool.query(`
            UPDATE departments 
            SET manager_id = 16 
            WHERE manager_id = 2 AND name = 'D2'
        `);

        // Get updated departments with correct joins
        const updatedDepartments = await pool.query(`
            SELECT 
                d.id,
                d.name,
                d.manager_id,
                e.first_name || ' ' || e.last_name as manager_name,
                u.username as manager_username,
                u.role as manager_role
            FROM departments d
            LEFT JOIN employees e ON d.manager_id = e.id
            LEFT JOIN users u ON u.employee_id = e.id
            ORDER BY d.name
        `);

        res.json({
            success: true,
            updatedCount: updateResult.rowCount,
            departments: updatedDepartments.rows
        });

    } catch (error) {
        console.error('[Fix] Error fixing department managers:', error);
        res.status(500).json({ error: 'Failed to fix department managers' });
    }
};

// Check employee and manager structure
export const checkEmployeeManagerStructure = async (req: Request, res: Response) => {
    try {
        console.log("🔍 Checking employee and manager structure...");

        // Check if employee id 16 exists
        const employee16 = await pool.query('SELECT * FROM employees WHERE id = 16');

        // Get all departments and their manager_id references
        const departmentsInfo = await pool.query(`
            SELECT 
                d.id as dept_id,
                d.name as dept_name,
                d.manager_id,
                e.id as employee_id,
                e.first_name || ' ' || e.last_name as employee_name,
                u.id as user_id,
                u.username,
                u.role,
                u.employee_id as user_employee_id
            FROM departments d
            LEFT JOIN employees e ON d.manager_id = e.id
            LEFT JOIN users u ON u.employee_id = e.id
            ORDER BY d.id
        `);

        // Get employees who could be managers (have user accounts)
        const potentialManagers = await pool.query(`
            SELECT 
                e.id as employee_id,
                e.first_name || ' ' || e.last_name as employee_name,
                u.username,
                u.role
            FROM employees e
            JOIN users u ON u.employee_id = e.id
            WHERE u.role IN ('manager', 'admin')
            ORDER BY e.id
        `);

        res.json({
            employee16Exists: employee16.rows.length > 0,
            employee16Data: employee16.rows[0] || null,
            departmentsInfo: departmentsInfo.rows,
            potentialManagers: potentialManagers.rows
        });

    } catch (error) {
        console.error('[Check] Error checking employee manager structure:', error);
        res.status(500).json({ error: 'Failed to check employee manager structure' });
    }
}; 