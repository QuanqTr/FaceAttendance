import { Request, Response } from "express";
import { storage } from "../models/storage";
import { calculateEuclideanDistance, parseFaceDescriptor, validateFaceDescriptor } from "../utils/faceUtils";

// Face recognition for attendance
export const recognizeFace = async (req: Request, res: Response) => {
    try {
        const { faceDescriptor, confidence } = req.body;

        if (!faceDescriptor) {
            return res.status(400).json({ error: 'Face descriptor is required' });
        }

        // Parse the face descriptor
        let parsedDescriptor;
        try {
            parsedDescriptor = parseFaceDescriptor(faceDescriptor);
        } catch (error) {
            return res.status(400).json({ error: 'Invalid face descriptor format' });
        }

        // Validate the descriptor
        if (!validateFaceDescriptor(parsedDescriptor)) {
            return res.status(400).json({ error: 'Invalid face descriptor' });
        }

        // Get all employees with face descriptors
        const employeesWithFace = await storage.getEmployeesWithFaceDescriptor();

        if (employeesWithFace.length === 0) {
            return res.status(404).json({ error: 'No face data found for any employee' });
        }

        // Find best match
        let bestMatch = null;
        let bestDistance = Infinity;
        const threshold = 0.6; // Face recognition threshold

        for (const employee of employeesWithFace) {
            try {
                const employeeDescriptor = parseFaceDescriptor(employee.faceDescriptor!);
                const distance = calculateEuclideanDistance(parsedDescriptor, employeeDescriptor);

                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestMatch = employee;
                }
            } catch (error) {
                console.warn(`Invalid face descriptor for employee ${employee.id}:`, error);
                continue;
            }
        }

        if (!bestMatch || bestDistance > threshold) {
            return res.status(404).json({
                error: 'No matching face found',
                distance: bestDistance
            });
        }

        // Create time log
        const timeLog = await storage.createTimeLog({
            employeeId: bestMatch.id,
            logTime: new Date(),
            type: 'checkin', // This could be determined by business logic
            source: 'face'
        });

        res.json({
            success: true,
            employee: {
                id: bestMatch.id,
                firstName: bestMatch.firstName,
                lastName: bestMatch.lastName,
                employeeId: bestMatch.employeeId
            },
            distance: bestDistance,
            timeLog,
            message: 'Face recognized successfully'
        });
    } catch (error) {
        console.error('Error in face recognition:', error);
        res.status(500).json({ error: 'Face recognition failed' });
    }
};

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