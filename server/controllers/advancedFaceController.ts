import { Request, Response } from "express";
import { storage } from "../models/storage";
import { calculateEuclideanDistance, parseFaceDescriptor, validateFaceDescriptor } from "../utils/faceUtils";
import { getVietnamTime } from "../utils/timezone";

// Face recognition verify (for attendance with mode check)
export const faceRecognitionVerify = async (req: Request, res: Response) => {
    try {
        console.log("=== FACE RECOGNITION VERIFY ENDPOINT CALLED ===");
        const { descriptor, mode } = req.body;
        console.log("Request data:", { descriptorLength: descriptor?.length || 0, mode });

        if (!descriptor) {
            return res.status(400).json({ error: 'Face descriptor is required' });
        }

        // Parse the face descriptor
        let parsedDescriptor;
        try {
            if (typeof descriptor === 'string') {
                // If it's a comma-separated string
                parsedDescriptor = descriptor.split(',').map(Number);
            } else {
                parsedDescriptor = descriptor;
            }
            console.log("Parsed descriptor length:", parsedDescriptor.length);
        } catch (error) {
            console.error("Error parsing descriptor:", error);
            return res.status(400).json({ error: 'Invalid face descriptor format' });
        }

        // Get all employees with face descriptors
        const employeesWithFace = await storage.getEmployeesWithFaceDescriptor();
        console.log(`Found ${employeesWithFace.length} employees with face descriptors`);

        if (employeesWithFace.length === 0) {
            console.log("No employees with face data found");
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy nhân viên nào có dữ liệu khuôn mặt"
            });
        }

        // Find best match
        let bestMatch = null;
        let bestDistance = 1.0;
        const threshold = 0.4;
        console.log(`Starting face comparison with threshold: ${threshold}`);

        for (const employee of employeesWithFace) {
            if (!employee.faceDescriptor) continue;

            try {
                let employeeDescriptor;
                if (employee.faceDescriptor.startsWith('[') || employee.faceDescriptor.startsWith('{')) {
                    employeeDescriptor = JSON.parse(employee.faceDescriptor);
                } else {
                    employeeDescriptor = employee.faceDescriptor.split(',').map(Number);
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
                success: false,
                message: "Không thể nhận diện khuôn mặt. Vui lòng đảm bảo khuôn mặt được nhìn thấy rõ trong khung hình."
            });
        }

        // Get employee info
        const employee = await storage.getEmployee(bestMatch.id);
        if (!employee) {
            console.log("Employee not found in database");
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy thông tin nhân viên"
            });
        }

        // Create time log
        const vietnamTime = new Date();
        vietnamTime.setHours(vietnamTime.getHours() + 7); // UTC+7

        const timeLog = await storage.createTimeLog({
            employeeId: employee.id,
            logTime: vietnamTime,
            type: mode === 'check_out' ? 'checkout' : 'checkin',
            source: 'face'
        });

        console.log(`Face recognition successful for ${employee.firstName} ${employee.lastName}`);
        console.log("=== FACE RECOGNITION VERIFY SUCCESS ===");

        res.json({
            success: true,
            employee: {
                id: employee.id,
                firstName: employee.firstName,
                lastName: employee.lastName,
                employeeId: employee.employeeId
            },
            distance: bestDistance,
            timeLog,
            message: `${mode === 'check_out' ? 'Check-out' : 'Check-in'} thành công`
        });
    } catch (error) {
        console.error('Error in face recognition verify:', error);
        res.status(500).json({ error: 'Face recognition failed' });
    }
};

// Face registration
export const faceRegistration = async (req: Request, res: Response) => {
    try {
        const { employeeId, faceDescriptor } = req.body;

        if (!employeeId || !faceDescriptor) {
            return res.status(400).json({ error: 'Employee ID and face descriptor are required' });
        }

        // Check if employee exists
        const employee = await storage.getEmployee(parseInt(employeeId));
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Update employee with face descriptor
        const updatedEmployee = await storage.updateEmployee(employee.id, {
            faceDescriptor: JSON.stringify(faceDescriptor)
        });

        res.json({
            success: true,
            data: updatedEmployee,
            message: 'Face registration successful'
        });
    } catch (error) {
        console.error('Error in face registration:', error);
        res.status(500).json({ error: 'Face registration failed' });
    }
};

// Get employee face data
export const getEmployeeFaceData = async (req: Request, res: Response) => {
    try {
        const employeeId = parseInt(req.params.id);

        if (isNaN(employeeId)) {
            return res.status(400).json({ error: 'Invalid employee ID' });
        }

        const employee = await storage.getEmployee(employeeId);
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        res.json({
            hasProfile: !!employee.faceDescriptor,
            employeeId: employee.id,
            employeeName: `${employee.firstName} ${employee.lastName}`
        });
    } catch (error) {
        console.error('Error fetching employee face data:', error);
        res.status(500).json({ error: 'Failed to fetch face data' });
    }
};

// Delete employee face data
export const deleteEmployeeFaceData = async (req: Request, res: Response) => {
    try {
        const employeeId = parseInt(req.params.employeeId);

        if (isNaN(employeeId)) {
            return res.status(400).json({ error: 'Invalid employee ID' });
        }

        const employee = await storage.getEmployee(employeeId);
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Remove face descriptor
        await storage.updateEmployee(employeeId, {
            faceDescriptor: null
        });

        res.json({
            success: true,
            message: 'Face data deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting employee face data:', error);
        res.status(500).json({ error: 'Failed to delete face data' });
    }
};

// Employee face profile (create/update)
export const updateEmployeeFaceProfile = async (req: Request, res: Response) => {
    try {
        const employeeId = parseInt(req.params.id);
        const { faceDescriptor } = req.body;

        if (isNaN(employeeId)) {
            return res.status(400).json({ error: 'Invalid employee ID' });
        }

        if (!faceDescriptor) {
            return res.status(400).json({ error: 'Face descriptor is required' });
        }

        const employee = await storage.getEmployee(employeeId);
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Update face descriptor
        await storage.updateEmployee(employeeId, {
            faceDescriptor: JSON.stringify(faceDescriptor)
        });

        res.json({
            success: true,
            message: 'Face profile updated successfully'
        });
    } catch (error) {
        console.error('Error updating employee face profile:', error);
        res.status(500).json({ error: 'Failed to update face profile' });
    }
}; 