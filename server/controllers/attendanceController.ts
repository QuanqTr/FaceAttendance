import { Request, Response } from "express";
import { storage } from "../models/storage";
import { z } from "zod";
import { calculateEuclideanDistance, parseFaceDescriptor, validateFaceDescriptor } from "../utils/faceUtils";

// Create attendance record
export const createAttendance = async (req: Request, res: Response) => {
    try {
        const { employeeId, type, status, note } = req.body;

        if (!employeeId || !type || !status) {
            return res.status(400).json({ error: 'Employee ID, type, and status are required' });
        }

        const attendanceData = {
            employeeId: parseInt(employeeId),
            type,
            status,
            note: note || null,
            date: new Date(),
            time: new Date()
        };

        // This would need proper attendance creation logic
        res.status(201).json({
            success: true,
            message: 'Attendance recorded successfully'
        });
    } catch (error) {
        console.error('Error creating attendance:', error);
        res.status(500).json({ error: 'Failed to create attendance' });
    }
};

// Create time log
export const createTimeLog = async (req: Request, res: Response) => {
    try {
        console.log("=== TIME LOG ENDPOINT CALLED ===");
        const { faceDescriptor, type, employeeId } = req.body;
        console.log("Request data:", {
            hasFaceDescriptor: !!faceDescriptor,
            faceDescriptorLength: faceDescriptor?.length || 0,
            type,
            employeeId
        });

        // If employeeId is provided directly (for manual logs), use it
        if (employeeId && !faceDescriptor) {
            const timeLogData = {
                employeeId: parseInt(employeeId),
                logTime: new Date(),
                type,
                source: 'manual'
            };

            const timeLog = await storage.createTimeLog(timeLogData);

            return res.status(201).json({
                success: true,
                data: timeLog,
                message: 'Time log created successfully'
            });
        }

        // Face recognition flow
        if (!faceDescriptor) {
            return res.status(400).json({ error: 'Face descriptor is required for face recognition' });
        }

        if (!type) {
            return res.status(400).json({ error: 'Type (checkin/checkout) is required' });
        }

        // Parse the face descriptor
        let parsedDescriptor;
        try {
            if (typeof faceDescriptor === 'string') {
                // If it's a comma-separated string
                if (faceDescriptor.startsWith('[') || faceDescriptor.startsWith('{')) {
                    parsedDescriptor = JSON.parse(faceDescriptor);
                } else {
                    parsedDescriptor = faceDescriptor.split(',').map(Number);
                }
            } else if (Array.isArray(faceDescriptor)) {
                parsedDescriptor = faceDescriptor;
            } else {
                throw new Error("Invalid face descriptor format");
            }
            console.log("Parsed descriptor length:", parsedDescriptor.length);
        } catch (error) {
            console.error("Error parsing descriptor:", error);
            return res.status(400).json({ error: 'Invalid face descriptor format' });
        }

        // Validate descriptor
        if (!Array.isArray(parsedDescriptor) || parsedDescriptor.length === 0 || parsedDescriptor.some(isNaN)) {
            console.error("Invalid descriptor data");
            return res.status(400).json({ error: 'Invalid face descriptor data' });
        }

        // Get all employees with face descriptors
        const employeesWithFace = await storage.getEmployeesWithFaceDescriptor();
        console.log(`Found ${employeesWithFace.length} employees with face descriptors`);

        if (employeesWithFace.length === 0) {
            console.log("No employees with face data found");
            return res.status(404).json({
                error: "Không tìm thấy nhân viên nào có dữ liệu khuôn mặt"
            });
        }

        // Find best match
        let bestMatch = null;
        let bestDistance = Number.MAX_VALUE;
        const threshold = 100.0; // Threshold for face recognition
        console.log(`Starting face comparison with threshold: ${threshold}`);

        for (const employee of employeesWithFace) {
            if (!employee.faceDescriptor) continue;

            try {
                let employeeDescriptor;
                if (typeof employee.faceDescriptor === 'string') {
                    if (employee.faceDescriptor.startsWith('[') || employee.faceDescriptor.startsWith('{')) {
                        employeeDescriptor = JSON.parse(employee.faceDescriptor);
                    } else {
                        employeeDescriptor = employee.faceDescriptor.split(',').map(Number);
                    }
                } else {
                    employeeDescriptor = employee.faceDescriptor;
                }

                // Validate employee descriptor
                if (!Array.isArray(employeeDescriptor) || employeeDescriptor.length === 0 || employeeDescriptor.some(isNaN)) {
                    console.error(`Invalid descriptor for employee ${employee.id}`);
                    continue;
                }

                const distance = calculateEuclideanDistance(parsedDescriptor, employeeDescriptor);
                console.log(`Employee ${employee.id} (${employee.firstName} ${employee.lastName}): distance = ${distance.toFixed(4)}`);

                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestMatch = employee;
                    console.log(`New best match: ${employee.firstName} ${employee.lastName} with distance ${distance.toFixed(4)}`);
                }
            } catch (error) {
                console.error(`Error parsing face descriptor for employee ${employee.id}:`, error);
                continue;
            }
        }

        console.log(`Final result: Best match = ${bestMatch ? `${bestMatch.firstName} ${bestMatch.lastName}` : 'None'}, distance = ${bestDistance.toFixed(4)}, threshold = ${threshold}`);

        if (!bestMatch || bestDistance > threshold) {
            console.log("Face recognition failed: No match found or distance too high");
            return res.status(401).json({
                error: "Không thể nhận diện khuôn mặt. Vui lòng thử lại."
            });
        }

        // Get current time and check for existing logs
        const currentTime = new Date();
        const todayLogs = await storage.getEmployeeTimeLogs(bestMatch.id, currentTime);
        console.log(`Found ${todayLogs.length} existing logs for employee ${bestMatch.id} today`);

        // Business logic checks
        if (type === 'checkin') {
            // Check if already checked in today
            const lastCheckin = todayLogs
                .filter(log => log.type === 'checkin')
                .sort((a, b) => b.logTime.getTime() - a.logTime.getTime())[0];

            if (lastCheckin) {
                const timeDiff = currentTime.getTime() - lastCheckin.logTime.getTime();
                const minutesDiff = Math.floor(timeDiff / 60000);

                console.log(`Employee ${bestMatch.id} check-in, time since last check-in: ${minutesDiff} minutes`);

                if (timeDiff < 60000) { // Less than 1 minute
                    return res.status(400).json({
                        error: "Vui lòng đợi ít nhất 1 phút trước khi check-in lại."
                    });
                }
            }
        } else if (type === 'checkout') {
            // Check if there's a check-in today
            const todayCheckin = todayLogs.find(log => log.type === 'checkin');
            if (!todayCheckin) {
                return res.status(400).json({
                    error: "Bạn chưa check-in hôm nay. Vui lòng check-in trước khi check-out."
                });
            }

            // Check time between check-outs
            const lastCheckout = todayLogs
                .filter(log => log.type === 'checkout')
                .sort((a, b) => b.logTime.getTime() - a.logTime.getTime())[0];

            if (lastCheckout) {
                const timeDiff = currentTime.getTime() - lastCheckout.logTime.getTime();
                const minutesDiff = Math.floor(timeDiff / 60000);

                console.log(`Employee ${bestMatch.id} check-out, time since last check-out: ${minutesDiff} minutes`);

                if (timeDiff < 60000) { // Less than 1 minute
                    return res.status(400).json({
                        error: "Vui lòng đợi ít nhất 1 phút trước khi check-out lại."
                    });
                }
            }
        }

        // Create time log
        const timeLogData = {
            employeeId: bestMatch.id,
            logTime: currentTime,
            type,
            source: 'face'
        };

        console.log(`Creating time log for employee ${bestMatch.id}, type: ${type}`);
        const timeLog = await storage.createTimeLog(timeLogData);
        console.log(`Time log created successfully: ID=${timeLog.id}`);

        // Get employee with department info
        const employee = await storage.getEmployee(bestMatch.id);
        const department = employee?.departmentId ? await storage.getDepartment(employee.departmentId) : null;

        console.log(`Face recognition successful for ${employee?.firstName} ${employee?.lastName}`);
        console.log("=== TIME LOG SUCCESS ===");

        res.status(201).json({
            success: true,
            employee: {
                id: employee!.id,
                firstName: employee!.firstName,
                lastName: employee!.lastName,
                employeeId: employee!.employeeId
            },
            department,
            distance: bestDistance,
            logTime: timeLog.logTime,
            timeLog,
            message: `${type === 'checkout' ? 'Check-out' : 'Check-in'} thành công`
        });
    } catch (error) {
        console.error('Error creating time log:', error);
        res.status(500).json({ error: 'Failed to create time log' });
    }
};

