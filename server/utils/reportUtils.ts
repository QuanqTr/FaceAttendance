import XLSX from "xlsx";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { db } from "../db.js";
import { storage } from "../models/storage.js";
import {
    attendanceSummary,
    workHours,
    employees,
    departments
} from "@shared/schema";
import {
    eq,
    and,
    or,
    sql,
    inArray
} from "drizzle-orm";

// Declare the autoTable method for TypeScript
declare module "jspdf" {
    interface jsPDF {
        autoTable: (options: any) => void;
    }
}

// Report generation functions

export async function generateAttendanceReport(startDate: Date, endDate: Date, departmentId?: number): Promise<any[]> {
    try {
        // Get all work hours within date range
        const workHoursQuery = db
            .select({
                employeeId: workHours.employeeId,
                workDate: workHours.workDate,
                regularHours: workHours.regularHours,
                otHours: workHours.otHours,
                firstCheckin: workHours.firstCheckin,
                lastCheckout: workHours.lastCheckout,
                status: workHours.status
            })
            .from(workHours)
            .where(
                and(
                    sql`DATE(${workHours.workDate}) >= DATE(${startDate.toISOString().split('T')[0]})`,
                    sql`DATE(${workHours.workDate}) <= DATE(${endDate.toISOString().split('T')[0]})`
                )
            );

        const workHoursData = await workHoursQuery;

        // Get employee and department info
        const employeesWithDept = await db
            .select({
                id: employees.id,
                firstName: employees.firstName,
                lastName: employees.lastName,
                departmentId: employees.departmentId,
                departmentName: departments.name
            })
            .from(employees)
            .leftJoin(departments, eq(employees.departmentId, departments.id))
            .where(departmentId ? eq(employees.departmentId, departmentId) : undefined);

        // Combine data
        const attendanceData = [];
        for (const workHour of workHoursData) {
            const employee = employeesWithDept.find(emp => emp.id === workHour.employeeId);
            if (employee && (!departmentId || employee.departmentId === departmentId)) {
                attendanceData.push({
                    employeeName: `${employee.lastName} ${employee.firstName}`,
                    department: employee.departmentName || 'Chưa xác định',
                    date: new Date(workHour.workDate).toLocaleDateString('vi-VN'),
                    checkinTime: workHour.firstCheckin ? new Date(workHour.firstCheckin).toLocaleTimeString('vi-VN') : '',
                    checkoutTime: workHour.lastCheckout ? new Date(workHour.lastCheckout).toLocaleTimeString('vi-VN') : '',
                    regularHours: parseFloat(workHour.regularHours?.toString() || '0').toFixed(2),
                    overtimeHours: parseFloat(workHour.otHours?.toString() || '0').toFixed(2),
                    status: workHour.status || 'normal'
                });
            }
        }

        return attendanceData;
    } catch (error) {
        console.error('Error generating attendance report:', error);
        return [];
    }
}

