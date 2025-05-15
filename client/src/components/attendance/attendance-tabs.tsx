import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";

interface AttendanceTabsProps {
    activeTab: string;
    onTabChange: (value: string) => void;
}

export function AttendanceTabs({ activeTab, onTabChange }: AttendanceTabsProps) {
    const { t } = useTranslation();

    return (
        <div className="border-b mb-6">
            <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
                <TabsList className="w-full bg-transparent p-0 h-auto mb-0 justify-start">
                    <TabsTrigger
                        value="record"
                        className="px-6 py-3 data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none text-base"
                    >
                        {t('attendance.recordAttendance')}
                    </TabsTrigger>
                    <TabsTrigger
                        value="workhours"
                        className="px-6 py-3 data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none text-base"
                    >
                        {t('attendance.dailyAttendance')}
                    </TabsTrigger>
                </TabsList>
            </Tabs>
        </div>
    );
} 