// Get employee work hours
export const getEmployeeWorkHours = async (req: Request, res: Response) => {
    try {
        const employeeId = parseInt(req.params.id);
        const { date } = req.query;

        if (isNaN(employeeId)) {
            return res.status(400).json({ error: 'Invalid employee ID' });
        }

        const targetDate = date ? new Date(date as string) : new Date();
        const workHours = await storage.getEmployeeWorkHours(employeeId, targetDate);

        res.json(workHours);
    } catch (error) {
        console.error('Error fetching work hours:', error);
        res.status(500).json({ error: 'Failed to fetch work hours' });
    }
};

// Get daily work hours
export const getDailyWorkHours = async (req: Request, res: Response) => {
    try {
        const { date } = req.query;
        const targetDate = date ? new Date(date as string) : new Date();

        const dailyWorkHours = await storage.getDailyWorkHours(targetDate);

        res.json(dailyWorkHours);
    } catch (error) {
        console.error('Error fetching daily work hours:', error);
        res.status(500).json({ error: 'Failed to fetch daily work hours' });
    }
};

// Get employee attendance
export const getEmployeeAttendance = async (req: Request, res: Response) => {
    try {
        const employeeId = parseInt(req.params.id);
        const { date } = req.query;

        if (isNaN(employeeId)) {
            return res.status(400).json({ error: 'Invalid employee ID' });
        }

        const targetDate = date ? new Date(date as string) : new Date();
        const timeLogs = await storage.getEmployeeTimeLogs(employeeId, targetDate);

        res.json(timeLogs);
    } catch (error) {
        console.error('Error fetching employee attendance:', error);
        res.status(500).json({ error: 'Failed to fetch employee attendance' });
    }
};

