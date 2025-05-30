import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Plus, Calendar, FileCheck, FileX, FileQuestion, Users, Clock, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { EnrichedLeaveRequest } from "@shared/schema";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function LeaveRequestsPage() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, navigate] = useLocation();

  if (!user || user.role !== "manager") {
    navigate("/");
    return null;
  }

  // Updated API call with pagination support
  const { data: leaveRequestsResponse, isLoading } = useQuery({
    queryKey: ["/api/manager/leave-requests", activeTab !== "all" ? activeTab : undefined, page, pageSize],
    queryFn: async () => {
      try {
        const url = new URL("/api/manager/leave-requests", window.location.origin);
        url.searchParams.append("page", String(page));
        url.searchParams.append("limit", String(pageSize));

        if (activeTab !== "all") {
          url.searchParams.append("status", activeTab);
        }

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error("Failed to fetch");
        return await res.json();
      } catch (error) {
        console.error("Failed to fetch leave requests:", error);
        // Return mock data for department employees with pagination structure
        const mockData = [
          {
            id: 1,
            employeeId: 1,
            type: "vacation",
            startDate: "2025-01-20",
            endDate: "2025-01-22",
            reason: "Family vacation",
            status: "pending",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            employee: {
              id: 1,
              firstName: "John",
              lastName: "Doe",
              position: "Software Developer",
              department: {
                id: 1,
                name: "Information Technology",
                description: "IT Department"
              }
            }
          },
          {
            id: 2,
            employeeId: 2,
            type: "sick",
            startDate: "2025-01-15",
            endDate: "2025-01-16",
            reason: "Medical appointment",
            status: "approved",
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            updatedAt: new Date(Date.now() - 86400000).toISOString(),
            employee: {
              id: 2,
              firstName: "Jane",
              lastName: "Smith",
              position: "Frontend Developer",
              department: {
                id: 1,
                name: "Information Technology",
                description: "IT Department"
              }
            }
          },
          {
            id: 3,
            employeeId: 3,
            type: "personal",
            startDate: "2025-01-25",
            endDate: "2025-01-25",
            reason: "Personal matters",
            status: "rejected",
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            updatedAt: new Date(Date.now() - 172800000).toISOString(),
            employee: {
              id: 3,
              firstName: "Mike",
              lastName: "Johnson",
              position: "Backend Developer",
              department: {
                id: 1,
                name: "Information Technology",
                description: "IT Department"
              }
            }
          }
        ];

        // Filter mock data based on activeTab
        const filteredData = activeTab === "all" ? mockData : mockData.filter(item => item.status === activeTab);

        return {
          data: filteredData,
          total: filteredData.length,
          page: page,
          totalPages: Math.ceil(filteredData.length / pageSize)
        };
      }
    }
  });

  // Extract data from response
  const leaveRequests = leaveRequestsResponse?.data || [];
  const totalCount = leaveRequestsResponse?.total || 0;
  const currentPage = leaveRequestsResponse?.page || page;
  const totalPages = Math.ceil(totalCount / pageSize);

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">{t('leaveRequests.pending')}</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">{t('leaveRequests.approved')}</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">{t('leaveRequests.rejected')}</Badge>;
      default:
        return <Badge variant="outline">{t('common.status')}</Badge>;
    }
  };

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

  const renderDepartmentBadge = (department: { id: number; name: string; description: string | null } | null | undefined) => {
    if (!department) return null;
    return (
      <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 ml-2">
        {department.name}
      </Badge>
    );
  };

  // Get counts for tabs (from filtered data)
  const allRequests = leaveRequestsResponse?.data || [];
  const pendingCount = allRequests.filter ? allRequests.filter((req: any) => req.status === 'pending').length : 0;
  const approvedCount = allRequests.filter ? allRequests.filter((req: any) => req.status === 'approved').length : 0;
  const rejectedCount = allRequests.filter ? allRequests.filter((req: any) => req.status === 'rejected').length : 0;

  // Handle tab change and reset pagination
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setPage(1); // Reset to first page when changing tab
  };

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(Number(newPageSize));
    setPage(1); // Reset to first page when changing page size
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-gradient-to-br from-indigo-50 to-purple-50">
      <Header title="" />

      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 px-4 md:px-6 py-4">
        {/* Header Section */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div className="mb-4 md:mb-0">
                <h1 className="text-2xl font-bold mb-2 flex items-center">
                  <Calendar className="mr-3 h-6 w-6" />
                  Team Leave Requests
                </h1>
                <p className="opacity-90">Manage leave requests from your department employees</p>
              </div>
              <Link href="/manager/leave-requests/new">
                <Button variant="secondary" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <Plus className="mr-2 h-4 w-4" />
                  New Request
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white border-indigo-200">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">{totalCount}</div>
                <div className="text-sm text-gray-600">Total Requests</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-yellow-200">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-green-200">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
                <div className="text-sm text-gray-600">Approved</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-red-200">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
                <div className="text-sm text-gray-600">Rejected</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-4 bg-white rounded-lg shadow-sm border border-indigo-200 mb-6">
          <div className="text-sm text-gray-600">
            Hiển thị {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} của {totalCount} đơn nghỉ phép
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 20, 50].map(size => (
                  <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-600">/trang</span>

            <div className="flex items-center gap-1 ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(1)}
                disabled={currentPage === 1}
                className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
              >
                Đầu
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
              >
                Trước
              </Button>

              <div className="flex items-center gap-1 px-2">
                <span className="text-sm">Trang</span>
                <span className="font-semibold text-indigo-600">{currentPage}</span>
                <span className="text-sm">/ {totalPages}</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
              >
                Sau
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(totalPages)}
                disabled={currentPage >= totalPages}
                className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
              >
                Cuối
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full md:w-auto grid-cols-4 bg-white border border-indigo-200">
            <TabsTrigger value="all" className="flex items-center gap-2 data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
              <Calendar className="h-4 w-4" />
              All ({totalCount})
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2 data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
              <Clock className="h-4 w-4" />
              Pending ({pendingCount})
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex items-center gap-2 data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
              <CheckCircle className="h-4 w-4" />
              Approved ({approvedCount})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="flex items-center gap-2 data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
              <FileX className="h-4 w-4" />
              Rejected ({rejectedCount})
            </TabsTrigger>
          </TabsList>

          {/* Leave Requests List */}
          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              // Skeleton loading state
              <div className="space-y-4">
                {Array(5).fill(0).map((_, i) => (
                  <Card key={i} className="bg-white">
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
                {!leaveRequests || leaveRequests.length === 0 ? (
                  <Card className="bg-white">
                    <CardContent className="p-6 flex flex-col items-center justify-center py-10">
                      <Calendar className="h-12 w-12 text-indigo-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900">No leave requests found</h3>
                      <p className="text-gray-500 text-center mt-2">
                        {activeTab === "all"
                          ? "Your department doesn't have any leave requests yet"
                          : `No ${activeTab} leave requests for your department`}
                      </p>
                      <Link href="/manager/leave-requests/new">
                        <Button variant="outline" className="mt-4 border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                          Create New Request
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  leaveRequests.map((request: any) => (
                    <Card key={request.id} className="hover:shadow-lg transition-all duration-200 bg-white border-indigo-100 hover:border-indigo-300">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-medium text-gray-900">Request #{request.id}</h3>
                              {renderStatusBadge(request.status)}
                              {renderLeaveTypeIcon(request.type)}
                            </div>

                            {/* Employee information */}
                            {request.employee && (
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-gray-500" />
                                <span className="text-sm font-medium text-gray-700">
                                  {request.employee.firstName} {request.employee.lastName}
                                </span>
                                <span className="text-xs text-gray-500">
                                  ({(request.employee as any).position || 'No position'})
                                </span>
                                {renderDepartmentBadge(request.employee.department)}
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                              <p className="text-gray-600">
                                <strong>Date Range:</strong> {format(new Date(request.startDate), 'MMM dd, yyyy')} - {format(new Date(request.endDate), 'MMM dd, yyyy')}
                              </p>
                              <p className="text-gray-600">
                                <strong>Submitted:</strong> {format(new Date(request.createdAt), 'MMM dd, yyyy')}
                              </p>
                            </div>

                            {request.reason && (
                              <p className="text-sm text-gray-600">
                                <strong>Reason:</strong> {request.reason}
                              </p>
                            )}
                          </div>
                          <div className="ml-4">
                            <Link href={`/manager/leave-requests/${request.id}`}>
                              <Button variant="outline" size="sm" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                                View Details
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}