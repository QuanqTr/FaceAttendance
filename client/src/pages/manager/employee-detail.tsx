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
import { Calendar } from "@/components/ui/calendar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useI18nToast } from "@/hooks/use-i18n-toast";
import { formatEmployeeName, getEmployeeInitials } from "@/lib/name-utils";
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
import { vi } from "date-fns/locale";
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
import { EmployeeAttendanceHistory } from "@/components/manager/employee-attendance-history";



export default function EmployeeDetail() {
  const [, params] = useRoute<{ id: string }>("/manager/employees/:id");
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

  // Use manager API endpoint
  const { data: employee, isLoading: employeeLoading, refetch } = useQuery<Employee>({
    queryKey: [`/api/manager/employees/${employeeId}`],
    queryFn: async () => {
      if (!employeeId) return null;
      const res = await fetch(`/api/manager/employees/${employeeId}`);
      if (!res.ok) throw new Error("Failed to fetch employee details");
      return await res.json();
    },
    enabled: !!employeeId,
  });

  // Lấy thông tin chi tiết phòng ban
  const { data: department, isLoading: departmentLoading } = useQuery({
    queryKey: [`/api/departments/${employee?.departmentId}`],
    queryFn: async () => {
      if (!employee?.departmentId) return null;
      const res = await fetch(`/api/departments/${employee.departmentId}`);
      if (!res.ok) return null; // Không báo lỗi, chỉ trả về null
      return await res.json();
    },
    enabled: !!employee?.departmentId,
  });



  // Use manager API for delete
  const deleteEmployeeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/manager/employees/${employeeId}`);
    },
    onSuccess: () => {
      i18nToast.success('employees.deleteSuccess', 'employees.deleteSuccessMessage');
      window.location.href = "/manager/employees";
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
            <Link href="/manager/employees">
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



  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      i18nToast.error('common.error', 'employees.invalidFileType');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      i18nToast.error('common.error', 'employees.fileTooLarge');
      return;
    }

    setIsLoading(true);

    try {
      // Kiểm tra face-api models đã tải chưa
      if (!isModelsLoaded) {
        i18nToast.error('common.error', 'employees.modelsNotLoaded');
        setIsLoading(false);
        return;
      }

      // Validate face in image
      const img = new Image();
      img.onload = async () => {
        try {
          const detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();

          if (detections.length === 0) {
            i18nToast.error('common.error', 'employees.noFaceDetected');
            setIsLoading(false);
            return;
          }

          if (detections.length > 1) {
            i18nToast.error('common.error', 'employees.multipleFacesDetected');
            setIsLoading(false);
            return;
          }

          // Upload file
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch(`/api/manager/employees/${employeeId}/avatar`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Upload failed');
          }

          const result = await response.json();

          // Update query cache
          queryClient.invalidateQueries({ queryKey: [`/api/manager/employees/${employeeId}`] });

          i18nToast.success('employees.uploadSuccess', 'employees.avatarUpdated');

          // Trigger a refetch
          refetch();
        } catch (error) {
          console.error('Face detection error:', error);
          i18nToast.error('common.error', 'employees.faceDetectionError');
        } finally {
          setIsLoading(false);
        }
      };

      img.onerror = () => {
        i18nToast.error('common.error', 'employees.invalidImage');
        setIsLoading(false);
      };

      img.src = URL.createObjectURL(file);
    } catch (error) {
      console.error('Upload error:', error);
      i18nToast.error('common.error', 'employees.uploadError');
      setIsLoading(false);
    }

    // Reset input value để có thể upload lại cùng file
    event.target.value = '';
  };

  const handlePreviousMonth = () => {
    setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1));
  };

  const utcToLocalTime = (utcTime: string | Date): string => {
    try {
      const date = typeof utcTime === 'string' ? new Date(utcTime) : utcTime;
      if (isNaN(date.getTime())) return 'Invalid date';

      // Chuyển từ UTC sang local time
      const localTime = new Date(date.getTime() + (7 * 60 * 60 * 1000)); // UTC+7
      return format(localTime, 'HH:mm:ss');
    } catch (error) {
      console.error('Error converting time:', error);
      return 'Invalid time';
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title={formatEmployeeName(employee)} />
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 px-4 md:px-6 py-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header Actions */}
          <div className="flex items-center justify-between">
            <Link href="/manager/employees">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('employees.backToEmployees')}
              </Button>
            </Link>
            <div className="flex gap-2">
              <Link href={`/manager/employees/${employeeId}/edit`}>
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
                    <AlertDialogTitle>{t('employees.deleteEmployee')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('employees.deleteEmployeeConfirm', { name: formatEmployeeName(employee) })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteEmployeeMutation.mutate()}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      {deleteEmployeeMutation.isPending ? (
                        <div className="flex items-center">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('common.deleting')}
                        </div>
                      ) : (
                        t('common.delete')
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <Tabs defaultValue="info" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">{t('employees.information')}</TabsTrigger>
              <TabsTrigger value="face">{t('employees.faceRecognition')}</TabsTrigger>
              <TabsTrigger value="attendance">{t('employees.attendance')}</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="text-lg">
                        {getEmployeeInitials(employee)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <CardTitle className="text-2xl">
                        {formatEmployeeName(employee)}
                      </CardTitle>
                      <CardDescription>
                        {employee.position} • {department?.name || t('employees.noDepartment')}
                      </CardDescription>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(employee.status)}
                        <Badge variant="outline">ID: {employee.employeeId}</Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {t('employees.fullName')}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {formatEmployeeName(employee)}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        {t('employees.employeeId')}
                      </Label>
                      <p className="text-sm text-muted-foreground">{employee.employeeId}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {t('employees.email')}
                      </Label>
                      <p className="text-sm text-muted-foreground">{employee.email}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {t('employees.phone')}
                      </Label>
                      <p className="text-sm text-muted-foreground">{employee.phone || t('common.notSet')}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        {t('employees.position')}
                      </Label>
                      <p className="text-sm text-muted-foreground">{employee.position}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        {t('employees.department')}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {department?.name || t('employees.noDepartment')}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        {t('employees.joinDate')}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {employee.joinDate ? format(new Date(employee.joinDate), 'dd/MM/yyyy') : t('common.notSet')}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        {t('employees.status')}
                      </Label>
                      <div>{getStatusBadge(employee.status)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="face" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('employees.faceRecognition')}</CardTitle>
                  <CardDescription>
                    {t('employees.faceRecognitionDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isInitializing ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{t('employees.loadingModels')}</span>
                      </div>
                    </div>
                  ) : !isModelsLoaded ? (
                    <div className="text-center py-8">
                      <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {t('employees.faceModelError')}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Current Avatar */}
                      <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20">
                          <AvatarFallback className="text-xl">
                            {getEmployeeInitials(employee)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-2">
                          <Label>{t('employees.currentAvatar')}</Label>
                          <p className="text-sm text-muted-foreground">
                            {employee.faceDescriptor ? t('employees.faceRegistered') : t('employees.noFaceRegistered')}
                          </p>
                        </div>
                      </div>

                      <Separator />

                      {/* Upload New Avatar */}
                      <div className="space-y-4">
                        <Label>{t('employees.uploadNewAvatar')}</Label>
                        <div className="flex items-center gap-4">
                          <Input
                            id="avatar-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            disabled={isLoading}
                            className="hidden"
                          />
                          <Button
                            onClick={() => document.getElementById('avatar-upload')?.click()}
                            disabled={isLoading}
                            variant="outline"
                          >
                            {isLoading ? (
                              <div className="flex items-center">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t('common.uploading')}
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <Upload className="mr-2 h-4 w-4" />
                                {t('employees.selectImage')}
                              </div>
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t('employees.uploadNote')}
                        </p>
                      </div>

                      <Separator />

                      {/* Face Registration */}
                      <div className="space-y-4">
                        <Label>{t('employees.liveRegistration')}</Label>
                        <FaceRegistration
                          employeeId={employeeId}
                          onSuccess={() => {
                            refetch();
                            i18nToast.success('employees.faceRegistered', 'employees.faceRegisteredDesc');
                          }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attendance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{t('employees.attendanceHistory')}</span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handlePreviousMonth}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium min-w-[120px] text-center">
                        {format(date, 'MMMM yyyy', { locale: vi })}
                      </span>
                      <Button variant="outline" size="sm" onClick={handleNextMonth}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <EmployeeAttendanceHistory
                    employeeId={employeeId.toString()}
                    month={date}
                  />
                </CardContent>
              </Card>
            </TabsContent>


          </Tabs>
        </div>
      </main>
    </div>
  );
}
