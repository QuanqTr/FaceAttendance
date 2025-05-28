import { Request, Response, NextFunction } from "express";

// Middleware to check if user is authenticated
export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: "Unauthorized" });
};

// Middleware to check if user is admin
export const ensureAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
        if (req.user?.role === 'admin') {
            return next();
        }
        if (req.user?.role === 'manager') {
            return res.status(403).json({
                message: "Không có quyền truy cập",
                redirectTo: "/manager"
            });
        }
    }
    return res.status(403).json({ message: "Forbidden - Admin access required" });
};

// Middleware to check if user is manager or admin
export const ensureManager = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated() && (req.user?.role === 'admin' || req.user?.role === 'manager')) {
        return next();
    }
    return res.status(403).json({ message: "Forbidden - Manager access required" });
};

// Helper function to get employee ID from user ID for managers
export const getManagerEmployeeId = async (userId: number): Promise<number | null> => {
    try {
        const { db } = await import("../db.js");
        const { users } = await import("@shared/schema");
        const { eq } = await import("drizzle-orm");

        const [user] = await db
            .select({
                employeeId: users.employeeId
            })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        return user?.employeeId || null;
    } catch (error) {
        console.error("Error getting manager employee ID:", error);
        return null;
    }
}; 