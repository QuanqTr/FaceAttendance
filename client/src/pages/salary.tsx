import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";
import { DollarSign, FileText, Plus, Loader2, Calendar, Filter } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SalaryRecord } from "@shared/schema";
import { useTranslation } from "react-i18next";
import { useI18nToast } from "@/hooks/use-i18n-toast";

// Define an extended type for SalaryRecords with the fields we're using in the UI
interface ExtendedSalaryRecord extends SalaryRecord {
  employeeName?: string;
  netSalary?: number;
}

// Define a type for salary statistics
interface SalaryStatistic {
  month: number;
  totalSalary: number;
  totalEmployees: number;
}

export default function SalaryPage() {
  const { t } = useTranslation();
  const toast = useI18nToast();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState("all");

  // Create year options from 5 years ago to 5 years in the future
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => (currentYear - 5 + i).toString());

  // Month options
  const monthOptions = [
    { value: "1", label: t('months.january') },
    { value: "2", label: t('months.february') },
    { value: "3", label: t('months.march') },
    { value: "4", label: t('months.april') },
    { value: "5", label: t('months.may') },
    { value: "6", label: t('months.june') },
    { value: "7", label: t('months.july') },
    { value: "8", label: t('months.august') },
    { value: "9", label: t('months.september') },
    { value: "10", label: t('months.october') },
    { value: "11", label: t('months.november') },
    { value: "12", label: t('months.december') },
  ];

  // Get salary records
  const { data: salaryRecords, isLoading } = useQuery<ExtendedSalaryRecord[]>({
    queryKey: [
      "/api/salary-records",
      { year: selectedYear !== "" ? parseInt(selectedYear) : undefined },
      { month: selectedMonth !== "all" ? parseInt(selectedMonth) : undefined }
    ],
    queryFn: async () => {
      const url = new URL("/api/salary-records", window.location.origin);
      if (selectedYear) {
        url.searchParams.append("year", selectedYear);
      }
      if (selectedMonth && selectedMonth !== "all") {
        url.searchParams.append("month", selectedMonth);
      }
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch salary records");
      return res.json();
    }
  });

  // Salary statistics
  const { data: salaryStats, isLoading: statsLoading } = useQuery<SalaryStatistic[]>({
    queryKey: ["/api/stats/salary", selectedYear],
    queryFn: async () => {
      const res = await fetch(`/api/stats/salary/${selectedYear}`);
      if (!res.ok) throw new Error("Failed to fetch salary statistics");
      return res.json();
    },
    enabled: !!selectedYear
  });

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="flex flex-col h-full">
      <Header title={t('salary.title')} />

      <div className="p-4 space-y-4 flex-1 overflow-auto">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">{t('salary.salaryRecords')}</h1>
          <Link href="/salary/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t('salary.newSalaryRecord')}
            </Button>
          </Link>
        </div>

        {/* Filter Section */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">{t('common.year')}</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('salary.selectYear')} />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map(year => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">{t('common.month')}</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('salary.allMonths')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('salary.allMonths')}</SelectItem>
                    {monthOptions.map(month => (
                      <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" className="gap-2" onClick={() => {
                setSelectedMonth("all");
              }}>
                <Filter className="h-4 w-4" />
                {t('common.resetFilters')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statsLoading ? (
            Array(3).fill(0).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-8 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('salary.totalSalaryExpense')} ({selectedYear})</p>
                      <h3 className="text-2xl font-bold">
                        {formatCurrency(salaryStats?.reduce((sum: number, month: SalaryStatistic) => sum + month.totalSalary, 0) || 0)}
                      </h3>
                    </div>
                    <div className="p-2 bg-primary/10 rounded-full">
                      <DollarSign className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('salary.averageMonthlySalary')} ({selectedYear})</p>
                      <h3 className="text-2xl font-bold">
                        {formatCurrency(
                          salaryStats && salaryStats.length > 0
                            ? salaryStats.reduce((sum: number, month: SalaryStatistic) => sum + month.totalSalary, 0) / salaryStats.filter((m: SalaryStatistic) => m.totalSalary > 0).length
                            : 0
                        )}
                      </h3>
                    </div>
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('salary.paidEmployees')} ({selectedYear})</p>
                      <h3 className="text-2xl font-bold">
                        {salaryStats?.reduce((max: number, month: SalaryStatistic) => Math.max(max, month.totalEmployees), 0) || 0}
                      </h3>
                    </div>
                    <div className="p-2 bg-primary/10 rounded-full">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Salary Records List */}
        <div className="mt-4">
          {isLoading ? (
            // Skeleton loading state
            <div className="space-y-4">
              {Array(5).fill(0).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-60" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <Skeleton className="h-8 w-24" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {!salaryRecords || salaryRecords.length === 0 ? (
                <Card>
                  <CardContent className="p-6 flex flex-col items-center justify-center py-10">
                    <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">{t('salary.noRecordsFound')}</h3>
                    <p className="text-muted-foreground">
                      {selectedMonth !== "all"
                        ? t('salary.noRecordsForMonthYear', {
                          month: monthOptions.find(m => m.value === selectedMonth)?.label,
                          year: selectedYear
                        })
                        : t('salary.noRecordsForYear', { year: selectedYear })}
                    </p>
                    <Link href="/salary/new">
                      <Button variant="outline" className="mt-4">
                        {t('salary.createNewRecord')}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                salaryRecords.map((record) => (
                  <Card key={record.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{t('salary.salaryRecordId', { id: record.id })}</h3>
                            <Badge variant="outline" className={record.paymentStatus ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}>
                              {record.paymentStatus ? t('salary.paid') : t('salary.unpaid')}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {t('employees.name')}: {record.employeeName || 'N/A'} • {t('salary.paymentDate')}: {record.paymentDate ? format(new Date(record.paymentDate), 'PP') : 'N/A'}
                          </p>
                          <p className="text-lg font-semibold">
                            {t('salary.netSalary')}: {formatCurrency(record.netSalary || parseFloat(record.totalSalary) || 0)}
                          </p>
                        </div>
                        <Link href={`/salary/${record.id}`}>
                          <Button variant="outline" size="sm">
                            {t('common.view')}
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}