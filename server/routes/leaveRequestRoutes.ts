import { Express } from "express";
import { ensureAuthenticated, ensureManager } from "../middlewares/auth";
import {
    getAllLeaveRequests,
    getLeaveRequestsCount,
    createLeaveRequest,
    getLeaveRequestById,
    getEmployeeLeaveRequests,
    updateLeaveRequestStatus,
    cancelLeaveRequest
} from "../controllers/leaveRequestController";

export function leaveRequestRoutes(app: Express) {
    // Leave request endpoints

    // Get all leave requests (public for testing, should be protected in production)
    app.get("/api/leave-requests", ensureAuthenticated, getAllLeaveRequests);

    // Get leave requests count
    app.get("/api/leave-requests/count", ensureAuthenticated, getLeaveRequestsCount);

    // Create a new leave request (for employees)
    app.post("/api/leave-requests", ensureAuthenticated, createLeaveRequest);

    // Get leave request details by ID (for employees)
    app.get("/api/leave-requests/:id", ensureAuthenticated, getLeaveRequestById);

    // Get leave requests for a specific employee
    app.get("/api/leave-requests/employee/:employeeId", ensureAuthenticated, getEmployeeLeaveRequests);

    // Cancel leave request
    app.patch("/api/leave-requests/:id/cancel", ensureAuthenticated, cancelLeaveRequest);

    // Manager/Admin endpoints

    // Get all leave requests (for managers)
    app.get("/api/leave-requests/manager", ensureManager, getAllLeaveRequests);

    // Update leave request status (approve/reject)
    app.put("/api/leave-requests/:id/status", ensureManager, updateLeaveRequestStatus);

    // Approve leave request (specific endpoint for frontend compatibility)
    app.put("/api/leave-requests/:id/approve", ensureManager, async (req, res) => {
        // Set status to approved and call the main status update function
        req.body.status = 'approved';
        await updateLeaveRequestStatus(req, res);
    });

    // Reject leave request (specific endpoint for frontend compatibility)
    app.put("/api/leave-requests/:id/reject", ensureManager, async (req, res) => {
        // Set status to rejected and call the main status update function
        req.body.status = 'rejected';
        await updateLeaveRequestStatus(req, res);
    });
} 