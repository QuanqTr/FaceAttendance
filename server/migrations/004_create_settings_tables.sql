-- Create company_settings table
CREATE TABLE IF NOT EXISTS company_settings (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    company_address TEXT NOT NULL,
    company_phone VARCHAR(20) NOT NULL,
    company_email VARCHAR(255) NOT NULL,
    tax_code VARCHAR(50) NOT NULL,
    website VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    working_hours_start TIME NOT NULL DEFAULT '08:00:00',
    working_hours_end TIME NOT NULL DEFAULT '17:00:00',
    late_threshold INTEGER NOT NULL DEFAULT 20,
    attendance_reminders BOOLEAN NOT NULL DEFAULT true,
    export_format VARCHAR(10) NOT NULL DEFAULT 'csv',
    backup_frequency VARCHAR(20) NOT NULL DEFAULT 'daily',
    maintenance_mode BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create notification_settings table
CREATE TABLE IF NOT EXISTS notification_settings (
    id SERIAL PRIMARY KEY,
    system_alerts BOOLEAN NOT NULL DEFAULT true,
    user_registrations BOOLEAN NOT NULL DEFAULT true,
    attendance_reports BOOLEAN NOT NULL DEFAULT true,
    system_updates BOOLEAN NOT NULL DEFAULT false,
    security_alerts BOOLEAN NOT NULL DEFAULT true,
    backup_notifications BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default company settings if not exists
INSERT INTO company_settings (
    company_name, company_address, company_phone, 
    company_email, tax_code, website
) 
SELECT 
    'Công ty TNHH ABC',
    '123 Đường ABC, Quận 1, TP.HCM',
    '0123456789',
    'info@company.com',
    '0123456789',
    'https://company.com'
WHERE NOT EXISTS (SELECT 1 FROM company_settings);

-- Insert default system settings if not exists
INSERT INTO system_settings (
    working_hours_start, working_hours_end, late_threshold,
    attendance_reminders, export_format, backup_frequency, maintenance_mode
)
SELECT 
    '08:00:00', '17:00:00', 20,
    true, 'csv', 'daily', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings);

-- Insert default notification settings if not exists
INSERT INTO notification_settings (
    system_alerts, user_registrations, attendance_reports,
    system_updates, security_alerts, backup_notifications
)
SELECT 
    true, true, true,
    false, true, true
WHERE NOT EXISTS (SELECT 1 FROM notification_settings);
