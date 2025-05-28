import { pgTable, text, serial, integer, boolean, timestamp, varchar, pgEnum, date, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enum for employee status
export const employeeStatusEnum = pgEnum('employee_status', ['active', 'inactive', 'on_leave']);

// Enum for attendance status
export const attendanceStatusEnum = pgEnum('attendance_status', ['present', 'late', 'absent']);

// Enum for attendance type
export const attendanceTypeEnum = pgEnum('attendance_type', ['in', 'out']);

// Enum for time log type
export const timeLogTypeEnum = pgEnum('time_log_type', ['checkin', 'checkout']);

// Enum for leave request status
export const leaveRequestStatusEnum = pgEnum('leave_request_status', ['pending', 'approved', 'rejected', 'cancelled']);

// Enum for leave request type
export const leaveRequestTypeEnum = pgEnum('leave_request_type', ['sick', 'vacation', 'personal', 'other']);

// Departments table - define first to avoid circular reference
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  managerId: integer("manager_id"), // Remove reference for now
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Employees table
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  employeeId: varchar("employee_id", { length: 20 }).notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  departmentId: integer("department_id").references(() => departments.id),
  position: text("position"),
  status: employeeStatusEnum("status").default("active").notNull(),
  faceDescriptor: text("face_descriptor"),
  joinDate: date("join_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Users table (admins) - now references employees
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").default("admin").notNull(),
  employeeId: integer("employee_id").references(() => employees.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Face data table for storing face recognition data
export const faceData = pgTable("face_data", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  descriptor: text("descriptor").notNull(),
  quality: decimal("quality", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

// Attendance records table
export const attendanceRecords = pgTable("attendance_records", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  date: timestamp("date").defaultNow().notNull(),
  type: attendanceTypeEnum("type").notNull(),
  status: attendanceStatusEnum("status").notNull(),
  time: timestamp("time").defaultNow().notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Time logs table for clock-in/clock-out tracking
export const timeLogs = pgTable("time_logs", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  logTime: timestamp("log_time").defaultNow().notNull(),
  type: timeLogTypeEnum("type").notNull(),
  source: text("source").default("face"),
});

// Leave requests table
export const leaveRequests = pgTable("leave_requests", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  type: leaveRequestTypeEnum("type").notNull(),
  reason: text("reason"),
  status: leaveRequestStatusEnum("status").default("pending").notNull(),
  approvedById: integer("approved_by_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Cached work hours table for storing calculated work hours
export const cachedWorkHours = pgTable("cached_work_hours", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  date: date("date").notNull(),
  regularHours: decimal("regular_hours", { precision: 5, scale: 2 }).notNull(),
  overtimeHours: decimal("overtime_hours", { precision: 5, scale: 2 }).notNull(),
  regularHoursFormatted: text("regular_hours_formatted").notNull(),
  overtimeHoursFormatted: text("overtime_hours_formatted").notNull(),
  totalHoursFormatted: text("total_hours_formatted").notNull(),
  checkinTime: timestamp("checkin_time"),
  checkoutTime: timestamp("checkout_time"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Work hours table - calculated by the PostgreSQL function
export const workHours = pgTable("work_hours", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  workDate: date("work_date").notNull(),
  firstCheckin: timestamp("first_checkin"),
  lastCheckout: timestamp("last_checkout"),
  regularHours: decimal("regular_hours", { precision: 5, scale: 2 }).default("0.00"),
  otHours: decimal("ot_hours", { precision: 5, scale: 2 }).default("0.00"),
  status: text("status").default("normal"), // 'normal', 'late', 'early_leave', 'absent'
});

// Attendance summary table for monthly/yearly aggregations
export const attendanceSummary = pgTable("attendance_summary", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  totalHours: decimal("total_hours", { precision: 8, scale: 2 }).default("0.00"),
  regularHours: decimal("regular_hours", { precision: 8, scale: 2 }).default("0.00"),
  overtimeHours: decimal("overtime_hours", { precision: 8, scale: 2 }).default("0.00"),
  leaveDays: integer("leave_days").default(0),
  presentDays: integer("present_days").default(0),
  absentDays: integer("absent_days").default(0),
  lateDays: integer("late_days").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").default("info").notNull(), // 'info', 'warning', 'error', 'success'
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Define all relations
export const usersRelations = relations(users, ({ many, one }) => ({
  departments: many(departments),
  employee: one(employees, {
    fields: [users.employeeId],
    references: [employees.id],
  }),
}));

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  manager: one(users, {
    fields: [departments.managerId],
    references: [users.id],
  }),
  employees: many(employees),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  department: one(departments, {
    fields: [employees.departmentId],
    references: [departments.id],
  }),
  attendanceRecords: many(attendanceRecords),
  leaveRequests: many(leaveRequests),
  faceData: many(faceData),
}));

export const faceDataRelations = relations(faceData, ({ one }) => ({
  employee: one(employees, {
    fields: [faceData.employeeId],
    references: [employees.id],
  }),
}));

export const attendanceRecordsRelations = relations(attendanceRecords, ({ one }) => ({
  employee: one(employees, {
    fields: [attendanceRecords.employeeId],
    references: [employees.id],
  }),
}));

export const timeLogsRelations = relations(timeLogs, ({ one }) => ({
  employee: one(employees, {
    fields: [timeLogs.employeeId],
    references: [employees.id],
  }),
}));

export const leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
  employee: one(employees, {
    fields: [leaveRequests.employeeId],
    references: [employees.id],
  }),
  approvedBy: one(users, {
    fields: [leaveRequests.approvedById],
    references: [users.id],
  }),
}));

export const cachedWorkHoursRelations = relations(cachedWorkHours, ({ one }) => ({
  employee: one(employees, {
    fields: [cachedWorkHours.employeeId],
    references: [employees.id],
  }),
}));

export const workHoursRelations = relations(workHours, ({ one }) => ({
  employee: one(employees, {
    fields: [workHours.employeeId],
    references: [employees.id],
  }),
}));

// Add relations for new tables
export const attendanceSummaryRelations = relations(attendanceSummary, ({ one }) => ({
  employee: one(employees, {
    fields: [attendanceSummary.employeeId],
    references: [employees.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  employee: one(employees, {
    fields: [notifications.employeeId],
    references: [employees.id],
  }),
}));

// Create insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertDepartmentSchema = createInsertSchema(departments).omit({ id: true, createdAt: true });
export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  joinDate: z.string().date()
});
export const insertAttendanceRecordSchema = createInsertSchema(attendanceRecords).omit({
  id: true,
  createdAt: true
});
export const insertTimeLogSchema = createInsertSchema(timeLogs).omit({
  id: true
});
export const insertLeaveRequestSchema = createInsertSchema(leaveRequests).omit({
  id: true,
  approvedById: true,
  approvedAt: true,
  createdAt: true,
  updatedAt: true
});
export const insertFaceDataSchema = createInsertSchema(faceData).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export const insertCachedWorkHoursSchema = createInsertSchema(cachedWorkHours).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export const insertWorkHoursSchema = createInsertSchema(workHours).omit({
  id: true
});
export const insertAttendanceSummarySchema = createInsertSchema(attendanceSummary).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export const insertNotificationsSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;

export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type InsertAttendanceRecord = z.infer<typeof insertAttendanceRecordSchema>;

export type TimeLog = typeof timeLogs.$inferSelect;
export type InsertTimeLog = z.infer<typeof insertTimeLogSchema>;

export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;

export type CachedWorkHours = typeof cachedWorkHours.$inferSelect;
export type InsertCachedWorkHours = z.infer<typeof insertCachedWorkHoursSchema>;

export type WorkHours = typeof workHours.$inferSelect;
export type InsertWorkHours = z.infer<typeof insertWorkHoursSchema>;

export type AttendanceSummary = typeof attendanceSummary.$inferSelect;
export type InsertAttendanceSummary = z.infer<typeof insertAttendanceSummarySchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationsSchema>;

// Login schema (subset of InsertUser)
export const loginSchema = insertUserSchema.pick({ username: true, password: true });
export type LoginData = z.infer<typeof loginSchema>;

export type EnrichedLeaveRequest = {
  id: number;
  employeeId: number;
  createdAt: Date;
  updatedAt: Date;
  status: "pending" | "approved" | "rejected" | "cancelled";
  type: "sick" | "vacation" | "personal" | "other";
  startDate: string;
  endDate: string;
  reason: string | null;
  approvedById: number | null;
  approvedAt: Date | null;
  rejectionReason?: string | null;

  // Add employee property for manager view
  employee?: {
    id?: number;
    firstName?: string;
    lastName?: string;
    department?: {
      id: number;
      name: string;
      description: string | null;
    } | null;
  };
};
