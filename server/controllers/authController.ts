import { Request, Response, NextFunction } from "express";
import passport from "passport";
import { storage } from "../models/storage";
import { hashPassword } from "../middlewares/auth";
import { employees } from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";
import nodemailer from "nodemailer";

// Type definitions for global stores
declare global {
    var verificationCodes: Record<string, {
        code: string;
        expires: number;
        employeeId: number;
        userId: number;
    }> | undefined;

    var accessTokens: Record<string, {
        email: string;
        employeeId: number;
        userId: number;
        expires: number;
    }> | undefined;
}

// Login controller
export const login = (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: { message?: string } | undefined) => {
        if (err) return next(err);
        if (!user) {
            return res.status(401).json("Tài khoản hoặc mật khẩu không chính xác");
        }

        req.login(user, (err: Error | null) => {
            if (err) return next(err);

            // Remove password from the response
            const { password, ...userWithoutPassword } = user;
            res.status(200).json(userWithoutPassword);
        });
    })(req, res, next);
};

// Logout controller
export const logout = (req: Request, res: Response, next: NextFunction) => {
    req.logout((err: Error | null) => {
        if (err) return next(err);
        res.sendStatus(200);
    });
};

// Get current user controller
export const getCurrentUser = (req: Request, res: Response) => {
    if (req.isAuthenticated()) {
        const { password, ...userWithoutPassword } = req.user as Express.User;
        res.json(userWithoutPassword);
    } else {
        res.status(401).json({ message: "Not authenticated" });
    }
};

// Forgot password controller
export const forgotPassword = async (req: Request, res: Response) => {
    console.log("=== FORGOT PASSWORD ENDPOINT CALLED ===");
    console.log("Request body:", req.body);

    try {
        const { email } = req.body;
        console.log("Processing email:", email);

        if (!email) {
            console.log("ERROR: No email provided");
            return res.status(400).json({ message: "Email is required" });
        }

        console.log("Looking for employee with email:", email);
        // Check if email exists in employees table
        const employee = await db
            .select()
            .from(employees)
            .where(eq(employees.email, email))
            .limit(1);

        console.log("Employee search result:", employee);

        if (!employee || employee.length === 0) {
            console.log("ERROR: Employee not found for email:", email);
            return res.status(404).json({ message: "Email không tồn tại trong hệ thống" });
        }

        console.log("Found employee:", employee[0]);
        console.log("Looking for user account for employeeId:", employee[0].id);

        // Find user account linked to this employee
        const userAccount = await storage.getUserByEmployeeId(employee[0].id);
        console.log("User account search result:", userAccount);

        if (!userAccount) {
            console.log("ERROR: No user account found for employeeId:", employee[0].id);
            return res.status(404).json({ message: "Không tìm thấy tài khoản liên kết với email này" });
        }

        console.log("Found user account:", { id: userAccount.id, username: userAccount.username });

        // Generate random password
        const newPassword = generateRandomPassword();
        console.log("Generated new password:", newPassword);

        const hashedPassword = await hashPassword(newPassword);
        console.log("Password hashed successfully");

        // Update password in database
        console.log("Updating password for userId:", userAccount.id);
        await storage.updateUserPassword(userAccount.id, hashedPassword);
        console.log("Password updated successfully");

        // Send email with new password
        console.log("Sending password reset email to:", email);
        await sendPasswordResetEmail(email, newPassword, `${employee[0].lastName} ${employee[0].firstName}`);
        console.log("Password reset email sent successfully");

        console.log("=== FORGOT PASSWORD SUCCESS ===");
        res.json({ message: "Mật khẩu mới đã được gửi về email của bạn" });
    } catch (error) {
        console.error("=== FORGOT PASSWORD ERROR ===");
        console.error("Error in forgot password:", error);
        res.status(500).json({ message: "Đã xảy ra lỗi khi xử lý yêu cầu" });
    }
};

