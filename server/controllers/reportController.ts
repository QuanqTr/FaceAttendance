import { Request, Response } from "express";
import { storage } from "../models/storage.js";
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000
});

// Helper function to validate date parameters
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

// Monthly attendance summary report
export const getMonthlyAttendanceReport = async (req: Request, res: Response) => {
    try {
        const validation = validateDateParams(req);
        if (!validation.isValid) {
            return res.status(400).json({ error: validation.error });
        }

        const { month, year, startDate, endDate } = validation;
        const { departmentId } = req.query;

        let query = `
            SELECT 
                asu.id,
                asu.employee_id as "employeeId",
                e.first_name || ' ' || e.last_name as "employeeName",
                e.position,
                d.name as "departmentName",
                asu.month,
                asu.year,
                asu.total_hours as "totalHours",
                asu.overtime_hours as "overtimeHours",
                asu.leave_days as "leaveDays",
                asu.early_minutes as "earlyMinutes",
                asu.late_minutes as "lateMinutes",
                asu.penalty_amount as "penaltyAmount",
                asu.created_at as "createdAt"
            FROM attendance_summary asu
            LEFT JOIN employees e ON asu.employee_id = e.id
            LEFT JOIN departments d ON e.department_id = d.id
            WHERE asu.month = $1 AND asu.year = $2
                AND asu.created_at >= $3 AND asu.created_at <= $4
        `;

        const queryParams = [month, year, startDate, endDate];

        // Add department filter if provided
        if (departmentId && departmentId !== 'all') {
            query += ` AND e.department_id = $5`;
            queryParams.push(parseInt(departmentId as string));
        }

        query += ` ORDER BY asu.total_hours DESC, e.last_name, e.first_name`;

        const result = await pool.query(query, queryParams);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching monthly attendance report:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Department statistics
export const getDepartmentStats = async (req: Request, res: Response) => {
    try {
        const validation = validateDateParams(req);
        if (!validation.isValid) {
            return res.status(400).json({ error: validation.error });
        }

        const { month, year, startDate, endDate } = validation;

        const query = `
            SELECT 
                d.id as "departmentId",
                d.name as "departmentName",
                COUNT(asu.id) as "employeeCount",
                ROUND(AVG(asu.total_hours), 2) as "avgTotalHours",
                ROUND(SUM(asu.total_hours), 2) as "totalDepartmentHours",
                ROUND(AVG(asu.overtime_hours), 2) as "avgOvertimeHours",
                SUM(asu.leave_days) as "totalLeaveDays",
                ROUND(AVG(asu.late_minutes), 2) as "avgLateMinutes",
                SUM(asu.penalty_amount) as "totalPenaltyAmount"
            FROM departments d
            LEFT JOIN employees e ON d.id = e.department_id
            LEFT JOIN attendance_summary asu ON e.id = asu.employee_id 
                AND asu.month = $1 AND asu.year = $2
                AND asu.created_at >= $3 AND asu.created_at <= $4
            GROUP BY d.id, d.name
            HAVING COUNT(asu.id) > 0
            ORDER BY "totalDepartmentHours" DESC
        `;

        const result = await pool.query(query, [month, year, startDate, endDate]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching department stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Overall statistics summary
export const getOverallStats = async (req: Request, res: Response) => {
    try {
        const validation = validateDateParams(req);
        if (!validation.isValid) {
            return res.status(400).json({ error: validation.error });
        }

        const { month, year, startDate, endDate } = validation;

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
            FROM attendance_summary
            WHERE month = $1 AND year = $2
                AND created_at >= $3 AND created_at <= $4
        `;

        const result = await pool.query(query, [month, year, startDate, endDate]);
        res.json(result.rows[0] || {});
    } catch (error) {
        console.error('Error fetching overall stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Top performers (highest hours)
export const getTopPerformers = async (req: Request, res: Response) => {
    try {
        const validation = validateDateParams(req);
        if (!validation.isValid) {
            return res.status(400).json({ error: validation.error });
        }

        const { month, year, startDate, endDate } = validation;
        const { limit = 10 } = req.query;

        const query = `
            SELECT 
                asu.employee_id as "employeeId",
                e.first_name || ' ' || e.last_name as "employeeName",
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
            ORDER BY asu.total_hours DESC
            LIMIT $5
        `;

        const result = await pool.query(query, [month, year, startDate, endDate, limit]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching top performers:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Attendance trends (multiple months)
export const getAttendanceTrends = async (req: Request, res: Response) => {
    try {
        const { year, months } = req.query;

        if (!year) {
            return res.status(400).json({
                error: "Year parameter is required"
            });
        }

        // Default to last 6 months if not specified
        const monthsList = months ? months.toString().split(',').map(Number) : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

        const query = `
            SELECT 
                month,
                COUNT(*) as "employeeCount",
                ROUND(SUM(total_hours), 2) as "totalHours",
                ROUND(AVG(total_hours), 2) as "avgHours",
                ROUND(SUM(overtime_hours), 2) as "totalOvertime",
                SUM(leave_days) as "totalLeaveDays",
                SUM(penalty_amount) as "totalPenalties"
            FROM attendance_summary
            WHERE year = $1 AND month = ANY($2)
            GROUP BY month
            ORDER BY month
        `;

        const result = await pool.query(query, [year, monthsList]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching attendance trends:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Penalty analysis
export const getPenaltyAnalysis = async (req: Request, res: Response) => {
    try {
        const validation = validateDateParams(req);
        if (!validation.isValid) {
            return res.status(400).json({ error: validation.error });
        }

        const { month, year, startDate, endDate } = validation;

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
            ORDER BY asu.penalty_amount DESC
        `;

        const result = await pool.query(query, [month, year, startDate, endDate]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching penalty analysis:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}; 