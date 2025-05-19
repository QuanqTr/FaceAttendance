import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay, getDay } from "date-fns";
import React from "react";

export function MonthlyAttendanceCalendar({
    monthData,
    currentMonth,
    onMonthChange,
    onDateClick,
    t
}: any) {
    // Calendar: get status for a date
    const getAttendanceStatusForDate = (date: Date) => {
        const rec = monthData.find((item: any) => isSameDay(new Date(item.date), date));
        return rec ? rec.status : null;
    };
    // Calendar color mapping (đậm hơn)
    const getCalendarCellClass = (status: string | null) => {
        switch (status) {
            case 'normal':
                return 'bg-green-300 hover:bg-green-400 border-green-600';
            case 'absent':
                return 'bg-red-300 hover:bg-red-400 border-red-600';
            case 'late':
                return 'bg-yellow-300 hover:bg-yellow-400 border-yellow-600';
            case 'leave':
                return 'bg-blue-300 hover:bg-blue-400 border-blue-600';
            default:
                return 'bg-gray-100 hover:bg-gray-200';
        }
    };

    // Generate calendar days for the month
    const calendarDays = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth)
    });

    // Custom weekend detection that treats T3 and T4 as weekend days
    // This effectively shifts the weekend pattern by 4 days
    const isCustomWeekend = (date: Date) => {
        // Getting raw day of week (0 = Sunday, 6 = Saturday)
        const realDayOfWeek = getDay(date);

        // Shift by 4 days and wrap around within 0-6 range
        const shiftedDay = (realDayOfWeek + 3) % 7;

        // Consider days 6 and 0 (Saturday and Sunday) as weekends after shifting
        return shiftedDay === 6 || shiftedDay === 0;
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>{t("user.attendanceHistory.monthlyAttendance")}</CardTitle>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <CardDescription>
                    {format(currentMonth, "MMMM yyyy")}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium mb-2">
                    {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((day) => (
                        <div key={day} className="py-1">
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, i) => {
                        const status = getAttendanceStatusForDate(day);
                        const isCurrentDay = isToday(day);
                        const isCurrentMonth = day.getMonth() === currentMonth.getMonth();

                        // Check if this is a weekend day without status
                        const isWeekendWithoutStatus = isCustomWeekend(day) && !status;

                        // Determine background color class
                        let bgClass = getCalendarCellClass(status);

                        // Override background for weekend without status
                        if (isWeekendWithoutStatus) {
                            bgClass = 'bg-gray-300 hover:bg-gray-400';
                        }

                        return (
                            <button
                                key={i}
                                className={`aspect-square p-1 text-sm relative ${isCurrentMonth ? '' : 'opacity-50'} ${isCurrentDay ? 'ring-2 ring-primary' : ''} ${bgClass} rounded-md transition-colors`}
                                onClick={() => onDateClick(day)}
                            >
                                {format(day, "d")}
                            </button>
                        );
                    })}
                </div>
                <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-50 border border-green-200"></div>
                        <span className="text-sm">{t("attendance.present")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-50 border border-red-200"></div>
                        <span className="text-sm">{t("attendance.absent")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-50 border border-yellow-200"></div>
                        <span className="text-sm">{t("attendance.late")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-50 border border-blue-200"></div>
                        <span className="text-sm">{t("attendance.leave")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gray-200 rounded-sm"></div>
                        <span className="text-sm">{t("attendance.weekend")}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
} 