// Face auth verification controllers
export const sendFaceAuthVerification = async (req: Request, res: Response) => {
    console.log("=== FACE AUTH VERIFICATION ENDPOINT CALLED ===");
    console.log("Request body:", req.body);

    try {
        const { email, employeeId } = req.body;
        console.log("Processing face auth verification for email:", email);

        if (!email) {
            console.log("ERROR: No email provided");
            return res.status(400).json({ message: "Email is required" });
        }

        console.log("Looking for employee with email:", email);
        // Check if email exists in employees table
        const employee = await db
            .select()
            .from(employees)
            .where(eq(employees.email, email))
            .limit(1);

        console.log("Employee search result:", employee);

        if (!employee || employee.length === 0) {
            console.log("ERROR: Employee not found for email:", email);
            return res.status(404).json({ message: "Email không tồn tại trong hệ thống" });
        }

        console.log("Found employee:", employee[0]);
        console.log("Looking for user account for employeeId:", employee[0].id);

        // Find user account linked to this employee and check if admin
        const userAccount = await storage.getUserByEmployeeId(employee[0].id);
        console.log("User account search result:", userAccount);

        if (!userAccount) {
            console.log("ERROR: No user account found for employeeId:", employee[0].id);
            return res.status(404).json({ message: "Không tìm thấy tài khoản liên kết với email này" });
        }

        // Check if user is admin
        if (userAccount.role !== 'admin') {
            console.log("ERROR: User is not admin, role:", userAccount.role);
            return res.status(403).json({ message: "Chỉ admin mới được phép truy cập chức năng này" });
        }

        console.log("User is admin, generating verification code");

        // Generate 6-digit verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        console.log("Generated verification code:", JSON.stringify(verificationCode), "Type:", typeof verificationCode, "Length:", verificationCode.length);

        // Store verification code in session or cache (for demo, we'll use a simple in-memory store)
        // In production, use Redis or database
        if (!global.verificationCodes) {
            global.verificationCodes = {};
        }

        global.verificationCodes![email] = {
            code: verificationCode,
            expires: Date.now() + 5 * 60 * 1000, // 5 minutes
            employeeId: employee[0].id,
            userId: userAccount.id
        };

        console.log("Verification code stored for:", email, "Data:", JSON.stringify(global.verificationCodes![email]));

        // Send email with verification code
        console.log("Sending verification email to:", email);
        await sendFaceAuthVerificationEmail(email, verificationCode, `${employee[0].lastName} ${employee[0].firstName}`);
        console.log("Verification email sent successfully");

        console.log("=== FACE AUTH VERIFICATION SUCCESS ===");
        res.json({ message: "Mã xác thực đã được gửi về email của bạn" });
    } catch (error) {
        console.error("=== FACE AUTH VERIFICATION ERROR ===");
        console.error("Error in face auth verification:", error);
        res.status(500).json({ message: "Đã xảy ra lỗi khi gửi mã xác thực" });
    }
};

export const verifyFaceAuthCode = async (req: Request, res: Response) => {
    console.log("=== FACE AUTH CODE VERIFICATION ENDPOINT CALLED ===");
    console.log("Request body:", req.body);

    try {
        const { email, code, employeeId } = req.body;
        console.log("Verifying code for email:", email, "code:", code);

        if (!email || !code) {
            console.log("ERROR: Email or code missing");
            return res.status(400).json({ message: "Email và mã xác thực là bắt buộc" });
        }

        // Check verification code
        const storedData = global.verificationCodes![email];
        console.log("Stored verification data:", storedData);

        if (!storedData) {
            console.log("ERROR: No verification code found for email");
            return res.status(404).json({ message: "Không tìm thấy mã xác thực. Vui lòng yêu cầu mã mới." });
        }

        if (Date.now() > storedData.expires) {
            console.log("ERROR: Verification code expired");
            delete global.verificationCodes![email];
            return res.status(400).json({ message: "Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới." });
        }

        if (storedData.code !== code) {
            console.log("ERROR: Invalid verification code");
            console.log("Stored code:", JSON.stringify(storedData.code), "Type:", typeof storedData.code, "Length:", storedData.code.length);
            console.log("Input code:", JSON.stringify(code), "Type:", typeof code, "Length:", code.length);
            console.log("Strict comparison:", storedData.code !== code);
            console.log("Loose comparison:", storedData.code != code);
            console.log("Trimmed comparison:", storedData.code.trim() !== code.trim());
            return res.status(400).json({ message: "Mã xác thực không đúng" });
        }

        console.log("Verification code is valid");

        // Generate access token (valid for 10 minutes)
        const accessToken = generateAccessToken();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

        // Store access token
        if (!global.accessTokens) {
            global.accessTokens = {};
        }

        global.accessTokens[accessToken] = {
            email,
            employeeId: storedData.employeeId,
            userId: storedData.userId,
            expires: expiresAt
        };

        // Clean up verification code
        delete global.verificationCodes![email];

        console.log("Access token generated and stored");
        console.log("=== FACE AUTH CODE VERIFICATION SUCCESS ===");

        res.json({
            message: "Xác thực thành công",
            accessToken,
            expiresAt
        });
    } catch (error) {
        console.error("=== FACE AUTH CODE VERIFICATION ERROR ===");
        console.error("Error in code verification:", error);
        res.status(500).json({ message: "Đã xảy ra lỗi khi xác thực mã" });
    }
};

