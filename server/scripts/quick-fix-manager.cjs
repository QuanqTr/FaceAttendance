const { Pool } = require('pg');

// Try different connection approaches
const tryConnections = [
    'postgresql://postgres:password@localhost:5432/face_timekeeping',
    'postgresql://postgres:admin@localhost:5432/face_timekeeping',
    'postgresql://postgres:123456@localhost:5432/face_timekeeping',
    'postgresql://postgres:postgres@localhost:5432/face_timekeeping',
    'postgresql://postgres@localhost:5432/face_timekeeping'
];

async function quickFixManager() {
    for (const connectionString of tryConnections) {
        const pool = new Pool({ connectionString });

        try {
            console.log(`🔄 Trying connection: ${connectionString.replace(/:.+@/, ':****@')}`);

            // Test connection
            await pool.query('SELECT 1');
            console.log('✅ Connection successful!');

            // Quick fix: Set employee 5 as manager of departments 1 and 2
            console.log('\n🔧 Setting employee 5 as manager of departments...');

            // Update departments 1 and 2 to have manager_id = 5 (employee ID of user quang)
            await pool.query('UPDATE departments SET manager_id = 5 WHERE id IN (1, 2)');
            console.log('✅ Set employee 5 as manager of departments 1 and 2');

            // Verify the change
            const result = await pool.query(`
                SELECT 
                    d.id,
                    d.name,
                    d.manager_id,
                    COUNT(e.id) as employee_count
                FROM departments d
                LEFT JOIN employees e ON e.department_id = d.id
                WHERE d.manager_id = 5
                GROUP BY d.id, d.name, d.manager_id
                ORDER BY d.id
            `);

            console.log('\n✅ Verification - Departments managed by employee 5:');
            console.log(result.rows);

            const totalEmployees = result.rows.reduce((sum, row) => sum + parseInt(row.employee_count), 0);
            console.log(`\n🎉 Total employees under management: ${totalEmployees}`);

            await pool.end();

            console.log('\n🧪 Test the fix with: curl "http://localhost:5000/api/test/manager/employees"');
            return;

        } catch (error) {
            console.log(`❌ Failed: ${error.message}`);
            await pool.end();
        }
    }

    console.log('❌ All connection attempts failed. Please check database configuration.');
}

quickFixManager(); 