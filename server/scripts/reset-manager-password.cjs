const { Pool } = require('pg');

// Database connection - sử dụng connection string từ environment hoặc default local
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/face_timekeeping';

async function resetManagerPassword() {
    const pool = new Pool({ connectionString });

    try {
        console.log('🔄 Connecting to database...');

        // Check current users
        const usersResult = await pool.query('SELECT id, username, role FROM users ORDER BY id');
        console.log('👥 Current users:');
        usersResult.rows.forEach(user => {
            console.log(`  - ${user.username} (${user.role}) [ID: ${user.id}]`);
        });

        // Hash for "admin123" - this is bcrypt hash for admin123
        const admin123Hash = '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW';

        // Update manager password
        const updateResult = await pool.query(
            'UPDATE users SET password = $1 WHERE username = $2 RETURNING id, username, role',
            [admin123Hash, 'quang']
        );

        if (updateResult.rows.length > 0) {
            console.log('✅ Manager password updated successfully!');
            console.log('Updated user:', updateResult.rows[0]);
            console.log('🔑 Manager quang password is now: admin123');
        } else {
            console.log('❌ Manager user "quang" not found');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

resetManagerPassword(); 