// Helper functions
function generateRandomPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

async function sendPasswordResetEmail(email: string, newPassword: string, fullName: string): Promise<void> {
    try {
        console.log("Setting up email transporter...");

        // Tạo transporter với Gmail (hoặc có thể dùng dịch vụ email khác)
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER || 'mynameisquanq@gmail.com', // Email gửi
                pass: process.env.GMAIL_APP_PASSWORD || 'aixk pfwa xfin uswp' // App password của Gmail
            }
        });

        console.log("Email transporter created successfully");

        // Nội dung email
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #3b82f6; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background-color: #f8fafc; }
                .password-box { background-color: #ffffff; border: 2px solid #3b82f6; padding: 15px; margin: 20px 0; text-align: center; border-radius: 8px; }
                .password { font-size: 24px; font-weight: bold; color: #3b82f6; letter-spacing: 2px; }
                .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 10px; margin: 15px 0; }
                .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 FaceAttend - Đặt lại mật khẩu</h1>
                </div>
                <div class="content">
                    <h2>Xin chào ${fullName},</h2>
                    
                    <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn trong hệ thống FaceAttend.</p>
                    
                    <div class="password-box">
                        <p><strong>Mật khẩu mới của bạn là:</strong></p>
                        <div class="password">${newPassword}</div>
                    </div>
                    
                    <div class="warning">
                        <h3>⚠️ Lưu ý quan trọng:</h3>
                        <ul>
                            <li>Vui lòng đổi mật khẩu này sau khi đăng nhập thành công</li>
                            <li>Không chia sẻ mật khẩu này với bất kỳ ai</li>
                            <li>Mật khẩu này có hiệu lực ngay lập tức</li>
                        </ul>
                    </div>
                    
                    <p>Để đăng nhập:</p>
                    <ol>
                        <li>Truy cập hệ thống FaceAttend</li>
                        <li>Sử dụng username hiện tại và mật khẩu mới ở trên</li>
                        <li>Vào phần "Hồ sơ" để đổi mật khẩu mới</li>
                    </ol>
                    
                    <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng liên hệ với quản trị viên ngay lập tức.</p>
                    
                    <div class="footer">
                        <p>Email này được gửi tự động từ hệ thống FaceAttend.<br>
                        Vui lòng không trả lời email này.</p>
                        <p>© 2024 FaceAttend - Hệ thống chấm công nhận diện khuôn mặt</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;

        // Cấu hình email
        const mailOptions = {
            from: {
                name: 'FaceAttend System',
                address: process.env.GMAIL_USER || 'mynameisquanq@gmail.com'
            },
            to: email,
            subject: `🔐 [FaceAttend] Mật khẩu mới cho ${fullName}`,
            html: htmlContent,
            // Text version cho client không hỗ trợ HTML
            text: `
Xin chào ${fullName},

Mật khẩu mới của bạn trong hệ thống FaceAttend là: ${newPassword}

Vui lòng:
1. Đăng nhập với mật khẩu mới này
2. Đổi mật khẩu ngay sau khi đăng nhập thành công
3. Không chia sẻ mật khẩu với bất kỳ ai

Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng liên hệ quản trị viên.

Trân trọng,
FaceAttend System
            `
        };

        console.log("Sending email to:", email);
        console.log("Email subject:", mailOptions.subject);

        // Gửi email
        const info = await transporter.sendMail(mailOptions);

        console.log("Email sent successfully!");
        console.log("Message ID:", info.messageId);
        console.log("Preview URL:", nodemailer.getTestMessageUrl(info));

    } catch (error) {
        console.error("Error sending password reset email:", error);
        throw new Error(`Không thể gửi email: ${(error as Error).message}`);
    }
}

