import { Request, Response } from "express";
import { storage } from "../models/storage";
import { z } from "zod";

// Get all leave requests (for managers)
export const getAllLeaveRequests = async (req: Request, res: Response) => {
    try {
        const { status } = req.query;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        // Check if user is admin or manager
        const user = await storage.getUser(userId);
        if (user?.role !== 'admin' && user?.role !== 'manager') {
            return res.status(403).json({ error: 'Unauthorized. Only managers can view all leave requests' });
        }

        // Get all leave requests with employee details
        const leaveRequests = await storage.getAllLeaveRequestsWithEmployeeDetails(1, 100, status as string);

        res.json(leaveRequests);
    } catch (error) {
        console.error('Error fetching leave requests:', error);
        res.status(500).json({ error: 'Failed to fetch leave requests' });
    }
};

// Get leave requests count
export const getLeaveRequestsCount = async (req: Request, res: Response) => {
    try {
        const { status } = req.query;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        // Get employee by user ID
        const employee = await storage.getEmployeeByUserId(userId);
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Get leave requests for this employee
        const leaveRequests = await storage.getEmployeeLeaveRequests(employee.id, status as string);

        res.json({ count: leaveRequests.length });
    } catch (error) {
        console.error("Error fetching leave requests count:", error);
        res.status(500).json({ error: "Failed to fetch leave requests count" });
    }
};

// Create a new leave request (for employees)
export const createLeaveRequest = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { type, startDate, endDate, reason } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        // Validate required fields
        if (!type || !startDate || !endDate) {
            return res.status(400).json({ error: 'Type, start date, and end date are required' });
        }

        // Get employee by user ID
        const employee = await storage.getEmployeeByUserId(userId);
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ error: 'Invalid date format' });
        }

        if (start > end) {
            return res.status(400).json({ error: 'Start date must be before or equal to end date' });
        }

        // Create leave request
        const leaveRequestData = {
            employeeId: employee.id,
            type,
            startDate: start.toISOString().split('T')[0], // Convert to string format YYYY-MM-DD
            endDate: end.toISOString().split('T')[0], // Convert to string format YYYY-MM-DD
            reason: reason || null,
            status: 'pending' as const
        };

        const newLeaveRequest = await storage.createLeaveRequest(leaveRequestData);

        res.status(201).json({
            success: true,
            data: newLeaveRequest,
            message: 'Leave request created successfully'
        });
    } catch (error) {
        console.error('Error creating leave request:', error);
        res.status(500).json({ error: 'Failed to create leave request' });
    }
};

// Get leave request details by ID (for employees)
export const getLeaveRequestById = async (req: Request, res: Response) => {
    try {
        const requestId = parseInt(req.params.id);
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (isNaN(requestId)) {
            return res.status(400).json({ error: 'Invalid leave request ID' });
        }

        // Get employee by user ID
        const employee = await storage.getEmployeeByUserId(userId);
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Get leave request details
        const leaveRequest = await storage.getLeaveRequest(requestId);
        if (!leaveRequest) {
            return res.status(404).json({ error: 'Leave request not found' });
        }

        // Check if this request belongs to the current employee or if user is manager/admin
        const user = await storage.getUser(userId);
        const isManager = user?.role === 'admin' || user?.role === 'manager';

        if (leaveRequest.employeeId !== employee.id && !isManager) {
            return res.status(403).json({ error: 'Access denied. You can only view your own leave requests' });
        }

        res.json(leaveRequest);
    } catch (error) {
        console.error('Error fetching leave request details:', error);
        res.status(500).json({ error: 'Failed to fetch leave request details' });
    }
};

// Get leave requests for a specific employee
export const getEmployeeLeaveRequests = async (req: Request, res: Response) => {
    try {
        const employeeId = parseInt(req.params.employeeId);
        const { status } = req.query;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (isNaN(employeeId)) {
            return res.status(400).json({ error: 'Invalid employee ID' });
        }

        // Get current user's employee record
        const currentEmployee = await storage.getEmployeeByUserId(userId);
        if (!currentEmployee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Get user role
        const user = await storage.getUser(userId);
        const isManager = user?.role === 'admin' || user?.role === 'manager';

        // Check authorization: employee can only view their own requests, managers can view all
        if (currentEmployee.id !== employeeId && !isManager) {
            return res.status(403).json({ error: 'Access denied. You can only view your own leave requests' });
        }

        // Get leave requests for the specified employee
        const leaveRequests = await storage.getEmployeeLeaveRequests(employeeId, status as string);

        res.json(leaveRequests);
    } catch (error) {
        console.error('Error fetching employee leave requests:', error);
        res.status(500).json({ error: 'Failed to fetch employee leave requests' });
    }
};

// Update leave request status (approve/reject)
export const updateLeaveRequestStatus = async (req: Request, res: Response) => {
    try {
        const requestId = parseInt(req.params.id);
        const { status, reviewNotes } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (isNaN(requestId)) {
            return res.status(400).json({ error: 'Invalid leave request ID' });
        }

        // Check if user is manager or admin
        const user = await storage.getUser(userId);
        if (user?.role !== 'admin' && user?.role !== 'manager') {
            return res.status(403).json({ error: 'Only managers can update leave request status' });
        }

        // Validate status
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Status must be either "approved" or "rejected"' });
        }

        // Get the leave request
        const leaveRequest = await storage.getLeaveRequest(requestId);
        if (!leaveRequest) {
            return res.status(404).json({ error: 'Leave request not found' });
        }

        // Update the leave request
        const updatedRequest = await storage.updateLeaveRequest(requestId, {
            status,
            reviewNotes: reviewNotes || null,
            reviewedAt: new Date(),
            reviewedBy: userId
        });

        if (!updatedRequest) {
            return res.status(500).json({ error: 'Failed to update leave request' });
        }

        res.json({
            success: true,
            data: updatedRequest,
            message: `Leave request ${status} successfully`
        });
    } catch (error) {
        console.error('Error updating leave request status:', error);
        res.status(500).json({ error: 'Failed to update leave request status' });
    }
};

// Cancel leave request
export const cancelLeaveRequest = async (req: Request, res: Response) => {
    try {
        const requestId = parseInt(req.params.id);
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (isNaN(requestId)) {
            return res.status(400).json({ error: 'Invalid leave request ID' });
        }

        // Get employee by user ID
        const employee = await storage.getEmployeeByUserId(userId);
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Get the leave request
        const leaveRequest = await storage.getLeaveRequest(requestId);
        if (!leaveRequest) {
            return res.status(404).json({ error: 'Leave request not found' });
        }

        // Check if this request belongs to the current employee
        if (leaveRequest.employeeId !== employee.id) {
            return res.status(403).json({ error: 'You can only cancel your own leave requests' });
        }

        // Check if request can be cancelled (only pending requests)
        if (leaveRequest.status !== 'pending') {
            return res.status(400).json({ error: 'Only pending leave requests can be cancelled' });
        }

        // Update the leave request status to cancelled
        const updatedRequest = await storage.updateLeaveRequest(requestId, {
            status: 'cancelled'
        });

        if (!updatedRequest) {
            return res.status(500).json({ error: 'Failed to cancel leave request' });
        }

        res.json({
            success: true,
            data: updatedRequest,
            message: 'Leave request cancelled successfully'
        });
    } catch (error) {
        console.error('Error cancelling leave request:', error);
        res.status(500).json({ error: 'Failed to cancel leave request' });
    }
}; 