import { db } from "../db.js";
import { users, departments, employees } from "../../shared/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

async function addSampleData() {
    console.log("🌱 Adding sample data to database...");

    try {
        // Add sample departments
        console.log("Adding departments...");
        const depts = await db.insert(departments).values([
            {
                name: "Công Nghệ Thông Tin",
                description: "Phòng ban phát triển phần mềm và hệ thống"
            },
            {
                name: "Nhân Sự",
                description: "Phòng ban quản lý nhân sự và tuyển dụng"
            },
            {
                name: "Kế Toán",
                description: "Phòng ban tài chính và kế toán"
            }
        ]).returning();

        console.log("✅ Added departments:", depts.length);

        // Add sample employees
        console.log("Adding employees...");
        const emps = await db.insert(employees).values([
            {
                employeeId: "EMP001",
                firstName: "Nguyễn",
                lastName: "Văn An",
                email: "nguyen.van.an@company.com",
                phone: "0901234567",
                departmentId: depts[0].id,
                position: "Software Developer",
                status: "active",
                joinDate: "2023-01-15"
            },
            {
                employeeId: "EMP002",
                firstName: "Trần",
                lastName: "Thị Bích",
                email: "tran.thi.bich@company.com",
                phone: "0901234568",
                departmentId: depts[0].id,
                position: "Senior Developer",
                status: "active",
                joinDate: "2022-06-10"
            },
            {
                employeeId: "EMP003",
                firstName: "Lê",
                lastName: "Văn Cao",
                email: "le.van.cao@company.com",
                phone: "0901234569",
                departmentId: depts[1].id,
                position: "HR Manager",
                status: "active",
                joinDate: "2023-03-20"
            },
            {
                employeeId: "EMP004",
                firstName: "Phạm",
                lastName: "Thị Dung",
                email: "pham.thi.dung@company.com",
                phone: "0901234570",
                departmentId: depts[2].id,
                position: "Accountant",
                status: "active",
                joinDate: "2023-05-01"
            }
        ]).returning();

        console.log("✅ Added employees:", emps.length);

        // Add sample users (admin and managers)
        console.log("Adding users...");
        const hashedPassword = await bcrypt.hash("123456", 10);

        const usersToAdd = await db.insert(users).values([
            {
                username: "admin",
                password: hashedPassword,
                fullName: "Administrator",
                role: "admin",
                employeeId: null
            },
            {
                username: "manager1",
                password: hashedPassword,
                fullName: "Manager One",
                role: "manager",
                employeeId: emps[1].id // Senior Developer as manager
            },
            {
                username: "manager2",
                password: hashedPassword,
                fullName: "Manager Two",
                role: "manager",
                employeeId: emps[2].id // HR Manager
            },
            {
                username: "employee1",
                password: hashedPassword,
                fullName: "Employee One",
                role: "employee",
                employeeId: emps[0].id
            },
            {
                username: "employee2",
                password: hashedPassword,
                fullName: "Employee Two",
                role: "employee",
                employeeId: emps[3].id
            }
        ]).returning();

        console.log("✅ Added users:", usersToAdd.length);

        // Update departments to have managers
        console.log("Updating department managers...");
        await db.update(departments)
            .set({ managerId: usersToAdd[1].id }) // manager1
            .where(eq(departments.id, depts[0].id));

        await db.update(departments)
            .set({ managerId: usersToAdd[2].id }) // manager2  
            .where(eq(departments.id, depts[1].id));

        console.log("✅ Updated department managers");

        console.log("🎉 Sample data added successfully!");
        console.log("\n📋 Login credentials:");
        console.log("Admin: admin / 123456");
        console.log("Manager: manager1 / 123456 or manager2 / 123456");
        console.log("Employee: employee1 / 123456 or employee2 / 123456");

    } catch (error) {
        console.error("❌ Error adding sample data:", error);
        throw error;
    }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    addSampleData()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

export { addSampleData }; 