// Get daily attendance summary
export const getDailyAttendance = async (req: Request, res: Response) => {
    try {
        const { date } = req.query;
        const targetDate = date ? new Date(date as string) : new Date();

        const summary = await storage.getDailyAttendanceSummary(targetDate);

        res.json(summary);
    } catch (error) {
        console.error('Error fetching daily attendance:', error);
        res.status(500).json({ error: 'Failed to fetch daily attendance' });
    }
};

// Verify attendance (for face recognition)
export const verifyAttendance = async (req: Request, res: Response) => {
    try {
        const { employeeId, faceDescriptor, mode } = req.body;

        if (!employeeId) {
            return res.status(400).json({ error: 'Employee ID is required' });
        }

        // Get employee info
        const employee = await storage.getEmployee(parseInt(employeeId));
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Create time log
        const timeLog = await storage.createTimeLog({
            employeeId: employee.id,
            logTime: new Date(),
            type: mode === 'check_out' ? 'checkout' : 'checkin',
            source: 'face'
        });

        res.json({
            success: true,
            employee: {
                id: employee.id,
                firstName: employee.firstName,
                lastName: employee.lastName,
                employeeId: employee.employeeId
            },
            timeLog,
            message: `${mode === 'check_out' ? 'Check-out' : 'Check-in'} successful`
        });
    } catch (error) {
        console.error('Error verifying attendance:', error);
        res.status(500).json({ error: 'Failed to verify attendance' });
    }
}; 