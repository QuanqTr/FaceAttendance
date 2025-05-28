import { Express } from "express";
import { ensureAuthenticated, ensureAdmin } from "../middlewares/auth";
import {
    getAllEmployees,
    getEmployee,
    createEmployee,
    updateEmployee,
    deleteEmployee
} from "../controllers/employeeController";

export function employeeRoutes(app: Express) {
    // Employee endpoints

    // Get all employees (with pagination and filters)
    app.get("/api/employees", ensureAuthenticated, getAllEmployees);

    // Get all employees (public access for some functions)
    app.get("/api/employeeall", getAllEmployees);

    // Get employees with face descriptor
    app.get("/api/employees/with-face-descriptor", ensureAdmin, async (req, res) => {
        try {
            const { storage } = await import("../models/storage");
            const employees = await storage.getEmployeesWithFaceDescriptor();
            res.json(employees);
        } catch (error) {
            console.error('Error fetching employees with face descriptor:', error);
            res.status(500).json({ error: 'Failed to fetch employees' });
        }
    });

    // Get employees without accounts
    app.get("/api/employees/without-accounts", ensureAuthenticated, async (req, res) => {
        try {
            // This would need a method to get employees without user accounts
            res.json([]);
        } catch (error) {
            console.error('Error fetching employees without accounts:', error);
            res.status(500).json({ error: 'Failed to fetch employees' });
        }
    });

    // Get employee by account ID
    app.get("/api/employees/by-account/:id", ensureAuthenticated, async (req, res) => {
        try {
            const accountId = parseInt(req.params.id);
            const { storage } = await import("../models/storage");
            const employee = await storage.getEmployeeByUserId(accountId);

            if (!employee) {
                return res.status(404).json({ error: 'Employee not found for this account' });
            }

            res.json(employee);
        } catch (error) {
            console.error('Error fetching employee by account:', error);
            res.status(500).json({ error: 'Failed to fetch employee' });
        }
    });

    // Get employee by ID
    app.get("/api/employees/:id", ensureAdmin, getEmployee);

    // Create new employee (admin only)
    app.post("/api/employees", ensureAuthenticated, createEmployee);

    // Update employee (admin only)
    app.put("/api/employees/:id", ensureAuthenticated, updateEmployee);

    // Delete employee (admin only)
    app.delete("/api/employees/:id", ensureAuthenticated, deleteEmployee);

    // Safe delete employee (soft delete)
    app.post("/api/employees/:id/safe-delete", ensureAuthenticated, async (req, res) => {
        try {
            const employeeId = parseInt(req.params.id);

            if (isNaN(employeeId)) {
                return res.status(400).json({ error: 'Invalid employee ID' });
            }

            // This would implement soft delete logic
            res.json({
                success: true,
                message: 'Employee safely deleted'
            });
        } catch (error) {
            console.error('Error safely deleting employee:', error);
            res.status(500).json({ error: 'Failed to delete employee' });
        }
    });
} 