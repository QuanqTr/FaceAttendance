import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Loader2, User, Phone, Mail, Calendar, Building,
    MapPin, UserCheck, Lock, Camera, Upload, RefreshCw, Trash2, Scan, CheckCircle, AlertCircle, Shield, Users, Eye, EyeOff, Webcam, Edit
} from "lucide-react";
import * as faceapi from 'face-api.js';
import { FaceDetector } from "@/components/face-recognition/face-detector";
import { apiRequest } from "@/lib/queryClient";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { RecognitionStatusType } from "@/components/dashboard/attendance-recognition";
import { ManagerEmailVerification } from "@/components/face-recognition/manager-email-verification";

// Define the Department type
interface Department {
    id: number;
    name: string;
    description?: string;
    managerId?: number | null;
}

// Hàm trợ giúp chuyển đổi mã phòng ban thành tên đầy đủ tiếng Việt
const getDepartmentDisplayName = (deptName: string): string => {
    switch (deptName) {
        case "DS":
            return "Phòng Design";
        case "HR":
            return "Phòng Nhân sự";
        case "BR":
            return "Phòng Brand";
        case "D1":
            return "Phòng Development";
        default:
            return deptName;
    }
};

// Define the schema for form validation
const profileUpdateSchema = z.object({
    email: z.string().email().min(1, "Email is required"),
    phone: z.string().min(1, "Phone number is required"),
    position: z.string().min(1, "Position is required"),
    departmentId: z.number().nullable().optional(),
});

