import { useEffect, useRef, useState } from "react";
import { Camera, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { RecognitionStatusType } from "@/components/dashboard/attendance-recognition";

type FaceDetectorProps = {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  status: RecognitionStatusType;
};

export function FaceDetector({ videoRef, canvasRef, status }: FaceDetectorProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  
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
    };
  }, [videoRef]);
  
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
