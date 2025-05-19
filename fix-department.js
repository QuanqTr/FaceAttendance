import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();
const { Pool } = pg;

async function main() {
    try {
        console.log('Kết nối đến database...');

        // Kết nối đến database
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            connectionTimeoutMillis: 5000
        });

        console.log('Kết nối thành công!');
        console.log(`Cấu hình kết nối: DATABASE_URL=${process.env.DATABASE_URL ? '***' : 'not set'}`);

        // Kiểm tra kết nối
        const client = await pool.connect();
        console.log('Client connected');

        // Lấy danh sách tất cả phòng ban
        console.log('Lấy danh sách phòng ban:');
        const departments = await client.query('SELECT * FROM departments ORDER BY id');
        console.log(departments.rows);

        // Lấy phòng ban ID = 1
        console.log('\nLấy phòng ban ID = 1:');
        const department1 = await client.query('SELECT * FROM departments WHERE id = 1');
        console.log(department1.rows);

        // Kiểm tra cấu trúc bảng
        console.log('\nKiểm tra cấu trúc bảng departments:');
        const tableStructure = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'departments'
    `);
        console.log(tableStructure.rows);

        // Tạo một phòng ban mới
        const newDepartment = {
            name: 'TEST',
            description: 'Test Department'
        };

        console.log('\nTạo phòng ban mới:', newDepartment);
        const insertResult = await client.query(
            'INSERT INTO departments (name, description, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING *',
            [newDepartment.name, newDepartment.description]
        );
        console.log('Kết quả tạo phòng ban mới:', insertResult.rows[0]);

        // Cập nhật phòng ban
        const updatedId = insertResult.rows[0].id;
        console.log(`\nCập nhật phòng ban ID = ${updatedId}:`);
        const updateResult = await client.query(
            'UPDATE departments SET description = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            ['Updated Test Department', updatedId]
        );
        console.log('Kết quả cập nhật:', updateResult.rows[0]);

        // Xóa phòng ban test
        console.log(`\nXóa phòng ban ID = ${updatedId}:`);
        const deleteResult = await client.query(
            'DELETE FROM departments WHERE id = $1 RETURNING id',
            [updatedId]
        );
        console.log('Kết quả xóa:', deleteResult.rows);

        client.release();
        await pool.end();

        console.log('\nHoàn thành!');
    } catch (error) {
        console.error('Lỗi:', error);
    }
}

main(); 