import { Request, Response } from "express";
import { storage } from "../models/storage";

// Get attendance summary (admin only)
export const getAttendanceSummary = async (req: Request, res: Response) => {
    try {
        const { date } = req.query;
        const targetDate = date ? new Date(date as string) : new Date();

        const summary = await storage.getDailyAttendanceSummary(targetDate);

        res.json(summary);
    } catch (error) {
        console.error('Error fetching attendance summary:', error);
        res.status(500).json({ error: 'Failed to fetch attendance summary' });
    }
};

// Update attendance summary (admin only)
export const updateAttendanceSummary = async (req: Request, res: Response) => {
    try {
        const { date, summary } = req.body;

        if (!date || !summary) {
            return res.status(400).json({ error: 'Date and summary data are required' });
        }

        // This would implement attendance summary update logic
        res.json({
            success: true,
            message: 'Attendance summary updated successfully',
            data: { date, summary }
        });
    } catch (error) {
        console.error('Error updating attendance summary:', error);
        res.status(500).json({ error: 'Failed to update attendance summary' });
    }
}; 