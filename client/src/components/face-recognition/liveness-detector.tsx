import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LivenessDetectorProps {
    videoRef: React.RefObject<HTMLVideoElement>;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    onLivenessVerified: (isLive: boolean) => void;
    isActive: boolean;
}

export function LivenessDetector({
    videoRef,
    canvasRef,
    onLivenessVerified,
    isActive
}: LivenessDetectorProps) {
    const { toast } = useToast();
    const [isChecking, setIsChecking] = useState(false);
    const [progress, setProgress] = useState(0);
    const [instructions, setInstructions] = useState<string>('');
    const checkingIntervalRef = useRef<number | null>(null);

    // Biến để theo dõi chuyển động
    const facePositionsRef = useRef<Array<{ x: number, y: number }>>([]);
    const movementDetectedRef = useRef(false);
    const detectionCountRef = useRef(0);

    // Tải mô hình khi component được mount
    useEffect(() => {
        const loadModels = async () => {
            try {
                // Đường dẫn đến thư mục chứa các mô hình
                const MODEL_URL = '/models';

                // Tải các mô hình cần thiết
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
                ]);

                console.log('Đã tải xong các mô hình liveness detection');
            } catch (error) {
                console.error('Lỗi khi tải mô hình:', error);
                toast({
                    title: "Lỗi",
                    description: "Không thể tải mô hình nhận diện khuôn mặt",
                    variant: "destructive",
                });
            }
        };

        loadModels();
    }, [toast]);

    // Bắt đầu kiểm tra khi isActive thay đổi thành true
    useEffect(() => {
        if (isActive && !isChecking) {
            startLivenessCheck();
        }
    }, [isActive]);

    // Bắt đầu quá trình kiểm tra liveness
    const startLivenessCheck = () => {
        if (!videoRef.current || !canvasRef.current) {
            toast({
                title: "Lỗi",
                description: "Camera chưa sẵn sàng",
                variant: "destructive",
            });
            return;
        }

        // Kiểm tra video đã sẵn sàng chưa
        if (videoRef.current.readyState < 2) {
            console.log("Video chưa sẵn sàng, đợi...");
            // Đợi video sẵn sàng
            const checkVideoReady = () => {
                if (videoRef.current && videoRef.current.readyState >= 2) {
                    initLivenessCheck();
                } else {
                    setTimeout(checkVideoReady, 100);
                }
            };
            checkVideoReady();
            return;
        }

        initLivenessCheck();
    };

    // Khởi tạo quá trình kiểm tra liveness sau khi video đã sẵn sàng
    const initLivenessCheck = () => {
        setIsChecking(true);
        setProgress(0);
        setInstructions("Vui lòng di chuyển đầu nhẹ nhàng từ trái sang phải");
        facePositionsRef.current = [];
        movementDetectedRef.current = false;
        detectionCountRef.current = 0;

        // Bắt đầu kiểm tra khuôn mặt
        if (checkingIntervalRef.current) {
            clearInterval(checkingIntervalRef.current);
        }

        checkingIntervalRef.current = window.setInterval(() => {
            detectFace();
        }, 100);
    };

    // Dừng quá trình kiểm tra
    const stopLivenessCheck = (success: boolean = false) => {
        if (checkingIntervalRef.current) {
            clearInterval(checkingIntervalRef.current);
            checkingIntervalRef.current = null;
        }

        setIsChecking(false);

        if (success) {
            setProgress(100);
            setInstructions("Xác thực thành công!");
            onLivenessVerified(true);
        } else {
            setProgress(0);
            setInstructions("");
            onLivenessVerified(false);
        }
    };

    // Phát hiện khuôn mặt và kiểm tra chuyển động
    const detectFace = async () => {
        if (!videoRef.current || !canvasRef.current || !isActive) return;

        // Kiểm tra video đã sẵn sàng chưa
        if (videoRef.current.readyState < 2) {
            console.log("Video chưa sẵn sàng để phát hiện khuôn mặt");
            return;
        }

        try {
            const options = new faceapi.TinyFaceDetectorOptions({
                inputSize: 320,
                scoreThreshold: 0.5
            });

            // Phát hiện khuôn mặt và landmark
            const result = await faceapi.detectSingleFace(videoRef.current, options)
                .withFaceLandmarks();

            if (!result) {
                setInstructions("Không phát hiện khuôn mặt. Vui lòng nhìn thẳng vào camera.");
                return;
            }

            // Vẽ kết quả lên canvas
            const dims = {
                width: videoRef.current.videoWidth || 640,
                height: videoRef.current.videoHeight || 480
            };

            // Đảm bảo kích thước hiển thị hợp lệ
            const displaySize = {
                width: videoRef.current.width || videoRef.current.clientWidth || 640,
                height: videoRef.current.height || videoRef.current.clientHeight || 480
            };

            // Kiểm tra kích thước hợp lệ trước khi resize
            if (displaySize.width === 0 || displaySize.height === 0) {
                console.log("Kích thước hiển thị không hợp lệ:", displaySize);
                return;
            }

            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            if (ctx) {
                // Đảm bảo canvas có kích thước phù hợp
                if (canvas.width !== displaySize.width || canvas.height !== displaySize.height) {
                    canvas.width = displaySize.width;
                    canvas.height = displaySize.height;
                }

                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Điều chỉnh kích thước kết quả phù hợp với kích thước hiển thị
                const resizedResult = faceapi.resizeResults(result, displaySize);

                // Vẽ khuôn mặt và landmark
                faceapi.draw.drawDetections(canvas, [resizedResult]);
                faceapi.draw.drawFaceLandmarks(canvas, [resizedResult]);
            }

            // Lấy vị trí trung tâm khuôn mặt
            const facePosition = {
                x: result.detection.box.x + result.detection.box.width / 2,
                y: result.detection.box.y + result.detection.box.height / 2
            };

            // Lưu vị trí khuôn mặt để phát hiện chuyển động
            facePositionsRef.current.push(facePosition);

            // Giới hạn số lượng vị trí lưu trữ
            if (facePositionsRef.current.length > 10) {
                facePositionsRef.current.shift();
            }

            // Tăng số lần phát hiện
            detectionCountRef.current++;

            // Chỉ bắt đầu kiểm tra chuyển động sau khi đã có ít nhất 5 mẫu
            if (facePositionsRef.current.length >= 5 && detectionCountRef.current > 10) {
                // Tính toán mức độ chuyển động
                const movement = calculateMovement(facePositionsRef.current);

                // Ngưỡng chuyển động (điều chỉnh để phù hợp với yêu cầu)
                const MOVEMENT_THRESHOLD = 20;

                if (movement > MOVEMENT_THRESHOLD && !movementDetectedRef.current) {
                    movementDetectedRef.current = true;
                    setProgress(100);
                    setInstructions("Đã phát hiện chuyển động. Xác thực thành công!");

                    // Hoàn thành kiểm tra
                    setTimeout(() => {
                        stopLivenessCheck(true);
                    }, 1000);
                } else if (!movementDetectedRef.current) {
                    // Cập nhật tiến trình dựa trên mức độ chuyển động
                    const progressValue = Math.min(Math.floor((movement / MOVEMENT_THRESHOLD) * 80), 80);
                    setProgress(progressValue);

                    if (movement > MOVEMENT_THRESHOLD * 0.5) {
                        setInstructions("Tiếp tục di chuyển đầu...");
                    }
                }
            }

        } catch (error) {
            console.error('Lỗi khi phát hiện khuôn mặt:', error);
        }
    };

    // Tính toán mức độ chuyển động dựa trên các vị trí khuôn mặt
    const calculateMovement = (positions: Array<{ x: number, y: number }>): number => {
        if (positions.length < 2) return 0;

        // Tính khoảng cách giữa vị trí đầu tiên và cuối cùng
        const firstPos = positions[0];
        const lastPos = positions[positions.length - 1];

        // Tính khoảng cách Euclidean
        const distance = Math.sqrt(
            Math.pow(lastPos.x - firstPos.x, 2) +
            Math.pow(lastPos.y - firstPos.y, 2)
        );

        return distance;
    };

    // Hủy interval khi component unmount hoặc khi isActive thay đổi
    useEffect(() => {
        // Khi isActive thay đổi thành false, dừng kiểm tra
        if (!isActive && checkingIntervalRef.current) {
            clearInterval(checkingIntervalRef.current);
            checkingIntervalRef.current = null;
            setIsChecking(false);
            setProgress(0);
            setInstructions("");
        }

        return () => {
            if (checkingIntervalRef.current) {
                clearInterval(checkingIntervalRef.current);
                checkingIntervalRef.current = null;
            }
        };
    }, [isActive]);

    // Thêm timeout để tự động hủy nếu không phát hiện được chuyển động sau một khoảng thời gian
    useEffect(() => {
        let timeoutId: NodeJS.Timeout | null = null;

        if (isChecking) {
            // Tự động hủy sau 20 giây nếu không phát hiện được chuyển động
            timeoutId = setTimeout(() => {
                if (isChecking && !movementDetectedRef.current) {
                    toast({
                        title: "Hết thời gian",
                        description: "Không phát hiện được chuyển động. Vui lòng thử lại.",
                        variant: "destructive",
                    });
                    stopLivenessCheck(false);
                }
            }, 20000);
        }

        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [isChecking, toast]);

    return (
        <div className="flex flex-col items-center">
            {isActive && (
                <>
                    <div className="flex flex-col items-center mt-2 mb-2">
                        <div className="flex items-center">
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            <span>Đang kiểm tra...</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                            <div
                                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <p className="text-sm mt-1 font-medium">{instructions}</p>
                    </div>
                </>
            )}
        </div>
    );
} 