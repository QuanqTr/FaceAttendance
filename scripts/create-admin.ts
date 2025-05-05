import { db } from "../server/db";
import { users } from "@shared/schema";
import { hashPassword } from "../server/auth";

async function createAdmin() {
    try {
        const adminUser = {
            username: "admin",
            password: await hashPassword("admin123"),
            fullName: "Administrator",
            role: "admin"
        };

        await db.insert(users).values(adminUser);
        console.log("Admin user created successfully!");
    } catch (error) {
        console.error("Error creating admin user:", error);
    }
}

createAdmin(); 