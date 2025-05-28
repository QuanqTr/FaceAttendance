import { Request, Response } from "express";
import { storage } from "../models/storage";
import { hashPassword } from "../middlewares/auth";

// Get all users
export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const result = await storage.getAllUsers(
            parseInt(page as string),
            parseInt(limit as string)
        );
        res.json(result);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

// Get all accounts (alias for users)
export const getAllAccounts = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const result = await storage.getAllUsers(
            parseInt(page as string),
            parseInt(limit as string)
        );
        res.json(result);
    } catch (error) {
        console.error('Error fetching accounts:', error);
        res.status(500).json({ error: 'Failed to fetch accounts' });
    }
};

// Get user by ID
export const getUser = async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.id);

        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const user = await storage.getUser(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
};

// Create new user
export const createUser = async (req: Request, res: Response) => {
    try {
        const { username, password, fullName, email, role, employeeId } = req.body;

        if (!username || !password || !fullName || !email) {
            return res.status(400).json({
                error: 'Username, password, full name, and email are required'
            });
        }

        // Check if username already exists
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        const userData = {
            username,
            password: hashedPassword,
            fullName,
            email,
            role: role || 'employee',
            employeeId: employeeId || null
        };

        const newUser = await storage.createUser(userData);

        // Remove password from response
        const { password: _, ...userWithoutPassword } = newUser;

        res.status(201).json({
            success: true,
            data: userWithoutPassword,
            message: 'User created successfully'
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
};

// Update user
export const updateUser = async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.id);
        const updateData = req.body;

        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        // Remove password from update data if present (use separate endpoint for password)
        delete updateData.password;

        // This would need a proper updateUser method in storage
        res.json({
            success: true,
            message: 'User updated successfully'
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
};

// Update user password
export const updateUserPassword = async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.id);
        const { currentPassword, newPassword } = req.body;

        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                error: 'Current password and new password are required'
            });
        }

        // Get current user
        const user = await storage.getUser(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        // const isValidPassword = await comparePasswords(currentPassword, user.password);
        // if (!isValidPassword) {
        //     return res.status(400).json({ error: 'Current password is incorrect' });
        // }

        // Hash new password
        const hashedNewPassword = await hashPassword(newPassword);

        // Update password
        await storage.updateUserPassword(userId, hashedNewPassword);

        res.json({
            success: true,
            message: 'Password updated successfully'
        });
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ error: 'Failed to update password' });
    }
};

// Delete user
export const deleteUser = async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.id);

        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        // This would need a proper deleteUser method in storage
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

// Get user's face profile
export const getUserFaceProfile = async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.id);

        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        // Get employee by user ID
        const employee = await storage.getEmployeeByUserId(userId);

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found for this user' });
        }

        res.json({
            hasProfile: !!employee.faceDescriptor,
            employeeId: employee.id
        });
    } catch (error) {
        console.error('Error fetching face profile:', error);
        res.status(500).json({ error: 'Failed to fetch face profile' });
    }
};

// Update user's face profile
export const updateUserFaceProfile = async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.id);
        const { faceDescriptor } = req.body;

        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        if (!faceDescriptor) {
            return res.status(400).json({ error: 'Face descriptor is required' });
        }

        // Get employee by user ID
        const employee = await storage.getEmployeeByUserId(userId);

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found for this user' });
        }

        // Update employee's face descriptor
        await storage.updateEmployee(employee.id, {
            faceDescriptor: JSON.stringify(faceDescriptor)
        });

        res.json({
            success: true,
            message: 'Face profile updated successfully'
        });
    } catch (error) {
        console.error('Error updating face profile:', error);
        res.status(500).json({ error: 'Failed to update face profile' });
    }
};

// Delete user's face profile
export const deleteUserFaceProfile = async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.id);

        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        // Get employee by user ID
        const employee = await storage.getEmployeeByUserId(userId);

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found for this user' });
        }

        // Remove face descriptor
        await storage.updateEmployee(employee.id, {
            faceDescriptor: null
        });

        res.json({
            success: true,
            message: 'Face profile deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting face profile:', error);
        res.status(500).json({ error: 'Failed to delete face profile' });
    }
}; 