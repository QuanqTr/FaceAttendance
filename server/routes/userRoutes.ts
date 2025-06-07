import { Express } from "express";
import { ensureAuthenticated, ensureAdmin } from "../middlewares/auth";
import {
    getAllUsers,
    getAllAccounts,
    getUser,
    createUser,
    updateUser,
    updateUserPassword,
    deleteUser,
    getUserFaceProfile,
    updateUserFaceProfile,
    deleteUserFaceProfile
} from "../controllers/userController";
import { db } from "../db";
import { employees, attendanceSummary, leaveRequests, departments, workHours } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { storage } from "../models/storage";
import nodemailer from 'nodemailer';

// User Face OTP Store - tạm thời dùng memory, nên chuyển sang Redis
const userFaceOtpStore = new Map<string, {
    code: string;
    email: string;
    employeeId: number;
    userId: number;
    expiresAt: Date;
    attempts: number;
}>();

// Hàm gửi email xác thực cho User Face Profile
async function sendUserFaceAuthEmail(email: string, otpCode: string, fullName: string): Promise<void> {
    try {
        console.log("Setting up user face auth email transporter...");

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER || 'mynameisquanq@gmail.com',
                pass: process.env.GMAIL_APP_PASSWORD || 'aixk pfwa xfin uswp'
            }
        });

        console.log("User face auth email transporter created successfully");

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #059669; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background-color: #f8fafc; }
                .code-box { background-color: #ffffff; border: 2px solid #059669; padding: 20px; margin: 20px 0; text-align: center; border-radius: 8px; }
                .code { font-size: 32px; font-weight: bold; color: #059669; letter-spacing: 4px; font-family: monospace; }
                .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 10px; margin: 15px 0; }
                .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
                .user-badge { background-color: #10b981; color: white; padding: 4px 12px; border-radius: 16px; font-size: 12px; display: inline-block; margin: 5px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>👤 FaceAttend - Mã xác thực User</h1>
                    <div class="user-badge">USER PROFILE ACCESS</div>
                </div>
                <div class="content">
                    <h2>Xin chào ${fullName},</h2>
                    
                    <p>Bạn đã yêu cầu truy cập vào tính năng cập nhật dữ liệu khuôn mặt cá nhân.</p>
                    
                    <div class="code-box">
                        <p><strong>Mã xác thực của bạn là:</strong></p>
                        <div class="code">${otpCode}</div>
                    </div>
                    
                    <div class="warning">
                        <h3>⚠️ Lưu ý quan trọng:</h3>
                        <ul>
                            <li>Mã này có hiệu lực trong <strong>10 phút</strong></li>
                            <li>Chỉ sử dụng một lần</li>
                            <li>Chỉ dành cho việc cập nhật dữ liệu khuôn mặt cá nhân</li>
                            <li>Không chia sẻ mã này với bất kỳ ai</li>
                            <li>Sau khi xác thực, bạn có quyền cập nhật trong 15 phút</li>
                        </ul>
                    </div>
                    
                    <p>Với xác thực này, bạn có thể:</p>
                    <ul>
                        <li>✅ Cập nhật dữ liệu khuôn mặt cho chấm công</li>
                        <li>✅ Quản lý thông tin nhận diện cá nhân</li>
                        <li>✅ Đảm bảo tính bảo mật của dữ liệu sinh trắc học</li>
                    </ul>
                    
                    <p>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này và liên hệ IT Department.</p>
                    
                    <div class="footer">
                        <p>Email này được gửi tự động từ hệ thống FaceAttend.<br>
                        Vui lòng không trả lời email này.</p>
                        <p>© 2024 FaceAttend - Hệ thống chấm công nhận diện khuôn mặt</p>
                        <p><strong>User Portal</strong> | Personal Profile Management</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;

        const mailOptions = {
            from: {
                name: 'FaceAttend User System',
                address: process.env.GMAIL_USER || 'mynameisquanq@gmail.com'
            },
            to: email,
            subject: `👤 [FaceAttend] Mã xác thực User Profile - ${otpCode}`,
            html: htmlContent,
            text: `
Xin chào ${fullName},

Mã xác thực User Profile của bạn là: ${otpCode}

Mã này có hiệu lực trong 10 phút và chỉ sử dụng một lần.
Dành cho việc cập nhật dữ liệu khuôn mặt cá nhân.

Sau khi xác thực, bạn có quyền cập nhật trong 15 phút.

Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.

Trân trọng,
FaceAttend User System
            `
        };

        console.log("Sending user face auth email to:", email);
        const info = await transporter.sendMail(mailOptions);
        console.log("User face auth email sent successfully!");
        console.log("Message ID:", info.messageId);

    } catch (error) {
        console.error("Error sending user face auth email:", error);
        throw new Error(`Không thể gửi email xác thực User: ${(error as Error).message}`);
    }
}