export async function generateEmployeeReport(startDate: Date, endDate: Date, departmentId?: number): Promise<any[]> {
    try {
        // Get attendance summaries for the date range
        const startYear = startDate.getFullYear();
        const startMonth = startDate.getMonth() + 1;
        const endYear = endDate.getFullYear();
        const endMonth = endDate.getMonth() + 1;

        const summariesQuery = db
            .select()
            .from(attendanceSummary)
            .where(
                and(
                    or(
                        and(eq(attendanceSummary.year, startYear), sql`${attendanceSummary.month} >= ${startMonth}`),
                        sql`${attendanceSummary.year} > ${startYear}`
                    ),
                    or(
                        and(eq(attendanceSummary.year, endYear), sql`${attendanceSummary.month} <= ${endMonth}`),
                        sql`${attendanceSummary.year} < ${endYear}`
                    )
                )
            );

        const summariesData = await summariesQuery;

        // Get employee and department info
        const employeesWithDept = await db
            .select({
                id: employees.id,
                firstName: employees.firstName,
                lastName: employees.lastName,
                departmentId: employees.departmentId,
                position: employees.position,
                departmentName: departments.name
            })
            .from(employees)
            .leftJoin(departments, eq(employees.departmentId, departments.id))
            .where(departmentId ? eq(employees.departmentId, departmentId) : undefined);

        // Group summaries by employee
        const employeeData = [];
        for (const employee of employeesWithDept) {
            const employeeSummaries = summariesData.filter(s => s.employeeId === employee.id);

            const totalHours = employeeSummaries.reduce((sum, s) => sum + parseFloat(s.totalHours?.toString() || '0'), 0);
            const overtimeHours = employeeSummaries.reduce((sum, s) => sum + parseFloat(s.overtimeHours?.toString() || '0'), 0);
            const leaveDays = employeeSummaries.reduce((sum, s) => sum + (s.leaveDays || 0), 0);
            // Note: penaltyAmount might not exist in current schema, defaulting to 0
            const penaltyAmount = 0; // TODO: Update when penaltyAmount is added to schema

            employeeData.push({
                employeeId: employee.id,
                employeeName: `${employee.lastName} ${employee.firstName}`,
                department: employee.departmentName || 'Chưa xác định',
                position: employee.position || 'Chưa xác định',
                totalHours: totalHours.toFixed(2),
                overtimeHours: overtimeHours.toFixed(2),
                leaveDays: leaveDays,
                penaltyAmount: penaltyAmount.toLocaleString('vi-VN')
            });
        }

        return employeeData;
    } catch (error) {
        console.error('Error generating employee report:', error);
        return [];
    }
}

export async function generateDepartmentReport(startDate: Date, endDate: Date): Promise<any[]> {
    try {
        // Get all departments
        const allDepartments = await db.select().from(departments);

        const departmentData = [];
        for (const dept of allDepartments) {
            // Get employees in department
            const deptEmployees = await db
                .select()
                .from(employees)
                .where(eq(employees.departmentId, dept.id));

            // Get attendance summaries for this department
            const startYear = startDate.getFullYear();
            const startMonth = startDate.getMonth() + 1;
            const endYear = endDate.getFullYear();
            const endMonth = endDate.getMonth() + 1;

            const summariesQuery = db
                .select()
                .from(attendanceSummary)
                .where(
                    and(
                        deptEmployees.length > 0 ?
                            inArray(attendanceSummary.employeeId, deptEmployees.map(e => e.id)) :
                            sql`1=0`,
                        or(
                            and(eq(attendanceSummary.year, startYear), sql`${attendanceSummary.month} >= ${startMonth}`),
                            sql`${attendanceSummary.year} > ${startYear}`
                        ),
                        or(
                            and(eq(attendanceSummary.year, endYear), sql`${attendanceSummary.month} <= ${endMonth}`),
                            sql`${attendanceSummary.year} < ${endYear}`
                        )
                    )
                );

            const summariesData = deptEmployees.length > 0 ? await summariesQuery : [];

            const totalHours = summariesData.reduce((sum, s) => sum + parseFloat(s.totalHours?.toString() || '0'), 0);
            const overtimeHours = summariesData.reduce((sum, s) => sum + parseFloat(s.overtimeHours?.toString() || '0'), 0);
            // Note: penaltyAmount might not exist in current schema
            const totalPenalty = 0; // TODO: Update when penaltyAmount is added to schema

            // Calculate attendance rate (simplified)
            const attendanceRate = summariesData.length > 0 ?
                (summariesData.filter(s => parseFloat(s.totalHours?.toString() || '0') > 0).length / summariesData.length * 100) : 0;

            departmentData.push({
                departmentId: dept.id,
                departmentName: dept.name,
                employeeCount: deptEmployees.length,
                totalHours: totalHours.toFixed(2),
                overtimeHours: overtimeHours.toFixed(2),
                attendanceRate: attendanceRate.toFixed(1),
                totalPenalty: totalPenalty.toLocaleString('vi-VN')
            });
        }

        return departmentData;
    } catch (error) {
        console.error('Error generating department report:', error);
        return [];
    }
}

