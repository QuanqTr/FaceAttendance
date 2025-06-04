import { Request, Response } from "express";
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000
});

// Helper function to validate date parameters (EXACT COPY from Admin Reports)
const validateDateParams = (req: Request) => {
    const { month, year, startDate, endDate } = req.query;

    if (!month || !year) {
        return {
            isValid: false,
            error: "Month and year parameters are required"
        };
    }

    if (!startDate || !endDate) {
        return {
            isValid: false,
            error: "Start date and end date are required"
        };
    }

    return {
        isValid: true,
        month: parseInt(month as string),
        year: parseInt(year as string),
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string)
    };
};

// Get departments that this manager manages (where manager_id = employee_id)
const getManagerDepartments = async (managerId: number): Promise<number[]> => {
    const query = `
        SELECT DISTINCT d.id
        FROM departments d
        WHERE d.manager_id = (
            SELECT employee_id FROM users WHERE id = $1
        )
    `;
    const result = await pool.query(query, [managerId]);
    return result.rows.map(row => row.id);
};

// Overall statistics summary (EXACT COPY from Admin + department filter)
export const getManagerOverallStats = async (req: Request, res: Response) => {
    try {
        const validation = validateDateParams(req);
        if (!validation.isValid) {
            return res.status(400).json({ error: validation.error });
        }

        const { month, year, startDate, endDate } = validation;
        const managerId = (req.user as any)?.id;

        if (!managerId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // Get manager's departments
        const departmentIds = await getManagerDepartments(managerId);
        if (departmentIds.length === 0) {
            return res.status(404).json({ error: "Manager department not found" });
        }

        const placeholders = departmentIds.map((_, index) => `$${index + 5}`).join(',');

        const query = `
            SELECT
                COUNT(*) as "totalEmployees",
                ROUND(SUM(total_hours), 2) as "totalHours",
                ROUND(AVG(total_hours), 2) as "avgHoursPerEmployee",
                ROUND(SUM(overtime_hours), 2) as "totalOvertimeHours",
                ROUND(AVG(overtime_hours), 2) as "avgOvertimePerEmployee",
                SUM(leave_days) as "totalLeaveDays",
                ROUND(AVG(leave_days), 2) as "avgLeaveDaysPerEmployee",
                SUM(late_minutes) as "totalLateMinutes",
                ROUND(AVG(late_minutes), 2) as "avgLateMinutesPerEmployee",
                SUM(penalty_amount) as "totalPenaltyAmount",
                ROUND(AVG(penalty_amount), 2) as "avgPenaltyPerEmployee",
                COUNT(CASE WHEN total_hours >= 160 THEN 1 END) as "fullTimeEmployees",
                COUNT(CASE WHEN total_hours < 160 AND total_hours > 0 THEN 1 END) as "partTimeEmployees",
                COUNT(CASE WHEN total_hours = 0 THEN 1 END) as "absentEmployees"
            FROM attendance_summary asu
            LEFT JOIN employees e ON asu.employee_id = e.id
            WHERE asu.month = $1 AND asu.year = $2
                AND asu.created_at >= $3 AND asu.created_at <= $4
                AND e.department_id IN (${placeholders})
        `;

        const result = await pool.query(query, [month, year, startDate, endDate, ...departmentIds]);
        res.json(result.rows[0] || {});
    } catch (error) {
        console.error('Error fetching manager overall stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Attendance records (EXACT COPY from Admin + department filter)
export const getManagerAttendanceRecords = async (req: Request, res: Response) => {
    try {
        const validation = validateDateParams(req);
        if (!validation.isValid) {
            return res.status(400).json({ error: validation.error });
        }

        const { month, year, startDate, endDate } = validation;
        const managerId = (req.user as any)?.id;

        if (!managerId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // Get manager's departments
        const departmentIds = await getManagerDepartments(managerId);
        if (departmentIds.length === 0) {
            return res.status(404).json({ error: "Manager department not found" });
        }

        const placeholders = departmentIds.map((_, index) => `$${index + 5}`).join(',');

        const query = `
            SELECT
                asu.employee_id as "employeeId",
                e.last_name || ' ' || e.first_name as "employeeName",
                e.position,
                d.name as "departmentName",
                asu.total_hours as "totalHours",
                asu.overtime_hours as "overtimeHours",
                asu.late_minutes as "lateMinutes",
                asu.early_minutes as "earlyMinutes",
                asu.penalty_amount as "penaltyAmount",
                asu.leave_days as "leaveDays",
                asu.month,
                asu.year,
                asu.created_at as "createdAt"
            FROM attendance_summary asu
            LEFT JOIN employees e ON asu.employee_id = e.id
            LEFT JOIN departments d ON e.department_id = d.id
            WHERE asu.month = $1 AND asu.year = $2
                AND asu.created_at >= $3 AND asu.created_at <= $4
                AND e.department_id IN (${placeholders})
            ORDER BY asu.total_hours DESC
        `;

        const result = await pool.query(query, [month, year, startDate, endDate, ...departmentIds]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching manager attendance records:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Top performers (EXACT COPY from Admin + department filter)
export const getManagerTopPerformers = async (req: Request, res: Response) => {
    try {
        const validation = validateDateParams(req);
        if (!validation.isValid) {
            return res.status(400).json({ error: validation.error });
        }

        const { month, year, startDate, endDate } = validation;
        const { limit = 10 } = req.query;
        const managerId = (req.user as any)?.id;

        if (!managerId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // Get manager's departments
        const departmentIds = await getManagerDepartments(managerId);
        if (departmentIds.length === 0) {
            return res.status(404).json({ error: "Manager department not found" });
        }

        const placeholders = departmentIds.map((_, index) => `$${index + 6}`).join(',');

        const query = `
            SELECT
                asu.employee_id as "employeeId",
                e.last_name || ' ' || e.first_name as "employeeName",
                e.position,
                d.name as "departmentName",
                asu.total_hours as "totalHours",
                asu.overtime_hours as "overtimeHours",
                asu.late_minutes as "lateMinutes",
                asu.penalty_amount as "penaltyAmount"
            FROM attendance_summary asu
            LEFT JOIN employees e ON asu.employee_id = e.id
            LEFT JOIN departments d ON e.department_id = d.id
            WHERE asu.month = $1 AND asu.year = $2
                AND asu.created_at >= $3 AND asu.created_at <= $4
                AND e.department_id IN (${placeholders})
            ORDER BY asu.total_hours DESC
            LIMIT $5
        `;

        const result = await pool.query(query, [month, year, startDate, endDate, limit, ...departmentIds]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching manager top performers:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Penalty analysis (EXACT COPY from Admin + department filter)
export const getManagerPenaltyAnalysis = async (req: Request, res: Response) => {
    try {
        const validation = validateDateParams(req);
        if (!validation.isValid) {
            return res.status(400).json({ error: validation.error });
        }

        const { month, year, startDate, endDate } = validation;
        const managerId = (req.user as any)?.id;

        if (!managerId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // Get manager's departments
        const departmentIds = await getManagerDepartments(managerId);
        if (departmentIds.length === 0) {
            return res.status(404).json({ error: "Manager department not found" });
        }

        const placeholders = departmentIds.map((_, index) => `$${index + 5}`).join(',');

        const query = `
            SELECT
                asu.employee_id as "employeeId",
                e.first_name || ' ' || e.last_name as "employeeName",
                e.position,
                d.name as "departmentName",
                asu.late_minutes as "lateMinutes",
                asu.early_minutes as "earlyMinutes",
                asu.penalty_amount as "penaltyAmount",
                CASE
                    WHEN asu.penalty_amount = 0 THEN 'Không phạt'
                    WHEN asu.penalty_amount <= 50000 THEN 'Phạt nhẹ'
                    WHEN asu.penalty_amount <= 100000 THEN 'Phạt trung bình'
                    ELSE 'Phạt nặng'
                END as "penaltyLevel"
            FROM attendance_summary asu
            LEFT JOIN employees e ON asu.employee_id = e.id
            LEFT JOIN departments d ON e.department_id = d.id
            WHERE asu.month = $1 AND asu.year = $2
                AND asu.created_at >= $3 AND asu.created_at <= $4
                AND e.department_id IN (${placeholders})
            ORDER BY asu.penalty_amount DESC
        `;

        const result = await pool.query(query, [month, year, startDate, endDate, ...departmentIds]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching manager penalty analysis:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get employee attendance history from work_hours table
export const getManagerEmployeeAttendanceHistory = async (req: Request, res: Response) => {
    try {
        const { employeeId } = req.params;
        const { month, year, startDate, endDate } = req.query;

        const managerId = (req.user as any)?.id;
        if (!managerId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // Validate date parameters
        if (!month || !year || !startDate || !endDate) {
            return res.status(400).json({ error: "Month, year, startDate and endDate parameters are required" });
        }

        // Get manager's departments
        const departmentIds = await getManagerDepartments(managerId);
        if (departmentIds.length === 0) {
            return res.status(404).json({ error: "Manager department not found" });
        }

        // Check if employee belongs to manager's departments
        const employeeCheckQuery = `
            SELECT e.id, e.department_id
            FROM employees e
            WHERE e.id = $1 AND e.department_id = ANY($2)
        `;
        const employeeCheck = await pool.query(employeeCheckQuery, [employeeId, departmentIds]);

        if (employeeCheck.rows.length === 0) {
            return res.status(403).json({ error: "Employee not found or not in your managed departments" });
        }

        // Get attendance history from work_hours table
        const query = `
            SELECT
                wh.id,
                wh.date,
                wh.check_in as "checkIn",
                wh.check_out as "checkOut",
                wh.regular_hours as "regularHours",
                wh.overtime_hours as "overtimeHours",
                wh.total_hours as "totalHours",
                wh.late_minutes as "lateMinutes",
                wh.early_minutes as "earlyMinutes",
                wh.status,
                wh.created_at as "createdAt"
            FROM work_hours wh
            WHERE wh.employee_id = $1
                AND wh.date >= $2
                AND wh.date <= $3
            ORDER BY wh.date DESC
        `;

        const result = await pool.query(query, [employeeId, startDate, endDate]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching employee attendance history:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
