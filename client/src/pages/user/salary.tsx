import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Loader2,
    CalendarIcon,
    Download,
    MoreHorizontal,
    FileText,
    Mail,
    Filter,
    Printer,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

export default function SalaryPage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
    const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());
    const [currentSalaryDetails, setCurrentSalaryDetails] = useState<any>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Get employee ID from the authenticated user
    const employeeId = user?.employeeId;

    // Query to get employee salary history
    const {
        data: salaryData,
        isLoading,
        error,
    } = useQuery({
        queryKey: ["/api/salary/employee", employeeId, selectedYear],
        queryFn: async () => {
            if (!employeeId) return [];

            const response = await fetch(
                `/api/salary/employee/${employeeId}?year=${selectedYear}`,
                {
                    credentials: "include",
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch salary data: ${response.statusText}`);
            }

            return await response.json();
        },
        enabled: !!employeeId,
    });

    // Calculate total earnings for the year
    const totalEarnings = salaryData?.reduce(
        (total: number, salary: any) => total + (salary.netAmount || 0),
        0
    ) || 0;

    // Get available years for filtering (last 5 years)
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

    // Get all months for filtering
    const months = [
        { value: "1", label: t("dates.january") },
        { value: "2", label: t("dates.february") },
        { value: "3", label: t("dates.march") },
        { value: "4", label: t("dates.april") },
        { value: "5", label: t("dates.may") },
        { value: "6", label: t("dates.june") },
        { value: "7", label: t("dates.july") },
        { value: "8", label: t("dates.august") },
        { value: "9", label: t("dates.september") },
        { value: "10", label: t("dates.october") },
        { value: "11", label: t("dates.november") },
        { value: "12", label: t("dates.december") },
    ];

    // View salary details
    const viewSalaryDetails = (salary: any) => {
        setCurrentSalaryDetails(salary);
        setIsDetailsOpen(true);
    };

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(amount);
    };

    // Filter salaries by selected month
    const filteredSalaries = salaryData?.filter((salary: any) => {
        const salaryDate = new Date(salary.paymentDate);
        return salaryDate.getMonth() + 1 === parseInt(selectedMonth);
    });

    // Mock function to print payslip
    const printPayslip = (id: number) => {
        console.log(`Printing payslip for salary ID: ${id}`);
        // In a real application, you'd implement actual printing here
        window.print();
    };

    // Mock function to download payslip
    const downloadPayslip = (id: number) => {
        console.log(`Downloading payslip for salary ID: ${id}`);
        // In a real application, you'd generate and download a PDF here
    };

    // Mock function to request payslip by email
    const requestPayslipByEmail = (id: number) => {
        console.log(`Requesting payslip by email for salary ID: ${id}`);
        // In a real application, you'd send an API request to email the payslip
    };

    if (isLoading) {
        return (
            <>
                <Header
                    title={t("user.salary.title")}
                    description={t("user.salary.description")}
                />
                <div className="p-4 md:p-6">
                    <Card>
                        <CardContent className="p-6">
                            <div className="space-y-6">
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </>
        );
    }

    if (error) {
        return (
            <>
                <Header
                    title={t("user.salary.title")}
                    description={t("user.salary.description")}
                />
                <div className="p-4 md:p-6">
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-center py-4 text-destructive">
                                {t("common.errorOccurred")}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </>
        );
    }

    return (
        <>
            <Header
                title={t("user.salary.title")}
                description={t("user.salary.description")}
            />

            <div className="p-4 md:p-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
                    {/* Annual Summary Card */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">
                                {t("user.salary.annualEarnings")}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(totalEarnings)}</div>
                            <p className="text-xs text-muted-foreground">
                                {t("user.salary.forYear")} {selectedYear}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Tax Card */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">
                                {t("user.salary.taxPaid")}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatCurrency(
                                    salaryData?.reduce(
                                        (total: number, salary: any) => total + (salary.taxAmount || 0),
                                        0
                                    ) || 0
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {t("user.salary.forYear")} {selectedYear}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Insurance Card */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">
                                {t("user.salary.insuranceContributions")}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatCurrency(
                                    salaryData?.reduce(
                                        (total: number, salary: any) =>
                                            total + (salary.healthInsurance || 0) + (salary.socialInsurance || 0),
                                        0
                                    ) || 0
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {t("user.salary.forYear")} {selectedYear}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Bonus Card */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">
                                {t("user.salary.bonuses")}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatCurrency(
                                    salaryData?.reduce(
                                        (total: number, salary: any) => total + (salary.bonus || 0),
                                        0
                                    ) || 0
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {t("user.salary.forYear")} {selectedYear}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    {/* Salary History */}
                    <Card className="md:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>{t("user.salary.salaryHistory")}</CardTitle>
                                <CardDescription>
                                    {t("user.salary.viewYourPayments")}
                                </CardDescription>
                            </div>
                            <div className="flex flex-row items-center gap-2">
                                <Select
                                    value={selectedYear}
                                    onValueChange={setSelectedYear}
                                >
                                    <SelectTrigger className="w-[100px]">
                                        <SelectValue placeholder={t("common.year")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {years.map((year) => (
                                            <SelectItem key={year} value={year}>
                                                {year}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={selectedMonth}
                                    onValueChange={setSelectedMonth}
                                >
                                    <SelectTrigger className="w-[130px]">
                                        <SelectValue placeholder={t("common.month")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {months.map((month) => (
                                            <SelectItem key={month.value} value={month.value}>
                                                {month.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {!salaryData || salaryData.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    {t("user.salary.noSalaryData")}
                                </div>
                            ) : !filteredSalaries || filteredSalaries.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    {t("user.salary.noSalaryForMonth")}
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t("salary.paymentDate")}</TableHead>
                                            <TableHead>{t("salary.grossAmount")}</TableHead>
                                            <TableHead>{t("salary.netAmount")}</TableHead>
                                            <TableHead>{t("common.actions")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredSalaries.map((salary: any) => (
                                            <TableRow key={salary.id}>
                                                <TableCell>
                                                    {format(new Date(salary.paymentDate), "dd/MM/yyyy")}
                                                </TableCell>
                                                <TableCell>{formatCurrency(salary.grossAmount)}</TableCell>
                                                <TableCell className="font-medium">
                                                    {formatCurrency(salary.netAmount)}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => viewSalaryDetails(salary)}
                                                        >
                                                            {t("common.view")}
                                                        </Button>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="sm">
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuLabel>{t("common.actions")}</DropdownMenuLabel>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem onClick={() => printPayslip(salary.id)}>
                                                                    <Printer className="h-4 w-4 mr-2" />
                                                                    {t("user.salary.print")}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => downloadPayslip(salary.id)}>
                                                                    <Download className="h-4 w-4 mr-2" />
                                                                    {t("user.salary.download")}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => requestPayslipByEmail(salary.id)}>
                                                                    <Mail className="h-4 w-4 mr-2" />
                                                                    {t("user.salary.emailMe")}
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    {/* Salary Breakdown */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("user.salary.breakdown")}</CardTitle>
                            <CardDescription>
                                {t("user.salary.salaryComposition")}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {!salaryData || salaryData.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    {t("user.salary.noSalaryData")}
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">
                                                {t("salary.basicSalary")}
                                            </span>
                                            <span className="text-sm text-muted-foreground">65%</span>
                                        </div>
                                        <Progress value={65} className="h-2" />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">
                                                {t("salary.allowances")}
                                            </span>
                                            <span className="text-sm text-muted-foreground">15%</span>
                                        </div>
                                        <Progress value={15} className="h-2" />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">
                                                {t("salary.overtimePay")}
                                            </span>
                                            <span className="text-sm text-muted-foreground">8%</span>
                                        </div>
                                        <Progress value={8} className="h-2" />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">
                                                {t("salary.bonuses")}
                                            </span>
                                            <span className="text-sm text-muted-foreground">12%</span>
                                        </div>
                                        <Progress value={12} className="h-2" />
                                    </div>

                                    <div className="pt-4 border-t">
                                        <p className="text-sm font-medium mb-1">{t("salary.deductions")}</p>
                                        <ul className="text-sm space-y-1">
                                            <li className="flex justify-between">
                                                <span className="text-muted-foreground">{t("salary.incomeTax")}:</span>
                                                <span>10%</span>
                                            </li>
                                            <li className="flex justify-between">
                                                <span className="text-muted-foreground">{t("salary.socialInsurance")}:</span>
                                                <span>8%</span>
                                            </li>
                                            <li className="flex justify-between">
                                                <span className="text-muted-foreground">{t("salary.healthInsurance")}:</span>
                                                <span>1.5%</span>
                                            </li>
                                            <li className="flex justify-between">
                                                <span className="text-muted-foreground">{t("salary.unemploymentInsurance")}:</span>
                                                <span>1%</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Salary Details Dialog */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>{t("user.salary.salaryDetails")}</DialogTitle>
                        <DialogDescription>
                            {currentSalaryDetails &&
                                format(new Date(currentSalaryDetails.paymentDate), "MMMM yyyy")}
                        </DialogDescription>
                    </DialogHeader>

                    {currentSalaryDetails && (
                        <div className="space-y-4">
                            <Tabs defaultValue="earnings">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="earnings">{t("user.salary.earnings")}</TabsTrigger>
                                    <TabsTrigger value="deductions">{t("user.salary.deductions")}</TabsTrigger>
                                </TabsList>

                                <TabsContent value="earnings" className="space-y-4 pt-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-muted-foreground">{t("salary.basicSalary")}</p>
                                            <p className="text-lg font-semibold">{formatCurrency(currentSalaryDetails.basicSalary)}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">{t("salary.allowances")}</p>
                                            <p className="text-lg font-semibold">{formatCurrency(currentSalaryDetails.allowances || 0)}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">{t("salary.overtimePay")}</p>
                                            <p className="text-lg font-semibold">{formatCurrency(currentSalaryDetails.overtimePay || 0)}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">{t("salary.bonus")}</p>
                                            <p className="text-lg font-semibold">{formatCurrency(currentSalaryDetails.bonus || 0)}</p>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t">
                                        <div className="flex justify-between items-center">
                                            <p className="font-semibold">{t("salary.grossAmount")}</p>
                                            <p className="font-semibold">{formatCurrency(currentSalaryDetails.grossAmount)}</p>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="deductions" className="space-y-4 pt-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-muted-foreground">{t("salary.incomeTax")}</p>
                                            <p className="text-lg font-semibold">{formatCurrency(currentSalaryDetails.taxAmount || 0)}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">{t("salary.socialInsurance")}</p>
                                            <p className="text-lg font-semibold">{formatCurrency(currentSalaryDetails.socialInsurance || 0)}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">{t("salary.healthInsurance")}</p>
                                            <p className="text-lg font-semibold">{formatCurrency(currentSalaryDetails.healthInsurance || 0)}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">{t("salary.otherDeductions")}</p>
                                            <p className="text-lg font-semibold">{formatCurrency(currentSalaryDetails.otherDeductions || 0)}</p>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t">
                                        <div className="flex justify-between items-center">
                                            <p className="font-semibold">{t("salary.totalDeductions")}</p>
                                            <p className="font-semibold">
                                                {formatCurrency(
                                                    (currentSalaryDetails.taxAmount || 0) +
                                                    (currentSalaryDetails.socialInsurance || 0) +
                                                    (currentSalaryDetails.healthInsurance || 0) +
                                                    (currentSalaryDetails.otherDeductions || 0)
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>

                            <div className="pt-4 border-t">
                                <div className="flex justify-between items-center">
                                    <p className="text-xl font-bold">{t("salary.netAmount")}</p>
                                    <p className="text-xl font-bold">{formatCurrency(currentSalaryDetails.netAmount)}</p>
                                </div>
                                <p className="text-sm text-muted-foreground mt-2">
                                    {t("user.salary.paidOn")} {format(new Date(currentSalaryDetails.paymentDate), "dd MMMM yyyy")}
                                </p>
                            </div>

                            <div className="flex justify-end space-x-2 pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => printPayslip(currentSalaryDetails.id)}
                                >
                                    <Printer className="h-4 w-4 mr-2" />
                                    {t("user.salary.print")}
                                </Button>
                                <Button
                                    onClick={() => downloadPayslip(currentSalaryDetails.id)}
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    {t("user.salary.download")}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
} 