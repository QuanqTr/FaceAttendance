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

export default function SalaryPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState("");
  
  // Create year options from 5 years ago to 5 years in the future
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => (currentYear - 5 + i).toString());
  
  // Month options
  const monthOptions = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  // Get salary records
  const { data: salaryRecords, isLoading } = useQuery<SalaryRecord[]>({
    queryKey: [
      "/api/salary-records", 
      { year: selectedYear !== "" ? parseInt(selectedYear) : undefined },
      { month: selectedMonth !== "" ? parseInt(selectedMonth) : undefined }
    ],
    queryFn: async () => {
      const url = new URL("/api/salary-records", window.location.origin);
      if (selectedYear) {
        url.searchParams.append("year", selectedYear);
      }
      if (selectedMonth) {
        url.searchParams.append("month", selectedMonth);
      }
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch salary records");
      return res.json();
    }
  });

  // Salary statistics
  const { data: salaryStats, isLoading: statsLoading } = useQuery({
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
      <Header title="Salary Management" />

      <div className="p-4 space-y-4 flex-1 overflow-auto">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">Salary Records</h1>
          <Link href="/salary/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Salary Record
            </Button>
          </Link>
        </div>

        {/* Filter Section */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Year</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map(year => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Month</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Months" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Months</SelectItem>
                    {monthOptions.map(month => (
                      <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" className="gap-2" onClick={() => {
                setSelectedMonth("");
              }}>
                <Filter className="h-4 w-4" />
                Reset Filters
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
                      <p className="text-sm text-muted-foreground">Total Salary Expense ({selectedYear})</p>
                      <h3 className="text-2xl font-bold">
                        {formatCurrency(salaryStats?.reduce((sum, month) => sum + month.totalSalary, 0) || 0)}
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
                      <p className="text-sm text-muted-foreground">Average Monthly Salary ({selectedYear})</p>
                      <h3 className="text-2xl font-bold">
                        {formatCurrency(
                          salaryStats && salaryStats.length > 0 
                            ? salaryStats.reduce((sum, month) => sum + month.totalSalary, 0) / salaryStats.filter(m => m.totalSalary > 0).length 
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
                      <p className="text-sm text-muted-foreground">Paid Employees ({selectedYear})</p>
                      <h3 className="text-2xl font-bold">
                        {salaryStats?.reduce((max, month) => Math.max(max, month.totalEmployees), 0) || 0}
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
                    <h3 className="text-lg font-medium">No salary records found</h3>
                    <p className="text-muted-foreground">
                      {selectedMonth 
                        ? `There are no salary records for ${monthOptions.find(m => m.value === selectedMonth)?.label} ${selectedYear}.`
                        : `There are no salary records for ${selectedYear}.`}
                    </p>
                    <Link href="/salary/new">
                      <Button variant="outline" className="mt-4">
                        Create New Salary Record
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
                            <h3 className="font-medium">Salary Record #{record.id}</h3>
                            <Badge variant="outline" className={record.paymentStatus ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}>
                              {record.paymentStatus ? "Paid" : "Unpaid"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            <strong>Period:</strong> {monthOptions.find(m => m.value === record.month.toString())?.label} {record.year}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <strong>Basic Salary:</strong> {formatCurrency(record.basicSalary)} | 
                            <strong> Bonus:</strong> {formatCurrency(record.bonus)} | 
                            <strong> Deduction:</strong> {formatCurrency(record.deduction)}
                          </p>
                          <p className="text-sm font-medium">
                            <strong>Total Salary:</strong> {formatCurrency(record.totalSalary)}
                          </p>
                        </div>
                        <Link href={`/salary/${record.id}`}>
                          <Button variant="outline" size="sm">View Details</Button>
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