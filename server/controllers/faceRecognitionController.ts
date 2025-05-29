import { Request, Response } from "express";
import { storage } from "../models/storage";
import { calculateEuclideanDistance, parseFaceDescriptor, validateFaceDescriptor } from "../utils/faceUtils";
import { db } from "../db.js";
import { faceRecognitionLogs, timeLogs, employees } from "../../shared/schema.js";
import { eq, and, desc } from "drizzle-orm";

// Face recognition for attendance
export const recognizeFace = async (req: Request, res: Response) => {
    try {
        const { imageData, type = 'checkin' } = req.body;

        if (!imageData) {
            return res.status(400).json({ error: 'Image data is required' });
        }

        console.log(`🎭 Face recognition attempt for ${type}`);

        // Get all employees with face data using correct API
        const employeesResult = await storage.getAllEmployees(1, 1000); // Get first 1000 employees
        const employeesWithFace = employeesResult.employees.filter((emp: any) => emp.faceDescriptor);

        if (employeesWithFace.length === 0) {
            const errorMsg = 'No employees with face data found';
            console.log(`❌ ${errorMsg}`);

            // Log failed attempt (no employee ID available)
            await logFailedRecognition(null, imageData, errorMsg, type);

            return res.status(404).json({ error: errorMsg });
        }

        console.log(`🔍 Checking against ${employeesWithFace.length} employees with face data`);

        // Parse input face descriptor from base64 image
        const inputDescriptor = parseFaceDescriptor(imageData);
        if (!inputDescriptor) {
            const errorMsg = 'Could not extract face descriptor from image';
            console.log(`❌ ${errorMsg}`);

            await logFailedRecognition(null, imageData, errorMsg, type);

            return res.status(400).json({ error: errorMsg });
        }

        let bestMatch = null;
        let minDistance = Infinity;
        const threshold = 0.6; // Face recognition threshold

        // Compare with all employees
        for (const employee of employeesWithFace) {
            try {
                if (!employee.faceDescriptor) {
                    console.log(`⚠️ No face descriptor for employee ${employee.id}`);
                    continue;
                }

                const storedDescriptor = parseFaceDescriptor(employee.faceDescriptor);
                if (!storedDescriptor) {
                    console.log(`⚠️ Invalid face descriptor for employee ${employee.id}`);
                    continue;
                }

                const distance = calculateEuclideanDistance(inputDescriptor, storedDescriptor);
                console.log(`👤 Employee ${employee.firstName} ${employee.lastName} (ID: ${employee.id}): distance = ${distance.toFixed(4)}`);

                if (distance < minDistance && distance < threshold) {
                    minDistance = distance;
                    bestMatch = {
                        employee,
                        distance,
                        confidence: Math.max(0, (1 - distance / threshold) * 100) // Convert to confidence percentage
                    };
                }
            } catch (error) {
                console.error(`❌ Error comparing with employee ${employee.id}:`, error);
            }
        }

        if (bestMatch) {
            const { employee, distance, confidence } = bestMatch;
            console.log(`✅ Face recognized: ${employee.firstName} ${employee.lastName} (confidence: ${confidence.toFixed(1)}%)`);

            try {
                // Log successful recognition to face_recognition_logs table
                await logSuccessfulRecognition(
                    employee.id,
                    imageData,
                    confidence / 100, // Convert back to decimal
                    type as 'checkin' | 'checkout'
                );

                // Create time log entry
                await storage.createTimeLog({
                    employeeId: employee.id,
                    logTime: new Date(),
                    type: type,
                    source: 'face'
                });

                console.log(`⏰ Time log created for ${type} - Employee: ${employee.firstName} ${employee.lastName}`);

                return res.json({
                    success: true,
                    employee: {
                        id: employee.id,
                        firstName: employee.firstName,
                        lastName: employee.lastName,
                        position: employee.position,
                        departmentName: employee.departmentName
                    },
                    confidence: Math.round(confidence * 10) / 10,
                    distance: Math.round(distance * 10000) / 10000,
                    type: type,
                    timestamp: new Date().toISOString(),
                    message: `${type === 'checkin' ? 'Check-in' : 'Check-out'} successful for ${employee.firstName} ${employee.lastName}`
                });
            } catch (logError) {
                console.error('❌ Error logging recognition or creating time log:', logError);
                // Still return success since recognition worked
                return res.json({
                    success: true,
                    employee: {
                        id: employee.id,
                        firstName: employee.firstName,
                        lastName: employee.lastName,
                        position: employee.position,
                        departmentName: employee.departmentName
                    },
                    confidence: Math.round(confidence * 10) / 10,
                    distance: Math.round(distance * 10000) / 10000,
                    type: type,
                    timestamp: new Date().toISOString(),
                    message: `${type === 'checkin' ? 'Check-in' : 'Check-out'} successful for ${employee.firstName} ${employee.lastName}`,
                    warning: 'Recognition successful but logging failed'
                });
            }
        } else {
            const errorMsg = `Face not recognized. Best match distance: ${minDistance.toFixed(4)} (threshold: ${threshold})`;
            console.log(`❌ ${errorMsg}`);

            // Log failed recognition
            await logFailedRecognition(null, imageData, errorMsg, type);

            return res.status(404).json({
                error: 'Face not recognized',
                details: {
                    bestDistance: Math.round(minDistance * 10000) / 10000,
                    threshold: threshold,
                    employeesChecked: employeesWithFace.length
                }
            });
        }
    } catch (error) {
        console.error('❌ Error in face recognition:', error);

        // Log system error
        await logFailedRecognition(null, req.body.imageData || '', 'System error during recognition', req.body.type || 'checkin');

        res.status(500).json({
            error: 'Face recognition failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// Helper function to log successful recognition
async function logSuccessfulRecognition(
    employeeId: number,
    imageBase64: string,
    confidenceScore: number,
    type: 'checkin' | 'checkout'
) {
    try {
        await db.insert(faceRecognitionLogs).values({
            employeeId,
            success: true,
            confidenceScore: confidenceScore.toString(),
            imagePath: imageBase64,
            errorMessage: null
        });

        console.log(`📸 Logged successful ${type} recognition for employee ${employeeId} (confidence: ${(confidenceScore * 100).toFixed(1)}%)`);
    } catch (error) {
        console.error('❌ Error logging successful recognition:', error);
    }
}

// Helper function to log failed recognition
async function logFailedRecognition(
    employeeId: number | null,
    imageBase64: string,
    errorMessage: string,
    type: string
) {
    try {
        await db.insert(faceRecognitionLogs).values({
            employeeId,
            success: false,
            confidenceScore: null,
            imagePath: imageBase64,
            errorMessage
        });

        console.log(`📸 Logged failed ${type} recognition: ${errorMessage}`);
    } catch (error) {
        console.error('❌ Error logging failed recognition:', error);
    }
}

// Upload face data for employee
export const uploadFaceData = async (req: Request, res: Response) => {
    try {
        const { employeeId, faceDescriptor } = req.body;

        if (!employeeId || !faceDescriptor) {
            return res.status(400).json({ error: 'Employee ID and face descriptor are required' });
        }

        // Parse and validate face descriptor
        let parsedDescriptor;
        try {
            parsedDescriptor = parseFaceDescriptor(faceDescriptor);
        } catch (error) {
            return res.status(400).json({ error: 'Invalid face descriptor format' });
        }

        if (!validateFaceDescriptor(parsedDescriptor)) {
            return res.status(400).json({ error: 'Invalid face descriptor' });
        }

        // Check if employee exists
        const employee = await storage.getEmployee(parseInt(employeeId));
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Update employee with face descriptor
        const updatedEmployee = await storage.updateEmployee(employee.id, {
            faceDescriptor: JSON.stringify(parsedDescriptor)
        });

        res.json({
            success: true,
            data: updatedEmployee,
            message: 'Face data uploaded successfully'
        });
    } catch (error) {
        console.error('Error uploading face data:', error);
        res.status(500).json({ error: 'Failed to upload face data' });
    }
};

// Get employees with face data
export const getEmployeesWithFace = async (req: Request, res: Response) => {
    try {
        const employees = await storage.getEmployeesWithFaceDescriptor();

        // Remove face descriptor from response for security
        const employeeList = employees.map(emp => ({
            id: emp.id,
            employeeId: emp.employeeId,
            firstName: emp.firstName,
            lastName: emp.lastName,
            email: emp.email,
            departmentId: emp.departmentId,
            position: emp.position,
            hasFaceData: !!emp.faceDescriptor
        }));

        res.json(employeeList);
    } catch (error) {
        console.error('Error fetching employees with face data:', error);
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
};

// Interface for face recognition data
interface FaceRecognitionData {
    employeeId: number;
    success: boolean;
    confidenceScore?: number;
    imageBase64: string; // Base64 encoded image
    errorMessage?: string;
    type: 'checkin' | 'checkout';
}

// Log face recognition attempt and create time log if successful
export const logFaceRecognition = async (req: Request, res: Response) => {
    try {
        const {
            employeeId,
            success,
            confidenceScore,
            imageBase64,
            errorMessage,
            type
        }: FaceRecognitionData = req.body;

        console.log(`🎭 Face recognition attempt for employee ${employeeId}: ${success ? 'SUCCESS' : 'FAILED'}`);

        // Validate required fields
        if (!employeeId || success === undefined || !imageBase64 || !type) {
            return res.status(400).json({
                error: 'Missing required fields: employeeId, success, imageBase64, type'
            });
        }

        // Verify employee exists
        const employee = await db
            .select()
            .from(employees)
            .where(eq(employees.id, employeeId))
            .limit(1);

        if (employee.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Create face recognition log entry
        const [faceLog] = await db
            .insert(faceRecognitionLogs)
            .values({
                employeeId,
                success,
                confidenceScore: confidenceScore ? confidenceScore.toString() : null,
                imagePath: imageBase64, // Store base64 image directly
                errorMessage: success ? null : errorMessage || 'Recognition failed'
            })
            .returning();

        console.log(`📸 Face recognition log created with ID: ${faceLog.id}`);

        // If recognition was successful, create time log entry
        let timeLogEntry = null;
        if (success) {
            try {
                [timeLogEntry] = await db
                    .insert(timeLogs)
                    .values({
                        employeeId,
                        logTime: new Date(),
                        type,
                        source: 'face'
                    })
                    .returning();

                console.log(`⏰ Time log created with ID: ${timeLogEntry.id} for ${type}`);
            } catch (timeLogError) {
                console.error('❌ Error creating time log:', timeLogError);
                // Don't fail the whole request if time log creation fails
            }
        }

        res.status(201).json({
            success: true,
            message: `Face recognition ${success ? 'successful' : 'failed'}`,
            data: {
                faceRecognitionLog: faceLog,
                timeLog: timeLogEntry,
                employeeName: `${employee[0].firstName} ${employee[0].lastName}`,
                type,
                timestamp: faceLog.timestamp
            }
        });

    } catch (error) {
        console.error('❌ Error in face recognition logging:', error);
        res.status(500).json({
            error: 'Failed to log face recognition attempt',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// Get face recognition logs for an employee
export const getEmployeeFaceRecognitionLogs = async (req: Request, res: Response) => {
    try {
        const employeeId = parseInt(req.params.employeeId);
        const { limit = 50, offset = 0, date } = req.query;

        if (isNaN(employeeId)) {
            return res.status(400).json({ error: 'Invalid employee ID' });
        }

        let whereCondition = eq(faceRecognitionLogs.employeeId, employeeId);

        // Add date filter if provided
        if (date) {
            const targetDate = new Date(date as string);
            const startOfDay = new Date(targetDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(targetDate);
            endOfDay.setHours(23, 59, 59, 999);

            whereCondition = and(
                whereCondition,
                // Add date range condition here if needed
            ) as any;
        }

        const logs = await db
            .select({
                id: faceRecognitionLogs.id,
                employeeId: faceRecognitionLogs.employeeId,
                timestamp: faceRecognitionLogs.timestamp,
                success: faceRecognitionLogs.success,
                confidenceScore: faceRecognitionLogs.confidenceScore,
                errorMessage: faceRecognitionLogs.errorMessage,
                // Don't return the full image data in list view for performance
                hasImage: faceRecognitionLogs.imagePath
            })
            .from(faceRecognitionLogs)
            .where(whereCondition)
            .orderBy(desc(faceRecognitionLogs.timestamp))
            .limit(parseInt(limit as string))
            .offset(parseInt(offset as string));

        res.json({
            success: true,
            data: logs,
            total: logs.length
        });

    } catch (error) {
        console.error('❌ Error fetching face recognition logs:', error);
        res.status(500).json({
            error: 'Failed to fetch face recognition logs',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// Get specific face recognition log with image
export const getFaceRecognitionLogWithImage = async (req: Request, res: Response) => {
    try {
        const logId = parseInt(req.params.logId);

        if (isNaN(logId)) {
            return res.status(400).json({ error: 'Invalid log ID' });
        }

        const [log] = await db
            .select()
            .from(faceRecognitionLogs)
            .where(eq(faceRecognitionLogs.id, logId))
            .limit(1);

        if (!log) {
            return res.status(404).json({ error: 'Face recognition log not found' });
        }

        res.json({
            success: true,
            data: log
        });

    } catch (error) {
        console.error('❌ Error fetching face recognition log:', error);
        res.status(500).json({
            error: 'Failed to fetch face recognition log',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// Get face recognition statistics
export const getFaceRecognitionStats = async (req: Request, res: Response) => {
    try {
        const { employeeId, startDate, endDate } = req.query;

        let whereCondition: any = undefined;

        if (employeeId) {
            whereCondition = eq(faceRecognitionLogs.employeeId, parseInt(employeeId as string));
        }

        // Get basic stats
        const allLogs = await db
            .select({
                success: faceRecognitionLogs.success,
                confidenceScore: faceRecognitionLogs.confidenceScore,
                timestamp: faceRecognitionLogs.timestamp
            })
            .from(faceRecognitionLogs)
            .where(whereCondition)
            .orderBy(desc(faceRecognitionLogs.timestamp));

        const totalAttempts = allLogs.length;
        const successfulAttempts = allLogs.filter(log => log.success).length;
        const failedAttempts = totalAttempts - successfulAttempts;
        const successRate = totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 0;

        // Calculate average confidence score for successful attempts
        const successfulLogsWithScore = allLogs.filter(log =>
            log.success && log.confidenceScore !== null
        );
        const avgConfidenceScore = successfulLogsWithScore.length > 0
            ? successfulLogsWithScore.reduce((sum, log) =>
                sum + parseFloat(log.confidenceScore as string), 0
            ) / successfulLogsWithScore.length
            : 0;

        res.json({
            success: true,
            data: {
                totalAttempts,
                successfulAttempts,
                failedAttempts,
                successRate: Math.round(successRate * 100) / 100,
                avgConfidenceScore: Math.round(avgConfidenceScore * 100) / 100,
                period: {
                    startDate: startDate || 'All time',
                    endDate: endDate || 'All time'
                }
            }
        });

    } catch (error) {
        console.error('❌ Error fetching face recognition stats:', error);
        res.status(500).json({
            error: 'Failed to fetch face recognition stats',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}; 