// Helper functions for face auth
function generateAccessToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

async function sendFaceAuthVerificationEmail(email: string, verificationCode: string, fullName: string): Promise<void> {
    try {
        console.log("Setting up face auth verification email transporter...");

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER || 'mynameisquanq@gmail.com',
                pass: process.env.GMAIL_APP_PASSWORD || 'aixk pfwa xfin uswp'
            }
        });

        console.log("Face auth email transporter created successfully");

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #3b82f6; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background-color: #f8fafc; }
                .code-box { background-color: #ffffff; border: 2px solid #3b82f6; padding: 20px; margin: 20px 0; text-align: center; border-radius: 8px; }
                .code { font-size: 32px; font-weight: bold; color: #3b82f6; letter-spacing: 4px; font-family: monospace; }
                .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 10px; margin: 15px 0; }
                .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 FaceAttend - Mã xác thực Face Recognition</h1>
                </div>
                <div class="content">
                    <h2>Xin chào ${fullName},</h2>
                    
                    <p>Bạn đã yêu cầu truy cập vào hệ thống Face Recognition Live với quyền admin.</p>
                    
                    <div class="code-box">
                        <p><strong>Mã xác thực của bạn là:</strong></p>
                        <div class="code">${verificationCode}</div>
                    </div>
                    
                    <div class="warning">
                        <h3>⚠️ Lưu ý quan trọng:</h3>
                        <ul>
                            <li>Mã này có hiệu lực trong 5 phút</li>
                            <li>Chỉ sử dụng một lần</li>
                            <li>Chỉ admin mới có quyền truy cập Face Recognition Live</li>
                            <li>Không chia sẻ mã này với bất kỳ ai</li>
                        </ul>
                    </div>
                    
                    <p>Sau khi xác thực thành công, bạn sẽ có quyền truy cập trong 10 phút.</p>
                    
                    <p>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
                    
                    <div class="footer">
                        <p>Email này được gửi tự động từ hệ thống FaceAttend.<br>
                        Vui lòng không trả lời email này.</p>
                        <p>© 2024 FaceAttend - Hệ thống chấm công nhận diện khuôn mặt</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;

        const mailOptions = {
            from: {
                name: 'FaceAttend System',
                address: process.env.GMAIL_USER || 'mynameisquanq@gmail.com'
            },
            to: email,
            subject: `🔐 [FaceAttend] Mã xác thực Face Recognition - ${verificationCode}`,
            html: htmlContent,
            text: `
Xin chào ${fullName},

Mã xác thực Face Recognition của bạn là: ${verificationCode}

Mã này có hiệu lực trong 5 phút và chỉ sử dụng một lần.
Chỉ admin mới có quyền truy cập Face Recognition Live.

Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.

Trân trọng,
FaceAttend System
            `
        };

        console.log("Sending face auth verification email to:", email);
        const info = await transporter.sendMail(mailOptions);
        console.log("Face auth verification email sent successfully!");
        console.log("Message ID:", info.messageId);

    } catch (error) {
        console.error("Error sending face auth verification email:", error);
        throw new Error(`Không thể gửi email xác thực: ${(error as Error).message}`);
    }
} 