const passwordUpdateSchema = z.object({
    currentPassword: z.string().min(6, "Current password is required"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm password is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileUpdateSchema>;
type PasswordFormValues = z.infer<typeof passwordUpdateSchema>;

export default function ManagerProfilePage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isUploading, setIsUploading] = useState(false);
    const [isModelsLoaded, setIsModelsLoaded] = useState(false);
    const [isLoadingModels, setIsLoadingModels] = useState(false);

    // Refs for video and canvas elements
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // State for face registration
    const [isCapturing, setIsCapturing] = useState(false);
    const [captureStatus, setCaptureStatus] = useState<RecognitionStatusType>('waiting');
    const [detectorStatus, setDetectorStatus] = useState<RecognitionStatusType>('waiting');
    const [uploadedImage, setUploadedImage] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [currentTab, setCurrentTab] = useState<string>("details");
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

    // Thêm state để theo dõi phần tab đang hiển thị trong webcam tabs
    const [activeWebcamTab, setActiveWebcamTab] = useState<string>("webcam");

    // Email verification states for face profile access
    const [showEmailVerification, setShowEmailVerification] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [accessTokenExpiry, setAccessTokenExpiry] = useState<number | null>(null);

    // Personal Details states
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [position, setPosition] = useState('');
    const [departmentId, setDepartmentId] = useState<number>();

    // Security states
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Face data states
    const [captureMode, setCaptureMode] = useState<'none' | 'webcam' | 'upload'>('none');
    const [modelsLoaded, setModelsLoaded] = useState(false);

    const handleVerificationSuccess = (token: string) => {
        setAccessToken(token);
        setAccessTokenExpiry(Date.now() + 15 * 60 * 1000); // 15 minutes
        setIsVerified(true);
        setShowEmailVerification(false);

        toast({
            title: "✅ Xác thực thành công",
            description: "Bạn có thể cập nhật dữ liệu khuôn mặt trong 15 phút",
        });
    };

    const validateAccessToken = async (token: string): Promise<boolean> => {
        try {
            const response = await fetch('/api/manager/face-profile/validate-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ accessToken: token }),
            });

            return response.ok;
        } catch (error) {
            console.error('Error validating access token:', error);
            return false;
        }
    };

    const isAccessTokenValid = () => {
        if (!accessToken || !accessTokenExpiry) return false;
        return Date.now() < accessTokenExpiry;
    };

    // Fetch manager profile data
    const { data: profile, isLoading: isProfileLoading, error: profileError } = useQuery({
        queryKey: ["/api/manager/profile"],
        queryFn: async () => {
            const res = await fetch("/api/manager/profile", {
                credentials: 'include'
            });
            if (!res.ok) throw new Error("Failed to fetch manager profile");
            return res.json();
        },
        enabled: !!user?.id
    });

    // Fetch manager face profile data
    const { data: faceProfile, isLoading: isFaceProfileLoading, refetch: refetchFaceProfile } = useQuery({
        queryKey: ["/api/manager/face-profile"],
        queryFn: async () => {
            const res = await fetch("/api/manager/face-profile", {
                credentials: 'include'
            });
            if (!res.ok) throw new Error("Failed to fetch manager face profile");
            return res.json();
        },
        enabled: !!user?.id && isVerified && isAccessTokenValid()
    });

    // Fetch departments
    const { data: departments = [] } = useQuery<Department[]>({
        queryKey: ["/api/departments"],
        queryFn: async () => {
            const res = await fetch("/api/departments");
            if (!res.ok) throw new Error("Failed to fetch departments");
            return res.json();
        }
    });

    // Forms setup
    const profileForm = useForm<ProfileFormValues>({
        resolver: zodResolver(profileUpdateSchema),
        defaultValues: {
            email: profile?.email || "",
            phone: profile?.phone || "",
            position: profile?.position || "",
            departmentId: profile?.departmentId || null,
        },
    });

    const passwordForm = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordUpdateSchema),
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
    });

    // Update form values when profile data is loaded
    useEffect(() => {
        if (profile) {
            profileForm.reset({
                email: profile.email || "",
                phone: profile.phone || "",
                position: profile.position || "",
                departmentId: profile.departmentId || null,
            });
        }
    }, [profile, profileForm]);

    // Update profile mutation
    const updateProfileMutation = useMutation({
        mutationFn: async (data: ProfileFormValues) => {
            const res = await fetch(`/api/manager/profile`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to update profile");
            return res.json();
        },
        onSuccess: () => {
            toast({
                title: "Thành công",
                description: "Cập nhật thông tin cá nhân thành công",
            });
            queryClient.invalidateQueries({ queryKey: ["/api/manager/profile"] });
        },
        onError: (error) => {
            toast({
                title: "Lỗi",
                description: error instanceof Error ? error.message : "Cập nhật thất bại",
                variant: "destructive",
            });
        },
    });

    // Update password mutation
    const updatePasswordMutation = useMutation({
        mutationFn: async (data: PasswordFormValues) => {
            const res = await fetch(`/api/manager/change-password`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to change password");
            }
            return res.json();
        },
        onSuccess: () => {
            toast({
                title: "Thành công",
                description: "Đổi mật khẩu thành công",
            });
            passwordForm.reset();
        },
        onError: (error) => {
            toast({
                title: "Lỗi",
                description: error instanceof Error ? error.message : "Đổi mật khẩu thất bại",
                variant: "destructive",
            });
        },
    });

    // Update manager face profile mutation
    const updateFaceProfileMutation = useMutation({
        mutationFn: async ({ faceDescriptor }: { faceDescriptor: number[] }) => {
            const res = await fetch(`/api/manager/face-profile`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    faceDescriptor,
                    accessToken
                }),
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to update face profile");
            }
            return res.json();
        },
        onSuccess: () => {
            toast({
                title: "Thành công",
                description: "Cập nhật dữ liệu khuôn mặt thành công",
            });
            refetchFaceProfile();
            queryClient.invalidateQueries({ queryKey: ["/api/manager/profile"] });
        },
        onError: (error) => {
            toast({
                title: "Lỗi",
                description: error instanceof Error ? error.message : "Cập nhật thất bại",
                variant: "destructive",
            });
        },
    });

    // Delete manager face profile mutation
    const deleteFaceProfileMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/manager/face-profile`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ accessToken }),
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to delete face profile");
            }
            return res.json();
        },
        onSuccess: () => {
            toast({
                title: "Thành công",
                description: "Xóa dữ liệu khuôn mặt thành công",
            });
            refetchFaceProfile();
            queryClient.invalidateQueries({ queryKey: ["/api/manager/profile"] });
        },
        onError: (error) => {
            toast({
                title: "Lỗi",
                description: error instanceof Error ? error.message : "Xóa thất bại",
                variant: "destructive",
            });
        },
    });

    const onProfileSubmit = (data: ProfileFormValues) => {
        updateProfileMutation.mutate(data);
    };

    const onPasswordSubmit = (data: PasswordFormValues) => {
        updatePasswordMutation.mutate(data);
    };

    // Load face-api.js models (same as user profile)
    useEffect(() => {
        let isMounted = true;

        const loadFaceApiModels = async () => {
            if (modelsLoaded) return;

            setIsLoadingModels(true);

            try {
                const MODEL_URLS = [
                    '/models',
                    '/public/models',
                    './models',
                    '../models',
                    window.location.origin + '/models'
                ];

                console.log("Loading face-api.js models for manager...");

                let modelLoadSuccess = false;
                let lastError: Error | null = null;

                for (const url of MODEL_URLS) {
                    try {
                        console.log(`Trying to load models from: ${url}`);

                        await faceapi.nets.tinyFaceDetector.loadFromUri(url);
                        await faceapi.nets.ssdMobilenetv1.loadFromUri(url);
                        await faceapi.nets.faceLandmark68Net.loadFromUri(url);
                        await faceapi.nets.faceRecognitionNet.loadFromUri(url);

                        console.log(`All models loaded successfully from ${url}`);
                        modelLoadSuccess = true;
                        break;
                    } catch (err) {
                        console.error(`Failed to load models from ${url}:`, err);
                        lastError = err instanceof Error ? err : new Error(String(err));
                    }
                }

                if (modelLoadSuccess) {
                    if (isMounted) {
                        setModelsLoaded(true);
                        toast({
                            title: "Mô hình AI đã sẵn sàng",
                            description: "Có thể sử dụng chức năng nhận diện khuôn mặt",
                        });
                    }
                } else {
                    throw new Error(lastError ? lastError.message : "Failed to load models from any location");
                }
            } catch (error) {
                console.error("Error loading face-api.js models:", error);
                if (isMounted) {
                    toast({
                        title: "Lỗi tải mô hình AI",
                        description: error instanceof Error ? error.message : "Failed to load face recognition models",
                        variant: "destructive",
                    });
                }
            } finally {
                if (isMounted) {
                    setIsLoadingModels(false);
                }
            }
        };

        loadFaceApiModels();

        return () => {
            isMounted = false;
        };
    }, [toast, modelsLoaded]);

    // Initialize form data when profile loads
    useEffect(() => {
        if (profile) {
            setEmail(profile.email || '');
            setPhone(profile.phone || '');
            setPosition(profile.position || '');
            setDepartmentId(profile.departmentId || undefined);
        }
    }, [profile]);

    // Face detection using face-api.js
    const detectFaceFromWebcam = async (): Promise<string> => {
        if (!videoRef.current || !canvasRef.current) {
            throw new Error("Camera not ready");
        }

        if (!modelsLoaded) {
            throw new Error("Face detection models not loaded");
        }

        const options = new faceapi.TinyFaceDetectorOptions({
            inputSize: 416,
            scoreThreshold: 0.5
        });

        try {
            // First check if any face is detected
            console.log("Running pre-check for face detection...");
            const preCheck = await faceapi.detectSingleFace(videoRef.current, options);
            if (!preCheck) {
                throw new Error("Không phát hiện khuôn mặt. Vui lòng đảm bảo khuôn mặt của bạn hiển thị rõ trong khung hình.");
            }

            // Proceed with full detection with descriptors
            console.log("Face detected, running full face analysis...");
            const results = await faceapi.detectSingleFace(videoRef.current, options)
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!results) {
                throw new Error("Không thể phân tích khuôn mặt. Vui lòng thử lại với ánh sáng tốt hơn.");
            }

            console.log("Face detected successfully", results);

            // Draw the detected face on the canvas for visual feedback
            const dims = {
                width: videoRef.current.videoWidth || videoRef.current.width || 640,
                height: videoRef.current.videoHeight || videoRef.current.height || 480
            };
            faceapi.matchDimensions(canvasRef.current, dims);
            const resizedResults = faceapi.resizeResults(results, dims);

            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                faceapi.draw.drawDetections(canvasRef.current, [resizedResults]);
                faceapi.draw.drawFaceLandmarks(canvasRef.current, [resizedResults]);
            }

            // Return the face descriptor as a string
            return Array.from(results.descriptor).toString();
        } catch (error) {
            console.error("Error during face detection:", error);
            throw error instanceof Error ? error : new Error("Quá trình nhận diện khuôn mặt thất bại");
        }
    };

    // Detect face from uploaded image
    const detectFaceFromImage = async (imageFile: File): Promise<string> => {
        if (!modelsLoaded) {
            throw new Error("Face detection models not loaded");
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = async () => {
                try {
                    const options = new faceapi.TinyFaceDetectorOptions({
                        inputSize: 416,
                        scoreThreshold: 0.5
                    });

                    const detection = await faceapi.detectSingleFace(img, options)
                        .withFaceLandmarks()
                        .withFaceDescriptor();

                    if (!detection) {
                        reject(new Error("Không phát hiện khuôn mặt trong ảnh. Vui lòng chọn ảnh khác."));
                        return;
                    }

                    resolve(Array.from(detection.descriptor).toString());
                } catch (error) {
                    reject(error);
                }
            };
            img.onerror = () => {
                reject(new Error("Không thể tải ảnh. Vui lòng chọn file ảnh hợp lệ."));
            };
            img.src = URL.createObjectURL(imageFile);
        });
    };

    // Start webcam capture
    const startWebcamCapture = async () => {
        if (!modelsLoaded) {
            toast({
                title: "Mô hình AI chưa sẵn sàng",
                description: "Vui lòng đợi mô hình tải xong",
                variant: "destructive",
            });
            return;
        }

        try {
            setCaptureMode('webcam');
            setIsCapturing(true);
            setCaptureStatus('processing');
            setDetectorStatus('processing');

            const stream = await navigator.mediaDevices.getUserMedia({ video: true });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();

                // Wait for video to be ready and then detect face
                setTimeout(async () => {
                    try {
                        const faceDescriptor = await detectFaceFromWebcam();

                        if (!accessToken) {
                            throw new Error("Access token not found");
                        }

                        setCaptureStatus('success');
                        setDetectorStatus('success');

                        // Upload face descriptor
                        await updateFaceProfileMutation.mutateAsync({
                            faceDescriptor: faceDescriptor.split(',').map(Number)
                        });

                        // Stop camera
                        stream.getTracks().forEach(track => track.stop());

                    } catch (error) {
                        console.error("Error capturing face:", error);
                        setCaptureStatus('error');
                        setDetectorStatus('error');
                        toast({
                            title: "Lỗi chụp ảnh",
                            description: error instanceof Error ? error.message : "Đã có lỗi xảy ra",
                            variant: "destructive",
                        });

                        // Stop camera on error
                        stream.getTracks().forEach(track => track.stop());
                    }
                }, 3000); // Wait 3 seconds for user to position
            }
        } catch (error) {
            console.error("Error accessing camera:", error);
            toast({
                title: "Lỗi camera",
                description: "Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.",
                variant: "destructive",
            });
            setCaptureMode('none');
            setIsCapturing(false);
        }
    };

    // Handle file upload
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast({
                title: "File không hợp lệ",
                description: "Vui lòng chọn file ảnh",
                variant: "destructive",
            });
            return;
        }

        try {
            setCaptureMode('upload');
            setCaptureStatus('processing');

            const faceDescriptor = await detectFaceFromImage(file);

            if (!accessToken) {
                throw new Error("Access token not found");
            }

            setCaptureStatus('success');

            // Upload face descriptor
            await updateFaceProfileMutation.mutateAsync({
                faceDescriptor: faceDescriptor.split(',').map(Number)
            });

        } catch (error) {
            console.error("Error processing uploaded image:", error);
            setCaptureStatus('error');
            toast({
                title: "Lỗi xử lý ảnh",
                description: error instanceof Error ? error.message : "Đã có lỗi xảy ra",
                variant: "destructive",
            });
        }
    };

    const handlePersonalDetailsUpdate = () => {
        updateProfileMutation.mutate({
            email,
            phone,
            position,
            departmentId
        });
    };

    const handlePasswordChange = () => {
        if (newPassword !== confirmPassword) {
            toast({
                title: "❌ Mật khẩu không khớp",
                description: "Mật khẩu mới và xác nhận mật khẩu phải giống nhau",
                variant: "destructive",
            });
            return;
        }

        if (newPassword.length < 6) {
            toast({
                title: "❌ Mật khẩu quá ngắn",
                description: "Mật khẩu phải có ít nhất 6 ký tự",
                variant: "destructive",
            });
            return;
        }

        updatePasswordMutation.mutate({
            currentPassword,
            newPassword,
            confirmPassword
        });
    };

    const handleDeleteFaceData = () => {
        if (!accessToken) {
            toast({
                title: "Phiên đã hết hạn",
                description: "Vui lòng xác thực lại email",
                variant: "destructive",
            });
            return;
        }

        deleteFaceProfileMutation.mutate();
    };

    if (isProfileLoading) {
        return (
            <div className="flex flex-col flex-1 overflow-hidden">
                <Header title="Hồ sơ Quản lý" />
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-6">
                        <Skeleton className="h-8 w-64" />
                        <div className="grid gap-6 md:grid-cols-2">
                            <Skeleton className="h-64" />
                            <Skeleton className="h-64" />
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (profileError) {
        return (
            <div className="flex flex-col flex-1 overflow-hidden">
                <Header title="Hồ sơ quản lý" />
                <main className="flex-1 overflow-y-auto p-6">
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-center">
                                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold mb-2">Không thể tải thông tin</h3>
                                <p className="text-muted-foreground">
                                    {profileError instanceof Error ? profileError.message : "Đã xảy ra lỗi"}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </main>
            </div>
        );
    }

    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            <Header title="Hồ sơ quản lý" />
            <main className="flex-1 overflow-y-auto p-6">
                <div className="container mx-auto max-w-4xl">
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-blue-900">Hồ sơ quản lý</h1>
                        <p className="text-gray-600 mt-2">Quản lý thông tin cá nhân và cài đặt bảo mật</p>
                    </div>

                    <Tabs defaultValue="personal" className="space-y-6">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="personal" className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                Thông tin cá nhân
                            </TabsTrigger>
                            <TabsTrigger value="security" className="flex items-center gap-2">
                                <Lock className="w-4 h-4" />
                                Bảo mật
                            </TabsTrigger>
                            <TabsTrigger value="face-data" className="flex items-center gap-2">
                                <Camera className="w-4 h-4" />
                                Dữ liệu khuôn mặt
                            </TabsTrigger>
                        </TabsList>

                        {/* Personal Details Tab */}
                        <TabsContent value="personal">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <User className="w-5 h-5 text-blue-600" />
                                        Thông tin cá nhân
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="email">Email</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="manager@company.com"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="phone">Số điện thoại</Label>
                                            <Input
                                                id="phone"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="0123456789"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="position">Chức vụ</Label>
                                            <Input
                                                id="position"
                                                value={position}
                                                onChange={(e) => setPosition(e.target.value)}
                                                placeholder="Manager"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="department">Phòng ban</Label>
                                            <Select value={departmentId?.toString() || ""} onValueChange={(value) => setDepartmentId(value ? parseInt(value) : undefined)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Chọn phòng ban" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {departments.map((dept: any) => (
                                                        <SelectItem key={dept.id} value={dept.id.toString()}>
                                                            {getDepartmentDisplayName(dept.name)}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handlePersonalDetailsUpdate}
                                        disabled={updateProfileMutation.isPending}
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        {updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Cập nhật thông tin
                                    </Button>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Security Tab */}
                        <TabsContent value="security">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Lock className="w-5 h-5 text-blue-600" />
                                        Đổi mật khẩu
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
                                        <div className="relative">
                                            <Input
                                                id="currentPassword"
                                                type={showCurrentPassword ? "text" : "password"}
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                placeholder="Nhập mật khẩu hiện tại"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-0 top-0 h-full px-3"
                                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                            >
                                                {showCurrentPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="newPassword">Mật khẩu mới</Label>
                                        <div className="relative">
                                            <Input
                                                id="newPassword"
                                                type={showNewPassword ? "text" : "password"}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder="Nhập mật khẩu mới"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-0 top-0 h-full px-3"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                            >
                                                {showNewPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
                                        <div className="relative">
                                            <Input
                                                id="confirmPassword"
                                                type={showConfirmPassword ? "text" : "password"}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="Nhập lại mật khẩu mới"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-0 top-0 h-full px-3"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            >
                                                {showConfirmPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handlePasswordChange}
                                        disabled={updatePasswordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        {updatePasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Đổi mật khẩu
                                    </Button>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Face Data Tab */}
                        <TabsContent value="face-data">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Camera className="w-5 h-5 text-blue-600" />
                                        Quản lý dữ liệu khuôn mặt
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {!isVerified || !isAccessTokenValid() ? (
                                        <div className="text-center space-y-4">
                                            <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                                                <Shield className="w-8 h-8 text-blue-600" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold mb-2">Xác thực email để tiếp tục</h3>
                                                <p className="text-muted-foreground mb-4">
                                                    Để bảo mật dữ liệu khuôn mặt, vui lòng xác thực email trước khi cập nhật
                                                </p>
                                                <Button
                                                    onClick={() => setShowEmailVerification(true)}
                                                    className="bg-blue-600 hover:bg-blue-700"
                                                >
                                                    <Shield className="w-4 h-4 mr-2" />
                                                    Xác thực Email
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {/* Current Face Data Status */}
                                            <Card>
                                                <CardContent className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-3 h-3 rounded-full ${faceProfile?.hasProfile || profile?.hasFaceData ? 'bg-green-500' : 'bg-gray-300'}`} />
                                                        <span className="font-medium">
                                                            {faceProfile?.hasProfile || profile?.hasFaceData ? 'Đã có dữ liệu khuôn mặt' : 'Chưa có dữ liệu khuôn mặt'}
                                                        </span>
                                                    </div>
                                                    {(faceProfile?.hasProfile || profile?.hasFaceData) && (
                                                        <div className="mt-4 flex gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => setCaptureMode('webcam')}
                                                                disabled={!modelsLoaded}
                                                            >
                                                                <Edit className="w-4 h-4 mr-1" />
                                                                Chỉnh sửa
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={handleDeleteFaceData}
                                                                disabled={deleteFaceProfileMutation.isPending}
                                                                className="text-red-600 hover:text-red-700"
                                                            >
                                                                {deleteFaceProfileMutation.isPending ? (
                                                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                                                ) : (
                                                                    <Trash2 className="w-4 h-4 mr-1" />
                                                                )}
                                                                Xóa
                                                            </Button>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>

                                            {/* Capture Options */}
                                            {captureMode === 'none' && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={startWebcamCapture}>
                                                        <CardContent className="p-6 text-center">
                                                            <Webcam className="w-12 h-18 mx-auto mb-4 text-blue-600" />
                                                            <h3 className="font-semibold mb-2">Chụp từ Webcam</h3>
                                                            <p className="text-sm text-muted-foreground">
                                                                Sử dụng camera để chụp ảnh khuôn mặt
                                                            </p>
                                                        </CardContent>
                                                    </Card>
                                                    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => fileInputRef.current?.click()}>
                                                        <CardContent className="p-6 text-center">
                                                            <Upload className="w-12 h-18 mx-auto mb-4 text-blue-600" />
                                                            <h3 className="font-semibold mb-2">Tải ảnh lên</h3>
                                                            <p className="text-sm text-muted-foreground">
                                                                Chọn ảnh từ thiết bị của bạn
                                                            </p>
                                                        </CardContent>
                                                    </Card>
                                                </div>
                                            )}

                                            {/* Webcam Capture */}
                                            {captureMode === 'webcam' && (
                                                <Card>
                                                    <CardContent className="p-6">
                                                        <div className="relative">
                                                            <video
                                                                ref={videoRef}
                                                                className="w-full h-80 bg-black rounded-lg object-cover"
                                                                autoPlay
                                                                muted
                                                                playsInline
                                                            />
                                                            <canvas
                                                                ref={canvasRef}
                                                                className="absolute top-0 left-0 w-full h-80 rounded-lg"
                                                            />
                                                            {captureStatus === 'processing' && (
                                                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                                                                    <div className="text-center text-white">
                                                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                                                        <p>Đang xử lý khuôn mặt...</p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {captureStatus === 'success' && (
                                                                <div className="absolute inset-0 flex items-center justify-center bg-green-500/20 rounded-lg">
                                                                    <div className="text-center text-green-800">
                                                                        <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                                                                        <p>Thành công!</p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {captureStatus === 'error' && (
                                                                <div className="absolute inset-0 flex items-center justify-center bg-red-500/20 rounded-lg">
                                                                    <div className="text-center text-red-800">
                                                                        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                                                                        <p>Có lỗi xảy ra</p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="mt-4 flex gap-2 justify-center">
                                                            <Button
                                                                variant="outline"
                                                                onClick={() => {
                                                                    setCaptureMode('none');
                                                                    setIsCapturing(false);
                                                                    // Stop camera
                                                                    if (videoRef.current?.srcObject) {
                                                                        const stream = videoRef.current.srcObject as MediaStream;
                                                                        stream.getTracks().forEach(track => track.stop());
                                                                    }
                                                                }}
                                                            >
                                                                Hủy
                                                            </Button>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            )}

                                            {/* Upload Processing */}
                                            {captureMode === 'upload' && (
                                                <Card>
                                                    <CardContent className="p-6 text-center">
                                                        {captureStatus === 'processing' && (
                                                            <div>
                                                                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                                                                <p>Đang xử lý ảnh...</p>
                                                            </div>
                                                        )}
                                                        {captureStatus === 'success' && (
                                                            <div>
                                                                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-4" />
                                                                <p>Xử lý ảnh thành công!</p>
                                                            </div>
                                                        )}
                                                        {captureStatus === 'error' && (
                                                            <div>
                                                                <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-4" />
                                                                <p>Có lỗi khi xử lý ảnh</p>
                                                                <Button
                                                                    variant="outline"
                                                                    className="mt-2"
                                                                    onClick={() => setCaptureMode('none')}
                                                                >
                                                                    Thử lại
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            )}

                                            {/* Hidden file input */}
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileUpload}
                                                className="hidden"
                                            />

                                            {!modelsLoaded && (
                                                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                                                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                                    <p className="text-sm text-yellow-700">Đang tải mô hình AI...</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </main>

            {/* Email Verification Modal */}
            {showEmailVerification && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <ManagerEmailVerification
                            employeeId={profile?.id || 0}
                            employeeEmail={profile?.email || ""}
                            onVerificationSuccess={handleVerificationSuccess}
                            onCancel={() => setShowEmailVerification(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
} 