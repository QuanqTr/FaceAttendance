import { useEffect, useState, useRef } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AttendanceLog } from "@/components/attendance/attendance-log";
import { Calendar } from "@/components/ui/calendar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useI18nToast } from "@/hooks/use-i18n-toast";
import {
  AlertCircle,
  ArrowLeft,
  Calendar as CalendarIcon,
  Edit2,
  Mail,
  Phone,
  Trash2,
  User,
  Upload,
  Loader2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Employee } from "@shared/schema";
import { FaceRegistration } from "@/components/face-recognition/face-registration";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import faceapi, { initFaceAPI } from "@/lib/faceapi";
import { EmployeeWorkHours } from "@/components/employee/employee-work-hours";
import AttendanceCalendar from "@/components/employee/attendance-calendar";

export default function EmployeeDetail() {
  const [, params] = useRoute<{ id: string }>("/employees/:id");
  const { toast } = useToast();
  const { t } = useTranslation();
  const i18nToast = useI18nToast();
  const [date, setDate] = useState<Date>(new Date());
  const employeeId = params?.id ? parseInt(params.id) : 0;
  const [isLoading, setIsLoading] = useState(false);
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const modelLoadAttempted = useRef(false);

  // Initialize face-api models
  useEffect(() => {
    if (modelLoadAttempted.current) return;

    const loadModels = async () => {
      try {
        setIsInitializing(true);
        modelLoadAttempted.current = true;

        console.log('Bắt đầu tải models...');

        // Sử dụng hàm initFaceAPI từ lib/faceapi.ts
        await initFaceAPI();

        setIsModelsLoaded(true);
        console.log('Đã load xong tất cả models face-api');
      } catch (error) {
        console.error('Lỗi khi load models face-api:', error);
        i18nToast.error('common.error', 'employees.faceModelError');
      } finally {
        setIsInitializing(false);
        setIsModelLoading(false);
      }
    };

    loadModels();
  }, [i18nToast]);

  const { data: employee, isLoading: employeeLoading, refetch } = useQuery<Employee>({
    queryKey: [`/api/employees/${employeeId}`],
    queryFn: async () => {
      if (!employeeId) return null;
      const res = await fetch(`/api/employees/${employeeId}`);
      if (!res.ok) throw new Error("Failed to fetch employee details");
      return await res.json();
    },
    enabled: !!employeeId,
  });

  const { data: attendanceRecords } = useQuery({
    queryKey: [`/api/attendance/employee/${employeeId}`, format(date, 'yyyy-MM')],
    queryFn: async () => {
      if (!employeeId) return [];

      const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      console.log(`Fetching attendance records from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);

      const res = await fetch(`/api/attendance/employee/${employeeId}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);
      if (!res.ok) throw new Error("Failed to fetch attendance records");

      const data = await res.json();
      console.log(`Đã tải ${data.length} bản ghi điểm danh cho tháng ${format(date, 'MM/yyyy')}`);

      // Nhóm các bản ghi theo ngày để kiểm tra
      const recordsByDate = data.reduce((acc: any, record: any) => {
        const recordDate = record.date ? new Date(record.date) : new Date(record.time);
        const dateStr = format(recordDate, 'yyyy-MM-dd');

        if (!acc[dateStr]) {
          acc[dateStr] = [];
        }
        acc[dateStr].push(record);
        return acc;
      }, {});

      console.log(`Có ${Object.keys(recordsByDate).length} ngày có điểm danh`);

      return data;
    },
    enabled: !!employeeId,
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/employees/${employeeId}`);
    },
    onSuccess: () => {
      i18nToast.success('employees.deleteSuccess', 'employees.deleteSuccessMessage');
      window.location.href = "/employees";
    },
    onError: (error) => {
      i18nToast.error('common.error', 'employees.deleteError', { error: error.message });
    },
  });

  if (employeeLoading) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header title={t('employees.details')} />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0 px-4 md:px-6 py-4">
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header title={t('employees.details')} />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0 px-4 md:px-6 py-4">
          <div className="flex flex-col items-center justify-center h-full">
            <AlertCircle className="h-16 w-16 text-destructive mb-4" />
            <h3 className="text-xl font-medium mb-2">{t('employees.notFound')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('employees.notFoundDesc')}
            </p>
            <Link href="/employees">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('employees.backToEmployees')}
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 hover:bg-green-600">{t('employees.active')}</Badge>;
      case 'inactive':
        return <Badge variant="secondary">{t('employees.inactive')}</Badge>;
      case 'on_leave':
        return <Badge className="bg-amber-500 hover:bg-amber-600">{t('employees.onLeave')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Kiểm tra loại file
    if (!file.type.startsWith('image/')) {
      i18nToast.error('common.error', 'employees.invalidFileType');
      return;
    }

    if (!isModelsLoaded) {
      i18nToast.error('common.error', 'employees.modelsLoading');
      return;
    }

    // Đóng dialog ngay sau khi chọn file - người dùng không cần phải đợi
    const dialogElement = document.querySelector('[data-state="open"][role="dialog"]');
    if (dialogElement) {
      // Tìm nút close trong dialog
      const closeButton = dialogElement.querySelector('button[data-state="closed"]');
      if (closeButton && 'click' in closeButton) {
        (closeButton as HTMLElement).click();
      } else {
        // Backup method - tìm kiếm theo attribute aria-label
        const closeButtonAlt = dialogElement.querySelector('button[aria-label="Close"]');
        if (closeButtonAlt && 'click' in closeButtonAlt) {
          (closeButtonAlt as HTMLElement).click();
        }
      }
    }

    // Hiển thị toast loading khi đang xử lý
    i18nToast.info('common.processing', 'employees.extractingFeatures');

    setIsLoading(true);
    let objectUrl: string | null = null;

    try {
      // Tạo URL cho ảnh
      objectUrl = URL.createObjectURL(file);
      console.log("Đã tạo object URL:", objectUrl);

      // Load ảnh
      console.log("Đang tải ảnh...");
      const img = await faceapi.fetchImage(objectUrl);
      console.log("Đã tải xong ảnh, kích thước:", img.width, "x", img.height);

      // Nhận diện khuôn mặt
      console.log("Đang nhận diện khuôn mặt...");
      const detections = await faceapi.detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detections) {
        throw new Error("Không tìm thấy khuôn mặt trong ảnh");
      }

      console.log("Đã nhận diện khuôn mặt thành công");

      // Chuyển đổi descriptor thành mảng
      const descriptor = Array.from(detections.descriptor);
      console.log("Descriptor có độ dài:", descriptor.length);

      console.log("Đã phát hiện khuôn mặt, gửi dữ liệu lên server...");

      // Dữ liệu gửi lên server
      const postData = {
        descriptor: descriptor
      };
      console.log("Dữ liệu gửi lên server:", postData);

      // Sử dụng URL tương đối, Vite sẽ proxy tới server
      const apiUrl = `/api/employees/${employee.id}/face-profile`;
      console.log("Gọi API tới URL:", apiUrl);

      // Gửi lên server
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      console.log("Phản hồi từ server:", {
        status: response.status,
        statusText: response.statusText,
        headers: {
          'content-type': response.headers.get('content-type'),
          'content-length': response.headers.get('content-length')
        }
      });

      if (!response.ok) {
        // Kiểm tra loại content của response
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Không thể lưu dữ liệu khuôn mặt");
        } else {
          // Nếu không phải JSON, đọc response dưới dạng text
          const errorText = await response.text();
          console.error("Phản hồi không phải JSON:", errorText);
          throw new Error(`Lỗi server: ${response.status} ${response.statusText}`);
        }
      }

      // Đọc response theo content-type
      const contentType = response.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.log("Phản hồi dạng text:", text);
        data = { message: "Đã lưu dữ liệu thành công" };
      }

      console.log("Dữ liệu từ server:", data);

      // Thông báo thành công và cập nhật UI
      i18nToast.success('common.success', 'employees.faceDataSaved');

      // Cập nhật lại dữ liệu nhân viên
      await refetch();
    } catch (error) {
      console.error('Lỗi khi xử lý khuôn mặt:', error);
      i18nToast.error('common.error', 'employees.faceProcessingError', { error: error instanceof Error ? error.message : "Không thể xử lý khuôn mặt" });
    } finally {
      setIsLoading(false);
      // Dọn dẹp URL
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    }
  };

  const handlePreviousMonth = () => {
    setDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1));
  };

  // Hàm chuyển đổi thời gian từ UTC sang giờ địa phương
  const utcToLocalTime = (utcTime: string | Date): string => {
    try {
      // Tạo đối tượng Date từ chuỗi UTC hoặc đối tượng Date
      const date = typeof utcTime === 'string' ? new Date(utcTime) : utcTime;

      // Kiểm tra tính hợp lệ của Date
      if (isNaN(date.getTime())) {
        console.warn("Thời gian không hợp lệ:", utcTime);
        return "--:--";
      }

      // Format thành HH:mm trong múi giờ địa phương
      return format(date, 'HH:mm');
    } catch (error) {
      console.error("Lỗi khi chuyển đổi thời gian:", error);
      return "--:--";
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title={t('employees.details')} />

      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 px-4 md:px-6 py-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div className="flex items-center">
            <Link href="/employees">
              <Button variant="ghost" className="mr-2 p-0 h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">{t('employees.profile')}</h1>
          </div>

          <div className="flex items-center mt-4 md:mt-0 space-x-2">
            <Link href={`/employees/${employeeId}/edit`}>
              <Button variant="outline">
                <Edit2 className="mr-2 h-4 w-4" />
                {t('common.edit')}
              </Button>
            </Link>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('common.delete')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('employees.confirmDelete')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('employees.deleteWarning', { name: `${employee.lastName} ${employee.firstName}` })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => deleteEmployeeMutation.mutate()}
                  >
                    {deleteEmployeeMutation.isPending ? t('employees.deleting') : t('common.delete')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                    {getInitials(employee.firstName, employee.lastName)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardTitle className="text-xl">
                {employee.lastName} {employee.firstName}
              </CardTitle>
              <CardDescription>{employee.position || t('employees.notSpecified')}</CardDescription>
              <div className="mt-2">{getStatusBadge(employee.status)}</div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">{t('employees.id')}</Label>
                  <p className="font-medium">{employee.employeeId}</p>
                </div>

                <Separator />

                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">{t('employees.email')}</Label>
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                    <p className="font-medium">{employee.email}</p>
                  </div>
                </div>

                {employee.phone && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <Label className="text-sm text-muted-foreground">{t('employees.phone')}</Label>
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                        <p className="font-medium">{employee.phone}</p>
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">{t('employees.department')}</Label>
                  <p className="font-medium">{employee.departmentId}</p>
                </div>

                <Separator />

                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">{t('employees.joinDate')}</Label>
                  <p className="font-medium">
                    {employee.joinDate ?
                      format(
                        typeof employee.joinDate === 'string' ?
                          new Date(employee.joinDate) :
                          employee.joinDate,
                        'PPP'
                      ) :
                      t('employees.notSpecified')
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <Tabs defaultValue="attendance" className="space-y-4">
              <TabsList>
                <TabsTrigger value="attendance">{t('employees.attendanceHistory')}</TabsTrigger>
                <TabsTrigger value="profile">{t('employees.faceProfile')}</TabsTrigger>
              </TabsList>

              <TabsContent value="attendance">
                <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle>{t('attendance.attendanceDetails')}</CardTitle>
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
                      {attendanceRecords && attendanceRecords.length > 0 ? (
                        <AttendanceLog
                          records={attendanceRecords.map((record: any) => {
                            // Chuẩn hóa dữ liệu ngày và giờ
                            let recordDate;
                            try {
                              if (record.date) {
                                recordDate = new Date(record.date);
                              } else if (record.time) {
                                // Lấy ngày từ trường time
                                const timeDate = new Date(record.time);
                                recordDate = new Date(
                                  timeDate.getFullYear(),
                                  timeDate.getMonth(),
                                  timeDate.getDate()
                                );
                              } else {
                                recordDate = new Date(); // Dự phòng, tránh lỗi
                                console.warn("Bản ghi thiếu thông tin ngày tháng:", record);
                              }

                              // Xác định thời gian check-in và check-out
                              let timeIn = undefined;
                              let timeOut = undefined;

                              if (record.type === 'checkin' || record.type === 'in') {
                                if (record.time) {
                                  // Chuyển đổi thời gian từ UTC sang giờ địa phương 
                                  timeIn = utcToLocalTime(record.time);
                                  console.log(`Thời gian vào: ${record.time} -> ${timeIn}`);
                                }
                              } else if (record.type === 'checkout' || record.type === 'out') {
                                if (record.time) {
                                  // Chuyển đổi thời gian từ UTC sang giờ địa phương
                                  timeOut = utcToLocalTime(record.time);
                                  console.log(`Thời gian ra: ${record.time} -> ${timeOut}`);
                                }
                              }

                              return {
                                id: record.id,
                                employeeId: employee.id,
                                employeeName: `${employee.lastName} ${employee.firstName}`,
                                departmentName: employee.departmentId ? employee.departmentId.toString() : t('employees.notAssigned'),
                                date: format(recordDate, 'yyyy-MM-dd'),
                                timeIn: timeIn,
                                timeOut: timeOut,
                                status: record.status || 'present',
                              };
                            } catch (error) {
                              console.error("Lỗi khi xử lý bản ghi điểm danh:", error, record);
                              // Trả về bản ghi mặc định nếu có lỗi
                              return {
                                id: record.id || 0,
                                employeeId: employee.id,
                                employeeName: `${employee.lastName} ${employee.firstName}`,
                                departmentName: employee.departmentId ? employee.departmentId.toString() : t('employees.notAssigned'),
                                date: format(new Date(), 'yyyy-MM-dd'),
                                timeIn: "--:--",
                                timeOut: "--:--",
                                status: 'present',
                              };
                            }
                          })}
                          isLoading={false}
                          date={date}
                          showSearch={false}
                        />
                      ) : (
                        <div className="text-center py-8">
                          <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-medium mb-2">{t('attendance.noRecords')}</h3>
                          <p className="text-muted-foreground">
                            {t('attendance.noRecordsForMonth')}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-6">
                  <AttendanceCalendar
                    employeeId={employee.id}
                    initialDate={date}
                    attendanceRecords={attendanceRecords || []}
                  />
                </div>

                <div className="mt-6">
                  <EmployeeWorkHours employeeId={employee.id} />
                </div>
              </TabsContent>

              <TabsContent value="profile">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('employees.faceRecognition')}</CardTitle>
                    <CardDescription>
                      {t('employees.faceRecognitionDesc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center">
                    <div className="relative w-64 h-64 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center mb-6">
                      {employee.faceDescriptor ? (
                        <div className="text-center">
                          <User className="h-16 w-16 text-primary mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">{t('employees.faceProfileExists')}</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <User className="h-16 w-16 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">{t('employees.noFaceProfile')}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 w-full max-w-md">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button className="w-full" disabled={isLoading}>
                            {employee.faceDescriptor ? t('employees.updateFaceProfile') : t('employees.uploadFaceImage')}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>{t('employees.faceRegistration')}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="face-image">{t('employees.uploadFaceImage')}</Label>
                              <div className="flex items-center gap-4">
                                <Input
                                  id="face-image"
                                  type="file"
                                  accept="image/*"
                                  onChange={handleFileUpload}
                                  disabled={isLoading || !isModelsLoaded || isInitializing}
                                  className="hidden"
                                />
                                <Button
                                  variant="outline"
                                  onClick={() => document.getElementById('face-image')?.click()}
                                  disabled={isLoading || !isModelsLoaded || isInitializing}
                                  className="w-full"
                                >
                                  {isLoading ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : isInitializing ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : !isModelsLoaded ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Upload className="h-4 w-4 mr-2" />
                                  )}
                                  {isLoading ? t('common.processing') : isInitializing ? t('employees.modelsLoading') : !isModelsLoaded ? t('employees.modelsLoading') : t('employees.uploadFaceImage')}
                                </Button>
                              </div>

                              <div className="text-center text-sm mt-2 text-muted-foreground">
                                {isLoading && t('employees.extractingFeatures')}
                                {isInitializing && t('employees.modelsLoading')}
                                {!isModelsLoaded && !isInitializing && t('employees.modelsLoading')}
                                {isModelsLoaded && !isLoading && !isInitializing && t('employees.uploadFaceHint')}
                              </div>
                            </div>

                            <div className="relative">
                              <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                              </div>
                              <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">
                                  {t('common.or')}
                                </span>
                              </div>
                            </div>

                            <FaceRegistration
                              employeeId={employee.id}
                              onComplete={() => refetch()}
                            />
                          </div>
                        </DialogContent>
                      </Dialog>

                      {employee.faceDescriptor && (
                        <Button
                          variant="destructive"
                          className="w-full"
                          onClick={async () => {
                            if (confirm(t('employees.confirmResetFace'))) {
                              try {
                                const res = await fetch(`/api/employees/${employee.id}/face-data`, {
                                  method: 'DELETE',
                                  headers: { 'Content-Type': 'application/json' }
                                });

                                if (!res.ok) {
                                  throw new Error("Failed to reset face data");
                                }

                                i18nToast.success('employees.faceDataReset', 'employees.faceDataResetMessage');

                                refetch();
                              } catch (error) {
                                console.error("Error resetting face data:", error);
                                i18nToast.error('common.error', 'employees.faceResetError', { error: error instanceof Error ? error.message : "Failed to reset face data" });
                              }
                            }
                          }}
                        >
                          {t('employees.resetFaceData')}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
