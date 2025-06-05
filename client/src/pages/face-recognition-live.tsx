import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CameraIcon, RefreshCw, Loader2, LogIn, LogOut, Eye, Lock, Unlock } from "lucide-react";
import { RecognitionStatus } from "@/components/face-recognition/recognition-status";
import { FaceDetector } from "@/components/face-recognition/face-detector";
import { EmailVerification } from "@/components/face-recognition/email-verification";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import * as faceapi from 'face-api.js';
import { format } from "date-fns";

export type RecognizedUser = {
    id: number;
    employeeId: string;
    name: string;
    department: string;
    time: string;
    attendanceType?: 'checkin' | 'checkout';
};

export type RecognitionStatusType = 'waiting' | 'processing' | 'success' | 'error';

export default function FaceRecognitionLive() {
    const { toast } = useToast();
    const [status, setStatus] = useState<RecognitionStatusType>('waiting');
    const [recognizedUser, setRecognizedUser] = useState<RecognizedUser | null>(null);
    const [currentAttendanceType, setCurrentAttendanceType] = useState<'checkin' | 'checkout'>('checkin');
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const landmarkCanvasRef = useRef<HTMLCanvasElement>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const componentMounted = useRef(true);
    const [detectedFaceDescriptor, setDetectedFaceDescriptor] = useState<string | null>(null);
    const [autoProcessing, setAutoProcessing] = useState(false);
    const [showLandmarks, setShowLandmarks] = useState(true);
    const [faceDetectionInfo, setFaceDetectionInfo] = useState<{
        confidence: number;
        landmarkCount: number;
        faceSize: { width: number; height: number } | null;
    }>({
        confidence: 0,
        landmarkCount: 0,
        faceSize: null
    });

    // Admin verification states
    const [isVerified, setIsVerified] = useState(false);
    const [showVerification, setShowVerification] = useState(true);
    const [accessToken, setAccessToken] = useState<string | null>(null);

    // Screen lock states
    const [isScreenLocked, setIsScreenLocked] = useState(false);
    const [showUnlockVerification, setShowUnlockVerification] = useState(false);

    // Fetch employee's today work hours if recognized
    const { data: workHoursData } = useQuery({
        queryKey: ['workHours', recognizedUser?.id],
        queryFn: async () => {
            if (!recognizedUser?.id) return null;

            const today = format(new Date(), 'yyyy-MM-dd');
            const res = await apiRequest("GET", `/api/work-hours/employee/${recognizedUser.id}?date=${today}`);

            if (!res.ok) return null;
            return res.data;
        },
        enabled: !!recognizedUser?.id && status === 'success',
    });

    // Check camera readiness
    const checkCameraReady = (logDetails = false): boolean => {
        if (!videoRef.current) {
            console.error("Video element not found");
            return false;
        }

        const hasStream = !!videoRef.current.srcObject;
        const isPlaying = videoRef.current.readyState >= 2 &&
            !videoRef.current.paused &&
            !videoRef.current.ended &&
            videoRef.current.currentTime > 0;

        if (logDetails) {
            console.log("Camera readiness check:", {
                readyState: videoRef.current.readyState,
                paused: videoRef.current.paused,
                ended: videoRef.current.ended,
                currentTime: videoRef.current.currentTime,
                srcObject: hasStream,
                isPlaying
            });
        }

        return hasStream && isPlaying;
    };

    // Face landmark detection
    const detectFaceLandmarks = async () => {
        if (!videoRef.current || !landmarkCanvasRef.current || !checkCameraReady()) {
            return;
        }

        const options = new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: 0.5
        });

        try {
            const detection = await faceapi.detectSingleFace(videoRef.current, options)
                .withFaceLandmarks()
                .withFaceDescriptor();

            const canvas = landmarkCanvasRef.current;
            const ctx = canvas.getContext('2d');

            if (!ctx) return;

            const video = videoRef.current;
            const displayWidth = video.offsetWidth;
            const displayHeight = video.offsetHeight;

            canvas.width = displayWidth;
            canvas.height = displayHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (detection) {
                setFaceDetectionInfo({
                    confidence: Math.round(detection.detection.score * 100),
                    landmarkCount: detection.landmarks.positions.length,
                    faceSize: {
                        width: Math.round(detection.detection.box.width),
                        height: Math.round(detection.detection.box.height)
                    }
                });

                if (showLandmarks) {
                    const scaleX = displayWidth / (video.videoWidth || video.width || 640);
                    const scaleY = displayHeight / (video.videoHeight || video.height || 480);
                    const landmarks = detection.landmarks;

                    const drawSmoothCurve = (points: any[], color: string, lineWidth: number = 0.8, closed: boolean = false) => {
                        if (points.length < 2) return;

                        ctx.strokeStyle = color;
                        ctx.lineWidth = lineWidth;
                        ctx.lineCap = 'round';
                        ctx.lineJoin = 'round';
                        ctx.beginPath();

                        const scaledPoints = points.map(point => ({
                            x: point.x * scaleX,
                            y: point.y * scaleY
                        }));

                        ctx.moveTo(scaledPoints[0].x, scaledPoints[0].y);

                        for (let i = 1; i < scaledPoints.length; i++) {
                            const current = scaledPoints[i];
                            const previous = scaledPoints[i - 1];

                            if (i === scaledPoints.length - 1 && !closed) {
                                ctx.lineTo(current.x, current.y);
                            } else {
                                const next = scaledPoints[i + 1] || scaledPoints[0];
                                const cpx = (previous.x + current.x) / 2;
                                const cpy = (previous.y + current.y) / 2;
                                ctx.quadraticCurveTo(previous.x, previous.y, cpx, cpy);
                            }
                        }

                        if (closed) {
                            ctx.closePath();
                        }
                        ctx.stroke();
                    };

                    // Draw landmarks with blue color
                    const jawPoints = landmarks.positions.slice(0, 17);
                    drawSmoothCurve(jawPoints, '#3b82f6', 0.8, false);

                    const rightEyebrowPoints = landmarks.positions.slice(17, 22);
                    drawSmoothCurve(rightEyebrowPoints, '#3b82f6', 0.8, false);

                    const leftEyebrowPoints = landmarks.positions.slice(22, 27);
                    drawSmoothCurve(leftEyebrowPoints, '#3b82f6', 0.8, false);

                    const noseBridgePoints = landmarks.positions.slice(27, 31);
                    drawSmoothCurve(noseBridgePoints, '#3b82f6', 0.8, false);

                    const noseTipPoints = landmarks.positions.slice(31, 36);
                    drawSmoothCurve(noseTipPoints, '#3b82f6', 0.8, false);

                    const rightEyePoints = landmarks.positions.slice(36, 42);
                    drawSmoothCurve(rightEyePoints, '#3b82f6', 0.8, true);

                    const leftEyePoints = landmarks.positions.slice(42, 48);
                    drawSmoothCurve(leftEyePoints, '#3b82f6', 0.8, true);

                    const outerLipsPoints = landmarks.positions.slice(48, 60);
                    drawSmoothCurve(outerLipsPoints, '#3b82f6', 0.8, true);

                    const innerLipsPoints = landmarks.positions.slice(60, 68);
                    drawSmoothCurve(innerLipsPoints, '#3b82f6', 0.8, true);

                    // Draw landmark points
                    landmarks.positions.forEach((point) => {
                        const scaledPoint = { x: point.x * scaleX, y: point.y * scaleY };
                        ctx.fillStyle = '#8b5cf6';
                        ctx.beginPath();
                        ctx.arc(scaledPoint.x, scaledPoint.y, 1.2, 0, 2 * Math.PI);
                        ctx.fill();
                    });

                    // Draw face bounding box
                    const box = detection.detection.box;
                    const scaledBox = {
                        x: box.x * scaleX,
                        y: box.y * scaleY,
                        width: box.width * scaleX,
                        height: box.height * scaleY
                    };

                    ctx.strokeStyle = '#16a34a';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(scaledBox.x, scaledBox.y, scaledBox.width, scaledBox.height);

                    ctx.fillStyle = '#16a34a';
                    ctx.fillRect(scaledBox.x, scaledBox.y - 25, 60, 20);
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 12px Arial';
                    ctx.fillText(
                        `${Math.round(detection.detection.score * 100)}%`,
                        scaledBox.x + 5,
                        scaledBox.y - 10
                    );
                }
            } else {
                setFaceDetectionInfo({
                    confidence: 0,
                    landmarkCount: 0,
                    faceSize: null
                });
            }
        } catch (error) {
            console.error('Lỗi phát hiện landmarks:', error);
            const canvas = landmarkCanvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
            }
        }
    };

    // Continuous landmark detection
    useEffect(() => {
        let animationId: number;

        const detectLoop = () => {
            if (isCameraReady) {
                detectFaceLandmarks();
            }
            animationId = requestAnimationFrame(detectLoop);
        };

        if (isCameraReady) {
            detectLoop();
        }

        return () => {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        };
    }, [isCameraReady, showLandmarks]);

    // Clear landmarks when processing
    useEffect(() => {
        if (isProcessing || status === 'success') {
            const landmarkCanvas = landmarkCanvasRef.current;
            const mainCanvas = canvasRef.current;

            if (landmarkCanvas) {
                const ctx = landmarkCanvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, landmarkCanvas.width, landmarkCanvas.height);
                }
            }

            if (mainCanvas) {
                const ctx = mainCanvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
                }
            }

            if (status === 'success') {
                setShowLandmarks(false);
                setTimeout(() => {
                    setShowLandmarks(true);
                }, 3000);
            }
        }
    }, [isProcessing, status]);

    // Clock in mutation
    const clockInMutation = useMutation({
        mutationFn: async (faceDescriptor: string) => {
            try {
                const res = await apiRequest("POST", "/api/time-logs", {
                    faceDescriptor,
                    type: 'checkin',
                });

                const data = res.data;
                return data;
            } catch (error: any) {
                if (error.response?.errorData?.employee) {
                    const data = error.response.errorData;
                    return {
                        ...data,
                        wasSuccessful: true,
                        _error: new Error(data.message || 'Clock-in warning')
                    };
                }
                throw error;
            }
        },
        onSuccess: (data) => {
            if (data._error) {
                toast({
                    title: "Chấm công thành công với cảnh báo",
                    description: data._error.message,
                    variant: "default",
                });
            } else {
                let employeeName = "Nhân viên";
                if (data.employee && typeof data.employee === 'object') {
                    const firstName = data.employee.firstName || '';
                    const lastName = data.employee.lastName || '';
                    employeeName = `${firstName} ${lastName}`.trim() || "Nhân viên";
                }

                toast({
                    title: "Chấm công vào thành công",
                    description: `${employeeName} đã chấm công vào thành công`,
                });
            }

            setStatus('success');
            const employeeData = data.employee || {};
            const employeeDepartment = employeeData.department || {};

            setRecognizedUser({
                id: data.employeeId || 0,
                employeeId: employeeData.employeeId || '',
                name: employeeData.firstName && employeeData.lastName ?
                    `${employeeData.firstName} ${employeeData.lastName}` : "Nhân viên",
                department: employeeDepartment.name || 'Không xác định',
                time: new Date(data.logTime || new Date()).toLocaleTimeString('vi-VN', {
                    timeZone: 'Asia/Ho_Chi_Minh',
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                }),
                attendanceType: 'checkin',
            });

            setIsProcessing(false);
        },
        onError: (error: Error) => {
            setStatus('error');
            toast({
                title: "Nhận diện thất bại",
                description: error.message || "Không thể xử lý dữ liệu khuôn mặt",
                variant: "destructive",
            });
            setIsProcessing(false);
        },
    });

    // Clock out mutation
    const clockOutMutation = useMutation({
        mutationFn: async (faceDescriptor: string) => {
            try {
                const res = await apiRequest("POST", "/api/time-logs", {
                    faceDescriptor,
                    type: 'checkout',
                });

                const data = res.data;
                return data;
            } catch (error: any) {
                if (error.response?.errorData?.employee) {
                    const data = error.response.errorData;
                    return {
                        ...data,
                        wasSuccessful: true,
                        _error: new Error(data.message || 'Clock-out warning')
                    };
                }
                throw error;
            }
        },
        onSuccess: (data) => {
            if (data._error) {
                toast({
                    title: "Chấm công ra thành công với cảnh báo",
                    description: data._error.message,
                    variant: "default",
                });
            } else {
                let employeeName = "Nhân viên";
                if (data.employee && typeof data.employee === 'object') {
                    const firstName = data.employee.firstName || '';
                    const lastName = data.employee.lastName || '';
                    employeeName = `${firstName} ${lastName}`.trim() || "Nhân viên";
                }

                toast({
                    title: "Chấm công ra thành công",
                    description: `${employeeName} đã chấm công ra thành công`,
                });
            }

            setStatus('success');
            const employeeData = data.employee || {};
            const employeeDepartment = employeeData.department || {};

            setRecognizedUser({
                id: data.employeeId || 0,
                employeeId: employeeData.employeeId || '',
                name: employeeData.firstName && employeeData.lastName ?
                    `${employeeData.firstName} ${employeeData.lastName}` : "Nhân viên",
                department: employeeDepartment.name || 'Không xác định',
                time: new Date(data.logTime || new Date()).toLocaleTimeString('vi-VN', {
                    timeZone: 'Asia/Ho_Chi_Minh',
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                }),
                attendanceType: 'checkout',
            });

            setIsProcessing(false);
        },
        onError: (error: Error) => {
            setStatus('error');
            toast({
                title: "Nhận diện thất bại",
                description: error.message || "Không thể xử lý dữ liệu khuôn mặt",
                variant: "destructive",
            });
            setIsProcessing(false);
        },
    });

    // Helper function to capture face descriptor
    const captureFaceDescriptor = async (): Promise<string> => {
        if (!videoRef.current || !canvasRef.current) {
            throw new Error("Camera chưa được khởi tạo");
        }

        if (!checkCameraReady()) {
            toast({
                title: "Camera chưa sẵn sàng",
                description: "Vui lòng đợi camera khởi động hoàn tất và thử lại.",
                variant: "destructive",
            });
            throw new Error("Camera chưa sẵn sàng. Vui lòng đợi một chút và thử lại.");
        }

        const options = new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: 0.7
        });

        await new Promise(resolve => setTimeout(resolve, 300));

        try {
            const preCheck = await faceapi.detectSingleFace(videoRef.current, options);
            if (!preCheck) {
                throw new Error("Không phát hiện khuôn mặt. Vui lòng đảm bảo khuôn mặt của bạn hiển thị rõ trong khung hình.");
            }

            const results = await faceapi.detectSingleFace(videoRef.current, options)
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!results) {
                throw new Error("Không thể phân tích đặc trưng khuôn mặt. Vui lòng thử lại với ánh sáng tốt hơn.");
            }

            if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                }
            }

            return Array.from(results.descriptor).toString();
        } catch (error) {
            console.error("Lỗi trong quá trình nhận diện khuôn mặt:", error);
            throw error instanceof Error ? error : new Error("Quá trình nhận diện khuôn mặt thất bại");
        }
    };

    const handleClockIn = async () => {
        if (isProcessing) return;
        setCurrentAttendanceType('checkin'); // Set attendance type cho checkin
        setIsProcessing(true);
        setStatus('processing');

        try {
            const descriptor = await captureFaceDescriptor();
            await clockInMutation.mutateAsync(descriptor);
        } catch (error: any) {
            setStatus('error');
            toast({
                title: "Lỗi",
                description: error.message || "Đã xảy ra lỗi trong quá trình chấm công",
                variant: "destructive",
            });
            setIsProcessing(false);
        }
    };

    const handleClockOut = async () => {
        if (isProcessing) return;
        setCurrentAttendanceType('checkout'); // Set attendance type cho checkout
        setIsProcessing(true);
        setStatus('processing');

        try {
            const descriptor = await captureFaceDescriptor();
            await clockOutMutation.mutateAsync(descriptor);
        } catch (error: any) {
            setStatus('error');
            toast({
                title: "Lỗi",
                description: error.message || "Đã xảy ra lỗi trong quá trình chấm công",
                variant: "destructive",
            });
            setIsProcessing(false);
        }
    };

    const handleRefresh = () => {
        setStatus('waiting');
        setRecognizedUser(null);
        setDetectedFaceDescriptor(null);
        setFaceDetectionInfo({
            confidence: 0,
            landmarkCount: 0,
            faceSize: null
        });
    };

    // Handle screen lock/unlock
    const toggleScreenLock = () => {
        if (isScreenLocked) {
            // Unlocking - show verification modal
            setShowUnlockVerification(true);
        } else {
            // Locking
            setIsScreenLocked(true);
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
            document.body.style.height = '100%';
            document.body.style.touchAction = 'none';
            document.documentElement.style.overflow = 'hidden';

            const viewport = document.querySelector('meta[name="viewport"]');
            if (viewport) {
                viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
            }

            toast({
                title: "🔒 Màn hình đã được khóa",
                description: "Không thể cuộn hoặc zoom màn hình",
                duration: 2000,
            });
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
            document.body.style.height = '';
            document.body.style.touchAction = '';
            document.documentElement.style.overflow = '';
        };
    }, []);

    // Refresh camera check
    useEffect(() => {
        let checkCount = 0;

        const checkInterval = setInterval(() => {
            const shouldLog = checkCount % 5 === 0;
            checkCount++;

            const ready = checkCameraReady(shouldLog);

            if (ready !== isCameraReady) {
                setIsCameraReady(ready);
                if (ready) {
                    console.log("Camera đã sẵn sàng sử dụng");
                }
            }
        }, 5000);

        return () => clearInterval(checkInterval);
    }, [isCameraReady]);

    // Handle verification success - auto lock screen
    const handleVerificationSuccess = (token: string) => {
        setAccessToken(token);
        setIsVerified(true);
        setShowVerification(false);

        // Auto lock screen after verification
        setIsScreenLocked(true);
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.height = '100%';
        document.body.style.touchAction = 'none';
        document.documentElement.style.overflow = 'hidden';

        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
        }

        toast({
            title: "✅ Xác thực thành công và đã khóa màn hình!",
            description: "Bạn đã có quyền truy cập vào tất cả tính năng trong 10 phút. Màn hình đã được khóa tự động.",
            duration: 5000,
        });
    };

    // Handle verification cancel - không cho phép tắt form nếu chưa xác thực
    const handleVerificationCancel = () => {
        if (!isVerified) {
            toast({
                title: "⚠️ Không thể bỏ qua xác thực",
                description: "Bạn cần xác thực email để sử dụng hệ thống. Chỉ admin có quyền truy cập.",
                variant: "destructive",
                duration: 3000,
            });
            return;
        }
        setShowVerification(false);
    };

    // Handle unlock verification success
    const handleUnlockVerificationSuccess = (token: string) => {
        setAccessToken(token);
        setShowUnlockVerification(false);

        // Unlock screen
        setIsScreenLocked(false);
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.height = '';
        document.body.style.touchAction = '';
        document.documentElement.style.overflow = '';

        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
        }

        toast({
            title: "🔓 Màn hình đã được mở khóa",
            description: "Có thể cuộn và zoom màn hình bình thường",
            duration: 2000,
        });
    };

    // Handle unlock verification cancel - allow to cancel
    const handleUnlockVerificationCancel = () => {
        setShowUnlockVerification(false);
        toast({
            title: "Hủy mở khóa",
            description: "Màn hình vẫn được giữ ở trạng thái khóa",
            duration: 2000,
        });
    };

    return (
        <div className={`${isScreenLocked ? 'h-screen overflow-hidden' : 'min-h-screen'} bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col p-2`}>
            {/* Email Verification Modal - Initial */}
            {showVerification && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <EmailVerification
                        employeeId={1}
                        employeeEmail=""
                        onVerificationSuccess={handleVerificationSuccess}
                        onCancel={handleVerificationCancel}
                    />
                </div>
            )}

            {/* Email Verification Modal - Unlock */}
            {showUnlockVerification && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <EmailVerification
                        employeeId={1}
                        employeeEmail=""
                        onVerificationSuccess={handleUnlockVerificationSuccess}
                        onCancel={handleUnlockVerificationCancel}
                    />
                </div>
            )}

            {/* Main Content */}
            <div className="grid grid-cols-10 gap-4 flex-1 min-h-0">
                {/* Camera Section - 7/10 */}
                <div className="col-span-7">
                    <Card className="shadow-lg h-full">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-center text-lg font-semibold flex items-center justify-center">
                                <CameraIcon className="mr-2 h-5 w-5" />
                                Camera nhận diện khuôn mặt
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pb-2">
                            <div className="relative mb-3">
                                <FaceDetector
                                    onFaceRecognized={(descriptor, person) => { }}
                                    videoRef={videoRef}
                                    canvasRef={canvasRef}
                                    status={status}
                                    modelsPreloaded={false}
                                />

                                <canvas
                                    ref={landmarkCanvasRef}
                                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                                    style={{ zIndex: 10 }}
                                />

                                {/* Control Buttons Overlay on Camera - Thu hẹp chiều rộng, tăng chiều cao */}
                                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
                                    <div className="flex gap-4">
                                        <Button
                                            onClick={handleClockIn}
                                            disabled={isProcessing || !isCameraReady || !isVerified}
                                            className="h-16 w-40 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg text-lg px-3 flex flex-row items-center justify-center font-semibold gap-2"
                                            size="sm"
                                        >
                                            {isProcessing && currentAttendanceType === 'checkin' ? (
                                                <Loader2 className="h-6 w-6 animate-spin" />
                                            ) : (
                                                <>
                                                    <LogIn className="h-6 w-6" />
                                                    <span className="text-lg">Vào</span>
                                                </>
                                            )}
                                        </Button>

                                        <Button
                                            onClick={handleClockOut}
                                            disabled={isProcessing || !isCameraReady || !isVerified}
                                            className="h-16 w-40 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg text-lg px-3 flex flex-row items-center justify-center font-semibold gap-2"
                                            size="sm"
                                        >
                                            {isProcessing && currentAttendanceType === 'checkout' ? (
                                                <Loader2 className="h-6 w-6 animate-spin" />
                                            ) : (
                                                <>
                                                    <LogOut className="h-6 w-6" />
                                                    <span className="text-lg">Ra</span>
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {/* Refresh Button - Top Right Corner */}
                                <div className="absolute top-4 right-4 z-20">
                                    <Button
                                        onClick={handleRefresh}
                                        variant="outline"
                                        className="h-8 w-8 p-0 bg-white/90 backdrop-blur-sm shadow-lg"
                                        size="sm"
                                        disabled={!isVerified}
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Status Section - 3/10 */}
                <div className="col-span-3 flex flex-col space-y-4">
                    {/* Face Detection Info */}
                    <Card className="shadow-lg">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-center text-lg font-semibold flex items-center justify-center">
                                🎯 Phát hiện khuôn mặt
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pb-2">
                            <div className="flex items-center justify-between mb-3">
                                <Button
                                    onClick={() => setShowLandmarks(!showLandmarks)}
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-3 text-xs"
                                    disabled={!isVerified}
                                >
                                    <Eye className="mr-1 h-3 w-3" />
                                    {showLandmarks ? 'Ẩn landmarks' : 'Hiện landmarks'}
                                </Button>

                                {/* Lock/Unlock Button in Face Detection Card */}
                                <Button
                                    onClick={toggleScreenLock}
                                    variant={isScreenLocked ? "default" : "outline"}
                                    size="sm"
                                    className={`h-8 px-2 text-xs ${isScreenLocked ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-gray-300'}`}
                                    disabled={!isVerified}
                                >
                                    {isScreenLocked ? (
                                        <Lock className="h-3 w-3" />
                                    ) : (
                                        <Unlock className="h-3 w-3" />
                                    )}
                                </Button>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Độ tin cậy:</span>
                                    <div className="flex items-center space-x-2">
                                        <div className={`w-3 h-3 rounded-full ${faceDetectionInfo.confidence > 80 ? 'bg-green-500' : faceDetectionInfo.confidence > 60 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                                        <span className="font-medium text-sm">
                                            {faceDetectionInfo.confidence > 0 ? `${faceDetectionInfo.confidence}%` : 'Không phát hiện'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Điểm landmark:</span>
                                    <span className="text-sm text-gray-600">
                                        {faceDetectionInfo.landmarkCount > 0 ? `${faceDetectionInfo.landmarkCount} điểm` : 'Chưa có'}
                                    </span>
                                </div>

                                {faceDetectionInfo.faceSize && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Kích thước:</span>
                                        <span className="text-sm text-gray-600">
                                            {faceDetectionInfo.faceSize.width}x{faceDetectionInfo.faceSize.height}px
                                        </span>
                                    </div>
                                )}

                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Màn hình:</span>
                                    <span className={`text-sm font-medium ${isScreenLocked ? 'text-red-600' : 'text-green-600'}`}>
                                        {isScreenLocked ? '🔒 Đã khóa' : '🔓 Mở'}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recognition Status */}
                    <Card className="shadow-lg">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-center text-lg font-semibold">
                                Trạng thái nhận diện
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pb-2">
                            <RecognitionStatus
                                status={status}
                                recognizedUser={recognizedUser}
                                onRetry={handleRefresh}
                                attendanceType={currentAttendanceType}
                            />
                        </CardContent>
                    </Card>

                    {/* Admin Status */}
                    <Card className="shadow-lg">
                        <CardContent className="pt-4">
                            <div className="text-center">
                                <h3 className="text-base font-semibold mb-3 text-gray-800">
                                    🔐 Trạng thái xác thực
                                </h3>
                                <div className={`p-2 rounded-lg border-2 ${isVerified
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-red-50 border-red-200'
                                    }`}>
                                    <div className="flex items-center justify-center mb-1">
                                        <div className={`w-3 h-3 rounded-full mr-2 ${isVerified ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                        <span className={`font-medium text-sm ${isVerified ? 'text-green-700' : 'text-red-700'}`}>
                                            {isVerified ? 'Đã xác thực' : 'Chưa xác thực'}
                                        </span>
                                    </div>
                                    <p className={`text-xs ${isVerified ? 'text-green-600' : 'text-red-600'}`}>
                                        {isVerified
                                            ? 'Bạn có quyền truy cập đầy đủ tất cả tính năng'
                                            : 'Tất cả tính năng bị khóa - Cần xác thực admin'
                                        }
                                    </p>
                                </div>
                                {!isVerified && (
                                    <Button
                                        onClick={() => setShowVerification(true)}
                                        variant="outline"
                                        size="sm"
                                        className="mt-2"
                                    >
                                        Xác thực Admin
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>


                </div>
            </div>
        </div>
    );
} 
