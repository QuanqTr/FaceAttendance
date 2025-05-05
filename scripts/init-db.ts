import { db } from "../server/db";
import { users } from "@shared/schema";
import { hashPassword } from "../server/auth";

async function initDb() {
    try {
        // Create admin user
        const adminUser = {
            username: "admin",
            password: await hashPassword("admin123"),
            fullName: "Administrator",
            role: "admin"
        };

        await db.insert(users).values(adminUser);
        console.log("Database initialized successfully!");
    } catch (error) {
        console.error("Error initializing database:", error);
        process.exit(1);
    }
}

initDb(); 