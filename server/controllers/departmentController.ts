import { Request, Response } from "express";
import { storage } from "../models/storage";

// Get all departments
export const getAllDepartments = async (req: Request, res: Response) => {
    try {
        const departments = await storage.getAllDepartments();
        res.json(departments);
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ error: 'Failed to fetch departments' });
    }
};

// Get department by ID
export const getDepartment = async (req: Request, res: Response) => {
    try {
        const departmentId = parseInt(req.params.id);

        if (isNaN(departmentId)) {
            return res.status(400).json({ error: 'Invalid department ID' });
        }

        const department = await storage.getDepartment(departmentId);

        if (!department) {
            return res.status(404).json({ error: 'Department not found' });
        }

        res.json(department);
    } catch (error) {
        console.error('Error fetching department:', error);
        res.status(500).json({ error: 'Failed to fetch department' });
    }
};

// Create new department
export const createDepartment = async (req: Request, res: Response) => {
    try {
        const { name, description, managerId } = req.body;

        // Validate required fields
        if (!name) {
            return res.status(400).json({ error: 'Department name is required' });
        }

        const departmentData = {
            name,
            description: description || null,
            managerId: managerId || null
        };

        const newDepartment = await storage.createDepartment(departmentData);

        res.status(201).json({
            success: true,
            data: newDepartment,
            message: 'Department created successfully'
        });
    } catch (error) {
        console.error('Error creating department:', error);
        res.status(500).json({ error: 'Failed to create department' });
    }
};

// Update department
export const updateDepartment = async (req: Request, res: Response) => {
    try {
        const departmentId = parseInt(req.params.id);
        const updateData = req.body;

        if (isNaN(departmentId)) {
            return res.status(400).json({ error: 'Invalid department ID' });
        }

        const updatedDepartment = await storage.updateDepartment(departmentId, updateData);

        if (!updatedDepartment) {
            return res.status(404).json({ error: 'Department not found' });
        }

        res.json({
            success: true,
            data: updatedDepartment,
            message: 'Department updated successfully'
        });
    } catch (error) {
        console.error('Error updating department:', error);
        res.status(500).json({ error: 'Failed to update department' });
    }
};

// Delete department
export const deleteDepartment = async (req: Request, res: Response) => {
    try {
        const departmentId = parseInt(req.params.id);

        if (isNaN(departmentId)) {
            return res.status(400).json({ error: 'Invalid department ID' });
        }

        const deleted = await storage.deleteDepartment(departmentId);

        if (!deleted) {
            return res.status(404).json({ error: 'Department not found' });
        }

        res.json({
            success: true,
            message: 'Department deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting department:', error);
        res.status(500).json({ error: 'Failed to delete department' });
    }
}; 