import { Request, Response } from "express";
import { storage } from "../models/storage";
import { db } from "../db.js";
import { sql } from "drizzle-orm";
import { eq, asc } from "drizzle-orm";
import { workHours } from "../../shared/schema";

// Update work hours (using raw SQL since storage method doesn't exist)
export const updateWorkHours = async (req: Request, res: Response) => {
    try {
        const { employeeId, workDate, regularHours, overtimeHours } = req.body;

        if (!employeeId || !workDate) {
            return res.status(400).json({
                error: 'Employee ID and work date are required'
            });
        }

        // Use raw SQL to update work hours
        await db.execute(sql`
            INSERT INTO work_hours (employee_id, work_date, regular_hours, ot_hours)
            VALUES (${parseInt(employeeId)}, ${workDate}, ${parseFloat(regularHours) || 0}, ${parseFloat(overtimeHours) || 0})
            ON CONFLICT (employee_id, work_date) DO UPDATE SET
            regular_hours = EXCLUDED.regular_hours,
            ot_hours = EXCLUDED.ot_hours
        `);

        res.json({
            success: true,
            message: 'Work hours updated successfully'
        });
    } catch (error) {
        console.error('Error updating work hours:', error);
        res.status(500).json({ error: 'Failed to update work hours' });
    }
};

// Update work hours without authentication (for system updates)
export const updateWorkHoursNoAuth = async (req: Request, res: Response) => {
    try {
        const { employeeId, workDate, regularHours, overtimeHours } = req.body;

        if (!employeeId || !workDate) {
            return res.status(400).json({
                error: 'Employee ID and work date are required'
            });
        }

        // Use raw SQL to update work hours
        await db.execute(sql`
            INSERT INTO work_hours (employee_id, work_date, regular_hours, ot_hours)
            VALUES (${parseInt(employeeId)}, ${workDate}, ${parseFloat(regularHours) || 0}, ${parseFloat(overtimeHours) || 0})
            ON CONFLICT (employee_id, work_date) DO UPDATE SET
            regular_hours = EXCLUDED.regular_hours,
            ot_hours = EXCLUDED.ot_hours
        `);

        res.json({
            success: true,
            message: 'Work hours updated successfully'
        });
    } catch (error) {
        console.error('Error updating work hours:', error);
        res.status(500).json({ error: 'Failed to update work hours' });
    }
};

// Get daily work hours for all employees
export const getDailyWorkHours = async (req: Request, res: Response) => {
    try {
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ error: 'Date parameter is required' });
        }

        console.log(`[WorkHours] Getting daily work hours for date: ${date}`);

        // Use raw SQL to get work hours data
        const workHoursData = await db.execute(sql`
            SELECT 
                wh.employee_id,
                e.last_name || ' ' || e.first_name as employee_name, -- Vietnamese format
                wh.regular_hours,
                wh.ot_hours as overtime_hours,
                wh.first_checkin as checkin_time,
                wh.last_checkout as checkout_time,
                wh.status
            FROM work_hours wh
            JOIN employees e ON wh.employee_id = e.id
            WHERE wh.work_date = ${date}
            ORDER BY e.last_name, e.first_name -- Vietnamese format
        `);

        const results = workHoursData.rows.map((row: any) => ({
            employeeId: row.employee_id,
            employeeName: row.employee_name,
            regularHours: parseFloat(row.regular_hours || 0),
            overtimeHours: parseFloat(row.overtime_hours || 0),
            checkinTime: row.checkin_time,
            checkoutTime: row.checkout_time,
            status: row.status
        }));

        console.log(`[WorkHours] Found ${results.length} work hour records`);
        res.json(results);

    } catch (error) {
        console.error('[WorkHours] Error fetching daily work hours:', error);
        res.status(500).json({ error: 'Failed to fetch work hours' });
    }
};

