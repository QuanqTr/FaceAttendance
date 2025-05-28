import { Express } from "express";
import { ensureAuthenticated } from "../middlewares/auth";
import {
    recognizeFace,
    uploadFaceData,
    getEmployeesWithFace
} from "../controllers/faceRecognitionController";

export function faceRecognitionRoutes(app: Express) {
    // Face recognition endpoints

    // Face recognition for attendance
    app.post("/api/face-recognition", recognizeFace);

    // Upload face data for employee
    app.post("/api/face-data", ensureAuthenticated, uploadFaceData);

    // Get employees with face data
    app.get("/api/employees/with-face", ensureAuthenticated, getEmployeesWithFace);
} 