import { Express } from "express";
import { db } from "../db.js";
import { sql } from "drizzle-orm";

export function debugRoutes(app: Express) {
    // Debug route to test database queries directly
    app.get("/api/debug/test-db", async (req, res) => {
        try {
            console.log("🔍 Testing database queries...");

            // Test simple query
            const workHoursCount = await db.execute(sql`SELECT COUNT(*) as count FROM work_hours`);
            console.log("Work hours count:", workHoursCount.rows[0]);

            const attendanceCount = await db.execute(sql`SELECT COUNT(*) as count FROM attendance_summary`);
            console.log("Attendance summary count:", attendanceCount.rows[0]);

            // Test specific query for 2025-05-27
            const specificDate = await db.execute(sql`
                SELECT wh.employee_id, e.first_name, e.last_name, wh.regular_hours, wh.ot_hours
                FROM work_hours wh
                JOIN employees e ON wh.employee_id = e.id  
                WHERE wh.work_date = '2025-05-27'
            `);
            console.log("Specific date results:", specificDate.rows);

            // Test attendance summary for 5/2025
            const attendanceData = await db.execute(sql`
                SELECT ats.employee_id, e.first_name, e.last_name, ats.total_hours
                FROM attendance_summary ats
                JOIN employees e ON ats.employee_id = e.id
                WHERE ats.month = 5 AND ats.year = 2025
            `);
            console.log("Attendance summary results:", attendanceData.rows);

            res.json({
                success: true,
                workHoursCount: workHoursCount.rows[0],
                attendanceCount: attendanceCount.rows[0],
                specificDateResults: specificDate.rows,
                attendanceResults: attendanceData.rows
            });

        } catch (error) {
            console.error("Debug query error:", error);
            res.status(500).json({ error: error.message });
        }
    });
} 