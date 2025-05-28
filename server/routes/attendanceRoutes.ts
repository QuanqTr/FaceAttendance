import { Express } from "express";
import { ensureAuthenticated } from "../middlewares/auth";
import {
    createAttendance,
    createTimeLog,
    getEmployeeAttendance,
    getDailyAttendance,
    verifyAttendance
} from "../controllers/attendanceController";
import { db } from "../db";
import { attendanceRecords } from "@shared/schema";
import { eq, gte, lte, and, desc } from "drizzle-orm";

export function attendanceRoutes(app: Express) {
    // Attendance endpoints

    // Create attendance record
    app.post("/api/attendance", createAttendance);

    // Create time log
    app.post("/api/time-logs", createTimeLog);

    // Get employee attendance (existing simple version)
    app.get("/api/attendance/employee/:id", getEmployeeAttendance);

    // Get employee attendance records with pagination (from backup)
    app.get("/api/attendance/employee/:id/records", async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: "Invalid employee ID" });
            }

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
            const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
            const search = req.query.search as string | undefined;
            const status = req.query.status as string | undefined;

            console.log(`[API] Fetching attendance records for employee ${id} from ${startDate?.toISOString() || 'all time'} to ${endDate?.toISOString() || 'present'}`);
            console.log(`[API] Page: ${page}, Limit: ${limit}, Search: ${search}, Status: ${status}`);

            // Get attendance records directly from database
            let whereConditions = [eq(attendanceRecords.employeeId, id)];

            if (startDate) {
                whereConditions.push(gte(attendanceRecords.date, startDate));
            }

            if (endDate) {
                whereConditions.push(lte(attendanceRecords.date, endDate));
            }

            const records = await db
                .select()
                .from(attendanceRecords)
                .where(and(...whereConditions))
                .orderBy(desc(attendanceRecords.date));

            console.log(`[API] Found ${records.length} attendance records for employee ${id}`);
            if (records.length > 0) {
                console.log(`[API] Sample record:`, JSON.stringify(records[0], null, 2));
            }

            // Filter by status if provided
            let filteredRecords = records;
            if (status && status !== 'all') {
                filteredRecords = records.filter((record: any) => record.status === status);
            }

            // Filter by search term if provided
            if (search) {
                const searchLower = search.toLowerCase();
                filteredRecords = filteredRecords.filter((record: any) => {
                    const dateStr = new Date(record.date).toLocaleDateString();
                    const timeStr = new Date(record.time).toLocaleTimeString();
                    return dateStr.includes(searchLower) || timeStr.includes(searchLower);
                });
            }

            // Calculate pagination
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

            res.json({
                items: paginatedRecords,
                total: filteredRecords.length,
                page,
                limit,
                totalPages: Math.ceil(filteredRecords.length / limit)
            });
        } catch (error) {
            console.error(`[API] Error fetching attendance records:`, error);
            res.status(500).json({ error: 'Failed to fetch attendance records' });
        }
    });

    // Get daily attendance
    app.get("/api/attendance/daily", getDailyAttendance);

    // Get recent activities
    app.get("/api/attendance/recent-activities", async (req, res) => {
        try {
            // Return sample activities for now since we don't have attendance_records table
            const activities = [
                {
                    id: 1,
                    name: "Quang Trần Đại",
                    description: "Clocked in for the day",
                    time: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
                    type: 'clockIn'
                },
                {
                    id: 2,
                    name: "Hùng Dương Vũ",
                    description: "Clocked out for the day",
                    time: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
                    type: 'clockOut'
                },
                {
                    id: 3,
                    name: "Tiến Lê Văn",
                    description: "Clocked in for the day",
                    time: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
                    type: 'clockIn'
                },
                {
                    id: 4,
                    name: "Thành Hoàng Ngọc",
                    description: "Clocked out for the day",
                    time: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
                    type: 'clockOut'
                }
            ];

            res.json(activities);
        } catch (error) {
            console.error('Error fetching recent activities:', error);
            res.status(500).json({ error: 'Failed to fetch recent activities' });
        }
    });

    // Verify attendance (for face recognition)
    app.post("/api/attendance/verify", verifyAttendance);
} 