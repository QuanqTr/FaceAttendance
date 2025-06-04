// Admin Settings Data Storage
// This file stores all admin settings data

export interface CompanySettings {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  taxCode: string;
  website: string;
}

export interface SystemSettings {
  workingHours: {
    start: string;
    end: string;
  };
  lateThreshold: string;
  attendanceReminders: boolean;
  exportFormat: string;
  backupFrequency: string;
  maintenanceMode: boolean;
}

export interface NotificationSettings {
  systemAlerts: boolean;
  userRegistrations: boolean;
  attendanceReports: boolean;
  systemUpdates: boolean;
  securityAlerts: boolean;
  backupNotifications: boolean;
}

// Default company settings
export let companySettings: CompanySettings = {
  companyName: "Công ty TNHH ABC",
  companyAddress: "123 Đường ABC, Quận 1, TP.HCM",
  companyPhone: "0123456789",
  companyEmail: "info@company.com",
  taxCode: "0123456789",
  website: "https://company.com"
};

// Default system settings
export let systemSettings: SystemSettings = {
  workingHours: {
    start: "08:00",
    end: "17:00"
  },
  lateThreshold: "20",
  attendanceReminders: true,
  exportFormat: "csv",
  backupFrequency: "daily",
  maintenanceMode: false
};

// Default notification settings
export let notificationSettings: NotificationSettings = {
  systemAlerts: true,
  userRegistrations: true,
  attendanceReports: true,
  systemUpdates: false,
  securityAlerts: true,
  backupNotifications: true
};

// Functions to update settings
export function updateCompanySettings(newSettings: CompanySettings) {
  companySettings = { ...companySettings, ...newSettings };
  return companySettings;
}

export function updateSystemSettings(newSettings: SystemSettings) {
  systemSettings = { ...systemSettings, ...newSettings };
  return systemSettings;
}

export function updateNotificationSettings(newSettings: NotificationSettings) {
  notificationSettings = { ...notificationSettings, ...newSettings };
  return notificationSettings;
}

// Getter functions
export function getCompanySettings(): CompanySettings {
  return companySettings;
}

export function getSystemSettings(): SystemSettings {
  return systemSettings;
}

export function getNotificationSettings(): NotificationSettings {
  return notificationSettings;
}
