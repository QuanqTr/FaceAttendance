import { Request, Response } from "express";
import { storage } from "../models/storage.js";
import {
    generateAttendanceReport,
    generateEmployeeReport,
    generateDepartmentReport,
    generateSummaryReport,
    generateCSV,
    generateXLSX,
    generatePDF
} from "../utils/reportUtils.js";

// Export reports (CSV, Excel, PDF)
export const exportReports = async (req: Request, res: Response) => {
    try {
        const {
            reportType,
            format,
            startDate,
            endDate,
            departmentId,
            includeDetails
        } = req.body;

        console.log(`Generating ${reportType} report in ${format} format`);

        // Validate required fields
        if (!reportType || !format || !startDate || !endDate) {
            return res.status(400).json({
                message: "Missing required fields: reportType, format, startDate, endDate"
            });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ message: "Invalid date format" });
        }

        let reportData: any[] = [];
        let filename = "";
        let headers: string[] = [];

        // Generate data based on report type
        switch (reportType) {
            case "attendance":
                const attendanceData = await generateAttendanceReport(start, end, departmentId);
                reportData = attendanceData;
                filename = `attendance_report_${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}`;
                headers = [
                    "Tên nhân viên", "Phòng ban", "Ngày", "Giờ vào", "Giờ ra",
                    "Tổng giờ làm", "Giờ làm thêm", "Trạng thái"
                ];
                break;

            case "employee":
                const employeeData = await generateEmployeeReport(start, end, departmentId);
                reportData = employeeData;
                filename = `employee_report_${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}`;
                headers = [
                    "Mã NV", "Tên nhân viên", "Phòng ban", "Chức vụ",
                    "Tổng giờ làm", "Giờ làm thêm", "Số ngày nghỉ", "Tiền phạt"
                ];
                break;

            case "department":
                const deptData = await generateDepartmentReport(start, end);
                reportData = deptData;
                filename = `department_report_${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}`;
                headers = [
                    "Phòng ban", "Số nhân viên", "Tổng giờ làm", "Giờ làm thêm",
                    "Tỷ lệ có mặt (%)", "Tổng tiền phạt"
                ];
                break;

            case "summary":
                const summaryData = await generateSummaryReport(start, end, departmentId);
                reportData = summaryData;
                filename = `summary_report_${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}`;
                headers = [
                    "Tên nhân viên", "Phòng ban", "Buổi làm", "Buổi trễ", "Buổi về sớm",
                    "Buổi vắng", "Buổi phép", "Phút trễ", "Phút về sớm", "Tiền phạt (VNĐ)"
                ];
                break;

            default:
                return res.status(400).json({ message: "Invalid report type" });
        }

        // Generate file based on format
        if (format === "csv") {
            const csv = await generateCSV(reportData, headers);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
            res.send('\ufeff' + csv); // Add BOM for UTF-8
        } else if (format === "xlsx") {
            const xlsx = await generateXLSX(reportData, headers, reportType);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
            res.send(xlsx);
        } else if (format === "pdf") {
            const pdf = await generatePDF(reportData, headers, reportType, start, end);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
            res.send(pdf);
        } else {
            return res.status(400).json({ message: "Invalid format. Supported formats: csv, xlsx, pdf" });
        }

    } catch (error) {
        console.error("Error generating report:", error);
        res.status(500).json({ error: "Failed to export reports" });
    }
};

// Get attendance summary report
export const getAttendanceSummaryReport = async (req: Request, res: Response) => {
    try {
        const year = parseInt(req.query.year as string) || new Date().getFullYear();
        const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
        const departmentId = req.query.departmentId ? parseInt(req.query.departmentId as string) : undefined;

        // Get all attendance summaries for the month
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const attendanceData = await generateAttendanceReport(startDate, endDate, departmentId);

        // Format the data similar to the old server
        const formattedData = attendanceData.map(record => ({
            employeeId: record.employeeId,
            employeeName: record.employeeName,
            departmentName: record.departmentName || 'Chưa phân công',
            totalHours: parseFloat(record.totalHours?.toString() || '0'),
            overtimeHours: parseFloat(record.overtimeHours?.toString() || '0'),
            leaveDays: record.leaveDays || 0,
            presentDays: record.presentDays || 0,
            lateDays: record.lateDays || 0,
            absentDays: record.absentDays || 0,
            month: month,
            year: year
        }));

        res.json(formattedData);
    } catch (error) {
        console.error('Error generating attendance summary report:', error);
        res.status(500).json({ error: 'Failed to generate attendance summary report' });
    }
};

// Get statistics report
export const getStatisticsReport = async (req: Request, res: Response) => {
    try {
        const year = parseInt(req.query.year as string) || new Date().getFullYear();
        const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        // Get attendance data for the month
        const attendanceData = await generateAttendanceReport(startDate, endDate);

        // Get total active employees
        const { employees: activeEmployees } = await storage.getAllEmployees(1, 1000, { status: 'active' });
        const activeEmployeeCount = activeEmployees.length;

        // Calculate statistics
        const stats = {
            totalEmployees: new Set(attendanceData.map(record => record.employeeId)).size,
            activeEmployees: activeEmployeeCount,
            totalHours: attendanceData.reduce((sum, record) => sum + (parseFloat(record.totalHours?.toString() || '0')), 0),
            totalOvertime: attendanceData.reduce((sum, record) => sum + (parseFloat(record.overtimeHours?.toString() || '0')), 0),
            totalLeaveDays: attendanceData.reduce((sum, record) => sum + (record.leaveDays || 0), 0),
            totalPresentDays: attendanceData.reduce((sum, record) => sum + (record.presentDays || 0), 0),
            totalLateDays: attendanceData.reduce((sum, record) => sum + (record.lateDays || 0), 0)
        };

        const formattedStats = {
            ...stats,
            avgHoursPerEmployee: stats.totalEmployees > 0 ? stats.totalHours / stats.totalEmployees : 0,
            attendanceRate: stats.totalPresentDays > 0 ?
                (stats.totalPresentDays / (stats.totalPresentDays + stats.totalLateDays)) * 100 : 0,
            lateRate: stats.totalPresentDays > 0 ?
                (stats.totalLateDays / stats.totalPresentDays) * 100 : 0
        };

        res.json(formattedStats);
    } catch (error) {
        console.error('Error generating statistics report:', error);
        res.status(500).json({ error: 'Failed to generate statistics report' });
    }
};

// Get department summary report
export const getDepartmentSummaryReport = async (req: Request, res: Response) => {
    try {
        const year = parseInt(req.query.year as string) || new Date().getFullYear();
        const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        // Get department report data
        const departmentData = await generateDepartmentReport(startDate, endDate);

        // Calculate additional statistics for each department
        const departmentSummary = departmentData.map(dept => ({
            departmentName: dept.departmentName,
            employeeCount: dept.employeeCount,
            totalWorkHours: dept.totalWorkHours,
            overtimeHours: dept.overtimeHours,
            attendanceRate: dept.attendanceRate,
            totalPenalties: dept.totalPenalties,
            averageWorkHoursPerEmployee: dept.employeeCount > 0 ? dept.totalWorkHours / dept.employeeCount : 0,
            averageOvertimeHoursPerEmployee: dept.employeeCount > 0 ? dept.overtimeHours / dept.employeeCount : 0
        }));

        res.json({
            departments: departmentSummary,
            period: {
                year: year,
                month: month,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            }
        });
    } catch (error) {
        console.error('Error generating department summary report:', error);
        res.status(500).json({ error: 'Failed to generate department summary report' });
    }
}; 