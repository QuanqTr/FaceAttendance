import { db } from "../db.js";
import { users, departments, employees } from "../../shared/schema.js";

async function testDatabase() {
    console.log("🔍 Testing database connection...");

    try {
        // Check users
        const userList = await db.select().from(users);
        console.log(`👥 Users found: ${userList.length}`);
        if (userList.length > 0) {
            console.log("Users:", userList.map(u => `${u.username} (${u.role})`));
        }

        // Check departments 
        const deptList = await db.select().from(departments);
        console.log(`🏢 Departments found: ${deptList.length}`);
        if (deptList.length > 0) {
            console.log("Departments:", deptList.slice(0, 3).map(d => d.name));
        }

        // Check employees
        const empList = await db.select().from(employees);
        console.log(`👨‍💼 Employees found: ${empList.length}`);
        if (empList.length > 0) {
            console.log("Employees:", empList.slice(0, 3).map(e => `${e.firstName} ${e.lastName}`));
        }

        if (userList.length === 0) {
            console.log("📝 No users found, adding admin and manager users...");
            await addBasicData();
        } else {
            console.log("✅ Database has data! APIs should work now.");
        }

    } catch (error) {
        console.error("❌ Database connection error:", error);
    }
}

async function addBasicData() {
    try {
        // Add admin user with simple password
        const hashedPassword = "$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"; // 'password'

        const adminUser = await db.insert(users).values({
            username: "admin",
            password: hashedPassword,
            fullName: "Administrator",
            role: "admin"
        }).returning();

        console.log("✅ Added admin user:", adminUser[0]);

        // Add manager user
        const managerUser = await db.insert(users).values({
            username: "manager",
            password: hashedPassword,
            fullName: "Manager",
            role: "manager"
        }).returning();

        console.log("✅ Added manager user:", managerUser[0]);

        console.log("🎉 Basic data added successfully!");
        console.log("Login: admin / password or manager / password");

    } catch (error) {
        console.error("❌ Error adding basic data:", error);
    }
}

testDatabase(); 