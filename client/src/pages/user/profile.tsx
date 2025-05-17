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
    MapPin, UserCheck, Lock, Camera, Upload, RefreshCw, Trash2, Scan, CheckCircle, AlertCircle
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
import { AttendanceProfile } from "@/components/face-recognition/attendance-profile";

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

export default function ProfilePage() {
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

    // Load face-api.js models
    useEffect(() => {
        let isMounted = true;

        const loadFaceApiModels = async () => {
            if (isModelsLoaded) return; // Skip if already loaded

            setIsLoadingModels(true);

            try {
                // Try different possible model locations
                const MODEL_URLS = [
                    '/models',
                    '/public/models',
                    './models',
                    '../models',
                    window.location.origin + '/models'
                ];

                console.log("Attempting to load face-api.js models...");

                let modelLoadSuccess = false;
                let lastError: Error | null = null;

                // Try each possible path until one works
                for (const url of MODEL_URLS) {
                    try {
                        console.log(`Trying to load models from: ${url}`);

                        // Load TinyFaceDetector model first instead of TinyYolov2
                        await faceapi.nets.tinyFaceDetector.loadFromUri(url);
                        console.log(`Success loading TinyFaceDetector from ${url}`);

                        // Then load the other models
                        await faceapi.nets.ssdMobilenetv1.loadFromUri(url);
                        console.log(`Success loading SsdMobilenetv1 from ${url}`);

                        await faceapi.nets.faceLandmark68Net.loadFromUri(url);
                        console.log(`Success loading faceLandmark68Net from ${url}`);

                        await faceapi.nets.faceRecognitionNet.loadFromUri(url);
                        console.log(`Success loading faceRecognitionNet from ${url}`);

                        console.log(`All models loaded successfully from ${url}`);
                        modelLoadSuccess = true;
                        break;
                    } catch (err) {
                        console.error(`Failed to load models from ${url}:`, err);
                        lastError = err instanceof Error ? err : new Error(String(err));
                        // Continue to next URL
                    }
                }

                // Check if models were loaded successfully
                if (modelLoadSuccess) {
                    // Only set state if component is still mounted
                    if (isMounted) {
                        setIsModelsLoaded(true);
                        toast({
                            title: t('user.faceProfile.modelsLoaded'),
                            description: t('user.faceProfile.readyToUse'),
                        });
                    }
                } else {
                    throw new Error(lastError ? lastError.message : "Failed to load models from any location");
                }
            } catch (error) {
                console.error("Error loading face-api.js models:", error);
                if (isMounted) {
                    toast({
                        title: t('user.faceProfile.modelLoadError'),
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
    }, [toast, t]);

    // Query to get employee profile data
    const {
        data: profileData,
        isLoading,
        error,
    } = useQuery({
        queryKey: ["/api/employees/profile", user?.employeeId],
        queryFn: async () => {
            if (!user?.employeeId) return null;

            const response = await fetch(`/api/employees/${user.employeeId}`, {
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch profile data: ${response.statusText}`);
            }

            return await response.json();
        },
        enabled: !!user?.employeeId,
    });

    // Get face profile data
    const { data: faceProfileData, isLoading: isLoadingFaceProfile } = useQuery({
        queryKey: ['userFaceProfile', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const response = await apiRequest.get(`/api/users/${user.id}/face-profile`);
            return response.data;
        },
        enabled: !!user?.id,
    });

    // Add this query to get departments list
    const { data: departmentsData, isLoading: isLoadingDepartments } = useQuery<Department[]>({
        queryKey: ["/api/departments"],
        queryFn: async () => {
            const response = await fetch("/api/departments", {
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch departments: ${response.statusText}`);
            }

            return await response.json();
        },
    });

    // Form for profile update
    const profileForm = useForm<ProfileFormValues>({
        resolver: zodResolver(profileUpdateSchema),
        defaultValues: {
            email: "",
            phone: "",
            position: "",
            departmentId: null,
        },
        values: profileData ? {
            email: profileData.email || "",
            phone: profileData.phone || "",
            position: profileData.position || "",
            departmentId: profileData.departmentId || null,
        } : undefined,
    });

    // Form for password update
    const passwordForm = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordUpdateSchema),
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
    });

    // Mutation to update profile
    const updateProfileMutation = useMutation({
        mutationFn: async (data: ProfileFormValues) => {
            if (!user?.employeeId) throw new Error("Employee ID not found");

            const response = await fetch(`/api/employees/${user.employeeId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error(`Failed to update profile: ${response.statusText}`);
            }

            return await response.json();
        },
        onSuccess: () => {
            toast({
                title: t("user.profile.updateSuccess"),
                description: t("user.profile.profileUpdated"),
            });
            queryClient.invalidateQueries({ queryKey: ["/api/employees/profile", user?.employeeId] });
        },
        onError: (error) => {
            toast({
                title: t("common.error"),
                description: error.message,
                variant: "destructive",
            });
        },
    });

    // Mutation to update password
    const updatePasswordMutation = useMutation({
        mutationFn: async (data: PasswordFormValues) => {
            if (!user?.id) throw new Error("User ID not found");

            const response = await fetch(`/api/users/${user.id}/password`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentPassword: data.currentPassword,
                    newPassword: data.newPassword,
                }),
                credentials: "include",
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to update password: ${response.statusText}`);
            }

            return await response.json();
        },
        onSuccess: () => {
            toast({
                title: t("user.profile.passwordUpdateSuccess"),
                description: t("user.profile.passwordUpdated"),
            });
            passwordForm.reset();
        },
        onError: (error) => {
            toast({
                title: t("common.error"),
                description: error.message,
                variant: "destructive",
            });
        },
    });

    // Mutation for registering face
    const registerFaceMutation = useMutation({
        mutationFn: async (descriptorString: string) => {
            if (!user?.id) throw new Error("User ID not found");
            const response = await apiRequest.post(`/api/users/${user.id}/face-profile`, {
                faceDescriptor: descriptorString
            });
            return response.data;
        },
        onSuccess: () => {
            setCaptureStatus('waiting');
            setDetectorStatus('waiting');
            toast({
                title: t('user.faceProfile.saveSuccess'),
                description: t('employees.faceDataSaved'),
                variant: "default",
            });

            // Invalidate and refetch the face profile data
            queryClient.invalidateQueries({ queryKey: ['userFaceProfile', user?.id] });

            // Reset states after successful registration
            setTimeout(() => {
                setIsCapturing(false);
                setCaptureStatus('waiting');
                setDetectorStatus('waiting');
            }, 1500);
        },
        onError: (error: any) => {
            toast({
                title: t('user.faceProfile.saveError'),
                description: error.message || t('employees.cannotSaveFaceData'),
                variant: "destructive",
            });
            setCaptureStatus('error');
            setDetectorStatus('error');
        },
    });

    // Mutation for resetting face data
    const resetFaceDataMutation = useMutation({
        mutationFn: async () => {
            if (!user?.id) throw new Error("User ID not found");
            const response = await apiRequest.delete(`/api/users/${user.id}/face-profile`);
            return response.data;
        },
        onSuccess: () => {
            toast({
                title: t('employees.faceDataReset'),
                description: t('employees.faceDataResetMessage'),
                variant: "default",
            });

            // Invalidate and refetch the face profile data
            queryClient.invalidateQueries({ queryKey: ['userFaceProfile', user?.id] });
        },
        onError: (error: any) => {
            toast({
                title: t('user.faceProfile.saveError'),
                description: error.message || t('employees.faceResetError'),
                variant: "destructive",
            });
        },
    });

    // Handle profile form submission
    const onProfileSubmit = (data: ProfileFormValues) => {
        updateProfileMutation.mutate(data);
    };

    // Handle password form submission
    const onPasswordSubmit = (data: PasswordFormValues) => {
        updatePasswordMutation.mutate(data);
    };

    // Handle profile image upload
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user?.employeeId) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append("avatar", file);

        try {
            const response = await fetch(`/api/employees/${user.employeeId}/avatar`, {
                method: "POST",
                body: formData,
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error(`Failed to upload avatar: ${response.statusText}`);
            }

            queryClient.invalidateQueries({ queryKey: ["/api/employees/profile", user.employeeId] });

            toast({
                title: t("user.profile.avatarUpdateSuccess"),
                description: t("user.profile.avatarUpdated"),
            });
        } catch (error) {
            toast({
                title: t("common.error"),
                description: error instanceof Error ? error.message : String(error),
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
        }
    };

    // Function to handle face capture from webcam
    const startWebcamCapture = async () => {
        if (!isModelsLoaded) {
            toast({
                title: t('user.faceProfile.modelLoadError'),
                description: t('user.faceProfile.waitForModels'),
                variant: "destructive",
            });
            return;
        }

        if (!videoRef.current || !canvasRef.current) {
            toast({
                title: t('user.faceProfile.cameraError'),
                description: t('user.faceProfile.cameraNotFound'),
                variant: "destructive",
            });
            return;
        }

        try {
            setCaptureStatus('processing');
            setDetectorStatus('processing');

            // Display processing notification
            toast({
                title: t('user.faceProfile.processingFace'),
                description: t('user.faceProfile.pleaseWait'),
            });

            // Đảm bảo model đã được tải
            if (!faceapi.nets.tinyFaceDetector.isLoaded) {
                console.log("TinyFaceDetector model is not loaded, loading now...");
                // Thử tải lại model nếu cần
                await faceapi.nets.tinyFaceDetector.load('/models');
            }

            // Wait a moment to ensure video is ready for capture
            await new Promise(resolve => setTimeout(resolve, 300));

            // Lưu trữ video element để tránh kiểm tra null nhiều lần
            // Đã kiểm tra ở đầu hàm nên chắc chắn videoRef.current không null ở đây
            const videoElement = videoRef.current as HTMLVideoElement;  // Type assertion
            const canvasElement = canvasRef.current as HTMLCanvasElement;  // Type assertion

            // First check if any face is detected using TinyFaceDetector
            console.log("Running pre-check for face detection with TinyFaceDetector...");
            const preCheck = await faceapi.detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions());
            if (!preCheck) {
                toast({
                    title: t('user.faceProfile.noFaceDetected'),
                    description: t('user.faceProfile.tryAgain'),
                    variant: "destructive",
                });
                setCaptureStatus('error');
                setDetectorStatus('error');
                setTimeout(() => {
                    setCaptureStatus('waiting');
                    setDetectorStatus('waiting');
                }, 2000);
                return;
            }

            // Proceed with full detection with descriptors using SSD Mobilenet
            console.log("Face detected, running full face analysis...");
            const results = await faceapi.detectSingleFace(videoElement)
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!results) {
                toast({
                    title: t('user.faceProfile.noFaceDetected'),
                    description: t('user.faceProfile.tryAgain'),
                    variant: "destructive",
                });
                setCaptureStatus('error');
                setDetectorStatus('error');
                setTimeout(() => {
                    setCaptureStatus('waiting');
                    setDetectorStatus('waiting');
                }, 2000);
                return;
            }

            console.log("Face detected successfully", results);

            // Draw the detected face on the canvas for visual feedback
            const dims = {
                width: videoElement.videoWidth || videoElement.width || 640,
                height: videoElement.videoHeight || videoElement.height || 480
            };
            faceapi.matchDimensions(canvasElement, dims);
            const resizedResults = faceapi.resizeResults(results, dims);

            const ctx = canvasElement.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
                faceapi.draw.drawDetections(canvasElement, [resizedResults]);
                faceapi.draw.drawFaceLandmarks(canvasElement, [resizedResults]);
            }

            // Extract descriptor from the detected face and convert to string
            const descriptorString = Array.from(results.descriptor).toString();

            // Register face with the API
            registerFaceMutation.mutate(descriptorString);

        } catch (error) {
            console.error("Error capturing face:", error);
            toast({
                title: t('user.faceProfile.saveError'),
                description: t('user.faceProfile.errorProcessingFace'),
                variant: "destructive",
            });
            setCaptureStatus('error');
            setDetectorStatus('error');

            // Reset the status after a delay
            setTimeout(() => {
                setCaptureStatus('waiting');
                setDetectorStatus('waiting');
            }, 2000);
        }
    };

    // Function to trigger file input
    const triggerFileUpload = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    // Function to handle file upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!isModelsLoaded) {
            toast({
                title: t('user.faceProfile.modelLoadError'),
                description: t('user.faceProfile.waitForModels'),
                variant: "destructive",
            });
            return;
        }

        // Check if file is an image
        if (!file.type.startsWith('image/')) {
            toast({
                title: t('user.faceProfile.saveError'),
                description: t('employees.invalidFileType'),
                variant: "destructive",
            });
            return;
        }

        setUploadedImage(file);
        setCaptureStatus('processing');

        try {
            // Load image and process with face-api.js
            const img = await faceapi.bufferToImage(file);

            // Get face descriptor using face-api.js
            const detections = await faceapi.detectSingleFace(img)
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (detections) {
                const descriptor = detections.descriptor;

                // Convert Float32Array to string for API transmission
                const descriptorString = Array.from(descriptor).toString();
                registerFaceMutation.mutate(descriptorString);
            } else {
                toast({
                    title: t('user.faceProfile.noFaceDetected'),
                    description: t('employees.noFaceDetected'),
                    variant: "destructive",
                });
                setCaptureStatus('error');
            }
        } catch (error) {
            console.error("Error processing uploaded image:", error);
            toast({
                title: t('user.faceProfile.saveError'),
                description: t('employees.cannotProcessFace'),
                variant: "destructive",
            });
            setCaptureStatus('error');
        } finally {
            // Reset the file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            setUploadedImage(null);
        }
    };

    // Function to handle reset face data
    const handleResetFaceData = () => {
        if (confirm(t('user.faceProfile.confirmReset'))) {
            resetFaceDataMutation.mutate();
        }
    };

    // Cancel capturing
    const cancelCapture = () => {
        setIsCapturing(false);
        setCaptureStatus('waiting');
        setDetectorStatus('waiting');
    };

    // Update the face tab content to show loading state
    const renderFaceTabContent = () => {
        if (isLoadingModels) {
            return (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <div className="text-center">
                        <p className="text-lg font-medium">{t('user.faceProfile.loadingModels')}</p>
                        <p className="text-sm text-muted-foreground">{t('user.faceProfile.pleaseWait')}</p>
                    </div>
                </div>
            );
        }

        if (!isModelsLoaded) {
            return (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                    <div className="text-center">
                        <p className="text-lg font-medium">{t('user.faceProfile.modelLoadError')}</p>
                        <p className="text-sm text-muted-foreground">{t('user.faceProfile.tryReload')}</p>
                        <Button
                            variant="outline"
                            onClick={() => window.location.reload()}
                            className="mt-4"
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            {t('common.refresh')}
                        </Button>
                    </div>
                </div>
            );
        }

        return (
            <>
                {/* Face Profile Status */}
                {faceProfileData?.hasFaceProfile ? (
                    <div className="bg-green-50 border border-green-600 p-4 rounded-md flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-medium text-green-800">{t('user.faceProfile.profileExists')}</h4>
                            <p className="text-sm text-green-700 mt-1">
                                {t('user.faceProfile.profileExistsDesc')}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-amber-50 border border-amber-600 p-4 rounded-md flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-medium text-amber-800">{t('user.faceProfile.noProfile')}</h4>
                            <p className="text-sm text-amber-700 mt-1">
                                {t('user.faceProfile.noProfileDesc')}
                            </p>
                        </div>
                    </div>
                )}

                {/* Face Capture UI */}
                {isCapturing ? (
                    <div className="space-y-4">
                        <div className="mx-auto max-w-md">
                            <div className="relative w-full aspect-[4/3] mb-4 bg-muted rounded-md overflow-hidden">
                                {/* Video element */}
                                <video
                                    ref={videoRef}
                                    className="absolute inset-0 w-full h-full object-contain z-10"
                                    autoPlay
                                    muted
                                    playsInline
                                    style={{ display: 'block' }}
                                />

                                {/* Canvas element for drawing face detections */}
                                <canvas
                                    ref={canvasRef}
                                    className="absolute inset-0 w-full h-full z-20"
                                    style={{ background: 'transparent' }}
                                />

                                {/* Processing overlay */}
                                {captureStatus === 'processing' && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-30">
                                        <div className="flex flex-col items-center space-y-2">
                                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                            <p className="text-sm font-medium text-white">{t('user.faceProfile.processingFace')}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Instructions overlay */}
                                <div className="absolute inset-0 pointer-events-none z-30">
                                    <div className="h-full flex flex-col justify-end p-4">
                                        <div className="text-center bg-black/30 rounded-md p-2 text-white text-sm">
                                            {t('user.faceProfile.cameraInstructions')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center space-x-4">
                            <Button
                                variant="outline"
                                onClick={cancelCapture}
                                disabled={captureStatus === 'processing'}
                            >
                                {t('common.cancel')}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Tabs defaultValue="webcam" className="w-full" onValueChange={(value) => setActiveWebcamTab(value)}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="webcam">{t('user.faceProfile.useWebcam')}</TabsTrigger>
                            <TabsTrigger value="upload">{t('user.faceProfile.orUpload')}</TabsTrigger>
                        </TabsList>

                        <TabsContent value="webcam" className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                {t('user.faceProfile.webcamInstructions')}
                            </p>

                            <div className="mx-auto max-w-md">
                                <div className="relative w-full aspect-[4/3] mb-4 bg-muted rounded-md overflow-hidden">
                                    {/* Video element */}
                                    <video
                                        ref={videoRef}
                                        className="absolute inset-0 w-full h-full object-contain z-10"
                                        autoPlay
                                        muted
                                        playsInline
                                        style={{ display: 'block' }}
                                    />

                                    {/* Canvas element for drawing face detections */}
                                    <canvas
                                        ref={canvasRef}
                                        className="absolute inset-0 w-full h-full z-20"
                                        style={{ background: 'transparent' }}
                                    />

                                    {/* Indicator when no camera is available */}
                                    {!cameraStream && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-30">
                                            <div className="text-center">
                                                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary mb-2" />
                                                <p className="text-white text-sm">{t('user.faceProfile.initializingCamera')}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-center">
                                <Button
                                    className="w-1/4"
                                    onClick={startWebcamCapture}
                                    disabled={!isModelsLoaded || !cameraStream}
                                >
                                    <Camera className="mr-2 h-4 w-4" />
                                    {t('user.faceProfile.takePicture')}
                                </Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="upload" className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                {t('user.faceProfile.uploadHint')}
                            </p>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileUpload}
                            />
                            <div className="flex justify-center">
                                <Button
                                    className="w-1/4 "
                                    onClick={triggerFileUpload}
                                    disabled={captureStatus === 'processing' || !isModelsLoaded}
                                >
                                    <Upload className="mr-2 h-4 w-4" />
                                    {t('user.faceProfile.uploadImage')}
                                </Button>
                            </div>
                            {uploadedImage && (
                                <div className="pt-2">
                                    <p className="text-sm">{uploadedImage.name}</p>
                                </div>
                            )}

                            {captureStatus === 'processing' && (
                                <div className="flex items-center justify-center py-4">
                                    <RefreshCw className="h-6 w-6 animate-spin text-primary mr-2" />
                                    <p>{t('user.faceProfile.extractingFeatures')}</p>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                )}

                {/* Reset Face Data Button */}
                {faceProfileData?.hasFaceProfile && (
                    <div className="pt-4 border-t flex justify-center">
                        <Button
                            variant="destructive"
                            onClick={handleResetFaceData}
                            disabled={resetFaceDataMutation.isPending}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {resetFaceDataMutation.isPending
                                ? t('common.processing')
                                : t('user.faceProfile.resetFaceData')
                            }
                        </Button>
                    </div>
                )}
            </>
        );
    };

    // Cập nhật useEffect để khởi động camera với tỉ lệ 4:3
    useEffect(() => {
        // Kết nối camera chỉ khi:
        // 1. Đang ở tab "face" 
        // 2. Các models đã được tải
        // 3. Không đang ở chế độ chụp
        // 4. Tab con đang hiển thị là "webcam"
        const shouldConnectCamera = currentTab === "face" && isModelsLoaded && !isCapturing && activeWebcamTab === "webcam";

        // Kiểm tra nếu camera hiện tại đã kết nối hoặc không
        const isCameraConnected = cameraStream && cameraStream.active && cameraStream.getVideoTracks().some(track => track.readyState === 'live');

        if (shouldConnectCamera && !isCameraConnected) {
            console.log("Starting camera preview: tab active, models loaded, not capturing");
            // Start camera for preview
            const startCameraPreview = async () => {
                try {
                    if (cameraStream) {
                        console.log("Stopping existing camera stream");
                        cameraStream.getTracks().forEach(track => track.stop());
                    }

                    console.log("Requesting camera access");
                    // Kết nối camera mới với tỉ lệ 4:3
                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            width: { ideal: 640 },
                            height: { ideal: 480 },  // Tỉ lệ 4:3 (640x480)
                            aspectRatio: 4 / 3,        // Đảm bảo tỉ lệ 4:3
                            facingMode: "user"
                        },
                        audio: false
                    });

                    console.log("Camera access granted, connecting to video element");
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        // Đảm bảo video hiển thị
                        videoRef.current.style.display = 'block';

                        // Thêm sự kiện loadedmetadata để đảm bảo video có kích thước phù hợp
                        videoRef.current.onloadedmetadata = () => {
                            if (videoRef.current && canvasRef.current) {
                                canvasRef.current.width = videoRef.current.videoWidth;
                                canvasRef.current.height = videoRef.current.videoHeight;
                                console.log("Video dimensions set:", videoRef.current.videoWidth, videoRef.current.videoHeight);
                            }
                        };

                        // Thêm sự kiện để đảm bảo video đang chạy
                        videoRef.current.onplaying = () => {
                            if (videoRef.current) {
                                console.log("Video is now playing with dimensions:", videoRef.current.videoWidth, "x", videoRef.current.videoHeight);
                            }
                        };
                    }

                    setCameraStream(stream);
                    console.log("Camera preview started successfully");
                } catch (error) {
                    console.error("Error starting camera preview:", error);
                    toast({
                        title: t('user.faceProfile.cameraError'),
                        description: t('user.faceProfile.checkCameraPermissions'),
                        variant: "destructive",
                    });
                }
            };

            startCameraPreview();
        } else if (!shouldConnectCamera && cameraStream) {
            console.log("Stopping camera: leaving tab or starting capture");
            // Ngắt kết nối camera khi rời khỏi tab hoặc bắt đầu chụp
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        }

        // Clean up function
        return () => {
            if (cameraStream && (currentTab !== "face" || isCapturing || activeWebcamTab !== "webcam")) {
                console.log("Cleanup: stopping camera stream");
                cameraStream.getTracks().forEach(track => track.stop());
                setCameraStream(null);
                if (videoRef.current) {
                    videoRef.current.srcObject = null;
                }
            }
        };
    }, [currentTab, isModelsLoaded, isCapturing, cameraStream, toast, t, activeWebcamTab]);

    // Thêm một useEffect mới để kiểm tra khi video đã sẵn sàng
    useEffect(() => {
        if (!videoRef.current || !canvasRef.current) return;

        const handleVideoReady = () => {
            if (videoRef.current && videoRef.current.videoWidth > 0) {
                console.log("Video is ready with dimensions:", videoRef.current.videoWidth, videoRef.current.videoHeight);

                // Đặt kích thước canvas khớp với video
                if (canvasRef.current) {
                    canvasRef.current.width = videoRef.current.videoWidth;
                    canvasRef.current.height = videoRef.current.videoHeight;
                }
            }
        };

        videoRef.current.addEventListener('loadedmetadata', handleVideoReady);

        return () => {
            if (videoRef.current) {
                videoRef.current.removeEventListener('loadedmetadata', handleVideoReady);
            }
        };
    }, [videoRef.current, canvasRef.current]);

    if (isLoading) {
        return (
            <>
                <Header
                    title={t("user.profile.title")}
                    description={t("user.profile.description")}
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
                    title={t("user.profile.title")}
                    description={t("user.profile.description")}
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

    if (!profileData) {
        return (
            <>
                <Header
                    title={t("user.profile.title")}
                    description={t("user.profile.description")}
                />
                <div className="p-4 md:p-6">
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-center py-4 text-muted-foreground">
                                {t("user.profile.noProfile")}
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
                title={t("user.profile.title")}
                description={t("user.profile.description")}
            />

            <div className="p-4 md:p-6">
                <div className="grid gap-6 md:grid-cols-3">
                    {/* Profile Summary Card */}
                    <Card className="md:col-span-1">
                        <CardHeader>
                            <CardTitle>{t("user.profile.summary")}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center text-center">
                            <div className="relative mb-6">
                                <Avatar className="h-32 w-32">
                                    <AvatarImage src={profileData.avatarUrl || ""} alt={profileData.firstName} />
                                    <AvatarFallback className="text-4xl">
                                        {profileData.firstName?.[0]}
                                        {profileData.lastName?.[0]}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-2 -right-2">
                                    <Label htmlFor="avatar-upload" className="cursor-pointer">
                                        <div className="rounded-full bg-primary p-2 text-white hover:bg-primary/90">
                                            {isUploading ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Camera className="h-4 w-4" />
                                            )}
                                        </div>
                                    </Label>
                                    <Input
                                        id="avatar-upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageUpload}
                                        disabled={isUploading}
                                    />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold">{`${profileData.lastName} ${profileData.firstName}`}</h3>
                            <p className="text-muted-foreground">{profileData.position}</p>
                            <div className="mt-6 space-y-2 w-full">
                                <div className="flex items-center">
                                    <User className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <span className="text-sm">ID: {profileData.employeeId}</span>
                                </div>
                                <div className="flex items-center">
                                    <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <span className="text-sm">{profileData.email}</span>
                                </div>
                                <div className="flex items-center">
                                    <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <span className="text-sm">{profileData.phone}</span>
                                </div>
                                <div className="flex items-center">
                                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <span className="text-sm">
                                        {profileData.birthDate
                                            ? format(new Date(profileData.birthDate), "dd/MM/yyyy")
                                            : "-"}
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <span className="text-sm">
                                        {profileData.departmentId && departmentsData
                                            ? getDepartmentDisplayName(departmentsData.find((d) => d.id === profileData.departmentId)?.name || "")
                                            : t("employees.notSpecified")}
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <UserCheck className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <span className="text-sm">
                                        {t("employees.joinDate")}: {format(new Date(profileData.joinDate), "dd/MM/yyyy")}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Profile Edit Tabs */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>{t("user.profile.editProfile")}</CardTitle>
                            <CardDescription>
                                {t("user.profile.updateYourInfo")}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="details" onValueChange={(value) => setCurrentTab(value)}>
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="details">{t("user.profile.personalDetails")}</TabsTrigger>
                                    <TabsTrigger value="security">{t("user.profile.security")}</TabsTrigger>
                                    <TabsTrigger value="face">{t("user.faceProfile.title")}</TabsTrigger>
                                </TabsList>
                                <TabsContent value="details" className="pt-4">
                                    <Form {...profileForm}>
                                        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                                            <FormField
                                                control={profileForm.control}
                                                name="email"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{t("employees.email")}</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={profileForm.control}
                                                name="phone"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{t("employees.phone")}</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={profileForm.control}
                                                name="position"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{t("employees.position")}</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={profileForm.control}
                                                name="departmentId"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{t("employees.department")}</FormLabel>
                                                        <Select
                                                            disabled={isLoadingDepartments}
                                                            onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                                                            value={field.value ? field.value.toString() : ""}
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder={t("employees.selectDepartment")} />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {isLoadingDepartments ? (
                                                                    <SelectItem value="loading" disabled>
                                                                        {t("employees.loadingDepartments")}
                                                                    </SelectItem>
                                                                ) : departmentsData?.length ? (
                                                                    departmentsData.map((dept: Department) => {
                                                                        // Sử dụng hàm helper để hiển thị tên phòng ban đầy đủ
                                                                        const displayName = getDepartmentDisplayName(dept.name);

                                                                        return (
                                                                            <SelectItem key={dept.id} value={dept.id.toString()}>
                                                                                {displayName}
                                                                            </SelectItem>
                                                                        );
                                                                    })
                                                                ) : (
                                                                    <SelectItem value="none" disabled>
                                                                        {t("employees.noDepartments")}
                                                                    </SelectItem>
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <div className="flex justify-center">
                                                <Button
                                                    type="submit"
                                                    disabled={updateProfileMutation.isPending}
                                                    className="w-1/4"
                                                >
                                                    {updateProfileMutation.isPending && (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    )}
                                                    {t("common.save")}
                                                </Button>
                                            </div>
                                        </form>
                                    </Form>
                                </TabsContent>
                                <TabsContent value="security" className="pt-4">
                                    <Form {...passwordForm}>
                                        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                                            <FormField
                                                control={passwordForm.control}
                                                name="currentPassword"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{t("user.profile.currentPassword")}</FormLabel>
                                                        <FormControl>
                                                            <Input type="password" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={passwordForm.control}
                                                name="newPassword"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{t("user.profile.newPassword")}</FormLabel>
                                                        <FormControl>
                                                            <Input type="password" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={passwordForm.control}
                                                name="confirmPassword"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{t("user.profile.confirmPassword")}</FormLabel>
                                                        <FormControl>
                                                            <Input type="password" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <div className="flex justify-center">
                                                <Button
                                                    type="submit"
                                                    disabled={updatePasswordMutation.isPending}
                                                    className="w-1/4"
                                                >
                                                    {updatePasswordMutation.isPending && (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    )}
                                                    {t("user.profile.updatePassword")}
                                                </Button>
                                            </div>
                                        </form>
                                    </Form>
                                </TabsContent>
                                <TabsContent value="face" className="pt-4">
                                    <AttendanceProfile userId={user?.id} type="user" t={t} />
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
} 