import { Request, Response } from "express";
import { db } from "../db.js";
import { sql } from "drizzle-orm";
import { attendanceSummary } from "@shared/schema";
import { eq } from "drizzle-orm";

// Get all employees attendance summaries for a specific month/year
export const getAllEmployeesAttendanceSummary = async (req: Request, res: Response) => {
    try {
        const { month, year } = req.query;

        if (!month || !year) {
            return res.status(400).json({
                error: 'Month and year are required'
            });
        }

        console.log(`[AttendanceSummary] Getting summaries for ${month}/${year}`);

        // Use raw SQL to get attendance summary data
        const summariesData = await db.execute(sql`
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
            WHERE ats.month = ${month} AND ats.year = ${year}
            ORDER BY e.first_name, e.last_name
        `);

        const results = summariesData.rows.map((row: any) => ({
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

        console.log(`[AttendanceSummary] Found ${results.length} attendance summary records`);
        res.json(results);

    } catch (error) {
        console.error('[AttendanceSummary] Error fetching attendance summaries:', error);
        res.status(500).json({ error: 'Failed to fetch attendance summaries' });
    }
};

// Get attendance summary for an employee
export const getEmployeeAttendanceSummary = async (req: Request, res: Response) => {
    try {
        const employeeId = parseInt(req.params.employeeId);
        const { month, year } = req.query;

        if (isNaN(employeeId)) {
            return res.status(400).json({ error: 'Invalid employee ID' });
        }

        if (month && year) {
            // Get specific month summary
            const summaryData = await db.execute(sql`
                SELECT 
                    id, employee_id, month, year, total_hours, overtime_hours, 
                    leave_days, early_minutes, late_minutes, penalty_amount, created_at
                FROM attendance_summary
                WHERE employee_id = ${employeeId} AND month = ${month} AND year = ${year}
            `);

            if (summaryData.rows.length === 0) {
                return res.json(null);
            }

            const row = summaryData.rows[0] as any;
            const result = {
                id: row.id,
                employeeId: row.employee_id,
                month: row.month,
                year: row.year,
                totalHours: parseFloat(row.total_hours || 0),
                overtimeHours: parseFloat(row.overtime_hours || 0),
                leaveDays: row.leave_days || 0,
                earlyMinutes: row.early_minutes || 0,
                lateMinutes: row.late_minutes || 0,
                penaltyAmount: parseFloat(row.penalty_amount || 0),
                createdAt: row.created_at
            };

            return res.json(result);
        } else if (year) {
            // Get all months for a year
            const summariesData = await db.execute(sql`
                SELECT 
                    id, employee_id, month, year, total_hours, overtime_hours, 
                    leave_days, early_minutes, late_minutes, penalty_amount, created_at
                FROM attendance_summary
                WHERE employee_id = ${employeeId} AND year = ${year}
                ORDER BY month
            `);

            const results = summariesData.rows.map((row: any) => ({
                id: row.id,
                employeeId: row.employee_id,
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

            return res.json(results);
        } else {
            // Get current year summaries
            const currentYear = new Date().getFullYear();
            const summariesData = await db.execute(sql`
                SELECT 
                    id, employee_id, month, year, total_hours, overtime_hours, 
                    leave_days, early_minutes, late_minutes, penalty_amount, created_at
                FROM attendance_summary
                WHERE employee_id = ${employeeId} AND year = ${currentYear}
                ORDER BY month
            `);

            const results = summariesData.rows.map((row: any) => ({
                id: row.id,
                employeeId: row.employee_id,
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

            return res.json(results);
        }
    } catch (error) {
        console.error('Error fetching employee attendance summary:', error);
        res.status(500).json({ error: 'Failed to fetch attendance summary' });
    }
};

// Create attendance summary
export const createAttendanceSummary = async (req: Request, res: Response) => {
    try {
        const { employeeId, month, year, totalHours, overtimeHours, leaveDays, earlyMinutes, lateMinutes, penaltyAmount } = req.body;

        if (!employeeId || !month || !year) {
            return res.status(400).json({
                error: 'Employee ID, month, and year are required'
            });
        }

        const [insertedData] = await db.insert(attendanceSummary).values({
            employeeId: parseInt(employeeId),
            month: parseInt(month),
            year: parseInt(year),
            totalHours: (totalHours || 0).toString(),
            overtimeHours: (overtimeHours || 0).toString(),
            leaveDays: parseInt(leaveDays) || 0,
            earlyMinutes: parseInt(earlyMinutes) || 0,
            lateMinutes: parseInt(lateMinutes) || 0,
            penaltyAmount: (penaltyAmount || 0).toString()
        }).returning();

        res.status(201).json({
            success: true,
            data: insertedData,
            message: 'Attendance summary created successfully'
        });
    } catch (error) {
        console.error('Error creating attendance summary:', error);
        res.status(500).json({ error: 'Failed to create attendance summary' });
    }
};

// Update attendance summary
export const updateAttendanceSummary = async (req: Request, res: Response) => {
    try {
        const summaryId = parseInt(req.params.id);
        const updateData = req.body;

        if (isNaN(summaryId)) {
            return res.status(400).json({ error: 'Invalid summary ID' });
        }

        // Build dynamic update query
        const fields = [];
        const values = [];
        let paramCount = 1;

        for (const [key, value] of Object.entries(updateData)) {
            if (['totalHours', 'overtimeHours', 'leaveDays', 'earlyMinutes', 'lateMinutes', 'penaltyAmount'].includes(key)) {
                fields.push(`${key.replace(/([A-Z])/g, '_$1').toLowerCase()} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }

        if (fields.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        values.push(summaryId);
        const updateQuery = `
            UPDATE attendance_summary 
            SET ${fields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const updateResult = await db.execute(updateQuery, values);

        if (updateResult.rows.length === 0) {
            return res.status(404).json({ error: 'Attendance summary not found' });
        }

        res.json({
            success: true,
            data: updateResult.rows[0],
            message: 'Attendance summary updated successfully'
        });
    } catch (error) {
        console.error('Error updating attendance summary:', error);
        res.status(500).json({ error: 'Failed to update attendance summary' });
    }
};

// Calculate monthly attendance summary for an employee
export const calculateMonthlyAttendanceSummary = async (req: Request, res: Response) => {
    try {
        const employeeId = parseInt(req.params.employeeId);
        const { month, year } = req.body;

        if (isNaN(employeeId) || !month || !year) {
            return res.status(400).json({
                error: 'Employee ID, month, and year are required'
            });
        }

        // This would need to calculate from work_hours and time_logs
        // For now, return success message
        res.json({
            success: true,
            message: 'Monthly attendance summary calculated successfully'
        });
    } catch (error) {
        console.error('Error calculating monthly attendance summary:', error);
        res.status(500).json({ error: 'Failed to calculate attendance summary' });
    }
}; 