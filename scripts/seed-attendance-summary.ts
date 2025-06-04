import { db } from "../server/db.js";
import { attendanceSummary, employees, departments } from "../shared/schema.js";
import { sql } from "drizzle-orm";

async function seedAttendanceSummary() {
    try {
        console.log("🌱 Seeding attendance summary data...");

        // Get current month and year
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();

        // Get all employees
        const allEmployees = await db.select().from(employees);
        
        if (allEmployees.length === 0) {
            console.log("❌ No employees found. Please seed employees first.");
            return;
        }

        console.log(`📊 Creating attendance summary for ${allEmployees.length} employees for ${currentMonth}/${currentYear}`);

        // Clear existing data for current month
        await db.execute(sql`
            DELETE FROM attendance_summary 
            WHERE month = ${currentMonth} AND year = ${currentYear}
        `);

        // Generate sample attendance summary data
        const attendanceSummaryData = allEmployees.map((employee, index) => {
            // Generate realistic data
            const baseHours = 160 + Math.random() * 40; // 160-200 hours
            const overtimeHours = Math.random() * 20; // 0-20 overtime hours
            const leaveDays = Math.floor(Math.random() * 3); // 0-2 leave days
            const lateMinutes = Math.floor(Math.random() * 120); // 0-120 minutes late
            const earlyMinutes = Math.floor(Math.random() * 60); // 0-60 minutes early
            
            // Calculate penalty based on late minutes
            let penaltyAmount = 0;
            if (lateMinutes > 60) {
                penaltyAmount = 100000; // Heavy penalty
            } else if (lateMinutes > 30) {
                penaltyAmount = 50000; // Medium penalty
            } else if (lateMinutes > 15) {
                penaltyAmount = 25000; // Light penalty
            }

            return {
                employeeId: employee.id,
                month: currentMonth,
                year: currentYear,
                totalHours: baseHours.toFixed(2),
                overtimeHours: overtimeHours.toFixed(2),
                leaveDays: leaveDays,
                earlyMinutes: earlyMinutes,
                lateMinutes: lateMinutes,
                penaltyAmount: penaltyAmount.toString()
            };
        });

        // Insert data in batches
        const batchSize = 10;
        for (let i = 0; i < attendanceSummaryData.length; i += batchSize) {
            const batch = attendanceSummaryData.slice(i, i + batchSize);
            await db.insert(attendanceSummary).values(batch);
            console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(attendanceSummaryData.length / batchSize)}`);
        }

        console.log("🎉 Attendance summary data seeded successfully!");

        // Show summary statistics
        const stats = await db.execute(sql`
            SELECT 
                COUNT(*) as total_records,
                ROUND(AVG(total_hours), 2) as avg_hours,
                ROUND(AVG(overtime_hours), 2) as avg_overtime,
                SUM(penalty_amount) as total_penalties
            FROM attendance_summary 
            WHERE month = ${currentMonth} AND year = ${currentYear}
        `);

        console.log("📈 Summary Statistics:");
        console.log(`   Total Records: ${stats.rows[0].total_records}`);
        console.log(`   Average Hours: ${stats.rows[0].avg_hours}`);
        console.log(`   Average Overtime: ${stats.rows[0].avg_overtime}`);
        console.log(`   Total Penalties: ${stats.rows[0].total_penalties} VND`);

    } catch (error) {
        console.error("❌ Error seeding attendance summary:", error);
    } finally {
        process.exit(0);
    }
}

// Run the seeding function
seedAttendanceSummary();
