import { db } from "../db.js";
import { sql } from "drizzle-orm";

async function checkWorkHours() {
    console.log("🔍 Checking work_hours table...");

    try {
        // Check work_hours table structure and data
        const workHoursData = await db.execute(sql`
            SELECT 
                id, employee_id, work_date, first_checkin, last_checkout, 
                regular_hours, ot_hours, status
            FROM work_hours 
            ORDER BY work_date DESC 
            LIMIT 10
        `);

        console.log(`📊 Work hours records found: ${workHoursData.rows.length}`);

        if (workHoursData.rows.length > 0) {
            console.log("\n📋 Recent work hours:");
            workHoursData.rows.forEach((row: any) => {
                console.log(`Employee ${row.employee_id}: ${row.work_date} - Regular: ${row.regular_hours}h, OT: ${row.ot_hours}h, Status: ${row.status}`);
            });

            // Get unique dates
            const uniqueDates = Array.from(new Set(workHoursData.rows.map((row: any) => row.work_date)));
            console.log("\n📅 Available dates:", uniqueDates.slice(0, 5));
        }

        // Check attendance_summary table
        const attendanceData = await db.execute(sql`
            SELECT 
                id, employee_id, month, year, total_hours, overtime_hours, leave_days
            FROM attendance_summary 
            ORDER BY year DESC, month DESC 
            LIMIT 5
        `);

        console.log(`\n📈 Attendance summary records found: ${attendanceData.rows.length}`);

        if (attendanceData.rows.length > 0) {
            console.log("\n📋 Recent attendance summaries:");
            attendanceData.rows.forEach((row: any) => {
                console.log(`Employee ${row.employee_id}: ${row.month}/${row.year} - Total: ${row.total_hours}h, OT: ${row.overtime_hours}h, Leave: ${row.leave_days} days`);
            });
        }

    } catch (error) {
        console.error("❌ Error:", error);
    }
}

checkWorkHours(); 