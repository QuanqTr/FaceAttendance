import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "../models/storage";
import { User, loginSchema, employees, users } from "@shared/schema";
import { ZodError, z } from "zod";
import { fromZodError } from "zod-validation-error";
import nodemailer from "nodemailer";
import { db } from "../db";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcrypt";

declare global {
    namespace Express {
        interface User {
            id: number;
            username: string;
            password: string;
            fullName: string;
            role: string;
            createdAt: Date;
        }
    }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(password: string, hash: string) {
    const [hashedPassword, salt] = hash.split(".");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return timingSafeEqual(Buffer.from(hashedPassword, "hex"), buf);
}

// Authentication middleware
export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: "Authentication required" });
};

export const ensureAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated() && req.user && (req.user as any).role === 'admin') {
        return next();
    }
    res.status(403).json({ error: "Admin access required" });
};

export const ensureManager = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated() && req.user && ['admin', 'manager'].includes((req.user as any).role)) {
        return next();
    }
    res.status(403).json({ error: "Manager access required" });
};

export function setupAuth(app: Express) {
    const sessionSecret = process.env.SESSION_SECRET || randomBytes(32).toString('hex');

    const sessionSettings: session.SessionOptions = {
        secret: sessionSecret,
        resave: false,
        saveUninitialized: false,
        store: storage.sessionStore,
        rolling: true,
        cookie: {
            maxAge: 15 * 60 * 1000, // 15 minutes
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        }
    };

    app.set("trust proxy", 1);
    app.use(session(sessionSettings));
    app.use(passport.initialize());
    app.use(passport.session());

    passport.use(
        new LocalStrategy(
            {
                usernameField: 'username',
                passwordField: 'password'
            },
            async (username: string, password: string, done) => {
                try {
                    const user = await storage.getUserByUsername(username);
                    
                    if (!user) {
                        return done(null, false, { message: 'Invalid username or password' });
                    }

                    const isValidPassword = await comparePasswords(password, user.password);
                    
                    if (!isValidPassword) {
                        return done(null, false, { message: 'Invalid username or password' });
                    }

                    return done(null, user);
                } catch (error) {
                    return done(error);
                }
            }
        ),
    );

    passport.serializeUser((user: any, done) => done(null, user.id));
    passport.deserializeUser(async (id: number, done) => {
        try {
            const user = await storage.getUser(id);
            if (!user) {
                return done(null, false);
            }
            done(null, user);
        } catch (error) {
            done(error);
        }
    });
}

function generateRandomPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

async function sendPasswordResetEmail(email: string, newPassword: string, fullName: string): Promise<void> {
    // Email configuration would go here
    console.log(`Sending password reset email to ${email} for ${fullName} with password: ${newPassword}`);
}

async function sendFaceAuthVerificationEmail(email: string, verificationCode: string, fullName: string): Promise<void> {
    // Email configuration would go here
    console.log(`Sending verification code ${verificationCode} to ${email} for ${fullName}`);
}

function generateTempAccessToken(employeeId: number): string {
    return `temp_token_${employeeId}_${Date.now()}`;
} 