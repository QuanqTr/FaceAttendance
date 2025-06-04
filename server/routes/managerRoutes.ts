import { Express } from "express";
import { ensureAuthenticated, ensureManager } from "../middlewares/auth";
import {
    getAllManagers,
    getManagerDailyStats,
    getManagerWeeklyStats,
    getManagerDepartmentStats,
    getManagerLeaveRequests,
    getManagerLeaveRequest,
    createManagerLeaveRequest,
    updateManagerLeaveRequest,
    deleteManagerLeaveRequest,
    approveLeaveRequest,
    rejectLeaveRequest,
    getManagerEmployees,
    getManagerEmployee,
    createManagerEmployee,
    updateManagerEmployee,
    deleteManagerEmployee,
    getManagerAttendanceSummary,
    getManagerAttendance,
    getManagerDepartmentInfo,
    getManagerDepartments,
    getManagerUsers,
    createManagerUser,
    getManagerReports,
    getManagerWorkHours,
    getPendingApprovalsCount,
    getTopPerformers,
    createSampleTimeLogs,
    debugTimeLogs,
    debugWorkHours,
    getManagerProfile,
    updateManagerProfile,
    changeManagerPassword,
    getManagerDepartmentIds
} from "../controllers/managerController";
import nodemailer from 'nodemailer';

// In-memory store for manager OTP codes (use Redis in production)
const managerFaceOtpStore = new Map<string, {
    code: string;
    email: string;
    employeeId: number;
    userId: number;
    expiresAt: Date;
    attempts: number;
}>();

