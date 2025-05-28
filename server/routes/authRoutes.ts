import { Express } from "express";
import { login, logout, getCurrentUser, forgotPassword, sendFaceAuthVerification, verifyFaceAuthCode } from "../controllers/authController";

export function authRoutes(app: Express) {
    // Authentication endpoints
    app.post("/api/login", login);
    app.post("/api/logout", logout);
    app.get("/api/user", getCurrentUser);
    app.post("/api/forgot-password", forgotPassword);

    // Face auth verification endpoints
    app.post("/api/face-auth/send-verification", sendFaceAuthVerification);
    app.post("/api/face-auth/verify-code", verifyFaceAuthCode);
} 