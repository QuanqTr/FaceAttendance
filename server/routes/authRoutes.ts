import { Express } from "express";
import { login, logout, getCurrentUser, forgotPassword, sendFaceAuthVerification, verifyFaceAuthCode } from "../controllers/authController";
import { storage } from "../models/storage";

export function authRoutes(app: Express) {
    // Authentication endpoints
    app.post("/api/login", login);
    app.post("/api/logout", logout);
    app.get("/api/user", getCurrentUser);
    app.post("/api/forgot-password", forgotPassword);

    // Face auth verification endpoints
    app.post("/api/face-auth/send-verification", sendFaceAuthVerification);
    app.post("/api/face-auth/verify-code", verifyFaceAuthCode);

    // Debug route to check users
    app.get("/api/debug/users", async (req, res) => {
        try {
            console.log("🔍 Debug: Checking users in database...");
            const { users } = await storage.getAllUsers(1, 100);

            const debugUsers = users.map(user => ({
                id: user.id,
                username: user.username,
                role: user.role,
                fullName: user.fullName,
                passwordHashType: user.password.startsWith('$2b$') ? 'bcrypt' :
                    user.password.includes('.') ? 'scrypt' : 'unknown',
                passwordPrefix: user.password.substring(0, 20) + '...'
            }));

            console.log("Users found:", debugUsers);
            res.json(debugUsers);
        } catch (error) {
            console.error("Debug users error:", error);
            res.status(500).json({ error: "Debug failed" });
        }
    });
} 