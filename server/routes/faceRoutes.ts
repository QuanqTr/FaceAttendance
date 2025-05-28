import { Express } from "express";
import { ensureAuthenticated } from "../middlewares/auth";
import {
    updateEmployeeFaceDescriptor,
    getEmployeeFaceStatus,
    removeEmployeeFaceDescriptor,
    uploadFaceProfile,
    getEmployeeFaceData,
    resetEmployeeFaceData
} from "../controllers/faceController";

export function faceRoutes(app: Express) {
    // Face descriptor management endpoints

    // Get employee face descriptor status
    app.get("/api/employees/:id/face", ensureAuthenticated, getEmployeeFaceStatus);

    // Update employee face descriptor
    app.put("/api/employees/:id/face", ensureAuthenticated, updateEmployeeFaceDescriptor);

    // Remove employee face descriptor  
    app.delete("/api/employees/:id/face", ensureAuthenticated, removeEmployeeFaceDescriptor);

    // Legacy endpoints from old server (without authentication for face-profile)

    // Upload face image and save face profile (from old server - no auth needed)
    app.post("/api/employees/:id/face-profile", uploadFaceProfile);

    // Get employee face data (from old server - no auth for testing)
    app.get("/api/employees/:id/face-data", getEmployeeFaceData);

    // Test endpoint without auth
    app.get("/api/test/employees/:id/face-data", getEmployeeFaceData);

    // Reset employee face data (with auth)
    app.delete("/api/employees/:employeeId/face-data", ensureAuthenticated, resetEmployeeFaceData);
} 