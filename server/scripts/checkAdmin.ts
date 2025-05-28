import { db } from "../db.js";
import { users } from "../../shared/schema.js";
import { eq } from "drizzle-orm";

async function checkAdminUser() {
    console.log("🔍 Checking admin user...");

    try {
        const adminUser = await db.select().from(users).where(eq(users.username, "admin"));

        if (adminUser.length > 0) {
            console.log("✅ Admin user found:");
            console.log("Username:", adminUser[0].username);
            console.log("Full Name:", adminUser[0].fullName);
            console.log("Role:", adminUser[0].role);
            console.log("Password hash:", adminUser[0].password.substring(0, 20) + "...");
        } else {
            console.log("❌ Admin user not found");
        }

        // Check all managers
        const managers = await db.select().from(users).where(eq(users.role, "manager"));
        console.log("\n📋 Managers found:", managers.length);
        managers.forEach(m => {
            console.log(`- ${m.username} (${m.fullName})`);
        });

    } catch (error) {
        console.error("❌ Error:", error);
    }
}

checkAdminUser(); 