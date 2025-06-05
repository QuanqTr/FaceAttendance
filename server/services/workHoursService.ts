import { db } from "../db";
import { workHours, timeLogs } from "@shared/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { getVietnamTime } from "../utils/timezone";

// Interface for work hours calculation
interface WorkHoursCalculation {
    employeeId: number;
    workDate: string;
    firstCheckin: Date | null;
    lastCheckout: Date | null;
    regularHours: number;
    otHours: number;
    status: string;
}

// Calculate work hours from time logs
export async function calculateWorkHours(employeeId: number, date: Date): Promise<WorkHoursCalculation | null> {
    try {
        // Get start and end of day
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // Get all time logs for the employee on this date
        const logs = await db
            .select()
            .from(timeLogs)
            .where(
                and(
                    eq(timeLogs.employeeId, employeeId),
                    gte(timeLogs.logTime, startOfDay),
                    lte(timeLogs.logTime, endOfDay)
                )
            )
            .orderBy(timeLogs.logTime);

        console.log(`[WorkHours] Found ${logs.length} time logs for employee ${employeeId} on ${date.toISOString().split('T')[0]}`);

        if (logs.length === 0) {
            return null; // No logs, no work hours
        }

        // Find first checkin and last checkout
        const checkinLogs = logs.filter(log => log.type === 'checkin');
        const checkoutLogs = logs.filter(log => log.type === 'checkout');

        if (checkinLogs.length === 0) {
            console.log(`[WorkHours] No checkin found for employee ${employeeId}`);
            return null; // No checkin, no work hours
        }

        const firstCheckin = checkinLogs[0].logTime;
        const lastCheckout = checkoutLogs.length > 0 ? checkoutLogs[checkoutLogs.length - 1].logTime : null;

        // Only calculate work hours if we have both checkin and checkout
        if (!lastCheckout) {
            console.log(`[WorkHours] No checkout found for employee ${employeeId}, not calculating work hours yet`);
            return null; // No checkout yet, don't create work hours record
        }

        // Calculate work duration in hours
        const workDurationMs = lastCheckout.getTime() - firstCheckin.getTime();
        const workDurationHours = workDurationMs / (1000 * 60 * 60);

        // Calculate regular and overtime hours
        const regularHours = Math.min(workDurationHours, 8);
        const otHours = Math.max(0, workDurationHours - 8);

        // Determine status
        const checkinHour = firstCheckin.getHours() + firstCheckin.getMinutes() / 60;
        let status = 'normal';
        if (checkinHour > 8.5) { // Late if after 8:30 AM
            status = 'late';
        }

        const workDate = date.toISOString().split('T')[0];

        console.log(`[WorkHours] Calculated for employee ${employeeId}: ${regularHours.toFixed(2)}h regular, ${otHours.toFixed(2)}h OT, status: ${status}`);

        return {
            employeeId,
            workDate,
            firstCheckin,
            lastCheckout,
            regularHours,
            otHours,
            status
        };

    } catch (error) {
        console.error(`[WorkHours] Error calculating work hours for employee ${employeeId}:`, error);
        return null;
    }
}

// Update or create work hours record
export async function updateWorkHours(employeeId: number, date: Date): Promise<void> {
    try {
        const calculation = await calculateWorkHours(employeeId, date);
        
        if (!calculation) {
            console.log(`[WorkHours] No work hours to update for employee ${employeeId} on ${date.toISOString().split('T')[0]}`);
            return;
        }

        const workDate = calculation.workDate;

        // Check if record already exists
        const existingRecord = await db
            .select()
            .from(workHours)
            .where(
                and(
                    eq(workHours.employeeId, employeeId),
                    eq(workHours.workDate, workDate)
                )
            )
            .limit(1);

        if (existingRecord.length > 0) {
            // Update existing record
            await db
                .update(workHours)
                .set({
                    firstCheckin: calculation.firstCheckin,
                    lastCheckout: calculation.lastCheckout,
                    regularHours: calculation.regularHours.toFixed(2),
                    otHours: calculation.otHours.toFixed(2),
                    status: calculation.status
                })
                .where(
                    and(
                        eq(workHours.employeeId, employeeId),
                        eq(workHours.workDate, workDate)
                    )
                );

            console.log(`[WorkHours] Updated work hours record for employee ${employeeId} on ${workDate}`);
        } else {
            // Create new record
            await db
                .insert(workHours)
                .values({
                    employeeId: calculation.employeeId,
                    workDate: calculation.workDate,
                    firstCheckin: calculation.firstCheckin,
                    lastCheckout: calculation.lastCheckout,
                    regularHours: calculation.regularHours.toFixed(2),
                    otHours: calculation.otHours.toFixed(2),
                    status: calculation.status
                });

            console.log(`[WorkHours] Created new work hours record for employee ${employeeId} on ${workDate}`);
        }

    } catch (error) {
        console.error(`[WorkHours] Error updating work hours for employee ${employeeId}:`, error);
    }
}

// Delete work hours record if no valid logs exist
export async function deleteWorkHoursIfInvalid(employeeId: number, date: Date): Promise<void> {
    try {
        const calculation = await calculateWorkHours(employeeId, date);
        
        if (!calculation) {
            // No valid work hours, delete any existing record
            const workDate = date.toISOString().split('T')[0];
            
            await db
                .delete(workHours)
                .where(
                    and(
                        eq(workHours.employeeId, employeeId),
                        eq(workHours.workDate, workDate)
                    )
                );

            console.log(`[WorkHours] Deleted invalid work hours record for employee ${employeeId} on ${workDate}`);
        }

    } catch (error) {
        console.error(`[WorkHours] Error deleting invalid work hours for employee ${employeeId}:`, error);
    }
}
