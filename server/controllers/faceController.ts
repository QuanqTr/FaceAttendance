import { Request, Response } from "express";
import { storage } from "../models/storage";
import { z } from "zod";

// Schema for updating face descriptor
const updateFaceDescriptorSchema = z.object({
    faceDescriptor: z.string().min(1, "Face descriptor is required"),
    imageData: z.string().optional() // Base64 image data (optional for now)
});

// Schema for face profile upload (from old server)
const faceProfileSchema = z.object({
    descriptor: z.union([z.string(), z.array(z.number())]),
    imageData: z.string().optional()
});

// Upload face image and save face profile (from old server)
export const uploadFaceProfile = async (req: Request, res: Response) => {
    try {
        const employeeId = parseInt(req.params.id);

        console.log("Nhận request upload khuôn mặt cho nhân viên:", employeeId);

        if (isNaN(employeeId)) {
            return res.status(400).json({ message: "ID nhân viên không hợp lệ" });
        }

        // Kiểm tra xem có descriptor không
        const { descriptor } = req.body;

        if (!descriptor) {
            return res.status(400).json({ message: "Cần có dữ liệu khuôn mặt" });
        }

        // Tìm nhân viên
        const employee = await storage.getEmployee(employeeId);

        if (!employee) {
            return res.status(404).json({ message: "Không tìm thấy nhân viên" });
        }

        console.log("Đã tìm thấy nhân viên:", employee.firstName, employee.lastName);
        console.log("Kiểu dữ liệu descriptor:", typeof descriptor);

        // Không cần parse nếu descriptor đã là array
        let descriptorArray = descriptor;

        // Kiểm tra nếu descriptor là chuỗi, thì parse
        if (typeof descriptor === 'string') {
            try {
                descriptorArray = JSON.parse(descriptor);
                console.log("Đã parse chuỗi descriptor thành mảng");
            } catch (e) {
                console.error("Lỗi khi parse descriptor:", e);
                return res.status(400).json({ message: "Dữ liệu khuôn mặt không hợp lệ" });
            }
        }

        console.log("Thông tin descriptor:", {
            type: typeof descriptorArray,
            isArray: Array.isArray(descriptorArray),
            length: Array.isArray(descriptorArray) ? descriptorArray.length : 'N/A'
        });

        // Chuyển descriptor thành chuỗi JSON để lưu vào database
        const descriptorJson = JSON.stringify(descriptorArray);

        try {
            // Cập nhật thông tin nhân viên với descriptor
            const updatedEmployee = await storage.updateEmployee(employeeId, {
                faceDescriptor: descriptorJson as any
            });

            if (!updatedEmployee) {
                throw new Error("Không thể cập nhật dữ liệu nhân viên");
            }

            console.log("Đã cập nhật thành công nhân viên ID:", employeeId);

            return res.status(201).json({
                success: true,
                message: "Đã lưu dữ liệu khuôn mặt thành công",
                employee: updatedEmployee
            });
        } catch (updateError) {
            console.error("Lỗi khi cập nhật dữ liệu nhân viên:", updateError);
            return res.status(500).json({
                success: false,
                message: "Không thể lưu dữ liệu khuôn mặt vào hệ thống"
            });
        }
    } catch (error) {
        console.error("Lỗi khi lưu dữ liệu khuôn mặt:", error);
        res.status(500).json({
            message: error instanceof Error ? error.message : "Không thể lưu dữ liệu khuôn mặt"
        });
    }
};

// Get employee face data (from old server)
export const getEmployeeFaceData = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ message: "Invalid employee ID" });
        }

        // Check if employee exists
        const employee = await storage.getEmployee(id);
        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        // Return face descriptor data
        res.json({
            id: employee.id,
            employeeId: employee.id,
            descriptor: employee.faceDescriptor,
            isActive: !!employee.faceDescriptor
        });
    } catch (error) {
        console.error('Error getting employee face data:', error);
        res.status(500).json({ error: 'Failed to get face data' });
    }
};

// Reset employee face data (from old server)
export const resetEmployeeFaceData = async (req: Request, res: Response) => {
    try {
        const employeeId = parseInt(req.params.employeeId);

        if (isNaN(employeeId)) {
            return res.status(400).json({ message: "Invalid employee ID" });
        }

        // Update employee to remove face descriptor
        await storage.updateEmployee(employeeId, {
            faceDescriptor: null
        });

        res.status(204).send();
    } catch (error) {
        console.error('Error resetting face data:', error);
        res.status(500).json({ error: 'Failed to reset face data' });
    }
};

