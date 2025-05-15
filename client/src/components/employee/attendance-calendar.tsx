import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { format, isSameDay, parseISO, getDate, getMonth, getYear } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";

type AttendanceCalendarProps = {
    employeeId: number;
    initialDate?: Date;
    attendanceRecords: any[];
};

const AttendanceCalendar = ({ employeeId, initialDate = new Date(), attendanceRecords }: AttendanceCalendarProps) => {
    const { t } = useTranslation();
    const [date, setDate] = useState<Date>(initialDate);
    const [workDays, setWorkDays] = useState<Date[]>([]);

    useEffect(() => {
        // Nếu không có bản ghi điểm danh, không có ngày làm việc
        if (!attendanceRecords || attendanceRecords.length === 0) {
            console.log("Không có bản ghi điểm danh");
            setWorkDays([]);
            return;
        }

        console.log(`Xử lý ${attendanceRecords.length} bản ghi điểm danh cho lịch`);

        // Lưu trữ các ngày làm việc duy nhất bằng Set
        const uniqueDatesMap = new Map<string, Date>();

        // Duyệt qua tất cả các bản ghi điểm danh
        attendanceRecords.forEach((record, index) => {
            // Ghi log chi tiết cho một số bản ghi đầu tiên để debug
            if (index < 5) {
                console.log(`Record #${index}:`, JSON.stringify(record, null, 2));
            }

            try {
                // Xác định ngày từ bản ghi (ưu tiên trường date nếu có)
                let recordDateObj: Date | null = null;

                if (record.date) {
                    // Nếu là chuỗi, parse thành Date object
                    if (typeof record.date === 'string') {
                        recordDateObj = new Date(record.date);
                    } else {
                        recordDateObj = record.date;
                    }
                } else if (record.time) {
                    // Nếu không có date, sử dụng time
                    if (typeof record.time === 'string') {
                        recordDateObj = new Date(record.time);
                    } else {
                        recordDateObj = record.time;
                    }
                }

                if (recordDateObj && !isNaN(recordDateObj.getTime())) {
                    // Tạo key là yyyy-MM-dd cho Map
                    const dateKey = format(recordDateObj, 'yyyy-MM-dd');

                    // Kiểm tra và lưu vào Map
                    if (!uniqueDatesMap.has(dateKey)) {
                        // Tạo đối tượng Date mới để chỉ lưu ngày, tháng, năm (không lưu giờ, phút, giây)
                        const normalizedDate = new Date(
                            getYear(recordDateObj),
                            getMonth(recordDateObj),
                            getDate(recordDateObj)
                        );
                        uniqueDatesMap.set(dateKey, normalizedDate);
                        console.log(`Đã thêm ngày làm việc ${dateKey} vào map`);
                    }
                } else {
                    console.warn("Không thể xác định ngày từ bản ghi:", record);
                }
            } catch (error) {
                console.error("Lỗi khi xử lý bản ghi:", error, record);
            }
        });

        // Chuyển Map thành mảng các ngày làm việc
        const workingDates = Array.from(uniqueDatesMap.values());

        console.log(`Đã xác định được ${workingDates.length} ngày làm việc duy nhất:`,
            workingDates.map(date => format(date, 'yyyy-MM-dd')));

        setWorkDays(workingDates);
    }, [attendanceRecords]);

    const handlePreviousMonth = () => {
        setDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1));
    };

    // Kiểm tra một ngày có phải là ngày làm việc không
    const isWorkDay = (day: Date) => {
        try {
            // Sử dụng hàm isSameDay từ date-fns để so sánh ngày
            const result = workDays.some(workDay => {
                try {
                    // Kiểm tra tính hợp lệ của ngày làm việc
                    if (!workDay || isNaN(workDay.getTime())) {
                        console.warn("Invalid work day:", workDay);
                        return false;
                    }

                    const isSame = isSameDay(day, workDay);

                    // In ra log cho ngày cần kiểm tra đặc biệt
                    if (day.getDate() === 14 && day.getMonth() === 4) { // Ngày 14/5
                        console.log(`Kiểm tra ngày 14/5:`,
                            format(day, 'yyyy-MM-dd'),
                            "với ngày làm việc:",
                            format(workDay, 'yyyy-MM-dd'),
                            "kết quả:", isSame
                        );
                    }
                    return isSame;
                } catch (err) {
                    console.error("Error comparing dates:", err);
                    return false;
                }
            });
            return result;
        } catch (error) {
            console.error("Error checking work day:", error);
            return false;
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle>{t('attendance.monthlyAttendance')}</CardTitle>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousMonth}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-sm font-medium">
                        {format(date, "MMMM yyyy")}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextMonth}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex justify-center">
                    <Calendar
                        mode="single"
                        month={date}
                        selected={undefined}
                        onSelect={() => { }}
                        className="rounded-md border"
                        modifiers={{
                            workDay: workDays
                        }}
                        modifiersStyles={{
                            workDay: {
                                backgroundColor: "hsl(var(--success) / 20%)",
                                color: "hsl(var(--success))",
                                fontWeight: "bold"
                            }
                        }}
                    />
                </div>

                <div className="flex justify-between items-center mt-4 text-sm">
                    <div className="flex items-center">
                        <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-800/20 mr-2"></div>
                        <span>{t('attendance.presentDay')}</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-4 h-4 rounded bg-background border mr-2"></div>
                        <span>{t('attendance.nonWorkDay')}</span>
                    </div>
                </div>

                <div className="flex items-center justify-center mt-4 p-2 text-sm bg-blue-100 dark:bg-blue-900/20 rounded-md">
                    <Info className="h-4 w-4 mr-2 text-blue-700 dark:text-blue-300" />
                    <p className="text-blue-700 dark:text-blue-300">
                        {t('attendance.calendayHint', 'Những ngày có màu xanh lá là những ngày có ghi nhận điểm danh')}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};

export default AttendanceCalendar; 