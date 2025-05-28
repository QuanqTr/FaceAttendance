import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, loginSchema, employees, users } from "@shared/schema";
import { ZodError, z } from "zod";
import { fromZodError } from "zod-validation-error";
import nodemailer from "nodemailer";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

declare global {
  namespace Express {
    // Define User interface for Express
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

export function setupAuth(app: Express) {
  const sessionSecret = process.env.SESSION_SECRET || randomBytes(32).toString('hex');

  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    rolling: true,
    cookie: {
      maxAge: 15 * 60 * 1000, // 15 phút
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Tài khoản hoặc mật khẩu không chính xác" });
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
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

  app.post("/api/login", (req, res, next) => {
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
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err: Error | null) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Thêm endpoint để lấy thông tin người dùng hiện tại
  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      const { password, ...userWithoutPassword } = req.user as Express.User;
      res.json(userWithoutPassword);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // Endpoint kiểm tra email và gửi mật khẩu mới
  app.post("/api/forgot-password", async (req, res) => {
    console.log("=== FORGOT PASSWORD ENDPOINT CALLED ===");
    console.log("Request body:", req.body);
    console.log("Request headers:", req.headers);

    try {
      const { email } = req.body;
      console.log("Processing email:", email);

      if (!email) {
        console.log("ERROR: No email provided");
        return res.status(400).json({ message: "Email is required" });
      }

      console.log("Looking for employee with email:", email);
      // Kiểm tra email có tồn tại trong bảng employees không
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

      // Tìm user account liên kết với employee này
      const userAccount = await storage.getUserByEmployeeId(employee[0].id);
      console.log("User account search result:", userAccount);

      if (!userAccount) {
        console.log("ERROR: No user account found for employeeId:", employee[0].id);
        return res.status(404).json({ message: "Không tìm thấy tài khoản liên kết với email này" });
      }

      console.log("Found user account:", { id: userAccount.id, username: userAccount.username });

      // Tạo mật khẩu ngẫu nhiên
      const newPassword = generateRandomPassword();
      console.log("Generated new password:", newPassword);

      const hashedPassword = await hashPassword(newPassword);
      console.log("Password hashed successfully");

      // Cập nhật mật khẩu trong database
      console.log("Updating password for userId:", userAccount.id);
      await storage.updateUserPassword(userAccount.id, hashedPassword);
      console.log("Password updated successfully");

      // Gửi email với mật khẩu mới
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
  });

  // Store for email verification codes
  const emailVerificationCodes = new Map<string, { code: string; employeeId: number; expiresAt: Date }>();

  // Endpoint gửi mã xác thực email cho face authentication
  app.post("/api/face-auth/send-verification", async (req, res) => {
    console.log("=== FACE AUTH VERIFICATION SEND ===");
    console.log("Request body:", req.body);

    try {
      const { email, employeeId } = req.body;
      console.log("Processing email:", email, "for employeeId:", employeeId);

      if (!email || !employeeId) {
        console.log("ERROR: Missing email or employeeId");
        return res.status(400).json({ message: "Email và Employee ID là bắt buộc" });
      }

      // Kiểm tra email có tồn tại và khớp với employeeId
      const employee = await db
        .select()
        .from(employees)
        .where(eq(employees.email, email))
        .limit(1);

      if (!employee || employee.length === 0 || employee[0].id !== employeeId) {
        console.log("ERROR: Email không khớp với employee");
        return res.status(404).json({ message: "Email không khớp với nhân viên này" });
      }

      // Tạo mã xác thực 6 chữ số
      const verificationCode = Math.random().toString(10).substr(2, 6);
      console.log("Generated verification code:", verificationCode);

      // Lưu mã với thời hạn 5 phút
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      emailVerificationCodes.set(email, {
        code: verificationCode,
        employeeId,
        expiresAt
      });

      // Gửi email với mã xác thực
      console.log("Sending verification email to:", email);
      await sendFaceAuthVerificationEmail(email, verificationCode, `${employee[0].lastName} ${employee[0].firstName}`);
      console.log("Verification email sent successfully");

      console.log("=== FACE AUTH VERIFICATION SEND SUCCESS ===");
      res.json({ message: "Mã xác thực đã được gửi về email của bạn" });
    } catch (error) {
      console.error("=== FACE AUTH VERIFICATION SEND ERROR ===");
      console.error("Error:", error);
      res.status(500).json({ message: "Đã xảy ra lỗi khi gửi mã xác thực" });
    }
  });

  // Endpoint xác thực mã để cho phép truy cập face authentication
  app.post("/api/face-auth/verify-code", async (req, res) => {
    console.log("=== FACE AUTH CODE VERIFICATION ===");
    console.log("Request body:", req.body);

    try {
      const { email, code, employeeId } = req.body;
      console.log("Verifying code:", code, "for email:", email, "employeeId:", employeeId);

      if (!email || !code || !employeeId) {
        console.log("ERROR: Missing email, code, or employeeId");
        return res.status(400).json({ message: "Email, mã xác thực và Employee ID là bắt buộc" });
      }

      // Kiểm tra mã trong store
      const storedData = emailVerificationCodes.get(email);
      console.log("Stored verification data:", storedData);

      if (!storedData) {
        console.log("ERROR: No verification code found for email");
        return res.status(404).json({ message: "Không tìm thấy mã xác thực cho email này" });
      }

      // Kiểm tra mã có hết hạn không
      if (new Date() > storedData.expiresAt) {
        console.log("ERROR: Verification code expired");
        emailVerificationCodes.delete(email);
        return res.status(400).json({ message: "Mã xác thực đã hết hạn" });
      }

      // Kiểm tra mã có đúng không
      if (storedData.code !== code) {
        console.log("ERROR: Invalid verification code");
        return res.status(400).json({ message: "Mã xác thực không đúng" });
      }

      // Kiểm tra employeeId có khớp không
      if (storedData.employeeId !== employeeId) {
        console.log("ERROR: Employee ID mismatch");
        return res.status(400).json({ message: "Dữ liệu không khớp" });
      }

      // Xóa mã sau khi sử dụng
      emailVerificationCodes.delete(email);
      console.log("Verification successful, code deleted");

      console.log("=== FACE AUTH CODE VERIFICATION SUCCESS ===");
      res.json({
        message: "Xác thực thành công",
        verified: true,
        // Tạo token tạm thời cho phép truy cập trong 10 phút
        accessToken: generateTempAccessToken(employeeId)
      });
    } catch (error) {
      console.error("=== FACE AUTH CODE VERIFICATION ERROR ===");
      console.error("Error:", error);
      res.status(500).json({ message: "Đã xảy ra lỗi khi xác thực mã" });
    }
  });
}

// Hàm tạo mật khẩu ngẫu nhiên
function generateRandomPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Hàm gửi email mật khẩu mới
async function sendPasswordResetEmail(email: string, newPassword: string, fullName: string): Promise<void> {
  // Cấu hình transporter cho Gmail
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASSWORD || 'your-app-password'
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_USER || 'your-email@gmail.com',
    to: email,
    subject: 'Thông báo cập nhật mật khẩu mới - Hệ thống chấm công',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #007bff; margin-bottom: 10px;">🔒 Thông báo cập nhật mật khẩu mới</h1>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 16px; line-height: 1.6;">
            Xin chào <strong>${fullName}</strong>,
          </p>
          <br>
          <p style="margin: 0; font-size: 16px; line-height: 1.6;">
            Hệ thống vừa phát hiện bạn vừa thao tác quên mật khẩu và xác nhận đăng nhập bằng gmail.
          </p>
        </div>

        <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
          <p style="margin: 0 0 10px 0; font-size: 18px; font-weight: bold; color: #333;">
            Mật khẩu mới của bạn là:
          </p>
          <div style="background-color: #fff; padding: 15px; border-radius: 5px; border: 2px solid #007bff;">
            <strong style="font-size: 24px; color: #007bff; letter-spacing: 2px;">${newPassword}</strong>
          </div>
        </div>

        <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
          <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #856404;">
            <strong>📌 Lưu ý quan trọng:</strong><br>
            Bạn vui lòng đăng nhập vào hệ thống và cập nhật lại mật khẩu mới để đảm bảo tính bảo mật của tài khoản.
          </p>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <p style="font-size: 18px; color: #28a745; font-weight: bold;">
            🙏 Cảm ơn!
          </p>
        </div>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
          <p style="color: #666; font-size: 14px; margin: 0;">
            <strong>Hệ thống chấm công FaceAttend</strong><br>
            Email này được gửi tự động, vui lòng không trả lời email này.<br>
            Nếu bạn không yêu cầu reset mật khẩu, vui lòng liên hệ quản trị viên hệ thống ngay lập tức.
          </p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
}

// Hàm gửi email mã xác thực cho face authentication
async function sendFaceAuthVerificationEmail(email: string, verificationCode: string, fullName: string): Promise<void> {
  // Cấu hình transporter cho Gmail
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASSWORD || 'your-app-password'
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_USER || 'your-email@gmail.com',
    to: email,
    subject: 'Mã xác thực truy cập Quản lý Khuôn mặt - FaceAttend',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #007bff; margin-bottom: 10px;">🔐 Mã xác thực truy cập</h1>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 16px; line-height: 1.6;">
            Xin chào <strong>${fullName}</strong>,
          </p>
          <br>
          <p style="margin: 0; font-size: 16px; line-height: 1.6;">
            Bạn đang yêu cầu truy cập vào phần <strong>Quản lý Khuôn mặt</strong> trong hệ thống FaceAttend.
          </p>
        </div>

        <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
          <p style="margin: 0 0 10px 0; font-size: 18px; font-weight: bold; color: #333;">
            Mã xác thực của bạn là:
          </p>
          <div style="background-color: #fff; padding: 15px; border-radius: 5px; border: 2px solid #007bff;">
            <strong style="font-size: 32px; color: #007bff; letter-spacing: 4px;">${verificationCode}</strong>
          </div>
          <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">
            Mã này có hiệu lực trong <strong>5 phút</strong>
          </p>
        </div>

        <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
          <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #856404;">
            <strong>⚠️ Lưu ý bảo mật:</strong><br>
            Không chia sẻ mã này với bất kỳ ai. Mã chỉ được sử dụng để xác thực truy cập quản lý khuôn mặt của bạn.
          </p>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <p style="font-size: 18px; color: #28a745; font-weight: bold;">
            🙏 Cảm ơn!
          </p>
        </div>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
          <p style="color: #666; font-size: 14px; margin: 0;">
            <strong>Hệ thống chấm công FaceAttend</strong><br>
            Email này được gửi tự động, vui lòng không trả lời email này.<br>
            Nếu bạn không yêu cầu mã xác thực này, vui lòng liên hệ quản trị viên hệ thống ngay lập tức.
          </p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
}

// Tạo token tạm thời cho phép truy cập face authentication
function generateTempAccessToken(employeeId: number): string {
  const payload = {
    employeeId,
    purpose: 'face-auth-access',
    expiresAt: Date.now() + 10 * 60 * 1000 // 10 phút
  };

  // Tạo token đơn giản bằng base64
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}