// Update employee face descriptor
export const updateEmployeeFaceDescriptor = async (req: Request, res: Response) => {
    try {
        const employeeId = parseInt(req.params.id);
        if (isNaN(employeeId)) {
            return res.status(400).json({ error: 'Invalid employee ID' });
        }

        console.log(`[Face] Updating face descriptor for employee ${employeeId}`);

        const { faceDescriptor, imageData } = updateFaceDescriptorSchema.parse(req.body);

        // Validate face descriptor format
        let parsedDescriptor;
        try {
            // Try to parse as JSON array first
            if (faceDescriptor.startsWith('[')) {
                parsedDescriptor = JSON.parse(faceDescriptor);
            } else {
                // Try as comma-separated values
                parsedDescriptor = faceDescriptor.split(',').map(Number);
            }

            // Validate it's a proper array of numbers
            if (!Array.isArray(parsedDescriptor) || parsedDescriptor.length !== 128) {
                throw new Error('Face descriptor must be an array of 128 numbers');
            }

            // Check if all elements are valid numbers
            if (parsedDescriptor.some(num => isNaN(num))) {
                throw new Error('All face descriptor values must be valid numbers');
            }

        } catch (error) {
            console.error('[Face] Invalid face descriptor format:', error);
            return res.status(400).json({
                error: 'Invalid face descriptor format. Must be an array of 128 numbers'
            });
        }

        // Check if employee exists
        const employee = await storage.getEmployee(employeeId);
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        console.log(`[Face] Parsed face descriptor with ${parsedDescriptor.length} values for employee ${employee.firstName} ${employee.lastName}`);

        // Update employee with face descriptor
        const updatedEmployee = await storage.updateEmployee(employeeId, {
            faceDescriptor: JSON.stringify(parsedDescriptor)
        });

        if (!updatedEmployee) {
            return res.status(500).json({ error: 'Failed to update employee face descriptor' });
        }

        console.log(`[Face] Successfully updated face descriptor for employee ${employeeId}`);

        res.json({
            success: true,
            message: 'Face descriptor updated successfully',
            employee: {
                id: updatedEmployee.id,
                firstName: updatedEmployee.firstName,
                lastName: updatedEmployee.lastName,
                hasFaceDescriptor: !!updatedEmployee.faceDescriptor
            }
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error('[Face] Validation error:', error.errors);
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors
            });
        }

        console.error('[Face] Error updating face descriptor:', error);
        res.status(500).json({
            error: 'Failed to update face descriptor',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// Get employee face descriptor status
export const getEmployeeFaceStatus = async (req: Request, res: Response) => {
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
            success: true,
            employee: {
                id: employee.id,
                firstName: employee.firstName,
                lastName: employee.lastName,
                hasFaceDescriptor: !!employee.faceDescriptor,
                faceDescriptorLength: employee.faceDescriptor ?
                    (employee.faceDescriptor.startsWith('[') ?
                        JSON.parse(employee.faceDescriptor).length :
                        employee.faceDescriptor.split(',').length) : 0
            }
        });

    } catch (error) {
        console.error('[Face] Error getting face status:', error);
        res.status(500).json({ error: 'Failed to get face status' });
    }
};

// Remove employee face descriptor
export const removeEmployeeFaceDescriptor = async (req: Request, res: Response) => {
    try {
        const employeeId = parseInt(req.params.id);
        if (isNaN(employeeId)) {
            return res.status(400).json({ error: 'Invalid employee ID' });
        }

        const employee = await storage.getEmployee(employeeId);
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Remove face descriptor
        const updatedEmployee = await storage.updateEmployee(employeeId, {
            faceDescriptor: null
        });

        if (!updatedEmployee) {
            return res.status(500).json({ error: 'Failed to remove face descriptor' });
        }

        console.log(`[Face] Successfully removed face descriptor for employee ${employeeId}`);

        res.json({
            success: true,
            message: 'Face descriptor removed successfully',
            employee: {
                id: updatedEmployee.id,
                firstName: updatedEmployee.firstName,
                lastName: updatedEmployee.lastName,
                hasFaceDescriptor: false
            }
        });

    } catch (error) {
        console.error('[Face] Error removing face descriptor:', error);
        res.status(500).json({ error: 'Failed to remove face descriptor' });
    }
}; 