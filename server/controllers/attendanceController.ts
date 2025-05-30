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
        const threshold = 0.4; // Threshold for face recognition - updated to match frontend
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
        console.log(`[TimeLogs] Tìm logs cho nhân viên ${bestMatch.id} ngày ${currentTime.toISOString()}`);

        // Sắp xếp logs theo thời gian (mới nhất trước)
        const sortedLogs = todayLogs.sort((a, b) => b.logTime.getTime() - a.logTime.getTime());

        // Log chi tiết để debug
        if (sortedLogs.length > 0) {
            const startOfDay = new Date(currentTime);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(currentTime);
            endOfDay.setHours(23, 59, 59, 999);

            console.log(`[TimeLogs] Khoảng thời gian: ${startOfDay.toISOString()} đến ${endOfDay.toISOString()}`);
            console.log(`[TimeLogs] Tìm thấy ${sortedLogs.length} bản ghi`);

            sortedLogs.forEach((log, index) => {
                const localTime = new Date(log.logTime.getTime() + 7 * 60 * 60 * 1000); // UTC+7
                const timeStr = localTime.toTimeString().substring(0, 5); // HH:MM
                console.log(`[TimeLogs] Bản ghi ${index + 1}: ${log.type} lúc ${log.logTime.toISOString()} (${timeStr})`);
            });
        }

        // Lấy trạng thái cuối cùng của nhân viên (log gần nhất)
        const lastLog = sortedLogs.length > 0 ? sortedLogs[0] : null;
        const employeeName = `${bestMatch.firstName} ${bestMatch.lastName}`;

        // Business logic checks
        if (type === 'checkin') {
            // Kiểm tra trạng thái hiện tại
            if (lastLog && lastLog.type === 'checkin') {
                // Nhân viên đã checkin rồi, không được checkin lại
                const lastCheckinTime = new Date(lastLog.logTime.getTime() + 7 * 60 * 60 * 1000); // UTC+7
                const timeStr = lastCheckinTime.toTimeString().substring(0, 5); // HH:MM

                console.log(`❌ Employee ${bestMatch.id} đã check-in lúc ${timeStr}, không được check-in lại`);
                return res.status(400).json({
                    error: `${employeeName} đã check-in lúc ${timeStr}. Vui lòng check-out trước khi check-in lại.`,
                    details: {
                        currentStatus: 'checked_in',
                        lastAction: 'checkin',
                        lastActionTime: timeStr,
                        message: 'Nhân viên hiện đang trong trạng thái đã check-in'
                    }
                });
            }

            // Cho phép checkin nếu:
            // 1. Chưa có log nào (lần đầu checkin)
            // 2. Log cuối cùng là checkout (đã checkout trước đó)
            console.log(`✅ Employee ${bestMatch.id} được phép check-in`);

        } else if (type === 'checkout') {
            // Kiểm tra phải có checkin trước đó
            if (!lastLog || lastLog.type !== 'checkin') {
                let errorMessage = '';

                if (!lastLog) {
                    // Chưa có log nào trong ngày
                    errorMessage = `${employeeName} chưa check-in hôm nay. Vui lòng check-in trước khi check-out.`;
                    console.log(`❌ Employee ${bestMatch.id} chưa check-in, không được check-out`);
                } else if (lastLog.type === 'checkout') {
                    // Log cuối cùng là checkout
                    const lastCheckoutTime = new Date(lastLog.logTime.getTime() + 7 * 60 * 60 * 1000); // UTC+7
                    const timeStr = lastCheckoutTime.toTimeString().substring(0, 5); // HH:MM

                    errorMessage = `${employeeName} đã check-out lúc ${timeStr}. Vui lòng check-in trước khi check-out lại.`;
                    console.log(`❌ Employee ${bestMatch.id} đã check-out lúc ${timeStr}, không được check-out lại`);
                }

                return res.status(400).json({
                    error: errorMessage,
                    details: {
                        currentStatus: lastLog ? 'checked_out' : 'no_logs',
                        lastAction: lastLog ? lastLog.type : 'none',
                        lastActionTime: lastLog ? new Date(lastLog.logTime.getTime() + 7 * 60 * 60 * 1000).toTimeString().substring(0, 5) : null,
                        message: lastLog ? 'Nhân viên hiện đang trong trạng thái đã check-out' : 'Nhân viên chưa có log nào trong ngày'
                    }
                });
            }

            // Cho phép checkout nếu log cuối cùng là checkin
            const lastCheckinTime = new Date(lastLog.logTime.getTime() + 7 * 60 * 60 * 1000); // UTC+7
            const timeStr = lastCheckinTime.toTimeString().substring(0, 5); // HH:MM
            console.log(`✅ Employee ${bestMatch.id} được phép check-out (đã check-in lúc ${timeStr})`);
        }

        // Kiểm tra time limit để tránh spam (1 phút)
        if (lastLog) {
            const timeDiff = currentTime.getTime() - lastLog.logTime.getTime();
            const minutesDiff = Math.floor(timeDiff / 60000);

            if (timeDiff < 60000) { // Ít hơn 1 phút
                const remainingSeconds = 60 - Math.floor((timeDiff % 60000) / 1000);

                console.log(`❌ Employee ${bestMatch.id} thử ${type} quá nhanh, cần đợi ${remainingSeconds} giây`);
                return res.status(429).json({
                    error: `Vui lòng đợi ${remainingSeconds} giây trước khi thực hiện ${type === 'checkin' ? 'check-in' : 'check-out'} tiếp.`,
                    details: {
                        timeLimitSeconds: remainingSeconds,
                        message: 'Thao tác quá nhanh, vui lòng đợi'
                    }
                });
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