export function managerRoutes(app: Express) {
    // Manager authentication required for all routes

    // Manager Profile Management
    app.get("/api/manager/profile", ensureAuthenticated, ensureManager, getManagerProfile);
    app.put("/api/manager/profile", ensureAuthenticated, ensureManager, updateManagerProfile);
    app.put("/api/manager/change-password", ensureAuthenticated, ensureManager, changeManagerPassword);

    // Manager Face Profile Management Endpoints
    app.get("/api/manager/face-profile", ensureAuthenticated, ensureManager, async (req, res) => {
        try {
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            // Get manager's employee record
            const { storage } = await import("../models/storage");
            const employee = await storage.getEmployeeByUserId(userId);

            if (!employee) {
                return res.status(404).json({ error: 'Manager employee record not found' });
            }

            res.json({
                hasProfile: !!employee.faceDescriptor,
                employeeId: employee.id,
                employeeName: `${employee.firstName} ${employee.lastName}`
            });
        } catch (error) {
            console.error('Error fetching manager face profile:', error);
            res.status(500).json({ error: 'Failed to fetch face profile' });
        }
    });

    app.post("/api/manager/face-profile", ensureAuthenticated, ensureManager, async (req, res) => {
        try {
            const userId = req.user?.id;
            const { faceDescriptor, accessToken } = req.body;

            if (!userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            // Validate access token first
            if (!accessToken) {
                return res.status(403).json({ error: 'Access token required for face profile updates' });
            }

            try {
                const tokenData = JSON.parse(Buffer.from(accessToken, 'base64').toString());

                if (tokenData.purpose !== 'manager_face_profile' || tokenData.userId !== userId) {
                    return res.status(403).json({ error: 'Invalid or expired access token' });
                }

                if (Date.now() > tokenData.expiresAt) {
                    return res.status(401).json({ error: 'Access token has expired' });
                }
            } catch (error) {
                return res.status(403).json({ error: 'Invalid access token format' });
            }

            if (!faceDescriptor) {
                return res.status(400).json({ error: 'Face descriptor is required' });
            }

            if (!Array.isArray(faceDescriptor) || faceDescriptor.length === 0) {
                return res.status(400).json({ error: 'Invalid face descriptor format' });
            }

            // Get manager's employee record
            const { storage } = await import("../models/storage");
            const employee = await storage.getEmployeeByUserId(userId);

            if (!employee) {
                return res.status(404).json({ error: 'Manager employee record not found' });
            }

            console.log(`[ManagerFaceProfile] Updating face descriptor for manager employee ${employee.id}`);

            // Update face descriptor
            const updatedEmployee = await storage.updateEmployee(employee.id, {
                faceDescriptor: JSON.stringify(faceDescriptor)
            });

            if (!updatedEmployee) {
                return res.status(500).json({ error: 'Failed to update manager face data' });
            }

            console.log(`[ManagerFaceProfile] Successfully updated face descriptor for manager ${employee.id}`);

            res.json({
                success: true,
                message: 'Manager face profile updated successfully',
                hasFaceData: true
            });

        } catch (error) {
            console.error('Error updating manager face profile:', error);
            res.status(500).json({
                error: 'Failed to update manager face profile',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });

    app.delete("/api/manager/face-profile", ensureAuthenticated, ensureManager, async (req, res) => {
        try {
            const userId = req.user?.id;
            const { accessToken } = req.body;

            if (!userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            // Validate access token first
            if (!accessToken) {
                return res.status(403).json({ error: 'Access token required for face profile operations' });
            }

            try {
                const tokenData = JSON.parse(Buffer.from(accessToken, 'base64').toString());

                if (tokenData.purpose !== 'manager_face_profile' || tokenData.userId !== userId) {
                    return res.status(403).json({ error: 'Invalid or expired access token' });
                }

                if (Date.now() > tokenData.expiresAt) {
                    return res.status(401).json({ error: 'Access token has expired' });
                }
            } catch (error) {
                return res.status(403).json({ error: 'Invalid access token format' });
            }

            // Get manager's employee record
            const { storage } = await import("../models/storage");
            const employee = await storage.getEmployeeByUserId(userId);

            if (!employee) {
                return res.status(404).json({ error: 'Manager employee record not found' });
            }

            console.log(`[ManagerFaceProfile] Deleting face descriptor for manager employee ${employee.id}`);

            // Remove face descriptor
            const updatedEmployee = await storage.updateEmployee(employee.id, {
                faceDescriptor: null
            });

            if (!updatedEmployee) {
                return res.status(500).json({ error: 'Failed to delete manager face data' });
            }

            console.log(`[ManagerFaceProfile] Successfully deleted face descriptor for manager ${employee.id}`);

            res.json({
                success: true,
                message: 'Manager face profile deleted successfully',
                hasFaceData: false
            });

        } catch (error) {
            console.error('Error deleting manager face profile:', error);
            res.status(500).json({
                error: 'Failed to delete manager face profile',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });

    // Manager Face Profile Email Verification Endpoints

    // Send OTP to manager's email for face profile access
    app.post("/api/manager/face-profile/send-otp", ensureAuthenticated, ensureManager, async (req, res) => {
        try {
            const { employeeId } = req.body;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            console.log(`[ManagerFaceOTP] DEBUG - Request body:`, req.body);
            console.log(`[ManagerFaceOTP] DEBUG - UserId from session:`, userId);
            console.log(`[ManagerFaceOTP] DEBUG - EmployeeId from request:`, employeeId);
            console.log(`[ManagerFaceOTP] Sending OTP for employee ${employeeId}, user ${userId}`);

            // Kiểm tra quyền - manager có thể gửi OTP cho chính họ
            const { storage } = await import("../models/storage");
            const currentEmployee = await storage.getEmployeeByUserId(userId);

            console.log(`[ManagerFaceOTP] DEBUG - Current employee from userId ${userId}:`, currentEmployee);

            if (!currentEmployee) {
                console.log(`[ManagerFaceOTP] ERROR - No employee found for userId ${userId}`);
                return res.status(404).json({ error: 'Manager employee record not found for current user' });
            }

            if (currentEmployee.id !== employeeId) {
                console.log(`[ManagerFaceOTP] ERROR - Employee ID mismatch. Current: ${currentEmployee.id}, Requested: ${employeeId}`);
                return res.status(403).json({ error: 'Unauthorized. You can only request OTP for your own profile' });
            }

            // Lấy thông tin employee để có email
            const employee = await storage.getEmployee(employeeId);
            if (!employee || !employee.email) {
                return res.status(404).json({ error: 'Manager email not found' });
            }

            // Tạo OTP code 6 số
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

            // Lưu OTP vào memory store
            const otpKey = `manager_face_otp_${employeeId}`;
            managerFaceOtpStore.set(otpKey, {
                code: otpCode,
                email: employee.email,
                employeeId: employeeId,
                userId: userId,
                expiresAt: expiresAt,
                attempts: 0
            });

            // Gửi email thực sự
            await sendManagerFaceAuthEmail(employee.email, otpCode, `${employee.firstName} ${employee.lastName}`);

            console.log(`[ManagerFaceOTP] OTP Code for ${employee.email}: ${otpCode}`);
            console.log(`[ManagerFaceOTP] OTP expires at: ${expiresAt}`);

            res.json({
                success: true,
                message: 'Mã xác thực Manager đã được gửi đến email của bạn',
                email: employee.email.replace(/(.{2}).*@/, '$1***@'), // Ẩn một phần email
                expiresIn: 10 * 60 // 10 phút tính bằng giây
            });

        } catch (error) {
            console.error('Error sending manager face OTP:', error);
            res.status(500).json({ error: 'Failed to send OTP' });
        }
    });

    // Verify OTP for manager face profile access
    app.post("/api/manager/face-profile/verify-otp", ensureAuthenticated, ensureManager, async (req, res) => {
        try {
            const { employeeId, otpCode } = req.body;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            console.log(`[ManagerFaceOTP] Verifying OTP for employee ${employeeId}, code: ${otpCode}`);

            // Kiểm tra quyền
            const { storage } = await import("../models/storage");
            const currentEmployee = await storage.getEmployeeByUserId(userId);
            if (!currentEmployee || currentEmployee.id !== employeeId) {
                return res.status(403).json({ error: 'Unauthorized' });
            }

            // Lấy OTP từ store
            const otpKey = `manager_face_otp_${employeeId}`;
            const otpData = managerFaceOtpStore.get(otpKey);

            if (!otpData) {
                return res.status(400).json({
                    error: 'Mã OTP không tồn tại hoặc đã hết hạn',
                    code: 'OTP_NOT_FOUND'
                });
            }

            // Kiểm tra hết hạn
            if (new Date() > otpData.expiresAt) {
                managerFaceOtpStore.delete(otpKey);
                return res.status(400).json({
                    error: 'Mã OTP đã hết hạn',
                    code: 'OTP_EXPIRED'
                });
            }

            // Kiểm tra số lần thử
            if (otpData.attempts >= 3) {
                managerFaceOtpStore.delete(otpKey);
                return res.status(400).json({
                    error: 'Đã thử quá nhiều lần. Vui lòng yêu cầu mã mới',
                    code: 'TOO_MANY_ATTEMPTS'
                });
            }

            // Kiểm tra mã OTP
            if (otpData.code !== otpCode) {
                otpData.attempts += 1;
                managerFaceOtpStore.set(otpKey, otpData);

                const remainingAttempts = 3 - otpData.attempts;
                return res.status(400).json({
                    error: `Mã OTP không đúng. Còn ${remainingAttempts} lần thử`,
                    code: 'INVALID_OTP',
                    remainingAttempts: remainingAttempts
                });
            }

            // OTP đúng - tạo access token
            const accessToken = Buffer.from(JSON.stringify({
                employeeId: employeeId,
                userId: userId,
                email: otpData.email,
                purpose: 'manager_face_profile',
                issuedAt: Date.now(),
                expiresAt: Date.now() + 15 * 60 * 1000 // 15 phút
            })).toString('base64');

            // Xóa OTP đã sử dụng
            managerFaceOtpStore.delete(otpKey);

            console.log(`[ManagerFaceOTP] OTP verified successfully for manager employee ${employeeId}`);

            res.json({
                success: true,
                message: 'Xác thực Manager thành công',
                accessToken: accessToken,
                expiresIn: 15 * 60 // 15 phút
            });

        } catch (error) {
            console.error('Error verifying manager face OTP:', error);
            res.status(500).json({ error: 'Failed to verify OTP' });
        }
    });

    // Validate access token for manager face profile
    app.post("/api/manager/face-profile/validate-token", ensureAuthenticated, ensureManager, async (req, res) => {
        try {
            const { accessToken } = req.body;
            const userId = req.user?.id;

            if (!accessToken) {
                return res.status(400).json({ error: 'Access token required' });
            }

            // Decode and validate token
            const tokenData = JSON.parse(Buffer.from(accessToken, 'base64').toString());

            if (tokenData.purpose !== 'manager_face_profile' || tokenData.userId !== userId) {
                return res.status(403).json({ error: 'Invalid token' });
            }

            if (Date.now() > tokenData.expiresAt) {
                return res.status(401).json({ error: 'Token expired' });
            }

            res.json({ success: true, valid: true });

        } catch (error) {
            console.error('Error validating manager access token:', error);
            res.status(400).json({ error: 'Invalid token format' });
        }
    });

    // Department and Manager Info
    app.get("/api/manager/department-info", ensureAuthenticated, ensureManager, getManagerDepartmentInfo);
    app.get("/api/manager/departments", ensureAuthenticated, ensureManager, getManagerDepartments);
    app.get("/api/managers", ensureAuthenticated, getAllManagers);

    // Pending items
    app.get("/api/manager/pending-counts", ensureAuthenticated, ensureManager, getPendingApprovalsCount);

    // Employee Management (Department-scoped)
    app.get("/api/manager/employees", ensureAuthenticated, ensureManager, getManagerEmployees);
    app.get("/api/manager/employees/:id", ensureAuthenticated, ensureManager, getManagerEmployee);
    app.post("/api/manager/employees", ensureAuthenticated, ensureManager, createManagerEmployee);
    app.put("/api/manager/employees/:id", ensureAuthenticated, ensureManager, updateManagerEmployee);
    app.delete("/api/manager/employees/:id", ensureAuthenticated, ensureManager, deleteManagerEmployee);

    // Leave Requests Management
    app.get("/api/manager/leave-requests", ensureAuthenticated, ensureManager, getManagerLeaveRequests);
    app.get("/api/manager/leave-requests/:id", ensureAuthenticated, ensureManager, getManagerLeaveRequest);
    app.post("/api/manager/leave-requests", ensureAuthenticated, ensureManager, createManagerLeaveRequest);
    app.put("/api/manager/leave-requests/:id", ensureAuthenticated, ensureManager, updateManagerLeaveRequest);
    app.delete("/api/manager/leave-requests/:id", ensureAuthenticated, ensureManager, deleteManagerLeaveRequest);
    app.put("/api/manager/leave-requests/:id/approve", ensureAuthenticated, ensureManager, approveLeaveRequest);
    app.put("/api/manager/leave-requests/:id/reject", ensureAuthenticated, ensureManager, rejectLeaveRequest);

    // User Account Management (Department employees)
    app.get("/api/manager/users", ensureAuthenticated, ensureManager, getManagerUsers);
    app.post("/api/manager/users", ensureAuthenticated, ensureManager, createManagerUser);

    // Statistics and Reports (Department-scoped)
    app.get("/api/manager/stats/daily", ensureAuthenticated, ensureManager, getManagerDailyStats);
    app.get("/api/manager/stats/weekly", ensureAuthenticated, ensureManager, getManagerWeeklyStats);
    app.get("/api/manager/stats/department", ensureAuthenticated, ensureManager, getManagerDepartmentStats);
    app.get("/api/manager/stats/departments", ensureAuthenticated, ensureManager, getManagerDepartmentStats);
    app.get("/api/manager/stats/top-performers", ensureAuthenticated, ensureManager, getTopPerformers);

    // Reports endpoints for manager interface - Using database data like admin
    app.get("/api/manager/stats/department-overall", ensureAuthenticated, ensureManager, (req, res) => {
        req.query.type = 'department-summary';
        getManagerReports(req, res);
    });

    app.get("/api/manager/stats/attendance-records", ensureAuthenticated, ensureManager, (req, res) => {
        req.query.type = 'attendance-records';
        getManagerReports(req, res);
    });

    app.get("/api/manager/stats/team-performance", ensureAuthenticated, ensureManager, (req, res) => {
        req.query.type = 'team-performance';
        getManagerReports(req, res);
    });

    app.get("/api/manager/stats/penalty-analysis", ensureAuthenticated, ensureManager, (req, res) => {
        req.query.type = 'penalty-analysis';
        getManagerReports(req, res);
    });

    app.get("/api/manager/stats/attendance-trends", ensureAuthenticated, ensureManager, (req, res) => {
        req.query.type = 'attendance-trends';
        getManagerReports(req, res);
    });

    app.get("/api/manager/stats/employees", ensureAuthenticated, ensureManager, (req, res) => {
        req.query.type = 'attendance-records';
        getManagerReports(req, res);
    });

    // Reports Generation - Using database data like admin interface
    app.get("/api/manager/reports", ensureAuthenticated, ensureManager, getManagerReports);

    // Attendance Management
    app.get("/api/manager/attendance-summary", ensureAuthenticated, ensureManager, getManagerAttendanceSummary);
    app.get("/api/manager/attendance", ensureAuthenticated, ensureManager, getManagerAttendance);
    app.get("/api/manager/work-hours", ensureAuthenticated, ensureManager, getManagerWorkHours);

    // Employee work hours history
    app.get("/api/manager/employees/:employeeId/work-hours", ensureAuthenticated, ensureManager, async (req, res) => {
        try {
            const { employeeId } = req.params;
            const { startDate, endDate } = req.query;

            if (!startDate || !endDate) {
                return res.status(400).json({ error: "startDate and endDate are required" });
            }

            console.log(`🔍 Fetching work hours for employee ${employeeId} from ${startDate} to ${endDate}`);

            // Check if manager has access to this employee
            const managerId = (req.user as any)?.id;
            const managerDepartmentIds = await getManagerDepartmentIds(managerId);

            console.log(`👤 Manager ${managerId} manages departments: [${managerDepartmentIds.join(', ')}]`);

            // Verify employee belongs to manager's departments
            const { pool } = await import("../db");
            const employeeCheck = await pool.query(
                'SELECT id, department_id FROM employees WHERE id = $1 AND department_id = ANY($2)',
                [employeeId, managerDepartmentIds]
            );

            if (employeeCheck.rows.length === 0) {
                console.log(`❌ Employee ${employeeId} not found in manager's departments`);
                return res.status(403).json({ error: 'Access denied to employee outside your departments' });
            }

            console.log(`✅ Employee ${employeeId} belongs to department ${employeeCheck.rows[0].department_id}`);

            const query = `
                SELECT
                    id,
                    work_date as "date",
                    first_checkin as "checkIn",
                    last_checkout as "checkOut",
                    COALESCE(regular_hours::numeric, 0) as "regularHours",
                    COALESCE(ot_hours::numeric, 0) as "overtimeHours",
                    (COALESCE(regular_hours::numeric, 0) + COALESCE(ot_hours::numeric, 0)) as "totalHours",
                    CASE
                        WHEN first_checkin IS NOT NULL AND first_checkin::time > '08:30:00'
                        THEN EXTRACT(EPOCH FROM (first_checkin::time - '08:30:00'::time))/60
                        ELSE 0
                    END as "lateMinutes",
                    CASE
                        WHEN last_checkout IS NOT NULL AND last_checkout::time < '17:00:00'
                        THEN EXTRACT(EPOCH FROM ('17:00:00'::time - last_checkout::time))/60
                        ELSE 0
                    END as "earlyMinutes",
                    status,
                    work_date as "createdAt"
                FROM work_hours
                WHERE employee_id = $1
                    AND work_date >= $2
                    AND work_date <= $3
                ORDER BY work_date DESC
            `;

            const result = await pool.query(query, [employeeId, startDate, endDate]);

            console.log(`📊 Found ${result.rows.length} work hours records for employee ${employeeId}`);

            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching employee work hours:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Debug endpoints for testing
    app.get("/api/manager/debug/time-logs", ensureAuthenticated, ensureManager, debugTimeLogs);
    app.get("/api/manager/debug/work-hours", ensureAuthenticated, ensureManager, debugWorkHours);
    app.post("/api/manager/debug/sample-time-logs", ensureAuthenticated, ensureManager, createSampleTimeLogs);

    // Development/Testing endpoints (without authentication)
    if (process.env.NODE_ENV === "development") {
        console.log("🚧 Development mode: Manager test endpoints enabled");

        // Test endpoints with mock manager user (user quang, ID 3, employee_id 5)
        app.get("/api/test/manager/employees", (req, res, next) => {
            req.user = { id: 3, role: 'manager', employeeId: 5 } as any; // Mock user quang
            getManagerEmployees(req, res);
        });

        app.get("/api/test/manager/leave-requests", (req, res, next) => {
            req.user = { id: 3, role: 'manager', employeeId: 5 } as any; // Mock user quang
            getManagerLeaveRequests(req, res);
        });

        app.get("/api/test/manager/stats/daily", (req, res, next) => {
            req.user = { id: 3, role: 'manager', employeeId: 5 } as any; // Mock user quang
            getManagerDailyStats(req, res);
        });

        app.get("/api/test/manager/stats/department", (req, res, next) => {
            req.user = { id: 3, role: 'manager', employeeId: 5 } as any; // Mock user quang
            getManagerDepartmentStats(req, res);
        });

        app.get("/api/test/manager/department-info", (req, res, next) => {
            req.user = { id: 3, role: 'manager', employeeId: 5 } as any; // Mock user quang
            getManagerDepartmentInfo(req, res);
        });

        app.get("/api/test/manager/attendance-summary", (req, res, next) => {
            req.user = { id: 3, role: 'manager', employeeId: 5 } as any; // Mock user quang
            getManagerAttendanceSummary(req, res);
        });

        app.get("/api/test/manager/pending-counts", (req, res, next) => {
            req.user = { id: 3, role: 'manager', employeeId: 5 } as any; // Mock user quang
            getPendingApprovalsCount(req, res);
        });

        app.get("/api/test/manager/stats/top-performers", (req, res, next) => {
            req.user = { id: 3, role: 'manager', employeeId: 5 } as any; // Mock user quang
            getTopPerformers(req, res);
        });

        app.get("/api/test/manager/attendance", (req, res, next) => {
            req.user = { id: 3, role: 'manager', employeeId: 5 } as any; // Mock user quang
            getManagerAttendance(req, res);
        });

        app.get("/api/test/manager/reports", (req, res, next) => {
            req.user = { id: 3, role: 'manager', employeeId: 5 } as any; // Mock user quang
            getManagerReports(req, res);
        });

        app.get("/api/test/manager/employees/:id", (req, res, next) => {
            req.user = { id: 3, role: 'manager', employeeId: 5 } as any; // Mock user quang
            getManagerEmployee(req, res);
        });

        // Create sample time logs for testing
        app.post("/api/test/manager/create-sample-logs", (req, res, next) => {
            req.user = { id: 3, role: 'manager', employeeId: 5 } as any; // Mock user quang
            createSampleTimeLogs(req, res);
        });

        // Debug endpoint to check database queries
        app.get("/api/test/manager/debug", async (req, res) => {
            try {
                const { pool } = await import('../db.js');

                // Test basic query
                const basicTest = await pool.query('SELECT COUNT(*) as count FROM employees');
                console.log('Basic test:', basicTest.rows[0]);

                // Test departments query
                const deptTest = await pool.query('SELECT id, name, manager_id FROM departments LIMIT 5');
                console.log('Department test:', deptTest.rows);

                // Test work_hours table structure
                const workHoursTest = await pool.query(`
                    SELECT column_name, data_type, is_nullable 
                    FROM information_schema.columns 
                    WHERE table_name = 'work_hours'
                    ORDER BY ordinal_position
                `);
                console.log('Work hours structure:', workHoursTest.rows);

                res.json({
                    success: true,
                    basicTest: basicTest.rows[0],
                    departments: deptTest.rows,
                    workHoursStructure: workHoursTest.rows
                });
            } catch (error) {
                console.error('Debug error:', error);
                res.status(500).json({
                    error: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined
                });
            }
        });

        // Insert sample work_hours data
        app.post("/api/test/insert-work-hours", async (req, res) => {
            try {
                const { pool } = await import('../db.js');
                console.log('🔧 Inserting sample work_hours data...');

                // Delete existing records for 2025-05-29
                await pool.query("DELETE FROM work_hours WHERE work_date = '2025-05-29'");

                // Insert 3 sample records for employees in managed departments
                const sampleData = [
                    {
                        employee_id: 48,
                        checkin: '2025-05-29 08:15:00',
                        checkout: '2025-05-29 17:30:00',
                        regular_hours: 8.25,
                        ot_hours: 1.25,
                        status: 'normal'
                    },
                    {
                        employee_id: 4,
                        checkin: '2025-05-29 08:30:00',
                        checkout: '2025-05-29 17:45:00',
                        regular_hours: 8.25,
                        ot_hours: 1.25,
                        status: 'normal'
                    },
                    {
                        employee_id: 22,
                        checkin: '2025-05-29 08:45:00',
                        checkout: '2025-05-29 17:00:00',
                        regular_hours: 8.25,
                        ot_hours: 0.00,
                        status: 'late'
                    }
                ];

                for (const record of sampleData) {
                    await pool.query(`
                        INSERT INTO work_hours (employee_id, work_date, first_checkin, last_checkout, regular_hours, ot_hours, status)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                    `, [
                        record.employee_id,
                        '2025-05-29',
                        record.checkin,
                        record.checkout,
                        record.regular_hours,
                        record.ot_hours,
                        record.status
                    ]);
                }

                console.log(`✅ Inserted ${sampleData.length} work_hours records`);

                // Verify the data
                const verifyResult = await pool.query(`
                    SELECT 
                        wh.employee_id,
                        e.first_name || ' ' || e.last_name AS full_name,
                        e.department_id,
                        wh.first_checkin,
                        wh.last_checkout,
                        wh.regular_hours,
                        wh.status
                    FROM work_hours wh
                    JOIN employees e ON wh.employee_id = e.id
                    WHERE wh.work_date = '2025-05-29'
                    ORDER BY e.department_id, e.first_name
                `);

                res.json({
                    success: true,
                    message: `Inserted ${sampleData.length} work_hours records`,
                    records: verifyResult.rows
                });
            } catch (error) {
                console.error('❌ Error inserting work_hours:', error);
                res.status(500).json({
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });

        // Debug work_hours endpoint without auth
        app.get("/api/test/manager/debug-work-hours", (req, res, next) => {
            req.user = { id: 3, role: 'manager', employeeId: 5 } as any; // Mock user
            debugWorkHours(req, res);
        });

        // Test manager employee work hours endpoint without auth
        app.get("/api/test/manager/employees/:employeeId/work-hours", async (req, res) => {
            try {
                // Mock manager user
                req.user = { id: 3, role: 'manager', employeeId: 5 } as any;

                const { employeeId } = req.params;
                const { startDate, endDate } = req.query;

                console.log(`🧪 TEST: Fetching work hours for employee ${employeeId} from ${startDate} to ${endDate}`);

                // Use default date range if not provided
                const defaultStartDate = startDate || '2025-01-01';
                const defaultEndDate = endDate || '2025-12-31';

                const { pool } = await import("../db");

                // First check if employee exists
                const employeeCheck = await pool.query('SELECT id, first_name, last_name, department_id FROM employees WHERE id = $1', [employeeId]);

                if (employeeCheck.rows.length === 0) {
                    return res.status(404).json({ error: 'Employee not found', employeeId });
                }

                console.log(`👤 Employee found:`, employeeCheck.rows[0]);

                // Check work hours data
                const workHoursQuery = `
                    SELECT
                        id,
                        work_date as "date",
                        first_checkin as "checkIn",
                        last_checkout as "checkOut",
                        COALESCE(regular_hours::numeric, 0) as "regularHours",
                        COALESCE(ot_hours::numeric, 0) as "overtimeHours",
                        (COALESCE(regular_hours::numeric, 0) + COALESCE(ot_hours::numeric, 0)) as "totalHours",
                        status
                    FROM work_hours
                    WHERE employee_id = $1
                        AND work_date >= $2
                        AND work_date <= $3
                    ORDER BY work_date DESC
                `;

                const result = await pool.query(workHoursQuery, [employeeId, defaultStartDate, defaultEndDate]);

                console.log(`📊 Found ${result.rows.length} work hours records for employee ${employeeId}`);

                res.json({
                    success: true,
                    employee: employeeCheck.rows[0],
                    workHours: result.rows,
                    count: result.rows.length,
                    dateRange: { startDate: defaultStartDate, endDate: defaultEndDate }
                });
            } catch (error) {
                console.error('❌ Test endpoint error:', error);
                res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
            }
        });

        // Simple work_hours analysis
        app.get("/api/test/work-hours-analysis", async (req, res) => {
            try {
                const { date = '2025-05-29' } = req.query;
                const { pool } = await import('../db.js');

                console.log(`🔍 Analyzing work_hours for date: ${date}`);

                // Check work_hours for specific date
                const workHoursQuery = await pool.query(`
                    SELECT 
                        wh.employee_id,
                        e.first_name,
                        e.last_name,
                        e.department_id,
                        wh.work_date,
                        wh.first_checkin,
                        wh.last_checkout,
                        wh.regular_hours,
                        wh.status
                    FROM work_hours wh
                    JOIN employees e ON wh.employee_id = e.id
                    WHERE wh.work_date = $1
                `, [date]);

                // Check all dates in work_hours
                const allDatesQuery = await pool.query(`
                    SELECT DISTINCT work_date, COUNT(*) as records
                    FROM work_hours 
                    GROUP BY work_date
                    ORDER BY work_date DESC
                    LIMIT 5
                `);

                console.log(`📊 Found ${workHoursQuery.rows.length} work_hours records for ${date}`);
                console.log(`📅 Recent dates:`, allDatesQuery.rows);

                res.json({
                    requestedDate: date,
                    workHoursForDate: workHoursQuery.rows,
                    countForDate: workHoursQuery.rows.length,
                    recentDates: allDatesQuery.rows,
                    analysis: {
                        hasData: workHoursQuery.rows.length > 0,
                        firstCheckinExists: workHoursQuery.rows.some((row: any) => row.first_checkin),
                        allEmployeeIds: workHoursQuery.rows.map((row: any) => row.employee_id)
                    }
                });
            } catch (error) {
                console.error('❌ Work hours analysis error:', error);
                res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
            }
        });

        // Database fix endpoint for development
        app.post("/api/test/fix-manager-departments", async (req, res) => {
            try {
                console.log('🔧 Fixing manager departments via API...');
                const { pool } = await import('../db.js');

                // First check what departments exist
                const deptCheck = await pool.query('SELECT id, name, manager_id FROM departments ORDER BY id');
                console.log('📋 Existing departments:', deptCheck.rows);

                // Check what employees exist  
                const empCheck = await pool.query('SELECT id, first_name, last_name, department_id FROM employees ORDER BY id');
                console.log('👥 Existing employees:', empCheck.rows);

                // Check if employee 5 exists
                const emp5Check = await pool.query('SELECT * FROM employees WHERE id = 5');
                if (emp5Check.rows.length === 0) {
                    console.log('❌ Employee 5 does not exist, cannot proceed');
                    return res.json({
                        error: 'Employee 5 (Quang) does not exist in database',
                        departments: deptCheck.rows,
                        employees: empCheck.rows
                    });
                }

                // Only set manager if departments exist
                if (deptCheck.rows.length >= 2) {
                    // Set employee 5 as manager of first two departments
                    const firstDeptId = deptCheck.rows[0].id;
                    const secondDeptId = deptCheck.rows[1].id;

                    await pool.query('UPDATE departments SET manager_id = 5 WHERE id IN ($1, $2)', [firstDeptId, secondDeptId]);
                    console.log(`✅ Set employee 5 as manager of departments ${firstDeptId} and ${secondDeptId}`);
                } else {
                    console.log('❌ Not enough departments to assign manager');
                }

                // Verify the setup
                const result = await pool.query(`
                    SELECT 
                        d.id,
                        d.name,
                        d.manager_id,
                        COUNT(e.id) as employee_count
                    FROM departments d
                    LEFT JOIN employees e ON e.department_id = d.id
                    WHERE d.manager_id = 5
                    GROUP BY d.id, d.name, d.manager_id
                    ORDER BY d.id
                `);

                console.log('✅ Verification result:', result.rows);

                const totalEmployees = result.rows.reduce((sum, row) => sum + parseInt(row.employee_count), 0);

                res.json({
                    success: true,
                    message: 'Manager departments fixed successfully',
                    departments: result.rows,
                    totalEmployees: totalEmployees,
                    allDepartments: deptCheck.rows,
                    allEmployees: empCheck.rows.length
                });
            } catch (error) {
                console.error('❌ Error fixing manager departments:', error);
                res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
            }
        });

        // Create mock manager data endpoint
        app.post("/api/test/create-mock-manager", async (req, res) => {
            try {
                console.log('🎭 Creating mock manager data...');

                // Return mock data without touching database
                const mockManagerData = {
                    managerId: 3,
                    employeeId: 5,
                    departments: [
                        { id: 1, name: 'IT Department', manager_id: 5, employee_count: 5 },
                        { id: 2, name: 'HR Department', manager_id: 5, employee_count: 4 }
                    ],
                    employees: [
                        { id: 1, name: 'John Doe', department: 'IT Department', position: 'Developer' },
                        { id: 2, name: 'Jane Smith', department: 'IT Department', position: 'Designer' },
                        { id: 3, name: 'Bob Wilson', department: 'IT Department', position: 'Tester' },
                        { id: 4, name: 'Alice Brown', department: 'HR Department', position: 'HR Manager' },
                        { id: 5, name: 'Quang Manager', department: 'IT Department', position: 'Team Lead' }
                    ],
                    totalEmployees: 9
                };

                console.log('✅ Mock manager data created:', mockManagerData);
                res.json({
                    success: true,
                    message: 'Mock manager data created successfully',
                    data: mockManagerData
                });
            } catch (error) {
                console.error('❌ Error creating mock data:', error);
                res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
            }
        });

        // Create work_hours sample data endpoint
        app.post("/api/test/create-work-hours-sample", async (req, res) => {
            try {
                const { date = '2025-05-29', departments = [10, 12, 8] } = req.body;
                console.log(`🔧 Creating work_hours sample data for date: ${date}, departments: ${departments}`);

                const { pool } = await import('../db.js');

                // Get employees in target departments
                const employeesResult = await pool.query(`
                    SELECT id, first_name, last_name, department_id
                    FROM employees 
                    WHERE department_id = ANY($1) AND status = 'active'
                    LIMIT 5
                `, [departments]);

                console.log(`Found ${employeesResult.rows.length} employees in departments [${departments.join(', ')}]`);

                if (employeesResult.rows.length === 0) {
                    return res.status(404).json({
                        error: 'No employees found in target departments',
                        departments: departments
                    });
                }

                // Delete existing work_hours for this date to avoid duplicates
                await pool.query('DELETE FROM work_hours WHERE work_date = $1', [date]);

                const createdRecords = [];

                for (const employee of employeesResult.rows) {
                    // Generate realistic check-in time (8:00-9:30 AM)
                    const checkInHour = 8 + Math.random() * 1.5;
                    const checkInMinute = Math.floor(Math.random() * 60);
                    const checkInTime = new Date(`${date}T${String(Math.floor(checkInHour)).padStart(2, '0')}:${String(checkInMinute).padStart(2, '0')}:00Z`);

                    // Generate realistic check-out time (17:00-19:00 PM)
                    const checkOutHour = 17 + Math.random() * 2;
                    const checkOutMinute = Math.floor(Math.random() * 60);
                    const checkOutTime = new Date(`${date}T${String(Math.floor(checkOutHour)).padStart(2, '0')}:${String(checkOutMinute).padStart(2, '0')}:00Z`);

                    // Calculate work hours
                    const workHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
                    const regularHours = Math.min(workHours, 8);
                    const otHours = Math.max(0, workHours - 8);

                    // Determine status
                    const status = checkInHour > 8.5 ? 'late' : 'normal';

                    console.log(`Creating work_hours for employee ${employee.id} (${employee.first_name} ${employee.last_name})`);

                    await pool.query(`
                        INSERT INTO work_hours (employee_id, work_date, first_checkin, last_checkout, regular_hours, ot_hours, status)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                    `, [
                        employee.id,
                        date,
                        checkInTime,
                        checkOutTime,
                        regularHours.toFixed(2),
                        otHours.toFixed(2),
                        status
                    ]);

                    createdRecords.push({
                        employeeId: employee.id,
                        employeeName: `${employee.first_name} ${employee.last_name}`,
                        checkIn: checkInTime.toISOString(),
                        checkOut: checkOutTime.toISOString(),
                        regularHours: regularHours.toFixed(2),
                        otHours: otHours.toFixed(2),
                        status: status
                    });
                }

                console.log(`✅ Successfully created work_hours records for ${createdRecords.length} employees on ${date}`);

                res.json({
                    success: true,
                    message: `Created work_hours records for ${createdRecords.length} employees`,
                    date: date,
                    departments: departments,
                    records: createdRecords
                });
            } catch (error) {
                console.error('❌ Error creating work_hours sample data:', error);
                res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
            }
        });
    }
}

// Hàm gửi email xác thực cho Manager Face Profile
async function sendManagerFaceAuthEmail(email: string, otpCode: string, fullName: string): Promise<void> {
    try {
        console.log("Setting up manager face auth email transporter...");

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER || 'mynameisquanq@gmail.com',
                pass: process.env.GMAIL_APP_PASSWORD || 'aixk pfwa xfin uswp'
            }
        });

        console.log("Manager face auth email transporter created successfully");

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background-color: #f8fafc; }
                .code-box { background-color: #ffffff; border: 2px solid #2563eb; padding: 20px; margin: 20px 0; text-align: center; border-radius: 8px; }
                .code { font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 4px; font-family: monospace; }
                .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 10px; margin: 15px 0; }
                .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
                .manager-badge { background-color: #1d4ed8; color: white; padding: 4px 12px; border-radius: 16px; font-size: 12px; display: inline-block; margin: 5px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>👨‍💼 FaceAttend - Mã xác thực Manager</h1>
                    <div class="manager-badge">MANAGER ACCESS</div>
                </div>
                <div class="content">
                    <h2>Xin chào Manager ${fullName},</h2>
                    
                    <p>Bạn đã yêu cầu truy cập vào hệ thống Face Recognition với quyền Manager.</p>
                    
                    <div class="code-box">
                        <p><strong>Mã xác thực Manager của bạn là:</strong></p>
                        <div class="code">${otpCode}</div>
                    </div>
                    
                    <div class="warning">
                        <h3>⚠️ Lưu ý quan trọng cho Manager:</h3>
                        <ul>
                            <li>Mã này có hiệu lực trong <strong>10 phút</strong></li>
                            <li>Chỉ sử dụng một lần</li>
                            <li>Chỉ Manager mới có quyền truy cập tính năng này</li>
                            <li>Không chia sẻ mã này với bất kỳ ai, kể cả nhân viên</li>
                            <li>Sau khi xác thực, bạn có quyền cập nhật dữ liệu khuôn mặt trong 15 phút</li>
                        </ul>
                    </div>
                    
                    <p>Với quyền Manager, bạn có thể:</p>
                    <ul>
                        <li>✅ Cập nhật dữ liệu khuôn mặt cá nhân</li>
                        <li>✅ Quản lý thông tin profile</li>
                        <li>✅ Truy cập các tính năng bảo mật cao</li>
                    </ul>
                    
                    <p>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này và thông báo cho IT Department.</p>
                    
                    <div class="footer">
                        <p>Email này được gửi tự động từ hệ thống FaceAttend.<br>
                        Vui lòng không trả lời email này.</p>
                        <p>© 2024 FaceAttend - Hệ thống chấm công nhận diện khuôn mặt</p>
                        <p><strong>Manager Portal</strong> | Department Management System</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;

        const mailOptions = {
            from: {
                name: 'FaceAttend Manager System',
                address: process.env.GMAIL_USER || 'mynameisquanq@gmail.com'
            },
            to: email,
            subject: `👨‍💼 [FaceAttend] Mã xác thực Manager - ${otpCode}`,
            html: htmlContent,
            text: `
Xin chào Manager ${fullName},

Mã xác thực Manager của bạn là: ${otpCode}

Mã này có hiệu lực trong 10 phút và chỉ sử dụng một lần.
Chỉ Manager mới có quyền truy cập Face Recognition Profile.

Sau khi xác thực, bạn có quyền cập nhật dữ liệu khuôn mặt trong 15 phút.

Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.

Trân trọng,
FaceAttend Manager System
            `
        };

        console.log("Sending manager face auth email to:", email);
        const info = await transporter.sendMail(mailOptions);
        console.log("Manager face auth email sent successfully!");
        console.log("Message ID:", info.messageId);

    } catch (error) {
        console.error("Error sending manager face auth email:", error);
        throw new Error(`Không thể gửi email xác thực Manager: ${(error as Error).message}`);
    }
} 