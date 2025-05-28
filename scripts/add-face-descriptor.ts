import 'dotenv/config';
import { db } from '../server/db';
import { employees } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Face descriptor mẫu (128 số thực)
const sampleFaceDescriptor = [
    0.1234, -0.5678, 0.9012, -0.3456, 0.7890, -0.1234, 0.5678, -0.9012,
    0.3456, -0.7890, 0.1234, -0.5678, 0.9012, -0.3456, 0.7890, -0.1234,
    0.5678, -0.9012, 0.3456, -0.7890, 0.1234, -0.5678, 0.9012, -0.3456,
    0.7890, -0.1234, 0.5678, -0.9012, 0.3456, -0.7890, 0.1234, -0.5678,
    0.9012, -0.3456, 0.7890, -0.1234, 0.5678, -0.9012, 0.3456, -0.7890,
    0.1234, -0.5678, 0.9012, -0.3456, 0.7890, -0.1234, 0.5678, -0.9012,
    0.3456, -0.7890, 0.1234, -0.5678, 0.9012, -0.3456, 0.7890, -0.1234,
    0.5678, -0.9012, 0.3456, -0.7890, 0.1234, -0.5678, 0.9012, -0.3456,
    0.7890, -0.1234, 0.5678, -0.9012, 0.3456, -0.7890, 0.1234, -0.5678,
    0.9012, -0.3456, 0.7890, -0.1234, 0.5678, -0.9012, 0.3456, -0.7890,
    0.1234, -0.5678, 0.9012, -0.3456, 0.7890, -0.1234, 0.5678, -0.9012,
    0.3456, -0.7890, 0.1234, -0.5678, 0.9012, -0.3456, 0.7890, -0.1234,
    0.5678, -0.9012, 0.3456, -0.7890, 0.1234, -0.5678, 0.9012, -0.3456,
    0.7890, -0.1234, 0.5678, -0.9012, 0.3456, -0.7890, 0.1234, -0.5678,
    0.9012, -0.3456, 0.7890, -0.1234, 0.5678, -0.9012, 0.3456, -0.7890,
    0.1234, -0.5678, 0.9012, -0.3456, 0.7890, -0.1234, 0.5678, -0.9012
];

async function addFaceDescriptor() {
    try {
        console.log('🔍 Đang tìm nhân viên để thêm face descriptor...');

        // Lấy tất cả nhân viên
        const allEmployees = await db.select().from(employees);
        console.log(`📊 Tìm thấy ${allEmployees.length} nhân viên`);

        if (allEmployees.length === 0) {
            console.log('❌ Không có nhân viên nào trong database');

            // Tạo nhân viên test
            console.log('🔧 Tạo nhân viên test...');
            const [newEmployee] = await db.insert(employees).values({
                employeeId: 'EMP001',
                firstName: 'Nguyễn',
                lastName: 'Văn A',
                email: 'test@company.com',
                phone: '0123456789',
                position: 'Nhân viên',
                status: 'active'
            }).returning();

            console.log(`✅ Đã tạo nhân viên: ${newEmployee.firstName} ${newEmployee.lastName} (ID: ${newEmployee.id})`);

            // Thêm face descriptor cho nhân viên mới
            await db.update(employees)
                .set({ faceDescriptor: JSON.stringify(sampleFaceDescriptor) })
                .where(eq(employees.id, newEmployee.id));

            console.log(`🎯 Đã thêm face descriptor cho nhân viên ${newEmployee.firstName} ${newEmployee.lastName}`);
        } else {
            // Lấy nhân viên đầu tiên chưa có face descriptor
            const employeeWithoutFace = allEmployees.find(emp => !emp.faceDescriptor);

            if (employeeWithoutFace) {
                console.log(`🎯 Thêm face descriptor cho nhân viên: ${employeeWithoutFace.firstName} ${employeeWithoutFace.lastName}`);

                await db.update(employees)
                    .set({ faceDescriptor: JSON.stringify(sampleFaceDescriptor) })
                    .where(eq(employees.id, employeeWithoutFace.id));

                console.log(`✅ Đã thêm face descriptor cho nhân viên ${employeeWithoutFace.firstName} ${employeeWithoutFace.lastName}`);
            } else {
                console.log('ℹ️ Tất cả nhân viên đã có face descriptor');

                // Hiển thị danh sách nhân viên có face descriptor
                const employeesWithFace = allEmployees.filter(emp => emp.faceDescriptor);
                console.log(`📋 Nhân viên có face descriptor:`);
                employeesWithFace.forEach(emp => {
                    console.log(`  - ${emp.firstName} ${emp.lastName} (ID: ${emp.id})`);
                });
            }
        }

        // Kiểm tra kết quả
        const updatedEmployees = await db.select().from(employees);
        const withFace = updatedEmployees.filter(emp => emp.faceDescriptor);
        console.log(`\n📊 Kết quả: ${withFace.length}/${updatedEmployees.length} nhân viên có face descriptor`);

        console.log('\n🎉 Hoàn thành! Bây giờ bạn có thể test face recognition.');

    } catch (error) {
        console.error('❌ Lỗi:', error);
    }
}

addFaceDescriptor().then(() => {
    process.exit(0);
}).catch(error => {
    console.error('❌ Script error:', error);
    process.exit(1);
}); 