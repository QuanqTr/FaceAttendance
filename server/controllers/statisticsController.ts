import { Request, Response } from "express";
import { storage } from "../models/storage";

// Get department attendance stats
export const getDepartmentStats = async (req: Request, res: Response) => {
    try {
        const { date } = req.query;
        const targetDate = date ? new Date(date as string) : new Date();

        const stats = await storage.getDepartmentAttendanceStats(targetDate);

        res.json(stats);
    } catch (error) {
        console.error('Error fetching department stats:', error);
        res.status(500).json({ error: 'Failed to fetch department stats' });
    }
};

// Get daily stats
export const getDailyStats = async (req: Request, res: Response) => {
    try {
        const { date } = req.query;
        const targetDate = date ? new Date(date as string) : new Date();

        const stats = await storage.getDailyAttendanceSummary(targetDate);

        res.json(stats);
    } catch (error) {
        console.error('Error fetching daily stats:', error);
        res.status(500).json({ error: 'Failed to fetch daily stats' });
    }
};

// Get weekly stats
export const getWeeklyStats = async (req: Request, res: Response) => {
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

        console.log(`[Weekly Stats] Date range: ${start.toISOString()} to ${end.toISOString()}`);

        const stats = await storage.getWeeklyAttendance(start, end);

        res.json(stats);
    } catch (error) {
        console.error('Error fetching weekly stats:', error);
        res.status(500).json({ error: 'Failed to fetch weekly stats' });
    }
}; 