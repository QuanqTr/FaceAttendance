import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Plus, Calendar, FileCheck, FileX, FileQuestion } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { format } from "date-fns";
import { LeaveRequest } from "@shared/schema";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function LeaveRequestsPage() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: allDepartments = [] } = useQuery({
    queryKey: ["/api/departments"],
    queryFn: async () => {
      const res = await fetch("/api/departments");
      if (!res.ok) return [];
      return res.json();
    }
  });

  const { data: leaveRequests, isLoading, refetch } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests", { activeTab, page, pageSize, departmentFilter, typeFilter, statusFilter }],
    queryFn: async () => {
      const url = new URL("/api/leave-requests", window.location.origin);
      if (activeTab !== "all") url.searchParams.append("status", activeTab);
      if (departmentFilter !== "all") url.searchParams.append("departmentId", departmentFilter);
      if (typeFilter !== "all") url.searchParams.append("type", typeFilter);
      if (statusFilter !== "all") url.searchParams.append("status", statusFilter);
      url.searchParams.append("page", String(page));
      url.searchParams.append("limit", String(pageSize));
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch leave requests");
      return res.json();
    }
  });

  const { data: totalCount = 0 } = useQuery({
    queryKey: ["/api/leave-requests/count", { activeTab, departmentFilter, typeFilter, statusFilter }],
    queryFn: async () => {
      const url = new URL("/api/leave-requests/count", window.location.origin);
      if (activeTab !== "all") url.searchParams.append("status", activeTab);
      if (departmentFilter !== "all") url.searchParams.append("departmentId", departmentFilter);
      if (typeFilter !== "all") url.searchParams.append("type", typeFilter);
      if (statusFilter !== "all") url.searchParams.append("status", statusFilter);
      const res = await fetch(url.toString());
      if (!res.ok) return 0;
      const data = await res.json();
      return data.count || 0;
    }
  });

  // Lấy danh sách employeeIds duy nhất từ leaveRequests
  const employeeIds = leaveRequests ? Array.from(new Set(leaveRequests.map(r => r.employeeId).filter(Boolean))) : [];

  // Lấy thông tin nhân viên cho tất cả employeeIds
  const { data: employeesData = {}, isLoading: employeesLoading } = useQuery({
    queryKey: ["/api/employees/bulk", employeeIds],
    queryFn: async () => {
      const result: Record<number, any> = {};
      for (const id of employeeIds) {
        const res = await fetch(`/api/employees/${id}`);
        if (res.ok) {
          const emp = await res.json();
          result[id] = emp;
        }
      }
      return result;
    },
    enabled: employeeIds.length > 0
  });

  // Lấy thông tin phòng ban cho tất cả departmentId xuất hiện trong employeesData
  const departmentIds = employeesData ? Array.from(new Set(Object.values(employeesData).map((e: any) => e?.departmentId).filter(Boolean))) : [];
  const { data: departmentsData = {}, isLoading: departmentsLoading } = useQuery({
    queryKey: ["/api/departments/bulk", departmentIds],
    queryFn: async () => {
      const result: Record<number, any> = {};
      for (const id of departmentIds) {
        const res = await fetch(`/api/departments/${id}`);
        if (res.ok) {
          const dept = await res.json();
          result[id] = dept;
        }
      }
      return result;
    },
    enabled: departmentIds.length > 0
  });

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">{t('leaveRequests.pending')}</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-100 text-green-800">{t('leaveRequests.approved')}</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-100 text-red-800">{t('leaveRequests.rejected')}</Badge>;
      default:
        return <Badge variant="outline">{t('common.status')}</Badge>;
    }
  };

  // Lọc lại leaveRequests theo departmentId của employee ở client
  const filteredLeaveRequests = leaveRequests ? leaveRequests.filter(request => {
    // Nếu không filter theo phòng ban, giữ nguyên
    if (departmentFilter === "all" && typeFilter === "all" && statusFilter === "all") return true;

    // Lọc theo phòng ban
    if (departmentFilter !== "all") {
      const employee = employeesData[request.employeeId];
      if (!employee || String(employee.departmentId) !== departmentFilter) return false;
    }

    // Lọc theo loại nghỉ phép
    if (typeFilter !== "all" && request.type !== typeFilter) return false;

    // Lọc theo trạng thái
    if (statusFilter !== "all" && request.status !== statusFilter) return false;

    return true;
  }) : [];

  const renderLeaveTypeIcon = (type: string) => {
    switch (type) {
      case "sick":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">{t('leaveRequests.sick')}</Badge>;
      case "vacation":
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800">{t('leaveRequests.vacation')}</Badge>;
      case "personal":
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">{t('leaveRequests.personal')}</Badge>;
      default:
        return <Badge variant="secondary" className="bg-gray-100">{t('leaveRequests.other')}</Badge>;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title={t('leaveRequests.title')} />

      <div className="p-4 space-y-4 flex-1 overflow-auto">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">{t('leaveRequests.title')}</h1>
          <Link href="/leave-requests/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t('leaveRequests.newRequest')}
            </Button>
          </Link>
        </div>

        <div className="flex flex-wrap gap-4 mb-4 items-center">
          <Select value={departmentFilter} onValueChange={v => { setDepartmentFilter(v); setPage(1); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t('employees.department')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              {allDepartments.map((dept: any) => (
                <SelectItem key={dept.id} value={String(dept.id)}>{dept.description}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(1); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t('leaveRequests.leaveType')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="sick">{t('leaveRequests.sick')}</SelectItem>
              <SelectItem value="vacation">{t('leaveRequests.vacation')}</SelectItem>
              <SelectItem value="personal">{t('leaveRequests.personal')}</SelectItem>
              <SelectItem value="other">{t('leaveRequests.other')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t('common.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="pending">{t('leaveRequests.pending')}</SelectItem>
              <SelectItem value="approved">{t('leaveRequests.approved')}</SelectItem>
              <SelectItem value="rejected">{t('leaveRequests.rejected')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-between items-center mt-4">
          <div>
            {t('common.page')}: {page} / {Math.ceil(totalCount / pageSize) || 1}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              {t('common.prev')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={!filteredLeaveRequests || filteredLeaveRequests.length < pageSize}
            >
              {t('common.next')}
            </Button>
            <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 20, 50].map(size => (
                  <SelectItem key={size} value={String(size)}>{size}/trang</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full md:w-auto grid-cols-4">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t('common.filter')}
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <FileQuestion className="h-4 w-4" />
              {t('leaveRequests.pending')}
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              {t('leaveRequests.approved')}
            </TabsTrigger>
            <TabsTrigger value="rejected" className="flex items-center gap-2">
              <FileX className="h-4 w-4" />
              {t('leaveRequests.rejected')}
            </TabsTrigger>
          </TabsList>

          {/* Leave Requests List */}
          <TabsContent value={activeTab} className="mt-4">
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
                {!filteredLeaveRequests || filteredLeaveRequests.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 flex flex-col items-center justify-center py-10">
                      <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">{t('common.noData')}</h3>
                      <p className="text-muted-foreground">
                        {activeTab === "all"
                          ? t('leaveRequests.noRequestsYet')
                          : t('leaveRequests.noRequestsInStatus', { status: t(`leaveRequests.${activeTab}`) })}
                      </p>
                      <Link href="/leave-requests/new">
                        <Button variant="outline" className="mt-4">
                          {t('leaveRequests.newRequest')}
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  filteredLeaveRequests.map((request) => {
                    const employee = employeesData[request.employeeId];
                    const department = employee && employee.departmentId ? departmentsData[employee.departmentId] : null;
                    return (
                      <Card key={request.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium">{t('leaveRequests.requestId', { id: request.id })}</h3>
                                {renderStatusBadge(request.status)}
                                {renderLeaveTypeIcon(request.type)}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                <strong>{t('leaveRequests.dateRange')}:</strong> {format(new Date(request.startDate), 'MMM dd, yyyy')} - {format(new Date(request.endDate), 'MMM dd, yyyy')}
                              </p>
                              {/* Hiển thị tên, mã nhân viên và phòng ban */}
                              {employee && (
                                <p className="text-sm text-muted-foreground">
                                  <strong>{t('employees.employeeId')}:</strong> {employee.id} <br />
                                  <strong>{t('employees.name')}:</strong> {employee.firstName} {employee.lastName} <br />
                                  {department && (
                                    <span><strong>{t('employees.department')}:</strong> {department.description}</span>
                                  )}
                                </p>
                              )}
                              {request.reason && (
                                <p className="text-sm text-muted-foreground">
                                  <strong>{t('leaveRequests.reason')}:</strong> {request.reason}
                                </p>
                              )}
                            </div>
                            <Link href={`/leave-requests/${request.id}`}>
                              <Button variant="outline" size="sm">{t('common.view')}</Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}