// Get work hours for employee with date range (from old server)
export const getEmployeeWorkHours = async (req: Request, res: Response) => {
    try {
        // Support both :id and :employeeId parameters
        const id = parseInt(req.params.id || req.params.employeeId);
        if (isNaN(id)) {
            return res.status(400).json({ message: "ID nhân viên không hợp lệ" });
        }

        console.log(`[WorkHours] Getting work hours for employee ${id}`);

        // Kiểm tra xem có yêu cầu phạm vi ngày không
        if (req.query.startDate && req.query.endDate) {
            const startDate = new Date(req.query.startDate as string);
            const endDate = new Date(req.query.endDate as string);

            console.log(`[API] Lấy dữ liệu giờ làm cho nhân viên ${id} từ ${startDate.toISOString()} đến ${endDate.toISOString()}`);

            // Kiểm tra tính hợp lệ của ngày
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                return res.status(400).json({ message: "Phạm vi ngày không hợp lệ" });
            }

            try {
                // Lấy tất cả dữ liệu giờ làm của nhân viên
                const allWorkHours = await db
                    .select()
                    .from(workHours)
                    .where(eq(workHours.employeeId, id))
                    .orderBy(asc(workHours.workDate));

                console.log(`[API] Tìm thấy ${allWorkHours.length} bản ghi cho nhân viên ${id}`);

                // Lọc kết quả theo khoảng thời gian trong JavaScript
                const startTimestamp = startDate.getTime();
                const endTimestamp = endDate.getTime();

                // Lọc kết quả chỉ lấy các bản ghi trong khoảng thời gian yêu cầu
                const workHoursData = allWorkHours.filter(record => {
                    const recordDate = new Date(record.workDate);
                    const recordTimestamp = recordDate.getTime();
                    return recordTimestamp >= startTimestamp && recordTimestamp <= endTimestamp;
                });

                console.log(`[API] Sau khi lọc theo phạm vi ngày: ${workHoursData.length} bản ghi`);

                // Định dạng giờ thành "hours:minutes"
                const formatHoursMinutes = (decimalHours: number): string => {
                    const hours = Math.floor(decimalHours);
                    const minutes = Math.round((decimalHours - hours) * 60);
                    return `${hours}:${minutes.toString().padStart(2, '0')}`;
                };

                // Helper function to get date string
                const getDateString = (date: Date): string => {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                };

                // Định dạng kết quả
                const results = workHoursData.map(record => {
                    const regularHours = record.regularHours ? parseFloat(record.regularHours.toString()) : 0;
                    const overtimeHours = record.otHours ? parseFloat(record.otHours.toString()) : 0;

                    // Chuyển đổi thời gian check-in và check-out thành chuỗi ISO
                    const checkinTime = record.firstCheckin
                        ? new Date(record.firstCheckin).toISOString()
                        : null;
                    const checkoutTime = record.lastCheckout
                        ? new Date(record.lastCheckout).toISOString()
                        : null;

                    return {
                        date: getDateString(new Date(record.workDate)),
                        regularHours,
                        overtimeHours,
                        regularHoursFormatted: formatHoursMinutes(regularHours),
                        overtimeHoursFormatted: formatHoursMinutes(overtimeHours),
                        totalHoursFormatted: formatHoursMinutes(regularHours + overtimeHours),
                        checkinTime,
                        checkoutTime,
                        status: record.status || "normal"
                    };
                });

                return res.json(results);
            } catch (error) {
                console.error(`[API] Lỗi khi lấy dữ liệu giờ làm: ${error}`);
                return res.status(500).json({ message: "Lỗi khi lấy dữ liệu giờ làm" });
            }
        }

        // Trường hợp chỉ lấy dữ liệu cho một ngày
        const dateStr = req.query.date as string;
        const date = dateStr ? new Date(dateStr) : new Date();

        console.log(`[API] Lấy dữ liệu giờ làm cho nhân viên ${id} vào ngày ${date.toISOString().split('T')[0]}`);

        if (isNaN(date.getTime())) {
            return res.status(400).json({ message: "Ngày không hợp lệ" });
        }

        try {
            // Định dạng ngày theo múi giờ Việt Nam
            const formattedDate = new Date(date);
            formattedDate.setHours(0, 0, 0, 0);

            // Helper function to get date string
            const getDateString = (date: Date): string => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            // Chuyển đổi ngày thành chuỗi YYYY-MM-DD
            const formattedDateStr = getDateString(formattedDate);

            console.log(`[API] Đang tìm dữ liệu cho nhân viên ${id} vào ngày ${formattedDateStr}`);

            // Lấy dữ liệu giờ làm của nhân viên
            const workHoursData = await db
                .select()
                .from(workHours)
                .where(eq(workHours.employeeId, id));

            console.log(`[API] Đã tìm thấy ${workHoursData.length} bản ghi cho nhân viên ${id}`);

            // Lọc theo ngày
            const filteredData = workHoursData.filter(record => {
                // Lấy ngày từ workDate và chuyển thành chuỗi YYYY-MM-DD
                const recordDate = new Date(record.workDate);
                const recordDateStr = getDateString(recordDate);
                console.log(`[API] So sánh ngày: ${recordDateStr} với ${formattedDateStr}`);
                return recordDateStr === formattedDateStr;
            });

            console.log(`[API] Sau khi lọc theo ngày: ${filteredData.length} bản ghi`);

            // Kiểm tra ngày có phải là quá khứ không
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isDateInPast = date < today;

            // Định dạng giờ thành "hours:minutes"
            const formatHoursMinutes = (decimalHours: number): string => {
                const hours = Math.floor(decimalHours);
                const minutes = Math.round((decimalHours - hours) * 60);
                return `${hours}:${minutes.toString().padStart(2, '0')}`;
            };

            if (filteredData.length > 0) {
                // Đã có dữ liệu
                const record = filteredData[0];
                console.log(`[API] Dữ liệu tìm thấy: ${JSON.stringify(record)}`);
                const regularHours = record.regularHours ? parseFloat(record.regularHours.toString()) : 0;
                const overtimeHours = record.otHours ? parseFloat(record.otHours.toString()) : 0;

                // Chuyển đổi thời gian check-in và check-out thành chuỗi có thể đọc được
                const formatTimeToString = (date: Date | null): string | null => {
                    if (!date) return null;

                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const hours = String(date.getHours()).padStart(2, '0');
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    const seconds = String(date.getSeconds()).padStart(2, '0');

                    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000Z`;
                };

                const firstCheckin = record.firstCheckin ? new Date(record.firstCheckin) : null;
                const lastCheckout = record.lastCheckout ? new Date(record.lastCheckout) : null;

                const checkinTime = formatTimeToString(firstCheckin);
                const checkoutTime = formatTimeToString(lastCheckout);

                return res.json({
                    regularHours,
                    overtimeHours,
                    regularHoursFormatted: formatHoursMinutes(regularHours),
                    overtimeHoursFormatted: formatHoursMinutes(overtimeHours),
                    totalHoursFormatted: formatHoursMinutes(regularHours + overtimeHours),
                    checkinTime,
                    checkoutTime,
                    status: record.status || "normal"
                });
            } else {
                // Không có dữ liệu
                console.log(`[API] Không tìm thấy dữ liệu cho ngày ${formattedDateStr}, trả về absent cho ngày quá khứ`);
                return res.json({
                    regularHours: 0,
                    overtimeHours: 0,
                    regularHoursFormatted: "0:00",
                    overtimeHoursFormatted: "0:00",
                    totalHoursFormatted: "0:00",
                    checkinTime: null,
                    checkoutTime: null,
                    status: isDateInPast ? "absent" : "normal"
                });
            }
        } catch (error) {
            console.error(`[API] Lỗi khi lấy dữ liệu giờ làm: ${error}`);
            return res.status(500).json({ message: "Lỗi khi lấy dữ liệu giờ làm" });
        }
    } catch (error) {
        console.error('Error fetching employee work hours:', error);
        res.status(500).json({ error: 'Failed to fetch work hours' });
    }
}; 