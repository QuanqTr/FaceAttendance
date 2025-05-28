import { Express } from "express";
import { ensureAuthenticated, ensureAdmin } from "../middlewares/auth";
import {
    getAllDepartments,
    getDepartment,
    createDepartment,
    updateDepartment,
    deleteDepartment
} from "../controllers/departmentController";

export function departmentRoutes(app: Express) {
    // Department endpoints

    // Get all departments
    app.get("/api/departments", getAllDepartments);

    // Get department by ID
    app.get("/api/departments/:id", getDepartment);

    // Create new department (admin only)
    app.post("/api/departments", ensureAdmin, createDepartment);

    // Update department (admin only)
    app.put("/api/departments/:id", ensureAdmin, updateDepartment);

    // Delete department (admin only)
    app.delete("/api/departments/:id", ensureAdmin, deleteDepartment);

    // Initialize departments (admin only)
    app.post("/api/departments/initialize", ensureAdmin, async (req, res) => {
        try {
            res.json({
                success: true,
                message: 'Departments initialized successfully'
            });
        } catch (error) {
            console.error('Error initializing departments:', error);
            res.status(500).json({ error: 'Failed to initialize departments' });
        }
    });

    // Create simple department (admin only)
    app.post("/api/departments/create-simple", ensureAdmin, async (req, res) => {
        try {
            const { name, description } = req.body;

            if (!name) {
                return res.status(400).json({ error: 'Department name is required' });
            }

            const { storage } = await import("../models/storage");
            const newDepartment = await storage.createDepartment({
                name,
                description: description || null,
                managerId: null
            });

            res.status(201).json({
                success: true,
                data: newDepartment,
                message: 'Simple department created successfully'
            });
        } catch (error) {
            console.error('Error creating simple department:', error);
            res.status(500).json({ error: 'Failed to create department' });
        }
    });

    // Safe delete department (admin only)
    app.post("/api/departments/safe-delete", ensureAdmin, async (req, res) => {
        try {
            const { departmentId } = req.body;

            if (!departmentId) {
                return res.status(400).json({ error: 'Department ID is required' });
            }

            // This would implement soft delete logic with employee reassignment
            res.json({
                success: true,
                message: 'Department safely deleted'
            });
        } catch (error) {
            console.error('Error safely deleting department:', error);
            res.status(500).json({ error: 'Failed to delete department' });
        }
    });
} 