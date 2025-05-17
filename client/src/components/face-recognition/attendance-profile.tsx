import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Camera, Trash2, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import * as faceapi from 'face-api.js';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RecognitionStatusType } from "@/components/dashboard/attendance-recognition";

interface AttendanceProfileProps {
    userId?: number;
    employeeId?: number;
    type: 'user' | 'employee';
    onComplete?: () => void;
    t: any;
}

export function AttendanceProfile({ userId, employeeId, type, onComplete, t }: AttendanceProfileProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isModelsLoaded, setIsModelsLoaded] = useState(false);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [captureStatus, setCaptureStatus] = useState<RecognitionStatusType>('waiting');
    const [uploadedImage, setUploadedImage] = useState<File | null>(null);
    const [activeTab, setActiveTab] = useState('webcam');
    const [isWebcamActive, setIsWebcamActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Load face-api.js models
    useEffect(() => {
        let isMounted = true;
        const loadModels = async () => {
            setIsLoadingModels(true);
            try {
                await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
                await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
                await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
                await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
                if (isMounted) setIsModelsLoaded(true);
            } catch (error) {
                toast({ title: t('user.faceProfile.modelLoadError'), description: t('user.faceProfile.tryReload'), variant: 'destructive' });
            } finally {
                if (isMounted) setIsLoadingModels(false);
            }
        };
        loadModels();
        return () => { isMounted = false; };
    }, [toast, t]);

    // Webcam initialization
    useEffect(() => {
        let stream: MediaStream | null = null;
        setCameraError(null);
        const startWebcam = async () => {
            try {
                if (activeTab === 'webcam' && videoRef.current && !isWebcamActive) {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            width: { ideal: 640 },
                            height: { ideal: 480 },
                            facingMode: "user"
                        }
                    });
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        streamRef.current = stream;
                        setIsWebcamActive(true);
                    }
                }
            } catch (error: any) {
                console.error('Error accessing webcam:', error);
                setCameraError(error?.message || 'Camera error');
                toast({
                    title: t('user.faceProfile.webcamError'),
                    description: t('user.faceProfile.webcamErrorDesc'),
                    variant: 'destructive'
                });
                setIsWebcamActive(false);
            }
        };
        const stopWebcam = () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
            setIsWebcamActive(false);
        };
        if (activeTab === 'webcam') {
            startWebcam();
        } else {
            stopWebcam();
        }
        return () => {
            stopWebcam();
        };
    }, [activeTab, toast, t]);

    // API endpoint logic
    const apiUrl = type === 'user'
        ? `/api/users/${userId}/face-profile`
        : `/api/employees/${employeeId}/face-data`;

    // Query face profile
    const { data: faceProfileData, isLoading: isLoadingFaceProfile } = useQuery({
        queryKey: [type === 'user' ? 'userFaceProfile' : 'employeeFaceProfile', userId || employeeId],
        queryFn: async () => {
            if (type === 'user' && userId) {
                const res = await fetch(apiUrl);
                return await res.json();
            } else if (type === 'employee' && employeeId) {
                const res = await fetch(`/api/employees/${employeeId}`);
                const data = await res.json();
                return { hasFaceProfile: !!data.faceDescriptor };
            }
            return null;
        },
        enabled: !!userId || !!employeeId,
    });

    // Register face mutation
    const registerFaceMutation = useMutation({
        mutationFn: async (descriptorString: string) => {
            if (type === 'user' && userId) {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ faceDescriptor: descriptorString })
                });

                return await response.json();
            } else if (type === 'employee' && employeeId) {
                const response = await fetch(`/api/employees/${employeeId}/face-profile`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ descriptor: descriptorString })
                });

                return await response.json();
            }
        },
        onSuccess: () => {
            toast({ title: t('user.faceProfile.saveSuccess'), description: t('employees.faceDataSaved') });
            queryClient.invalidateQueries();
            if (onComplete) onComplete();
        },
        onError: (error: any) => {
            toast({ title: t('user.faceProfile.saveError'), description: error.message, variant: 'destructive' });
        },
    });

    // Reset face data mutation
    const resetFaceDataMutation = useMutation({
        mutationFn: async () => {
            const response = await fetch(apiUrl, { method: 'DELETE' });
            return await response.json();
        },
        onSuccess: () => {
            toast({ title: t('employees.faceDataReset'), description: t('employees.faceDataResetMessage') });
            queryClient.invalidateQueries();
            if (onComplete) onComplete();
        },
        onError: (error: any) => {
            toast({ title: t('user.faceProfile.saveError'), description: error.message, variant: 'destructive' });
        },
    });

    // Webcam capture logic
    const startWebcamCapture = async () => {
        if (!isModelsLoaded || !isWebcamActive || isProcessing) return;
        if (!videoRef.current || !canvasRef.current) return;
        setIsProcessing(true);
        setCaptureStatus('processing');
        try {
            const videoElement = videoRef.current;
            const canvasElement = canvasRef.current;
            const preCheck = await faceapi.detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions());
            if (!preCheck) {
                toast({ title: t('user.faceProfile.noFaceDetected'), description: t('user.faceProfile.tryAgain'), variant: 'destructive' });
                setCaptureStatus('error');
                setIsProcessing(false);
                return;
            }
            const results = await faceapi.detectSingleFace(videoElement)
                .withFaceLandmarks()
                .withFaceDescriptor();
            if (!results) {
                toast({ title: t('user.faceProfile.noFaceDetected'), description: t('user.faceProfile.tryAgain'), variant: 'destructive' });
                setCaptureStatus('error');
                setIsProcessing(false);
                return;
            }
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
            const descriptorString = Array.from(results.descriptor).toString();
            await registerFaceMutation.mutateAsync(descriptorString);
        } catch (error) {
            console.error('Error capturing face:', error);
            toast({ title: t('user.faceProfile.saveError'), description: t('user.faceProfile.errorProcessingFace'), variant: 'destructive' });
            setCaptureStatus('error');
        } finally {
            setIsProcessing(false);
        }
    };

    // File upload logic
    const triggerFileUpload = () => { if (fileInputRef.current) fileInputRef.current.click(); };
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !isModelsLoaded || isProcessing) return;
        if (!file.type.startsWith('image/')) {
            toast({ title: t('user.faceProfile.saveError'), description: t('employees.invalidFileType'), variant: 'destructive' });
            return;
        }
        setUploadedImage(file);
        setIsProcessing(true);
        setCaptureStatus('processing');
        try {
            const img = await faceapi.bufferToImage(file);
            const detections = await faceapi.detectSingleFace(img)
                .withFaceLandmarks()
                .withFaceDescriptor();
            if (detections) {
                const descriptorString = Array.from(detections.descriptor).toString();
                await registerFaceMutation.mutateAsync(descriptorString);
            } else {
                toast({ title: t('user.faceProfile.noFaceDetected'), description: t('employees.noFaceDetected'), variant: 'destructive' });
                setCaptureStatus('error');
            }
        } catch (error) {
            console.error('Error processing image:', error);
            toast({ title: t('user.faceProfile.saveError'), description: t('employees.cannotProcessFace'), variant: 'destructive' });
            setCaptureStatus('error');
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
            setUploadedImage(null);
            setIsProcessing(false);
        }
    };

    // UI
    if (isLoadingModels || isLoadingFaceProfile) {
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
                    <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {t('common.refresh')}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Face profile status */}
            {faceProfileData?.hasFaceProfile ? (
                <div className="bg-green-50 border border-green-600 p-4 rounded-md flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-medium text-green-800">{t('user.faceProfile.profileExists')}</h4>
                        <p className="text-sm text-green-700 mt-1">{t('user.faceProfile.profileExistsDesc')}</p>
                    </div>
                </div>
            ) : (
                <div className="bg-amber-50 border border-amber-600 p-4 rounded-md flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-medium text-amber-800">{t('user.faceProfile.noProfile')}</h4>
                        <p className="text-sm text-amber-700 mt-1">{t('user.faceProfile.noProfileDesc')}</p>
                    </div>
                </div>
            )}
            {/* Camera error message */}
            {cameraError && (
                <div className="bg-red-50 border border-red-600 p-2 rounded-md text-red-700 text-center">
                    {t('user.faceProfile.webcamError')}: {cameraError}
                </div>
            )}
            {/* Tabs for webcam/upload */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="webcam">{t('user.faceProfile.useWebcam')}</TabsTrigger>
                    <TabsTrigger value="upload">{t('user.faceProfile.orUpload')}</TabsTrigger>
                </TabsList>
                <TabsContent value="webcam" className="space-y-4">
                    <div className="relative mx-auto max-w-md h-[480px] bg-muted rounded-lg overflow-hidden">
                        <video
                            ref={videoRef}
                            className="absolute inset-0 w-full h-full object-cover"
                            autoPlay
                            muted
                            playsInline
                        />
                        <canvas
                            ref={canvasRef}
                            className="absolute inset-0 w-full h-full"
                            style={{ background: 'transparent' }}
                        />
                        {isProcessing && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-30">
                                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            </div>
                        )}
                    </div>
                    <div className="flex justify-center">
                        <Button
                            onClick={startWebcamCapture}
                            disabled={!isModelsLoaded || !isWebcamActive || isProcessing || captureStatus === 'processing'}
                            className="w-1/4"
                        >
                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                            {isProcessing ? t('common.processing') : t('user.faceProfile.takePicture')}
                        </Button>
                    </div>
                </TabsContent>
                <TabsContent value="upload" className="space-y-4">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileUpload}
                    />
                    <div className="flex justify-center">
                        <Button
                            onClick={triggerFileUpload}
                            disabled={isProcessing || captureStatus === 'processing' || !isModelsLoaded}
                            className="w-1/4"
                        >
                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            {isProcessing ? t('common.processing') : t('user.faceProfile.uploadImage')}
                        </Button>
                    </div>
                </TabsContent>
            </Tabs>
            {/* Reset Face Data Button */}
            {faceProfileData?.hasFaceProfile && (
                <div className="pt-4 border-t flex justify-center">
                    <Button
                        variant="destructive"
                        onClick={() => resetFaceDataMutation.mutate()}
                        disabled={resetFaceDataMutation.isPending || isProcessing}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {resetFaceDataMutation.isPending ? t('common.processing') : t('user.faceProfile.resetFaceData')}
                    </Button>
                </div>
            )}
        </div>
    );
} 