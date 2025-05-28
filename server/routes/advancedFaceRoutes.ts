import { Express } from "express";
import { ensureAuthenticated } from "../middlewares/auth";
import {
    faceRecognitionVerify,
    faceRegistration,
    getEmployeeFaceData,
    deleteEmployeeFaceData,
    updateEmployeeFaceProfile
} from "../controllers/advancedFaceController";

export function advancedFaceRoutes(app: Express) {
    // Advanced face recognition endpoints

    // Face recognition verify (with mode check)
    app.post("/api/face-recognition/verify", faceRecognitionVerify);

    // Face registration
    app.post("/api/face-registration", faceRegistration);

    // Employee face data management (no auth for testing)
    app.get("/api/employees/:id/face-data", getEmployeeFaceData);
    app.delete("/api/employees/:employeeId/face-data", ensureAuthenticated, deleteEmployeeFaceData);

    // Employee face profile - COMMENTED OUT to avoid conflict with faceRoutes
    // app.post("/api/employees/:id/face-profile", updateEmployeeFaceProfile);
} 