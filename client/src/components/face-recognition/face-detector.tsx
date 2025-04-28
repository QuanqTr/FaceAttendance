import { useEffect, useRef, useState } from "react";
import { Camera, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { RecognitionStatusType } from "@/components/dashboard/attendance-recognition";
import * as faceapi from 'face-api.js';

type FaceDetectorProps = {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  status: RecognitionStatusType;
};

export function FaceDetector({ videoRef, canvasRef, status }: FaceDetectorProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const modelsLoaded = useRef(false);
  const intervalRef = useRef<number | null>(null);
  
  // Load face-api.js models
  useEffect(() => {
    const loadModels = async () => {
      try {
        if (modelsLoaded.current) return;

        // Set the path to the models
        const MODEL_URL = '/models';
        
        // Load models
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
        ]);
        
        console.log('Face-api models loaded successfully');
        modelsLoaded.current = true;
        setIsModelLoaded(true);
      } catch (error) {
        console.error('Error loading face-api models:', error);
      }
    };
    
    loadModels();
    
    return () => {
      modelsLoaded.current = false;
    };
  }, []);
  
  // Setup camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        if (!videoRef.current) return;
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user"
          }, 
          audio: false 
        });
        
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        setCameraError(false);
      } catch (error) {
        console.error("Error accessing camera:", error);
        setCameraError(true);
      }
    };
    
    startCamera();
    
    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
      
      // Clear interval if it exists
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [videoRef]);
  
  // Setup face detection when both camera and models are ready
  useEffect(() => {
    const setupFaceDetection = () => {
      if (!videoRef.current || !canvasRef.current || !isModelLoaded || !cameraActive || status === 'processing') return;
      
      // Set an interval to detect faces
      intervalRef.current = window.setInterval(async () => {
        if (!videoRef.current || !canvasRef.current) return;
        
        // Make sure video is playing
        if (videoRef.current.paused || videoRef.current.ended) return;
        
        // Get video dimensions
        const displaySize = { 
          width: videoRef.current.width || videoRef.current.videoWidth || 640, 
          height: videoRef.current.height || videoRef.current.videoHeight || 480
        };
        
        // Match canvas size to video
        if (canvasRef.current) {
          faceapi.matchDimensions(canvasRef.current, displaySize);
        }
        
        // Detect faces
        const detections = await faceapi.detectAllFaces(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions()
        ).withFaceLandmarks().withFaceExpressions();
        
        // Draw detections on canvas
        if (canvasRef.current) {
          const resizedDetections = faceapi.resizeResults(detections, displaySize);
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
            faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);
            faceapi.draw.drawFaceExpressions(canvasRef.current, resizedDetections);
          }
        }
      }, 100);
    };
    
    setupFaceDetection();
    
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [canvasRef, videoRef, cameraActive, isModelLoaded, status]);
  
  return (
    <div className="relative w-full">
      <div className={cn(
        "relative rounded-lg overflow-hidden aspect-video bg-black border-2 border-dashed",
        status === 'processing' ? "border-amber-500" : "border-primary",
        "flex items-center justify-center"
      )}>
        {cameraActive ? (
          <>
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
            />
          </>
        ) : (
          <div className="text-center p-4">
            {cameraError ? (
              <>
                <VideoOff className="mx-auto text-destructive h-12 w-12 mb-2" />
                <p className="text-foreground">Camera access denied</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Please check your camera permissions
                </p>
              </>
            ) : !isModelLoaded ? (
              <>
                <div className="mx-auto h-12 w-12 mb-2 animate-spin text-primary">
                  <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <p className="text-foreground">Loading face recognition models</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Please wait, this may take a moment...
                </p>
              </>
            ) : (
              <>
                <Camera className="mx-auto text-primary h-12 w-12 mb-2" />
                <p className="text-foreground">Camera will display here</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Position your face in the frame
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
