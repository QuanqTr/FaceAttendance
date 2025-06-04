import { db } from "../server/db.js";
import { workHours, employees } from "../shared/schema.js";
import { sql } from "drizzle-orm";

async function seedWorkHours() {
    try {
        console.log("🌱 Seeding work hours data...");

        // Get all employees
        const allEmployees = await db.select().from(employees);
        
        if (allEmployees.length === 0) {
            console.log("❌ No employees found. Please seed employees first.");
            return;
        }

        console.log(`📊 Creating work hours for ${allEmployees.length} employees`);

        // Clear existing work hours data
        await db.execute(sql`DELETE FROM work_hours`);

        // Generate work hours for the last 30 days
        const workHoursData = [];
        const today = new Date();
        
        for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
            const currentDate = new Date(today);
            currentDate.setDate(today.getDate() - dayOffset);
            
            // Skip weekends (Saturday = 6, Sunday = 0)
            if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
                continue;
            }
            
            const dateStr = currentDate.toISOString().split('T')[0];
            
            for (const employee of allEmployees) {
                // 85% chance employee is present
                const isPresent = Math.random() < 0.85;
                
                if (isPresent) {
                    // Generate realistic work hours
                    const startHour = 8 + Math.random() * 2; // 8:00 - 10:00 AM
                    const workDuration = 8 + Math.random() * 2; // 8-10 hours
                    const endHour = startHour + workDuration;
                    
                    const checkinTime = new Date(currentDate);
                    checkinTime.setHours(Math.floor(startHour), Math.floor((startHour % 1) * 60), 0, 0);
                    
                    const checkoutTime = new Date(currentDate);
                    checkoutTime.setHours(Math.floor(endHour), Math.floor((endHour % 1) * 60), 0, 0);
                    
                    // Calculate hours
                    const totalHours = workDuration;
                    const regularHours = Math.min(8, totalHours);
                    const overtimeHours = Math.max(0, totalHours - 8);
                    
                    // Determine status
                    let status = 'present';
                    if (startHour > 9) { // Late if after 9 AM
                        status = 'late';
                    }
                    
                    workHoursData.push({
                        employeeId: employee.id,
                        date: dateStr,
                        checkinTime: checkinTime.toISOString(),
                        checkoutTime: checkoutTime.toISOString(),
                        regularHours: regularHours.toFixed(2),
                        overtimeHours: overtimeHours.toFixed(2),
                        status: status
                    });
                }
            }
        }

        // Insert data in batches
        const batchSize = 50;
        for (let i = 0; i < workHoursData.length; i += batchSize) {
            const batch = workHoursData.slice(i, i + batchSize);
            await db.insert(workHours).values(batch);
            console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(workHoursData.length / batchSize)}`);
        }

        console.log("🎉 Work hours data seeded successfully!");

        // Show summary statistics
        const stats = await db.execute(sql`
            SELECT 
                COUNT(*) as total_records,
                COUNT(DISTINCT employee_id) as unique_employees,
                COUNT(DISTINCT date) as unique_dates,
                ROUND(AVG(regular_hours::numeric), 2) as avg_regular_hours,
                ROUND(AVG(overtime_hours::numeric), 2) as avg_overtime_hours,
                COUNT(CASE WHEN status = 'late' THEN 1 END) as late_count
            FROM work_hours
        `);

        console.log("📈 Summary Statistics:");
        console.log(`   Total Records: ${stats.rows[0].total_records}`);
        console.log(`   Unique Employees: ${stats.rows[0].unique_employees}`);
        console.log(`   Unique Dates: ${stats.rows[0].unique_dates}`);
        console.log(`   Average Regular Hours: ${stats.rows[0].avg_regular_hours}`);
        console.log(`   Average Overtime Hours: ${stats.rows[0].avg_overtime_hours}`);
        console.log(`   Late Records: ${stats.rows[0].late_count}`);

    } catch (error) {
        console.error("❌ Error seeding work hours:", error);
    } finally {
        process.exit(0);
    }
}

// Run the seeding function
seedWorkHours();
