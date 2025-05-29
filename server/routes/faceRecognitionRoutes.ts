import { Express } from "express";
import { ensureAuthenticated } from "../middlewares/auth";
import {
    recognizeFace,
    uploadFaceData,
    getEmployeesWithFace,
    logFaceRecognition,
    getEmployeeFaceRecognitionLogs,
    getFaceRecognitionLogWithImage,
    getFaceRecognitionStats
} from "../controllers/faceRecognitionController";

export function faceRecognitionRoutes(app: Express) {
    // Face recognition endpoints

    // Face recognition for attendance
    app.post("/api/face-recognition", recognizeFace);

    // Upload face data for employee
    app.post("/api/face-data", ensureAuthenticated, uploadFaceData);

    // Get employees with face data
    app.get("/api/employees/with-face", ensureAuthenticated, getEmployeesWithFace);

    // Face recognition logging endpoints

    // Log face recognition attempt (checkin/checkout)
    app.post("/api/face-recognition/log", ensureAuthenticated, logFaceRecognition);

    // Get face recognition logs for an employee
    app.get("/api/face-recognition/logs/employee/:employeeId", ensureAuthenticated, getEmployeeFaceRecognitionLogs);

    // Get specific face recognition log with image
    app.get("/api/face-recognition/logs/:logId", ensureAuthenticated, getFaceRecognitionLogWithImage);

    // Get face recognition statistics
    app.get("/api/face-recognition/stats", ensureAuthenticated, getFaceRecognitionStats);

    // Development/Testing endpoints
    if (process.env.NODE_ENV === "development") {
        console.log("🚧 Development mode: Face recognition test endpoints enabled");

        // Test endpoint to create sample face recognition log
        app.post("/api/test/face-recognition/create-sample", async (req, res) => {
            try {
                const sampleData = {
                    employeeId: 3, // Employee Tuấn Anh
                    success: true,
                    confidenceScore: 0.95,
                    imageBase64: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...", // Sample base64
                    type: "checkin"
                };

                // Call the log function directly
                req.body = sampleData;
                await logFaceRecognition(req, res);
            } catch (error) {
                res.status(500).json({
                    error: 'Failed to create sample face recognition log',
                    details: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // Test endpoint to create failed recognition log
        app.post("/api/test/face-recognition/create-failed", async (req, res) => {
            try {
                const sampleData = {
                    employeeId: 4, // Employee Thanh
                    success: false,
                    confidenceScore: 0.45,
                    imageBase64: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...", // Sample base64
                    errorMessage: "Face not recognized - confidence too low",
                    type: "checkin"
                };

                // Call the log function directly
                req.body = sampleData;
                await logFaceRecognition(req, res);
            } catch (error) {
                res.status(500).json({
                    error: 'Failed to create sample failed recognition log',
                    details: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
    }
} 