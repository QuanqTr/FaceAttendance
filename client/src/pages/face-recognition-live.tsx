import { useEffect, useRef, useState } from "react";
import { FaceDetector } from "@/components/face-recognition/face-detector";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, UserCheck, AlertCircle, RefreshCcw, Camera, LogIn, LogOut } from "lucide-react";
import * as faceapi from 'face-api.js';
import { RecognitionStatusType } from "@/components/dashboard/attendance-recognition";

type RecognitionResponse = {
    success: boolean;
    message: string;
    employee?: {
        id: number;
        name: string;
        department?: number;
        position?: string;
        confidence: number;
    };
    attendance?: {
        checkInTime: string;
    };
};

export default function FaceRecognitionLive() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [status, setStatus] = useState<RecognitionStatusType>('waiting');
    const { toast } = useToast();
    const [isInitialized, setIsInitialized] = useState(false);
    const [isRestarting, setIsRestarting] = useState(false);
    const [recognitionResult, setRecognitionResult] = useState<RecognitionResponse | null>(null);
    const [isRecognizing, setIsRecognizing] = useState(false);
    const recognitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [initError, setInitError] = useState<string | null>(null);
    // Add state for clock in/out
    const [mode, setMode] = useState<'check_in' | 'check_out'>('check_in');
    const [recognitionSuccess, setRecognitionSuccess] = useState(false);

    // Tải model face-api.js
    const loadModels = async () => {
        try {
            const MODEL_URL = '/models';

            // Load ssdMobilenetv1 trước để đảm bảo nó được tải đúng cách
            console.log("Loading SSD Mobilenet model...");
            await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
            console.log("SSD Mobilenet model loaded successfully");

            // Sau đó tải các model khác
            console.log("Loading remaining models...");
            await Promise.all([
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL)
            ]);

            console.log("All Face API models loaded successfully");
            setModelsLoaded(true);
            setInitError(null);
            return true;
        } catch (error) {
            console.error("Error loading face-api.js models:", error);
            const errorMessage = error instanceof Error ? error.message : "Không thể tải model nhận diện khuôn mặt";
            setInitError(`Lỗi tải model: ${errorMessage}`);
            toast({
                title: "Lỗi khởi tạo model",
                description: "Không thể tải model nhận diện khuôn mặt. Vui lòng làm mới trang.",
                variant: "destructive",
            });
            return false;
        }
    };

    // Auto-start the recognition when the component mounts
    useEffect(() => {
        const initialize = async () => {
            try {
                setStatus('processing');

                // Đầu tiên tải các model
                const modelsLoadedSuccessfully = await loadModels();

                if (!modelsLoadedSuccessfully) {
                    setStatus('error');
                    return;
                }

                // Đánh dấu đã khởi tạo
                setIsInitialized(true);

                // Bắt đầu nhận diện sau 3 giây
                setTimeout(() => {
                    startRecognition();
                }, 3000);
            } catch (error) {
                console.error("Error starting face recognition:", error);
                const errorMessage = error instanceof Error ? error.message : "Không thể khởi tạo nhận diện khuôn mặt";
                setInitError(`Lỗi khởi tạo: ${errorMessage}`);
                setStatus('error');
                toast({
                    title: "Lỗi khởi tạo",
                    description: "Không thể khởi tạo nhận diện khuôn mặt. Vui lòng thử lại.",
                    variant: "destructive",
                });
            }
        };

        initialize();

        return () => {
            // Xóa timeout khi component unmount
            if (recognitionTimeoutRef.current) {
                clearTimeout(recognitionTimeoutRef.current);
            }
        };
    }, []);

    const startRecognition = async () => {
        if (!videoRef.current || isRecognizing || !modelsLoaded) return;

        setIsRecognizing(true);
        setStatus('processing');
        setRecognitionResult(null);
        setRecognitionSuccess(false);

        try {
            // Chờ 1 giây để camera ổn định
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Nhận diện khuôn mặt - Sử dụng SsdMobilenetv1 thay vì TinyFaceDetector
            const detections = await faceapi.detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options())
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detections) {
                setStatus('error');
                toast({
                    title: "Không phát hiện khuôn mặt",
                    description: "Vui lòng đảm bảo khuôn mặt của bạn được nhìn thấy rõ trong khung hình.",
                    variant: "destructive",
                });
                setIsRecognizing(false);
                return;
            }

            // Chuyển đổi descriptor thành chuỗi để gửi lên server
            const descriptorString = Array.from(detections.descriptor).toString();

            // Gửi lên server để xác thực
            const response = await fetch('/api/face-recognition/verify', {
                method: 'POST',
                body: JSON.stringify({
                    descriptor: descriptorString,
                    mode: mode // Send the check_in or check_out mode
                }),
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }

            // Parse kết quả từ server
            const result: RecognitionResponse = await response.json();

            // Xử lý kết quả
            if (result.success) {
                setStatus('success');
                setRecognitionResult(result);
                setRecognitionSuccess(true);
                toast({
                    title: "Nhận diện thành công",
                    description: `Xin chào, ${result.employee?.name}!`,
                });

                // Đặt lại recognition sau 10 giây
                recognitionTimeoutRef.current = setTimeout(() => {
                    setRecognitionResult(null);
                    setRecognitionSuccess(false);
                    startRecognition();
                }, 10000);
            } else {
                setStatus('error');
                setRecognitionResult(result);
                toast({
                    title: "Không thể nhận diện",
                    description: "Không thể xác nhận danh tính. Vui lòng thử lại.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Lỗi nhận diện khuôn mặt:", error);
            setStatus('error');
            const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi khi xử lý nhận diện khuôn mặt";
            setInitError(`Lỗi nhận diện: ${errorMessage}`);
            toast({
                title: "Lỗi xử lý",
                description: "Đã xảy ra lỗi khi xử lý nhận diện khuôn mặt.",
                variant: "destructive",
            });
        } finally {
            setIsRecognizing(false);
        }
    };

    const restartRecognition = () => {
        setIsRestarting(true);
        setStatus('waiting');
        setRecognitionResult(null);
        setInitError(null);
        setRecognitionSuccess(false);

        // Xóa timeout hiện tại nếu có
        if (recognitionTimeoutRef.current) {
            clearTimeout(recognitionTimeoutRef.current);
        }

        // Nếu models chưa được tải, thử tải lại
        if (!modelsLoaded) {
            loadModels().then(success => {
                if (success) {
                    setStatus('processing');
                    setIsRestarting(false);
                    startRecognition();
                } else {
                    setStatus('error');
                    setIsRestarting(false);
                }
            });
        } else {
            setTimeout(() => {
                setStatus('processing');
                setIsRestarting(false);
                startRecognition();
            }, 1000);
        }
    };

    function formatTime(dateStr: string) {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    const handleModeChange = (newMode: 'check_in' | 'check_out') => {
        setMode(newMode);
        if (recognitionResult) {
            // If we already have a recognition result, clear it for the new mode
            setRecognitionResult(null);
            setRecognitionSuccess(false);
        }
        // Display toast to indicate mode change
        toast({
            title: newMode === 'check_in' ? "Chế độ Check-in" : "Chế độ Check-out",
            description: newMode === 'check_in'
                ? "Đã chuyển sang chế độ điểm danh đến"
                : "Đã chuyển sang chế độ điểm danh về",
        });
    };

    return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-background">
            {/* Tiêu đề */}
            <h1 className="text-2xl md:text-3xl font-bold mb-4 text-center text-primary">
                Hệ thống nhận diện khuôn mặt
            </h1>

            {/* Clock In/Out mode selector */}
            <div className="mb-6 flex justify-center space-x-4">
                <Button
                    variant={mode === 'check_in' ? "default" : "outline"}
                    size="lg"
                    onClick={() => handleModeChange('check_in')}
                    className="font-medium"
                >
                    <LogIn className="mr-2 h-4 w-4" />
                    Check In
                </Button>
                <Button
                    variant={mode === 'check_out' ? "default" : "outline"}
                    size="lg"
                    onClick={() => handleModeChange('check_out')}
                    className="font-medium"
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Check Out
                </Button>
            </div>

            {/* Khu vực hiển thị camera và nhận diện */}
            <div className="relative w-full max-w-3xl h-[70vh] border-2 border-primary rounded-lg overflow-hidden">
                {(status === 'waiting' || isRestarting || !modelsLoaded) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted z-20">
                        <Loader2 className="h-12 w-12 animate-spin text-primary mb-2" />
                        <p className="text-lg font-medium">
                            {!modelsLoaded ? "Đang tải model nhận diện..." : "Đang khởi tạo camera..."}
                        </p>
                    </div>
                )}

                {isInitialized && (
                    <FaceDetector
                        videoRef={videoRef}
                        canvasRef={canvasRef}
                        status={status}
                        modelsPreloaded={modelsLoaded}
                    />
                )}

                {/* Hiển thị thông báo lỗi khởi tạo */}
                {status === 'error' && initError && !recognitionResult && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 z-10">
                        <div className="bg-card p-6 rounded-lg max-w-md w-full mx-auto shadow-lg">
                            <div className="flex items-center justify-center mb-3">
                                <AlertCircle className="h-12 w-12 text-destructive" />
                            </div>
                            <h2 className="text-xl font-bold text-center mb-1">Lỗi khởi tạo</h2>
                            <p className="text-center text-muted-foreground mb-4">{initError}</p>
                            <div className="space-y-3">
                                <Button onClick={restartRecognition} className="w-full">
                                    <RefreshCcw className="mr-2 h-4 w-4" />
                                    Thử lại
                                </Button>
                                <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
                                    <Camera className="mr-2 h-4 w-4" />
                                    Tải lại trang
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Overlay nhận diện thành công */}
                {status === 'success' && recognitionResult?.success && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 z-10">
                        <div className="bg-card p-6 rounded-lg max-w-md w-full mx-auto shadow-lg">
                            <div className="flex items-center justify-center mb-3">
                                <UserCheck className="h-12 w-12 text-green-500" />
                            </div>
                            <h2 className="text-xl font-bold text-center mb-1">Nhận diện thành công!</h2>
                            <div className="space-y-2 mt-3">
                                <div className="flex justify-between p-2 bg-muted rounded">
                                    <span className="font-medium">Họ và tên:</span>
                                    <span className="font-bold">{recognitionResult.employee?.name}</span>
                                </div>
                                {recognitionResult.employee?.position && (
                                    <div className="flex justify-between p-2 bg-muted rounded">
                                        <span className="font-medium">Chức vụ:</span>
                                        <span>{recognitionResult.employee.position}</span>
                                    </div>
                                )}
                                <div className="flex justify-between p-2 bg-muted rounded">
                                    <span className="font-medium">Thời gian:</span>
                                    <span>{recognitionResult.attendance ? formatTime(recognitionResult.attendance.checkInTime) : '-'}</span>
                                </div>
                                <div className="flex justify-between p-2 bg-muted rounded">
                                    <span className="font-medium">Trạng thái:</span>
                                    <span className="text-green-500 font-bold">
                                        {mode === 'check_in' ? 'Điểm danh đến thành công' : 'Điểm danh về thành công'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Overlay nhận diện thất bại */}
                {status === 'error' && recognitionResult && !recognitionResult.success && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 z-10">
                        <div className="bg-card p-6 rounded-lg max-w-md w-full mx-auto shadow-lg">
                            <div className="flex items-center justify-center mb-3">
                                <AlertCircle className="h-12 w-12 text-destructive" />
                            </div>
                            <h2 className="text-xl font-bold text-center mb-1">Không thể nhận diện</h2>
                            <p className="text-center text-muted-foreground">{recognitionResult.message}</p>
                            <div className="mt-4 flex justify-center">
                                <Button onClick={restartRecognition} className="w-full">
                                    <RefreshCcw className="mr-2 h-4 w-4" />
                                    Thử lại
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Trạng thái đang nhận diện */}
                {isRecognizing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 z-10">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <p className="text-white font-medium mt-2">Đang nhận diện...</p>
                    </div>
                )}
            </div>

            {/* Nút điều khiển */}
            <div className="mt-6 flex justify-center space-x-4">
                <Button
                    variant="outline"
                    size="lg"
                    onClick={restartRecognition}
                    disabled={isRecognizing || (isRestarting && !initError)}
                    className="font-medium"
                >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Khởi động lại
                </Button>

                {status !== 'success' && !isRecognizing && modelsLoaded && !initError && (
                    <Button
                        variant="default"
                        size="lg"
                        onClick={startRecognition}
                        disabled={isRecognizing || status === 'waiting' || !modelsLoaded}
                        className="font-medium"
                    >
                        <UserCheck className="mr-2 h-4 w-4" />
                        Nhận diện {mode === 'check_in' ? 'Check In' : 'Check Out'}
                    </Button>
                )}
            </div>

            {/* Thông tin hướng dẫn */}
            <div className="mt-4 text-center text-muted-foreground">
                <p>Vui lòng nhìn thẳng vào camera để hệ thống nhận diện khuôn mặt.</p>
                <p className="mt-1">Chọn <strong>Check In</strong> khi đến và <strong>Check Out</strong> khi về.</p>
            </div>
        </div>
    );
} 