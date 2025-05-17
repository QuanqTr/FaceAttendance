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

export default function LeaveRequestsPage() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const { t } = useTranslation();

  // Get leave requests
  const { data: leaveRequests, isLoading } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests", activeTab !== "all" ? activeTab : undefined],
    queryFn: async () => {
      const url = new URL("/api/leave-requests", window.location.origin);
      if (activeTab !== "all") {
        url.searchParams.append("status", activeTab);
      }
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch leave requests");
      return res.json();
    }
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
                {!leaveRequests || leaveRequests.length === 0 ? (
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
                  leaveRequests.map((request) => (
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
                  ))
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}