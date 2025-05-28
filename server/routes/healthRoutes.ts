import { Express } from "express";

export function healthRoutes(app: Express) {
    // Health check endpoint
    app.get("/api/health", (req, res) => {
        res.status(200).json({
            status: "ok",
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || "development"
        });
    });
} 