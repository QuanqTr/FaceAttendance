/**
 * Timezone utility functions for Vietnam timezone (UTC+7)
 */

/**
 * Get current time in Vietnam timezone
 * @returns Date object adjusted to Vietnam timezone
 */
export function getVietnamTime(): Date {
    const now = new Date();
    // Add 7 hours to convert UTC to Vietnam timezone (UTC+7)
    now.setHours(now.getHours() + 7);
    return now;
}

/**
 * Convert any date to Vietnam timezone
 * @param date - Date to convert (optional, defaults to current time)
 * @returns Date object adjusted to Vietnam timezone
 */
export function toVietnamTime(date?: Date): Date {
    const targetDate = date || new Date();
    const vietnamTime = new Date(targetDate);
    vietnamTime.setHours(vietnamTime.getHours() + 7);
    return vietnamTime;
}

/**
 * Format date to Vietnam timezone string
 * @param date - Date to format (optional, defaults to current time)
 * @returns Formatted date string in Vietnam timezone
 */
export function formatVietnamTime(date?: Date): string {
    const vietnamTime = toVietnamTime(date);
    return vietnamTime.toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

/**
 * Get start of day in Vietnam timezone
 * @param date - Date to get start of day for (optional, defaults to current time)
 * @returns Date object representing start of day in Vietnam timezone
 */
export function getVietnamStartOfDay(date?: Date): Date {
    const vietnamTime = toVietnamTime(date);
    vietnamTime.setHours(0, 0, 0, 0);
    return vietnamTime;
}

/**
 * Get end of day in Vietnam timezone
 * @param date - Date to get end of day for (optional, defaults to current time)
 * @returns Date object representing end of day in Vietnam timezone
 */
export function getVietnamEndOfDay(date?: Date): Date {
    const vietnamTime = toVietnamTime(date);
    vietnamTime.setHours(23, 59, 59, 999);
    return vietnamTime;
}
