CREATE TYPE "public"."time_log_type" AS ENUM('checkin', 'checkout');--> statement-breakpoint
ALTER TYPE "public"."leave_request_status" ADD VALUE 'cancelled';--> statement-breakpoint
CREATE TABLE "cached_work_hours" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"date" date NOT NULL,
	"regular_hours" numeric(5, 2) NOT NULL,
	"overtime_hours" numeric(5, 2) NOT NULL,
	"regular_hours_formatted" text NOT NULL,
	"overtime_hours_formatted" text NOT NULL,
	"total_hours_formatted" text NOT NULL,
	"checkin_time" timestamp,
	"checkout_time" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pay_periods" (
	"id" serial PRIMARY KEY NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"log_time" timestamp DEFAULT now() NOT NULL,
	"type" time_log_type NOT NULL,
	"source" text DEFAULT 'face'
);
--> statement-breakpoint
CREATE TABLE "work_hours" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"work_date" date NOT NULL,
	"first_checkin" timestamp,
	"last_checkout" timestamp,
	"regular_hours" numeric(5, 2) DEFAULT '0.00',
	"ot_hours" numeric(5, 2) DEFAULT '0.00',
	"status" text DEFAULT 'normal'
);
--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "join_date" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "salary_records" ADD COLUMN "pay_period_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "employee_id" integer;--> statement-breakpoint
ALTER TABLE "cached_work_hours" ADD CONSTRAINT "cached_work_hours_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_logs" ADD CONSTRAINT "time_logs_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_hours" ADD CONSTRAINT "work_hours_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_records" ADD CONSTRAINT "salary_records_pay_period_id_pay_periods_id_fk" FOREIGN KEY ("pay_period_id") REFERENCES "public"."pay_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" DROP COLUMN "updated_at";