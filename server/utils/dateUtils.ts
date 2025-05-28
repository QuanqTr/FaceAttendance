// Utility functions for date handling

// Hàm điều chỉnh ngày theo múi giờ Việt Nam (UTC+7)
export function adjustDateToVietnamTimezone(date: Date): Date {
    // Tạo một bản sao của ngày để không thay đổi ngày gốc
    const adjustedDate = new Date(date);
    return adjustedDate;
}

// Hàm lấy chuỗi ngày theo định dạng YYYY-MM-DD
export function getDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Hàm log thông tin thời gian để debug
export function logTimeInfo(label: string, date: Date | null | undefined): void {
    if (!date) {
        console.log(`[DEBUG] ${label}: null`);
        return;
    }
    console.log(`[DEBUG] ${label}:`);
    console.log(`  - Original: ${date.toString()}`);
    console.log(`  - ISO: ${date.toISOString()}`);
    console.log(`  - Date string: ${getDateString(date)}`);
    console.log(`  - Locale string: ${date.toLocaleString('vi-VN')}`);
}

// Format hours from decimal to hours:minutes
export function formatHoursMinutes(decimalHours: number): string {
    if (isNaN(decimalHours) || decimalHours < 0) return "0:00";

    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);

    return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

// Format time to string
export function formatTimeToString(date: Date | null): string | null {
    if (!date) return null;
    return date.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Format time string
export function formatTimeString(timeDate: Date | null): string | null {
    if (!timeDate) return null;

    const hours = timeDate.getHours().toString().padStart(2, '0');
    const minutes = timeDate.getMinutes().toString().padStart(2, '0');

    return `${hours}:${minutes}`;
} 