const { Pool } = require('pg');

// Database connection
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'facetimekeeping',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123456'
});

async function debugWorkHours() {
    try {
        console.log('🔍 Debugging work_hours data...');

        // Check work_hours for 2025-05-29
        const date = '2025-05-29';
        const workHoursQuery = await pool.query(`
            SELECT 
                wh.employee_id,
                e.first_name,
                e.last_name,
                e.department_id,
                d.name as department_name,
                wh.work_date,
                wh.first_checkin,
                wh.last_checkout,
                wh.regular_hours,
                wh.status
            FROM work_hours wh
            JOIN employees e ON wh.employee_id = e.id
            LEFT JOIN departments d ON e.department_id = d.id
            WHERE wh.work_date = $1
            ORDER BY wh.employee_id
        `, [date]);

        console.log(`📊 Work hours records for ${date}:`, workHoursQuery.rows.length);
        console.log('📋 Data:', JSON.stringify(workHoursQuery.rows, null, 2));

        // Check all dates available
        const allDatesQuery = await pool.query(`
            SELECT work_date, COUNT(*) as count
            FROM work_hours 
            GROUP BY work_date
            ORDER BY work_date DESC
            LIMIT 5
        `);

        console.log('📅 Recent dates with data:', allDatesQuery.rows);

        // Check departments managed
        const departmentIds = [10, 12, 8];
        const employeesQuery = await pool.query(`
            SELECT 
                e.id,
                e.first_name,
                e.last_name,
                e.department_id,
                d.name as department_name
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            WHERE e.department_id = ANY($1)
                AND e.status = 'active'
            ORDER BY e.id
        `, [departmentIds]);

        console.log(`👥 Employees in departments ${departmentIds.join(', ')}:`, employeesQuery.rows.length);
        console.log('📋 Employee IDs:', employeesQuery.rows.map(row => row.id));

        // Check if work_hours employees match department employees
        const workHoursEmployeeIds = workHoursQuery.rows.map(row => row.employee_id);
        const departmentEmployeeIds = employeesQuery.rows.map(row => row.id);
        const intersection = workHoursEmployeeIds.filter(id => departmentEmployeeIds.includes(id));

        console.log('🔍 Analysis:');
        console.log('- Work hours employee IDs:', workHoursEmployeeIds);
        console.log('- Department employee IDs:', departmentEmployeeIds);
        console.log('- Intersection:', intersection);
        console.log('- Match count:', intersection.length);

        await pool.end();
    } catch (error) {
        console.error('❌ Error:', error);
        await pool.end();
    }
}

debugWorkHours(); 