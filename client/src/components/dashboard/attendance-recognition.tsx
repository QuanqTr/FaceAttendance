import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CameraIcon, RefreshCw, Loader2 } from "lucide-react";
import { RecognitionStatus } from "@/components/face-recognition/recognition-status";
import { FaceDetector } from "@/components/face-recognition/face-detector";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import * as faceapi from 'face-api.js';

export type RecognizedUser = {
  id: number;
  employeeId: string;
  name: string;
  department: string;
  time: string;
};

export type RecognitionStatusType = 'waiting' | 'processing' | 'success' | 'error';

export function AttendanceRecognition() {
  const { toast } = useToast();
  const [status, setStatus] = useState<RecognitionStatusType>('waiting');
  const [recognizedUser, setRecognizedUser] = useState<RecognizedUser | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const componentMounted = useRef(true);

  // Mutation for clock in
  const clockInMutation = useMutation({
    mutationFn: async (faceDescriptor: string) => {
      try {
        const res = await apiRequest("POST", "/api/attendance", {
          faceDescriptor,
          type: 'in',
          status: 'present',
          date: new Date().toISOString(),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Failed to clock in');
        }

        return await res.json();
      } catch (error: any) {
        throw new Error(error.message || 'Failed to clock in. Please try again.');
      }
    },
    onSuccess: (data) => {
      setStatus('success');
      setRecognizedUser({
        id: data.employeeId,
        employeeId: data.employee.employeeId,
        name: `${data.employee.firstName} ${data.employee.lastName}`,
        department: data.employee.department.name,
        time: new Date().toLocaleTimeString(),
      });
      toast({
        title: "Clocked In",
        description: `Successfully clocked in ${data.employee.firstName} ${data.employee.lastName}`,
      });
      setIsProcessing(false);
    },
    onError: (error: Error) => {
      setStatus('error');
      toast({
        title: "Recognition Failed",
        description: error.message || "Could not process face data",
        variant: "destructive",
      });
      setIsProcessing(false);
    },
  });

  // Mutation for clock out
  const clockOutMutation = useMutation({
    mutationFn: async (faceDescriptor: string) => {
      try {
        const res = await apiRequest("POST", "/api/attendance", {
          faceDescriptor,
          type: 'out',
          status: 'present',
          date: new Date().toISOString(),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Failed to clock out');
        }

        return await res.json();
      } catch (error: any) {
        throw new Error(error.message || 'Failed to clock out. Please try again.');
      }
    },
    onSuccess: (data) => {
      setStatus('success');
      setRecognizedUser({
        id: data.employeeId,
        employeeId: data.employee.employeeId,
        name: `${data.employee.firstName} ${data.employee.lastName}`,
        department: data.employee.department.name,
        time: new Date().toLocaleTimeString(),
      });
      toast({
        title: "Clocked Out",
        description: `Successfully clocked out ${data.employee.firstName} ${data.employee.lastName}`,
      });
      setIsProcessing(false);
    },
    onError: (error: Error) => {
      setStatus('error');
      toast({
        title: "Recognition Failed",
        description: error.message || "Could not process face data",
        variant: "destructive",
      });
      setIsProcessing(false);
    },
  });

  // Check camera readiness
  const checkCameraReady = (logDetails = false): boolean => {
    if (!videoRef.current) {
      console.error("Video element not found");
      return false;
    }

    // Check for srcObject which indicates a stream is connected
    const hasStream = !!videoRef.current.srcObject;

    const isPlaying = videoRef.current.readyState >= 2 &&
      !videoRef.current.paused &&
      !videoRef.current.ended &&
      videoRef.current.currentTime > 0;

    // Only log if debug flag is true to reduce console spam                 
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

  // Kiểm tra xem camera có đang bị tắt chủ động không
  const isCameraDisabled = (): boolean => {
    // Kiểm tra xem video có bị ẩn không (dấu hiệu camera bị tắt chủ động)
    return videoRef.current ?
      window.getComputedStyle(videoRef.current).display === 'none' : true;
  };

  // Helper function to capture face descriptor
  const captureFaceDescriptor = async (): Promise<string> => {
    if (!videoRef.current || !canvasRef.current) {
      throw new Error("Camera not initialized");
    }

    // Check if video is ready and playing
    if (!checkCameraReady()) {
      toast({
        title: "Camera Not Ready",
        description: "The camera feed is not ready yet. Please try again in a moment.",
        variant: "destructive",
      });
      throw new Error("Camera feed not ready. Please wait a moment and try again.");
    }

    // Capture current frame from the video
    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 320,
      scoreThreshold: 0.7 // Higher threshold for more precise detection
    });

    // Wait a moment to ensure video is ready for capture
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      // First check if any face is detected
      console.log("Running pre-check for face detection...");
      const preCheck = await faceapi.detectSingleFace(videoRef.current, options);
      if (!preCheck) {
        throw new Error("No face detected. Please ensure your face is visible in the camera frame.");
      }

      // Proceed with full detection with descriptors
      console.log("Face detected, running full face analysis...");
      const results = await faceapi.detectSingleFace(videoRef.current, options)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!results) {
        throw new Error("Could not analyze facial features. Please try again with better lighting.");
      }

      console.log("Face detected successfully", results);

      // Draw the detected face on the canvas for visual feedback
      if (canvasRef.current) {
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
      }

      // Return the face descriptor as a string
      return Array.from(results.descriptor).toString();
    } catch (error) {
      console.error("Error during face detection:", error);
      throw error instanceof Error ? error : new Error("Face recognition process failed");
    }
  };

  // Refresh camera check less frequently to reduce console spam
  useEffect(() => {
    let checkCount = 0;

    const checkInterval = setInterval(() => {
      // Log details only occasionally
      const shouldLog = checkCount % 5 === 0;
      checkCount++;

      const ready = checkCameraReady(shouldLog);

      if (ready !== isCameraReady) {
        setIsCameraReady(ready);
        if (ready) {
          console.log("Camera is now ready for use");
        }
      }
    }, 5000); // Check less frequently - every 5 seconds

    return () => clearInterval(checkInterval);
  }, [isCameraReady]);

  // Force camera initialization after component mounts
  useEffect(() => {
    // Short timeout to ensure component is fully mounted before initializing camera
    const initTimer = setTimeout(() => {
      if (videoRef.current && !isCameraReady) {
        console.log("Attempting to force camera initialization");
        // This will trigger the FaceDetector to attempt initialization
        setStatus(prev => {
          // Toggle status to force re-render of FaceDetector
          const newStatus = prev === 'waiting' ? 'processing' : 'waiting';
          setTimeout(() => setStatus('waiting'), 100); // Reset back quickly
          return newStatus;
        });
      }
    }, 1000);

    return () => clearTimeout(initTimer);
  }, []);

  const handleClockIn = async () => {
    if (isProcessing) return;

    // Kiểm tra xem camera có bị tắt không
    if (isCameraDisabled()) {
      toast({
        title: "Camera is Off",
        description: "Please turn on the camera to use face recognition.",
        variant: "destructive",
      });
      return;
    }

    // Check if camera is ready before proceeding
    if (!isCameraReady) {
      toast({
        title: "Camera Not Ready",
        description: "Please wait for the camera to initialize fully before trying again.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setStatus('processing');

    try {
      const faceDescriptor = await captureFaceDescriptor();
      clockInMutation.mutate(faceDescriptor);
    } catch (error: any) {
      console.error("Face recognition error:", error);
      setStatus('error');
      toast({
        title: "Recognition Failed",
        description: error.message || "Could not process face data",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const handleClockOut = async () => {
    if (isProcessing) return;

    // Kiểm tra xem camera có bị tắt không
    if (isCameraDisabled()) {
      toast({
        title: "Camera is Off",
        description: "Please turn on the camera to use face recognition.",
        variant: "destructive",
      });
      return;
    }

    // Check if camera is ready before proceeding
    if (!isCameraReady) {
      toast({
        title: "Camera Not Ready",
        description: "Please wait for the camera to initialize fully before trying again.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setStatus('processing');

    try {
      const faceDescriptor = await captureFaceDescriptor();
      clockOutMutation.mutate(faceDescriptor);
    } catch (error: any) {
      console.error("Face recognition error:", error);
      setStatus('error');
      toast({
        title: "Recognition Failed",
        description: error.message || "Could not process face data",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const handleRefresh = () => {
    setStatus('waiting');
    setRecognizedUser(null);
    setIsProcessing(false);
  };

  // Lifecycle management
  useEffect(() => {
    componentMounted.current = true;
    console.log("AttendanceRecognition component mounted");

    return () => {
      componentMounted.current = false;
      console.log("AttendanceRecognition component unmounted");
    };
  }, []);

  // Debug effect to check refs
  useEffect(() => {
    console.log("AttendanceRecognition refs:", {
      videoRef: !!videoRef.current,
      canvasRef: !!canvasRef.current
    });
  }, []);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium">Face Recognition</CardTitle>
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isProcessing}>
            <RefreshCw className="h-4 w-4 mr-1" />
            <span>Refresh</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <FaceDetector
              videoRef={videoRef}
              canvasRef={canvasRef}
              status={status}
            />

            <div className="mt-4 flex justify-center">
              {isCameraReady ? (
                <>
                  <Button
                    onClick={handleClockIn}
                    className="bg-primary text-white py-2 px-6 rounded-full flex items-center justify-center mr-4 hover:bg-primary/90 transition-colors"
                    disabled={isProcessing || clockInMutation.isPending || status === 'processing'}
                  >
                    <CameraIcon className="mr-2 h-4 w-4" />
                    <span>Clock In</span>
                  </Button>
                  <Button
                    onClick={handleClockOut}
                    variant="destructive"
                    className="py-2 px-6 rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors"
                    disabled={isProcessing || clockOutMutation.isPending || status === 'processing'}
                  >
                    <CameraIcon className="mr-2 h-4 w-4" />
                    <span>Clock Out</span>
                  </Button>
                </>
              ) : (
                <div className="text-center py-2 px-4 rounded-lg bg-muted">
                  <Loader2 className="h-4 w-4 inline-block mr-2 animate-spin" />
                  <span className="text-sm">Waiting for camera to initialize...</span>
                </div>
              )}
            </div>
          </div>

          <div className="w-full md:w-64">
            <RecognitionStatus
              status={status}
              recognizedUser={recognizedUser}
              onRetry={handleRefresh}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
