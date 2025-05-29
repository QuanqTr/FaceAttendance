import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, ClockIcon } from "lucide-react";

export default function ManagerWorkHours() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [, navigate] = useLocation();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    if (!user || user.role !== "manager") {
        navigate("/");
        return null;
    }

    // Fetch daily work hours
    const { data: workHoursData, isLoading } = useQuery({
        queryKey: ["/api/work-hours/daily", selectedDate],
        queryFn: async () => {
            const res = await fetch(`/api/work-hours/daily?date=${selectedDate}`);
            if (!res.ok) throw new Error("Failed to fetch work hours");
            return await res.json();
        }
    });

    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            <Header title="Work Hours Management" />

            <main className="flex-1 overflow-y-auto p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Date Selector */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CalendarIcon className="h-5 w-5" />
                                Work Hours Overview
                            </CardTitle>
                            <CardDescription>
                                View and manage employee work hours for the selected date
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <label htmlFor="date" className="text-sm font-medium">
                                        Date:
                                    </label>
                                    <Input
                                        id="date"
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="w-auto"
                                    />
                                </div>
                                <Button variant="outline" size="sm">
                                    Export
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Work Hours Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ClockIcon className="h-5 w-5" />
                                Employee Work Hours - {selectedDate}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex items-center justify-center p-8">
                                    <div className="text-muted-foreground">Loading work hours...</div>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Employee</TableHead>
                                            <TableHead>Check-in</TableHead>
                                            <TableHead>Check-out</TableHead>
                                            <TableHead>Regular Hours</TableHead>
                                            <TableHead>Overtime Hours</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {workHoursData && workHoursData.length > 0 ? (
                                            workHoursData.map((employee: any) => (
                                                <TableRow key={employee.employeeId}>
                                                    <TableCell className="font-medium">
                                                        {employee.employeeName}
                                                    </TableCell>
                                                    <TableCell>
                                                        {employee.checkinTime ?
                                                            new Date(employee.checkinTime).toLocaleTimeString('en-US', {
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            }) :
                                                            '-'
                                                        }
                                                    </TableCell>
                                                    <TableCell>
                                                        {employee.checkoutTime ?
                                                            new Date(employee.checkoutTime).toLocaleTimeString('en-US', {
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            }) :
                                                            '-'
                                                        }
                                                    </TableCell>
                                                    <TableCell>
                                                        {Number(employee.regularHours || 0).toFixed(2)}h
                                                    </TableCell>
                                                    <TableCell>
                                                        {Number(employee.overtimeHours || 0).toFixed(2)}h
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${employee.status === 'present' ? 'bg-green-100 text-green-800' :
                                                            employee.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                                                employee.status === 'absent' ? 'bg-red-100 text-red-800' :
                                                                    'bg-gray-100 text-gray-800'
                                                            }`}>
                                                            {employee.status || 'Unknown'}
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                                    No work hours data found for this date
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    {/* Summary Statistics */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Total Employees
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {workHoursData?.length || 0}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Present Today
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {workHoursData?.filter((emp: any) => emp.status === 'present' || emp.regularHours > 0).length || 0}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Total Hours Worked
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {workHoursData?.reduce((sum: number, emp: any) => sum + Number(emp.regularHours || 0) + Number(emp.overtimeHours || 0), 0).toFixed(1) || 0}h
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
} 