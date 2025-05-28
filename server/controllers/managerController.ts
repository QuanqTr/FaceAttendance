import { Request, Response } from "express";
import { storage } from "../models/storage";

// Get all managers
export const getAllManagers = async (req: Request, res: Response) => {
    try {
        const managers = await storage.getAllManagers();
        res.json(managers);
    } catch (error) {
        console.error('Error fetching managers:', error);
        res.status(500).json({ error: 'Failed to fetch managers' });
    }
};

// Get manager daily stats
export const getManagerDailyStats = async (req: Request, res: Response) => {
    try {
        const { date } = req.query;
        const targetDate = date ? new Date(date as string) : new Date();

        const stats = await storage.getDailyAttendanceSummary(targetDate);

        res.json(stats);
    } catch (error) {
        console.error('Error fetching manager daily stats:', error);
        res.status(500).json({ error: 'Failed to fetch daily stats' });
    }
};

// Get manager weekly stats
export const getManagerWeeklyStats = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;

        // Default to current week if dates not provided
        let start: Date;
        let end: Date;

        if (!startDate || !endDate) {
            // Default to current week (last 7 days)
            end = new Date();
            start = new Date();
            start.setDate(end.getDate() - 6);
        } else {
            start = new Date(startDate as string);
            end = new Date(endDate as string);

            // Validate dates
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return res.status(400).json({ error: 'Invalid date format' });
            }
        }

        console.log(`[Manager Weekly Stats] Date range: ${start.toISOString()} to ${end.toISOString()}`);

        const stats = await storage.getWeeklyAttendance(start, end);

        res.json(stats);
    } catch (error) {
        console.error('Error fetching manager weekly stats:', error);
        res.status(500).json({ error: 'Failed to fetch weekly stats' });
    }
};

// Get manager department stats
export const getManagerDepartmentStats = async (req: Request, res: Response) => {
    try {
        const { date } = req.query;
        const targetDate = date ? new Date(date as string) : new Date();

        const stats = await storage.getDepartmentAttendanceStats(targetDate);

        res.json(stats);
    } catch (error) {
        console.error('Error fetching manager department stats:', error);
        res.status(500).json({ error: 'Failed to fetch department stats' });
    }
};

// Get manager leave requests
export const getManagerLeaveRequests = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 10, status = 'all' } = req.query;

        const leaveRequests = await storage.getAllLeaveRequestsWithEmployeeDetails(
            parseInt(page as string),
            parseInt(limit as string),
            status as string
        );

        res.json(leaveRequests);
    } catch (error) {
        console.error('Error fetching manager leave requests:', error);
        res.status(500).json({ error: 'Failed to fetch leave requests' });
    }
};

// Get specific leave request for manager
export const getManagerLeaveRequest = async (req: Request, res: Response) => {
    try {
        const leaveRequestId = parseInt(req.params.id);

        if (isNaN(leaveRequestId)) {
            return res.status(400).json({ error: 'Invalid leave request ID' });
        }

        const leaveRequest = await storage.getLeaveRequest(leaveRequestId);

        if (!leaveRequest) {
            return res.status(404).json({ error: 'Leave request not found' });
        }

        res.json(leaveRequest);
    } catch (error) {
        console.error('Error fetching manager leave request:', error);
        res.status(500).json({ error: 'Failed to fetch leave request' });
    }
};

// Get manager employees
export const getManagerEmployees = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        const result = await storage.getAllEmployees(
            parseInt(page as string),
            parseInt(limit as string)
        );

        res.json(result);
    } catch (error) {
        console.error('Error fetching manager employees:', error);
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
};

// Get manager attendance summary
export const getManagerAttendanceSummary = async (req: Request, res: Response) => {
    try {
        const { date } = req.query;
        const targetDate = date ? new Date(date as string) : new Date();

        const summary = await storage.getDailyAttendanceSummary(targetDate);

        res.json(summary);
    } catch (error) {
        console.error('Error fetching manager attendance summary:', error);
        res.status(500).json({ error: 'Failed to fetch attendance summary' });
    }
};

// Create leave request (manager creating for employee)
export const createManagerLeaveRequest = async (req: Request, res: Response) => {
    try {
        const { employeeId, type, startDate, endDate, reason, status } = req.body;

        if (!employeeId || !type || !startDate || !endDate || !reason) {
            return res.status(400).json({
                error: 'Employee ID, type, start date, end date, and reason are required'
            });
        }

        const leaveRequestData = {
            employeeId: parseInt(employeeId),
            type,
            startDate: startDate, // Keep as string format for schema compatibility
            endDate: endDate,     // Keep as string format for schema compatibility
            reason,
            status: status || 'pending'
        };

        const newLeaveRequest = await storage.createLeaveRequest(leaveRequestData);

        res.status(201).json({
            success: true,
            data: newLeaveRequest,
            message: 'Leave request created successfully'
        });
    } catch (error) {
        console.error('Error creating manager leave request:', error);
        res.status(500).json({ error: 'Failed to create leave request' });
    }
};

// Approve leave request
export const approveLeaveRequest = async (req: Request, res: Response) => {
    try {
        const leaveRequestId = parseInt(req.params.id);

        if (isNaN(leaveRequestId)) {
            return res.status(400).json({ error: 'Invalid leave request ID' });
        }

        const updatedRequest = await storage.updateLeaveRequest(leaveRequestId, {
            status: 'approved'
        });

        if (!updatedRequest) {
            return res.status(404).json({ error: 'Leave request not found' });
        }

        res.json({
            success: true,
            data: updatedRequest,
            message: 'Leave request approved successfully'
        });
    } catch (error) {
        console.error('Error approving leave request:', error);
        res.status(500).json({ error: 'Failed to approve leave request' });
    }
};

// Reject leave request
export const rejectLeaveRequest = async (req: Request, res: Response) => {
    try {
        const leaveRequestId = parseInt(req.params.id);

        if (isNaN(leaveRequestId)) {
            return res.status(400).json({ error: 'Invalid leave request ID' });
        }

        const updatedRequest = await storage.updateLeaveRequest(leaveRequestId, {
            status: 'rejected'
        });

        if (!updatedRequest) {
            return res.status(404).json({ error: 'Leave request not found' });
        }

        res.json({
            success: true,
            data: updatedRequest,
            message: 'Leave request rejected successfully'
        });
    } catch (error) {
        console.error('Error rejecting leave request:', error);
        res.status(500).json({ error: 'Failed to reject leave request' });
    }
}; 