export function userRoutes(app: Express) {
    // User endpoints

    // Get all users
    app.get("/api/users", ensureAuthenticated, getAllUsers);

    // Get all accounts (alias for users)
    app.get("/api/accounts", ensureAuthenticated, getAllAccounts);

    // Get user by ID
    app.get("/api/users/:id", ensureAuthenticated, getUser);

    // Create new user
    app.post("/api/users", ensureAuthenticated, createUser);

    // Update user
    app.put("/api/users/:id", ensureAuthenticated, updateUser);

    // Update user password
    app.put("/api/users/:id/password", ensureAuthenticated, updateUserPassword);
    app.patch("/api/users/:id/password", ensureAuthenticated, updateUserPassword);

    // Delete user
    app.delete("/api/users/:id", ensureAuthenticated, deleteUser);

    // Face profile endpoints
    app.get("/api/users/:id/face-profile", ensureAuthenticated, getUserFaceProfile);
    app.post("/api/users/:id/face-profile", ensureAuthenticated, updateUserFaceProfile);
    app.delete("/api/users/:id/face-profile", ensureAuthenticated, deleteUserFaceProfile);

    // Get all departments (for profile dropdown)
    app.get("/api/departments", ensureAuthenticated, async (req, res) => {
        try {
            const departmentsList = await db.select().from(departments);
            res.json(departmentsList);
        } catch (error) {
            console.error('Error fetching departments:', error);
            res.status(500).json({ error: 'Failed to fetch departments' });
        }
    });

    // Employee attendance endpoints for users

    // Get attendance status for today
    app.get("/api/attendance/employee/:employeeId/status", ensureAuthenticated, async (req, res) => {
        try {
            const employeeId = parseInt(req.params.employeeId);
            const date = req.query.date as string || new Date().toISOString().split('T')[0];

            // Mock response - replace with actual implementation
            res.json({
                hasCheckedIn: false,
                hasCheckedOut: false,
                checkInTime: null,
                checkOutTime: null,
                status: 'absent',
                workHours: 0,
                expectedWorkHours: 8,
                isWorkingDay: true
            });
        } catch (error) {
            console.error('Error fetching attendance status:', error);
            res.status(500).json({ error: 'Failed to fetch attendance status' });
        }
    });

    // Get recent attendance records
    app.get("/api/attendance/employee/:employeeId/recent", ensureAuthenticated, async (req, res) => {
        try {
            const employeeId = parseInt(req.params.employeeId);
            const limit = parseInt(req.query.limit as string) || 5;

            // Mock response - replace with actual implementation
            res.json([]);
        } catch (error) {
            console.error('Error fetching recent attendance:', error);
            res.status(500).json({ error: 'Failed to fetch recent attendance' });
        }
    });

    // Get work hours
    app.get("/api/attendance/employee/:employeeId/work-hours", ensureAuthenticated, async (req, res) => {
        try {
            const employeeId = parseInt(req.params.employeeId);
            const { start, end } = req.query;

            // Mock response - replace with actual implementation
            res.json([]);
        } catch (error) {
            console.error('Error fetching work hours:', error);
            res.status(500).json({ error: 'Failed to fetch work hours' });
        }
    });

    // Get work hours stats
    app.get("/api/attendance/employee/:employeeId/work-hours/stats", ensureAuthenticated, async (req, res) => {
        try {
            const employeeId = parseInt(req.params.employeeId);
            const { start, end } = req.query;

            // Mock response - replace with actual implementation
            res.json({
                totalHours: 0,
                totalOvertime: 0,
                averageHours: 0,
                targetHours: 160,
                attendance: 0,
                lateCount: 0,
                earlyOutCount: 0
            });
        } catch (error) {
            console.error('Error fetching work hours stats:', error);
            res.status(500).json({ error: 'Failed to fetch work hours stats' });
        }
    });

    // Get attendance stats for employee (for dashboard) - USING REAL DATABASE
    app.get("/api/attendance/stats/employee/:employeeId", ensureAuthenticated, async (req, res) => {
        try {
            const employeeId = parseInt(req.params.employeeId);
            const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
            const year = parseInt(req.query.year as string) || new Date().getFullYear();

            console.log(`[UserRoutes] Getting attendance stats for employee ${employeeId}, month ${month}, year ${year}`);

            // Lấy dữ liệu từ bảng attendance_summary
            const summaryData = await db
                .select()
                .from(attendanceSummary)
                .where(and(
                    eq(attendanceSummary.employeeId, employeeId),
                    eq(attendanceSummary.month, month),
                    eq(attendanceSummary.year, year)
                ));

            if (summaryData.length === 0) {
                console.log(`[UserRoutes] No attendance summary found for employee ${employeeId}`);
                // Return default values if no data found
                res.json({
                    workingDays: 0,
                    present: 0,
                    absent: 0,
                    late: 0,
                    leave: 0,
                    earlyOut: 0,
                    totalHours: 0,
                    overtimeHours: 0,
                    averageHours: 0,
                    attendanceRate: 0,
                    punctualityRate: 0
                });
                return;
            }

            const summary = summaryData[0];
            console.log(`[UserRoutes] Found attendance summary:`, summary);

            // Tính toán từ dữ liệu có sẵn
            const workingDays = 22; // Default working days in a month
            const totalHours = parseFloat(summary.totalHours?.toString() || '0');
            const overtimeHours = parseFloat(summary.overtimeHours?.toString() || '0');
            const leaveDays = summary.leaveDays || 0;
            const lateMinutes = summary.lateMinutes || 0;
            const earlyMinutes = summary.earlyMinutes || 0;

            // Tính toán present days từ total hours (giả định 8h/ngày)
            const workDays = Math.ceil(totalHours / 8);
            // Tính late days từ late minutes (mỗi 15 phút muộn = 1 ngày muộn)
            const lateDays = lateMinutes > 0 ? Math.ceil(lateMinutes / 60) : 0; // 1 giờ muộn = 1 ngày muộn
            // Present days = work days - late days
            const presentDays = Math.max(0, workDays - lateDays);
            // Absent days = working days - work days - leave days
            const absentDays = Math.max(0, workingDays - workDays - leaveDays);

            // Calculate rates
            const totalAttendanceDays = workDays + leaveDays;
            const attendanceRate = workingDays > 0 ? (totalAttendanceDays / workingDays) * 100 : 0;
            const punctualityRate = workDays > 0 ? (presentDays / workDays) * 100 : 0;
            const averageHours = workDays > 0 ? totalHours / workDays : 0;

            res.json({
                workingDays: workingDays,
                present: presentDays,
                absent: absentDays,
                late: lateDays,
                leave: leaveDays,
                earlyOut: earlyMinutes > 0 ? Math.ceil(earlyMinutes / 60) : 0,
                totalHours: totalHours,
                overtimeHours: overtimeHours,
                averageHours: Math.round(averageHours * 10) / 10,
                attendanceRate: Math.round(attendanceRate * 10) / 10,
                punctualityRate: Math.round(punctualityRate * 10) / 10
            });
        } catch (error) {
            console.error('Error fetching attendance stats:', error);
            res.status(500).json({ error: 'Failed to fetch attendance stats' });
        }
    });

    // Get employee attendance for specific date
    app.get("/api/attendance/employee/:employeeId/date/:date", ensureAuthenticated, async (req, res) => {
        try {
            const employeeId = parseInt(req.params.employeeId);
            const date = req.params.date;

            console.log(`[UserRoutes] Getting attendance for employee ${employeeId} on date ${date}`);

            // Lấy work hours cho ngày cụ thể từ database
            const workHoursData = await db
                .select()
                .from(workHours)
                .where(and(
                    eq(workHours.employeeId, employeeId),
                    sql`DATE(${workHours.workDate}) = DATE(${date})`
                ));

            if (workHoursData.length === 0) {
                console.log(`[UserRoutes] No work hours found for employee ${employeeId} on ${date}`);
                return res.status(404).json({ message: 'No attendance record found for this date' });
            }

            const workHour = workHoursData[0];
            console.log(`[UserRoutes] Found work hours:`, workHour);

            res.json({
                id: workHour.id,
                employeeId: employeeId,
                date: date,
                checkIn: workHour.firstCheckin,
                checkOut: workHour.lastCheckout,
                status: workHour.status || 'present',
                workHours: parseFloat(workHour.regularHours?.toString() || '0'),
                overtimeHours: parseFloat(workHour.otHours?.toString() || '0'),
                notes: null
            });
        } catch (error) {
            console.error('Error fetching attendance by date:', error);
            res.status(500).json({ error: 'Failed to fetch attendance by date' });
        }
    });

    // Get employee daily attendance data for chart (monthly view)
    app.get("/api/attendance/employee/:employeeId/daily", ensureAuthenticated, async (req, res) => {
        try {
            const employeeId = parseInt(req.params.employeeId);
            const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
            const year = parseInt(req.query.year as string) || new Date().getFullYear();

            console.log(`[UserRoutes] Getting daily attendance for employee ${employeeId}, month ${month}, year ${year}`);

            // Tạo ngày đầu và cuối tháng
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);

            console.log(`[UserRoutes] Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

            // Lấy dữ liệu work hours cho tháng
            const workHoursData = await db
                .select()
                .from(workHours)
                .where(and(
                    eq(workHours.employeeId, employeeId),
                    sql`${workHours.workDate} >= ${startDate.toISOString().split('T')[0]}`,
                    sql`${workHours.workDate} <= ${endDate.toISOString().split('T')[0]}`
                ))
                .orderBy(workHours.workDate);

            console.log(`[UserRoutes] Found ${workHoursData.length} work hours records`);

            // Tạo mảng tất cả các ngày trong tháng
            const daysInMonth = [];
            for (let day = 1; day <= endDate.getDate(); day++) {
                const currentDate = new Date(year, month - 1, day);
                const dateStr = currentDate.toISOString().split('T')[0];

                // Tìm dữ liệu work hours cho ngày này
                const dayData = workHoursData.find(wh =>
                    wh.workDate && new Date(wh.workDate).toISOString().split('T')[0] === dateStr
                );

                daysInMonth.push({
                    date: `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}`,
                    fullDate: dateStr,
                    attendance: dayData ? 1 : 0, // 1 nếu có chấm công, 0 nếu không
                    hours: dayData ? parseFloat(dayData.regularHours?.toString() || '0') : 0,
                    overtimeHours: dayData ? parseFloat(dayData.otHours?.toString() || '0') : 0,
                    status: dayData?.status || 'absent',
                    checkIn: dayData?.firstCheckin || null,
                    checkOut: dayData?.lastCheckout || null
                });
            }

            console.log(`[UserRoutes] Returning ${daysInMonth.length} days of data`);

            res.json(daysInMonth);
        } catch (error) {
            console.error('Error fetching daily attendance:', error);
            res.status(500).json({ error: 'Failed to fetch daily attendance' });
        }
    });

    // Get employee leave requests - USING REAL DATABASE
    app.get("/api/leave-requests/employee/:employeeId", ensureAuthenticated, async (req, res) => {
        try {
            const employeeId = parseInt(req.params.employeeId);
            const { status, limit } = req.query;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            console.log(`[UserRoutes] Getting leave requests for employee ${employeeId}, status: ${status}`);

            // Kiểm tra quyền truy cập - chỉ cho phép nhân viên xem leave request của chính họ
            const currentEmployee = await storage.getEmployeeByUserId(userId);
            if (!currentEmployee) {
                return res.status(404).json({ error: 'Employee not found' });
            }

            // Check if user is admin/manager or requesting their own data
            const user = await storage.getUser(userId);
            const isManager = user?.role === 'admin' || user?.role === 'manager';

            if (!isManager && currentEmployee.id !== employeeId) {
                return res.status(403).json({ error: 'Unauthorized. You can only view your own leave requests' });
            }

            // Lấy leave requests từ database
            const leaveRequestsData = await storage.getEmployeeLeaveRequests(employeeId, status as string);

            // Thêm tính toán số ngày cho mỗi request
            const enrichedRequests = leaveRequestsData.map(request => {
                const startDate = new Date(request.startDate);
                const endDate = new Date(request.endDate);
                const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                return {
                    ...request,
                    days
                };
            });

            console.log(`[UserRoutes] Found ${enrichedRequests.length} leave requests for employee ${employeeId}`);
            res.json(enrichedRequests);
        } catch (error) {
            console.error('Error fetching leave requests:', error);
            res.status(500).json({ error: 'Failed to fetch leave requests' });
        }
    });

    // Get employee profile (for employees to access their own profile)
    app.get("/api/employees/profile/:employeeId", ensureAuthenticated, async (req, res) => {
        try {
            const employeeId = parseInt(req.params.employeeId);

            console.log(`[UserRoutes] Getting profile for employee ${employeeId}`);

            // Lấy thông tin nhân viên từ database
            const employee = await storage.getEmployee(employeeId);
            if (!employee) {
                return res.status(404).json({ error: 'Employee not found' });
            }

            // Lấy thông tin phòng ban nếu có
            let department = null;
            if (employee.departmentId) {
                department = await storage.getDepartment(employee.departmentId);
            }

            console.log(`[UserRoutes] Found employee:`, employee);

            res.json({
                id: employee.id,
                employeeId: employee.employeeId,
                firstName: employee.firstName,
                lastName: employee.lastName,
                email: employee.email,
                phone: employee.phone,
                position: employee.position,
                departmentId: employee.departmentId,
                department: department ? {
                    id: department.id,
                    name: department.name,
                    description: department.description
                } : null,
                birthDate: null,
                joinDate: employee.joinDate,
                hireDate: employee.joinDate,
                status: employee.status,
                avatar: null,
                avatarUrl: null
            });
        } catch (error) {
            console.error('Error fetching employee profile:', error);
            res.status(500).json({ error: 'Failed to fetch employee profile' });
        }
    });

    // Update employee profile (for employees to update their own profile)
    app.put("/api/employees/profile/:employeeId", ensureAuthenticated, async (req, res) => {
        try {
            const employeeId = parseInt(req.params.employeeId);
            const { email, phone, position, departmentId } = req.body;

            console.log(`[UserRoutes] Updating profile for employee ${employeeId}`, { email, phone, position, departmentId });

            // Cập nhật thông tin nhân viên trong database
            const updatedEmployee = await storage.updateEmployee(employeeId, {
                email: email,
                phone: phone,
                position: position,
                departmentId: departmentId
            });

            if (!updatedEmployee) {
                return res.status(404).json({ error: 'Employee not found' });
            }

            // Lấy thông tin phòng ban mới nếu có
            let department = null;
            if (updatedEmployee.departmentId) {
                department = await storage.getDepartment(updatedEmployee.departmentId);
            }

            console.log(`[UserRoutes] Updated employee profile:`, updatedEmployee);

            res.json({
                id: updatedEmployee.id,
                employeeId: updatedEmployee.employeeId,
                firstName: updatedEmployee.firstName,
                lastName: updatedEmployee.lastName,
                email: updatedEmployee.email,
                phone: updatedEmployee.phone,
                position: updatedEmployee.position,
                departmentId: updatedEmployee.departmentId,
                department: department ? {
                    id: department.id,
                    name: department.name,
                    description: department.description
                } : null,
                birthDate: null,
                joinDate: updatedEmployee.joinDate,
                hireDate: updatedEmployee.joinDate,
                status: updatedEmployee.status,
                avatar: null,
                avatarUrl: null
            });
        } catch (error) {
            console.error('Error updating employee profile:', error);
            res.status(500).json({ error: 'Failed to update employee profile' });
        }
    });

    // Upload employee avatar
    app.post("/api/employees/:employeeId/avatar", ensureAuthenticated, async (req, res) => {
        try {
            const employeeId = parseInt(req.params.employeeId);

            // Mock response - replace with actual file upload implementation
            res.json({
                success: true,
                avatarUrl: `/avatars/employee-${employeeId}.jpg`,
                message: 'Avatar uploaded successfully'
            });
        } catch (error) {
            console.error('Error uploading avatar:', error);
            res.status(500).json({ error: 'Failed to upload avatar' });
        }
    });

    // Employee reports endpoints

    // Get attendance report
    app.get("/api/reports/employee/:employeeId/attendance", ensureAuthenticated, async (req, res) => {
        try {
            const employeeId = parseInt(req.params.employeeId);
            const month = req.query.month as string;

            // Mock response - replace with actual implementation
            res.json({
                totalWorkingDays: 22,
                presentDays: 20,
                absentDays: 2,
                lateDays: 1,
                earlyOutDays: 0,
                attendanceRate: 90.9,
                punctualityRate: 95.0,
                totalWorkHours: 160,
                overtimeHours: 8,
                averageWorkHours: 8
            });
        } catch (error) {
            console.error('Error fetching attendance report:', error);
            res.status(500).json({ error: 'Failed to fetch attendance report' });
        }
    });

    // Get performance metrics
    app.get("/api/reports/employee/:employeeId/performance", ensureAuthenticated, async (req, res) => {
        try {
            const employeeId = parseInt(req.params.employeeId);
            const period = req.query.period as string;

            // Mock response - replace with actual implementation
            res.json({
                productivityScore: 85,
                attendanceScore: 90,
                punctualityScore: 95,
                overallScore: 90,
                improvements: ["Cải thiện giờ đến làm", "Tăng cường hiệu suất công việc"],
                achievements: ["Hoàn thành 100% nhiệm vụ", "Không vắng mặt không phép"]
            });
        } catch (error) {
            console.error('Error fetching performance metrics:', error);
            res.status(500).json({ error: 'Failed to fetch performance metrics' });
        }
    });

    // Get monthly comparison
    app.get("/api/reports/employee/:employeeId/comparison", ensureAuthenticated, async (req, res) => {
        try {
            const employeeId = parseInt(req.params.employeeId);
            const month = req.query.month as string;

            // Mock response - replace with actual implementation
            res.json({
                currentMonth: {
                    attendanceRate: 90.9,
                    punctualityRate: 95.0,
                    totalWorkHours: 160
                },
                previousMonth: {
                    attendanceRate: 87.5,
                    punctualityRate: 92.0,
                    totalWorkHours: 155
                },
                changes: {
                    attendanceRate: 3.4,
                    punctualityRate: 3.0,
                    workHours: 5
                }
            });
        } catch (error) {
            console.error('Error fetching monthly comparison:', error);
            res.status(500).json({ error: 'Failed to fetch monthly comparison' });
        }
    });

    // Export report
    app.get("/api/reports/employee/:employeeId/export", ensureAuthenticated, async (req, res) => {
        try {
            const employeeId = parseInt(req.params.employeeId);
            const month = req.query.month as string;

            // Mock response - replace with actual PDF generation
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="attendance-report-${month}.pdf"`);
            res.send(Buffer.from('Mock PDF content'));
        } catch (error) {
            console.error('Error exporting report:', error);
            res.status(500).json({ error: 'Failed to export report' });
        }
    });

    // Get announcements
    app.get("/api/announcements", ensureAuthenticated, async (req, res) => {
        try {
            const limit = parseInt(req.query.limit as string) || 10;

            // Mock response - replace with actual implementation
            res.json([]);
        } catch (error) {
            console.error('Error fetching announcements:', error);
            res.status(500).json({ error: 'Failed to fetch announcements' });
        }
    });

    // Notifications endpoints

    // Get user notifications
    app.get("/api/notifications", ensureAuthenticated, async (req, res) => {
        try {
            const { filter, type, search } = req.query;

            // Mock response - replace with actual implementation
            res.json([
                {
                    id: 1,
                    title: "Thông báo nghỉ lễ Quốc khánh",
                    content: "Công ty thông báo lịch nghỉ lễ Quốc khánh 2/9 từ ngày 2/9 đến 4/9. Toàn thể CBNV nghỉ 3 ngày liên tiếp.",
                    type: "announcement",
                    priority: "high",
                    isRead: false,
                    createdAt: new Date().toISOString(),
                    author: "Phòng Nhân sự",
                    department: "Nhân sự"
                },
                {
                    id: 2,
                    title: "Cập nhật quy định chấm công",
                    content: "Từ tháng 9, công ty áp dụng quy định chấm công mới. Nhân viên cần chấm công trước 8h00 để không bị tính muộn.",
                    type: "info",
                    priority: "medium",
                    isRead: true,
                    createdAt: new Date(Date.now() - 86400000).toISOString(),
                    author: "Ban Giám đốc",
                    department: "Hành chính"
                }
            ]);
        } catch (error) {
            console.error('Error fetching notifications:', error);
            res.status(500).json({ error: 'Failed to fetch notifications' });
        }
    });

    // Mark notification as read
    app.post("/api/notifications/:id/mark-read", ensureAuthenticated, async (req, res) => {
        try {
            const notificationId = parseInt(req.params.id);

            // Mock response - replace with actual implementation
            res.json({ success: true });
        } catch (error) {
            console.error('Error marking notification as read:', error);
            res.status(500).json({ error: 'Failed to mark notification as read' });
        }
    });

    // Mark all notifications as read
    app.post("/api/notifications/mark-all-read", ensureAuthenticated, async (req, res) => {
        try {
            // Mock response - replace with actual implementation
            res.json({ success: true });
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            res.status(500).json({ error: 'Failed to mark all notifications as read' });
        }
    });

    // User Face Profile Email Verification Endpoints

    // Send OTP to user's email for face profile access
    app.post("/api/user/face-profile/send-otp", ensureAuthenticated, async (req, res) => {
        try {
            const { employeeId } = req.body;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            console.log(`[UserFaceOTP] Sending OTP for employee ${employeeId}, user ${userId}`);

            // Kiểm tra quyền - user chỉ có thể gửi OTP cho chính họ
            const currentEmployee = await storage.getEmployeeByUserId(userId);
            if (!currentEmployee || currentEmployee.id !== employeeId) {
                return res.status(403).json({ error: 'Unauthorized. You can only request OTP for your own profile' });
            }

            // Lấy thông tin employee để có email
            const employee = await storage.getEmployee(employeeId);
            if (!employee || !employee.email) {
                return res.status(404).json({ error: 'Employee email not found' });
            }

            // Tạo OTP code 6 số
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

            // Lưu OTP vào database (tạm thời lưu trong memory, nên chuyển sang Redis hoặc DB)
            const otpKey = `user_face_otp_${employeeId}`;
            userFaceOtpStore.set(otpKey, {
                code: otpCode,
                email: employee.email,
                employeeId: employeeId,
                userId: userId,
                expiresAt: expiresAt,
                attempts: 0
            });

            // Gửi email thực sự thay vì chỉ log
            console.log("Sending user face OTP email to:", employee.email);
            await sendUserFaceAuthEmail(employee.email, otpCode, `${employee.firstName} ${employee.lastName}`);
            console.log("User face OTP email sent successfully");

            res.json({
                success: true,
                message: 'Mã xác thực đã được gửi đến email của bạn',
                email: employee.email.replace(/(.{2}).*@/, '$1***@'), // Ẩn một phần email
                expiresIn: 10 * 60 // 10 phút tính bằng giây
            });

        } catch (error) {
            console.error('Error sending user face OTP:', error);
            res.status(500).json({ error: 'Failed to send OTP' });
        }
    });

    // Verify OTP for user face profile access
    app.post("/api/user/face-profile/verify-otp", ensureAuthenticated, async (req, res) => {
        try {
            const { employeeId, otpCode } = req.body;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            console.log(`[UserFaceOTP] Verifying OTP for employee ${employeeId}, code: ${otpCode}`);

            // Kiểm tra quyền
            const currentEmployee = await storage.getEmployeeByUserId(userId);
            if (!currentEmployee || currentEmployee.id !== employeeId) {
                return res.status(403).json({ error: 'Unauthorized' });
            }

            // Lấy OTP từ store
            const otpKey = `user_face_otp_${employeeId}`;
            const otpData = userFaceOtpStore.get(otpKey);

            if (!otpData) {
                return res.status(400).json({
                    error: 'Mã OTP không tồn tại hoặc đã hết hạn',
                    code: 'OTP_NOT_FOUND'
                });
            }

            // Kiểm tra hết hạn
            if (new Date() > otpData.expiresAt) {
                userFaceOtpStore.delete(otpKey);
                return res.status(400).json({
                    error: 'Mã OTP đã hết hạn',
                    code: 'OTP_EXPIRED'
                });
            }

            // Kiểm tra số lần thử
            if (otpData.attempts >= 3) {
                userFaceOtpStore.delete(otpKey);
                return res.status(400).json({
                    error: 'Đã thử quá nhiều lần. Vui lòng yêu cầu mã mới',
                    code: 'TOO_MANY_ATTEMPTS'
                });
            }

            // Kiểm tra mã OTP
            if (otpData.code !== otpCode) {
                otpData.attempts += 1;
                userFaceOtpStore.set(otpKey, otpData);

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
                purpose: 'user_face_profile',
                issuedAt: Date.now(),
                expiresAt: Date.now() + 15 * 60 * 1000 // 15 phút
            })).toString('base64');

            // Xóa OTP đã sử dụng
            userFaceOtpStore.delete(otpKey);

            console.log(`[UserFaceOTP] OTP verified successfully for employee ${employeeId}`);

            res.json({
                success: true,
                message: 'Xác thực thành công',
                accessToken: accessToken,
                expiresIn: 15 * 60 // 15 phút
            });

        } catch (error) {
            console.error('Error verifying user face OTP:', error);
            res.status(500).json({ error: 'Failed to verify OTP' });
        }
    });

    // Validate access token for user face profile
    app.post("/api/user/face-profile/validate-token", ensureAuthenticated, async (req, res) => {
        try {
            const { accessToken } = req.body;
            const userId = req.user?.id;

            if (!accessToken) {
                return res.status(400).json({ error: 'Access token required' });
            }

            try {
                const tokenData = JSON.parse(Buffer.from(accessToken, 'base64').toString());

                // Kiểm tra hết hạn
                if (Date.now() > tokenData.expiresAt) {
                    return res.status(401).json({
                        error: 'Access token đã hết hạn',
                        code: 'TOKEN_EXPIRED'
                    });
                }

                // Kiểm tra user
                if (tokenData.userId !== userId) {
                    return res.status(403).json({ error: 'Invalid token' });
                }

                // Kiểm tra purpose
                if (tokenData.purpose !== 'user_face_profile') {
                    return res.status(403).json({ error: 'Invalid token purpose' });
                }

                res.json({
                    valid: true,
                    employeeId: tokenData.employeeId,
                    email: tokenData.email,
                    expiresAt: tokenData.expiresAt
                });

            } catch (parseError) {
                return res.status(400).json({ error: 'Invalid token format' });
            }

        } catch (error) {
            console.error('Error validating user face token:', error);
            res.status(500).json({ error: 'Failed to validate token' });
        }
    });
} 