export async function generateSummaryReport(startDate: Date, endDate: Date, departmentId?: number): Promise<any[]> {
    try {
        // Get attendance summaries for the date range
        const startYear = startDate.getFullYear();
        const startMonth = startDate.getMonth() + 1;
        const endYear = endDate.getFullYear();
        const endMonth = endDate.getMonth() + 1;

        const summariesQuery = db
            .select()
            .from(attendanceSummary)
            .where(
                and(
                    or(
                        and(eq(attendanceSummary.year, startYear), sql`${attendanceSummary.month} >= ${startMonth}`),
                        sql`${attendanceSummary.year} > ${startYear}`
                    ),
                    or(
                        and(eq(attendanceSummary.year, endYear), sql`${attendanceSummary.month} <= ${endMonth}`),
                        sql`${attendanceSummary.year} < ${endYear}`
                    )
                )
            );

        const summariesData = await summariesQuery;

        // Get employee and department info
        const employeesWithDept = await db
            .select({
                id: employees.id,
                firstName: employees.firstName,
                lastName: employees.lastName,
                departmentId: employees.departmentId,
                departmentName: departments.name
            })
            .from(employees)
            .leftJoin(departments, eq(employees.departmentId, departments.id))
            .where(departmentId ? eq(employees.departmentId, departmentId) : undefined);

        // Create summary data
        const summaryData = [];
        for (const summary of summariesData) {
            const employee = employeesWithDept.find(emp => emp.id === summary.employeeId);
            if (employee && (!departmentId || employee.departmentId === departmentId)) {
                summaryData.push({
                    employeeName: `${employee.lastName} ${employee.firstName}`,
                    department: employee.departmentName || 'Chưa xác định',
                    presentDays: summary.presentDays || 0,
                    lateDays: summary.lateDays || 0,
                    earlyLeaveDays: 0, // TODO: Add to schema when available
                    absentDays: summary.absentDays || 0,
                    leaveDays: summary.leaveDays || 0,
                    lateMinutes: 0, // TODO: Add to schema when available
                    earlyLeaveMinutes: 0, // TODO: Add to schema when available
                    penaltyAmount: '0' // TODO: Update when penaltyAmount is added to schema
                });
            }
        }

        return summaryData;
    } catch (error) {
        console.error('Error generating summary report:', error);
        return [];
    }
}

// File generation utilities

export async function generateCSV(data: any[], headers: string[]): Promise<string> {
    const csvRows = [];

    // Add headers
    csvRows.push(headers.join(','));

    // Add data rows
    for (const row of data) {
        const values = Object.values(row).map(value => {
            // Handle values that might contain commas or quotes
            const stringValue = String(value || '');
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        });
        csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
}

export async function generateXLSX(data: any[], headers: string[], reportType: string): Promise<Buffer> {
    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Create worksheet data
    const worksheetData = [
        headers,
        ...data.map(row => Object.values(row))
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths
    const columnWidths = headers.map(() => ({ wch: 15 }));
    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, reportType.charAt(0).toUpperCase() + reportType.slice(1));

    // Generate buffer
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

export async function generatePDF(data: any[], headers: string[], reportType: string, startDate: Date, endDate: Date): Promise<Buffer> {
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(16);
    doc.text(`Báo cáo ${reportType}`, 20, 20);

    // Add date range
    doc.setFontSize(12);
    doc.text(`Từ ngày: ${startDate.toLocaleDateString('vi-VN')} đến ${endDate.toLocaleDateString('vi-VN')}`, 20, 35);

    // Add table
    doc.autoTable({
        head: [headers],
        body: data.map(row => Object.values(row)),
        startY: 45,
        styles: {
            fontSize: 8,
            cellPadding: 2
        },
        headStyles: {
            fillColor: [63, 81, 181],
            textColor: 255,
            fontSize: 9
        },
        margin: { top: 45 }
    });

    return Buffer.from(doc.output('arraybuffer'));
} 