import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FaceDetector } from "@/components/face-recognition/face-detector";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import * as faceapi from 'face-api.js';
import { Loader2, CheckCircle, AlertCircle, Camera } from "lucide-react";
import { RecognitionStatusType } from "@/components/dashboard/attendance-recognition";

type FaceRegistrationProps = {
    employeeId: number;
    onComplete?: () => void;
};

export function FaceRegistration({ employeeId, onComplete }: FaceRegistrationProps) {
    const [isCapturing, setIsCapturing] = useState(false);
    const [captureStatus, setCaptureStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [capturedDescriptor, setCapturedDescriptor] = useState<Float32Array | null>(null);
    const { toast } = useToast();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [detectorStatus, setDetectorStatus] = useState<RecognitionStatusType>('waiting');

    const registerFaceMutation = useMutation({
        mutationFn: async (descriptor: string) => {
            const response = await fetch("/api/face-registration", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    employeeId,
                    descriptor
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
                throw new Error(errorData.message || "Failed to register face");
            }

            return await response.json();
        },
        onSuccess: () => {
            toast({
                title: "Face registration successful",
                description: "Your face has been registered for attendance tracking",
            });
            setCaptureStatus('success');
            setDetectorStatus('success');
            if (onComplete) {
                onComplete();
            }
            queryClient.invalidateQueries({ queryKey: [`/api/employees/${employeeId}`] });
        },
        onError: (error: any) => {
            toast({
                title: "Face registration failed",
                description: error.message || "Failed to register face. Please try again.",
                variant: "destructive",
            });
            setCaptureStatus('error');
            setDetectorStatus('error');
        },
    });

    // Set up face detection when the component is mounted
    useEffect(() => {
        if (isCapturing && captureStatus === 'processing') {
            const timer = setTimeout(() => {
                setDetectorStatus('processing');

                // Set up a timer to capture the face after a few seconds
                const captureTimer = setTimeout(async () => {
                    if (videoRef.current && canvasRef.current) {
                        try {
                            // Get face descriptor using face-api.js
                            const detections = await faceapi.detectSingleFace(videoRef.current)
                                .withFaceLandmarks()
                                .withFaceDescriptor();

                            if (detections) {
                                const descriptor = detections.descriptor;
                                setCapturedDescriptor(descriptor);

                                // Convert Float32Array to string for API transmission
                                const descriptorString = Array.from(descriptor).toString();
                                registerFaceMutation.mutate(descriptorString);
                            } else {
                                toast({
                                    title: "No face detected",
                                    description: "Please position your face clearly in the camera view",
                                    variant: "destructive",
                                });
                                setCaptureStatus('error');
                                setDetectorStatus('error');
                            }
                        } catch (error) {
                            console.error("Error detecting face:", error);
                            toast({
                                title: "Face detection failed",
                                description: "Could not analyze your face. Please try again.",
                                variant: "destructive",
                            });
                            setCaptureStatus('error');
                            setDetectorStatus('error');
                        }
                    }
                }, 3000); // Wait 3 seconds to capture the face

                return () => clearTimeout(captureTimer);
            }, 1000); // Give a second for the camera to initialize

            return () => clearTimeout(timer);
        }
    }, [isCapturing, captureStatus]);

    const startCapture = () => {
        setIsCapturing(true);
        setCaptureStatus('processing');
        setDetectorStatus('waiting');
    };

    const cancelCapture = () => {
        setIsCapturing(false);
        setCaptureStatus('idle');
        setDetectorStatus('waiting');
        setCapturedDescriptor(null);
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Face Registration</CardTitle>
                <CardDescription>
                    Register your face for attendance recognition
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
                {isCapturing ? (
                    <>
                        <div className="relative w-full h-64 mb-4 bg-muted rounded-md overflow-hidden">
                            <FaceDetector
                                videoRef={videoRef}
                                canvasRef={canvasRef}
                                status={detectorStatus}
                            />

                            {captureStatus === 'processing' && (
                                <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                                    <div className="flex flex-col items-center space-y-2">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                        <p className="text-sm font-medium">Look at the camera</p>
                                    </div>
                                </div>
                            )}

                            {captureStatus === 'success' && (
                                <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                                    <div className="flex flex-col items-center space-y-2">
                                        <CheckCircle className="h-8 w-8 text-green-500" />
                                        <p className="text-sm font-medium">Face registered successfully</p>
                                    </div>
                                </div>
                            )}

                            {captureStatus === 'error' && (
                                <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                                    <div className="flex flex-col items-center space-y-2">
                                        <AlertCircle className="h-8 w-8 text-destructive" />
                                        <p className="text-sm font-medium">Failed to register face</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex space-x-2">
                            {captureStatus === 'processing' && (
                                <Button variant="outline" onClick={cancelCapture}>
                                    Cancel
                                </Button>
                            )}

                            {(captureStatus === 'success' || captureStatus === 'error') && (
                                <Button onClick={cancelCapture}>
                                    Close
                                </Button>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="w-full flex flex-col items-center space-y-4">
                        <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center">
                            <Camera className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <Button onClick={startCapture}>
                            Capture Face
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
} 