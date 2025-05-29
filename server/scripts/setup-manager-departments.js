const { Pool } = require('pg');

// Database connection - sử dụng connection string từ environment hoặc default local  
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/face_timekeeping';

async function setupManagerDepartments() {
    const pool = new Pool({ connectionString });

    try {
        console.log('🔄 Setting up manager departments for Quang...');

        // 1. Check current state
        console.log('\n📊 Current state:');
        const users = await pool.query('SELECT id, username, role, employee_id FROM users ORDER BY id');
        console.log('Users:', users.rows);

        const employees = await pool.query('SELECT id, first_name, last_name, department_id FROM employees ORDER BY id');
        console.log('Employees:', employees.rows);

        const departments = await pool.query('SELECT id, name, manager_id FROM departments ORDER BY id');
        console.log('Departments:', departments.rows);

        // 2. Find user quang (should be ID 3 with employee_id 5)
        const quangUser = users.rows.find(u => u.username === 'quang' && u.role === 'manager');
        if (!quangUser) {
            console.error('❌ Manager user "quang" not found!');
            return;
        }

        console.log(`\n✅ Found manager Quang: User ID ${quangUser.id}, Employee ID ${quangUser.employee_id}`);

        // 3. Set employee 5 (Quang) as manager of multiple departments to get 9 total employees
        console.log('\n🔧 Setting up department managers...');

        // Update department managers to assign Quang to manage multiple departments
        const departmentUpdates = [
            { deptId: 1, name: 'IT' },
            { deptId: 2, name: 'HR' }
        ];

        for (const dept of departmentUpdates) {
            await pool.query(
                'UPDATE departments SET manager_id = $1 WHERE id = $2',
                [quangUser.employee_id, dept.deptId]
            );
            console.log(`✅ Set employee ${quangUser.employee_id} (Quang) as manager of department ${dept.deptId} (${dept.name})`);
        }

        // 4. Ensure we have at least 9 employees across Quang's departments
        console.log('\n👥 Ensuring sufficient employees...');

        // Get current employees in departments 1 and 2
        const currentEmployees = await pool.query(`
            SELECT id, first_name, last_name, department_id 
            FROM employees 
            WHERE department_id IN (1, 2)
            ORDER BY department_id, id
        `);

        console.log(`Current employees in Quang's departments:`, currentEmployees.rows);

        // If we don't have enough employees, create more or move existing ones
        if (currentEmployees.rows.length < 9) {
            const needed = 9 - currentEmployees.rows.length;
            console.log(`⚠️ Need ${needed} more employees in Quang's departments`);

            // Move other employees to Quang's departments if available
            const otherEmployees = await pool.query(`
                SELECT id, first_name, last_name, department_id 
                FROM employees 
                WHERE department_id NOT IN (1, 2) OR department_id IS NULL
                ORDER BY id 
                LIMIT $1
            `, [needed]);

            for (let i = 0; i < otherEmployees.rows.length && i < needed; i++) {
                const emp = otherEmployees.rows[i];
                const targetDept = i % 2 === 0 ? 1 : 2; // Alternate between dept 1 and 2

                await pool.query(
                    'UPDATE employees SET department_id = $1 WHERE id = $2',
                    [targetDept, emp.id]
                );
                console.log(`✅ Moved employee ${emp.id} (${emp.first_name} ${emp.last_name}) to department ${targetDept}`);
            }

            // If still not enough, create new employees
            const stillNeeded = needed - otherEmployees.rows.length;
            if (stillNeeded > 0) {
                console.log(`📝 Creating ${stillNeeded} new employees...`);

                for (let i = 0; i < stillNeeded; i++) {
                    const deptId = i % 2 === 0 ? 1 : 2;
                    const empNumber = currentEmployees.rows.length + otherEmployees.rows.length + i + 1;

                    await pool.query(`
                        INSERT INTO employees (employee_id, first_name, last_name, email, department_id, position, status, join_date)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE)
                    `, [
                        `EMP${empNumber.toString().padStart(3, '0')}`,
                        `Employee${empNumber}`,
                        'Test',
                        `employee${empNumber}@company.com`,
                        deptId,
                        'Staff',
                        'active'
                    ]);

                    console.log(`✅ Created employee EMP${empNumber.toString().padStart(3, '0')} in department ${deptId}`);
                }
            }
        }

        // 5. Final verification
        console.log('\n🔍 Final verification:');

        const finalDepartments = await pool.query(`
            SELECT 
                d.id,
                d.name,
                d.manager_id,
                e.first_name || ' ' || e.last_name as manager_name,
                COUNT(emp.id) as employee_count
            FROM departments d
            LEFT JOIN employees e ON d.manager_id = e.id
            LEFT JOIN employees emp ON emp.department_id = d.id
            WHERE d.manager_id = $1
            GROUP BY d.id, d.name, d.manager_id, e.first_name, e.last_name
            ORDER BY d.id
        `, [quangUser.employee_id]);

        console.log('Departments managed by Quang:', finalDepartments.rows);

        const totalEmployees = finalDepartments.rows.reduce((sum, dept) => sum + parseInt(dept.employee_count), 0);
        console.log(`\n🎉 Total employees under Quang's management: ${totalEmployees}`);

        // 6. Test the manager API
        console.log('\n🧪 Testing manager API...');
        console.log('Manager Quang can now access employees from departments:', finalDepartments.rows.map(d => d.id));
        console.log('Use test endpoint: http://localhost:5000/api/test/manager/employees');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

setupManagerDepartments(); 