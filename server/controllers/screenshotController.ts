import { Request, Response } from "express";
import { saveAttendanceScreenshot, getAttendanceScreenshots, AttendanceScreenshot } from "../services/firebaseService.js";
import "../middlewares/firebase.js"; // Initialize Firebase

// Save attendance screenshot to Firebase
export const saveScreenshot = async (req: Request, res: Response) => {
    try {
        const { name, time, base64Image, employeeId, attendanceType } = req.body;

        // Validate required fields
        if (!name || !time || !base64Image) {
            return res.status(400).json({ 
                error: 'Missing required fields: name, time, base64Image' 
            });
        }

        // Validate base64 image format
        if (!base64Image.startsWith('data:image/')) {
            return res.status(400).json({
                error: 'Invalid base64 image format'
            });
        }

        // Prepare screenshot data
        const screenshotData = {
            name,
            time,
            base64Image,
            employeeId,
            attendanceType
        };

        // Save to Realtime Database
        const screenshotId = await saveAttendanceScreenshot(screenshotData);

        res.status(201).json({
            success: true,
            message: 'Screenshot saved successfully',
            screenshotId,
            data: {
                id: screenshotId,
                ...screenshotData
            }
        });

    } catch (error) {
        console.error('Error saving screenshot:', error);
        res.status(500).json({
            error: 'Failed to save screenshot',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// Get attendance screenshots from Firebase
export const getScreenshots = async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 50;
        
        if (limit > 100) {
            return res.status(400).json({ 
                error: 'Limit cannot exceed 100' 
            });
        }

        const screenshots = await getAttendanceScreenshots(limit);

        res.status(200).json({
            success: true,
            data: screenshots,
            count: screenshots.length
        });

    } catch (error) {
        console.error('Error getting screenshots:', error);
        res.status(500).json({
            error: 'Failed to get screenshots',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// Health check for Realtime Database connection
export const checkFirebaseConnection = async (req: Request, res: Response) => {
    try {
        // Try to read from Realtime Database to test connection
        await getAttendanceScreenshots(1);

        // Get Vietnam time for response
        const vietnamTime = new Date().toLocaleString('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        res.status(200).json({
            success: true,
            message: 'Firebase Realtime Database connection is healthy',
            timestamp: new Date().toISOString(),
            vietnamTime: vietnamTime
        });

    } catch (error) {
        console.error('Firebase Realtime Database connection error:', error);
        res.status(500).json({
            success: false,
            error: 'Firebase Realtime Database connection failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
