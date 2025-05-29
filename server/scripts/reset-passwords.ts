import { db } from "../db.js";
import { users } from "../../shared/schema.js";
import { eq } from "drizzle-orm";
import { hashPassword } from "../middlewares/auth.js";

async function resetPasswords() {
    console.log("🔄 Resetting passwords...");

    try {
        // Check existing users
        const userList = await db.select().from(users);
        console.log(`👥 Found ${userList.length} users`);

        for (const user of userList) {
            console.log(`User: ${user.username} (${user.role})`);
            console.log(`Password hash: ${user.password.substring(0, 20)}...`);
        }

        // Hash the password "password" using our auth system
        const newPasswordHash = await hashPassword("password");
        console.log(`🔐 New password hash: ${newPasswordHash.substring(0, 30)}...`);

        // Update admin password
        const adminUpdate = await db
            .update(users)
            .set({ password: newPasswordHash })
            .where(eq(users.username, "admin"))
            .returning();

        if (adminUpdate.length > 0) {
            console.log("✅ Admin password updated");
        } else {
            console.log("❌ Admin user not found");
        }

        // Update manager password  
        const managerUpdate = await db
            .update(users)
            .set({ password: newPasswordHash })
            .where(eq(users.username, "quang"))
            .returning();

        if (managerUpdate.length > 0) {
            console.log("✅ Manager password updated");
        } else {
            console.log("❌ Manager user not found");
        }

        console.log("🎉 Password reset complete! Use 'password' to login");

    } catch (error) {
        console.error("❌ Error resetting passwords:", error);
    }
}

resetPasswords(); 