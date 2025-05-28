import { Request, Response } from "express";
import { storage } from "../models/storage";
import { z } from "zod";

// Get all employees
export const getAllEmployees = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 10, search, departmentId, status } = req.query;

        const filters = {
            search: search as string,
            departmentId: departmentId ? parseInt(departmentId as string) : undefined,
            status: status as string
        };

        const result = await storage.getAllEmployees(
            parseInt(page as string),
            parseInt(limit as string),
            filters
        );

        res.json(result);
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
};

// Get employee by ID
export const getEmployee = async (req: Request, res: Response) => {
    try {
        const employeeId = parseInt(req.params.id);

        if (isNaN(employeeId)) {
            return res.status(400).json({ error: 'Invalid employee ID' });
        }

        const employee = await storage.getEmployee(employeeId);

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        res.json(employee);
    } catch (error) {
        console.error('Error fetching employee:', error);
        res.status(500).json({ error: 'Failed to fetch employee' });
    }
};

// Create new employee
export const createEmployee = async (req: Request, res: Response) => {
    try {
        const {
            employeeId,
            firstName,
            lastName,
            email,
            phone,
            departmentId,
            position,
            status,
            joinDate
        } = req.body;

        // Validate required fields
        if (!employeeId || !firstName || !lastName || !email) {
            return res.status(400).json({
                error: 'Employee ID, first name, last name, and email are required'
            });
        }

        const employeeData = {
            employeeId,
            firstName,
            lastName,
            email,
            phone: phone || null,
            departmentId: departmentId || null,
            position: position || null,
            status: status || 'active',
            joinDate: joinDate || new Date().toISOString().split('T')[0]
        };

        const newEmployee = await storage.createEmployee(employeeData);

        res.status(201).json({
            success: true,
            data: newEmployee,
            message: 'Employee created successfully'
        });
    } catch (error) {
        console.error('Error creating employee:', error);
        res.status(500).json({ error: 'Failed to create employee' });
    }
};

// Update employee
export const updateEmployee = async (req: Request, res: Response) => {
    try {
        const employeeId = parseInt(req.params.id);
        const updateData = req.body;

        if (isNaN(employeeId)) {
            return res.status(400).json({ error: 'Invalid employee ID' });
        }

        const updatedEmployee = await storage.updateEmployee(employeeId, updateData);

        if (!updatedEmployee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        res.json({
            success: true,
            data: updatedEmployee,
            message: 'Employee updated successfully'
        });
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({ error: 'Failed to update employee' });
    }
};

// Delete employee
export const deleteEmployee = async (req: Request, res: Response) => {
    try {
        const employeeId = parseInt(req.params.id);

        if (isNaN(employeeId)) {
            return res.status(400).json({ error: 'Invalid employee ID' });
        }

        const deleted = await storage.deleteEmployee(employeeId);

        if (!deleted) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        res.json({
            success: true,
            message: 'Employee deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({ error: 'Failed to delete employee' });
    }
}; 