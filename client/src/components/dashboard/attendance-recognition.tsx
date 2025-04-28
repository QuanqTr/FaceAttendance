import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CameraIcon, RefreshCw } from "lucide-react";
import { RecognitionStatus } from "@/components/face-recognition/recognition-status";
import { FaceDetector } from "@/components/face-recognition/face-detector";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

  // Mutation for clock in
  const clockInMutation = useMutation({
    mutationFn: async (faceDescriptor: string) => {
      const res = await apiRequest("POST", "/api/attendance", {
        faceDescriptor,
        type: 'in',
        status: 'present', // This would be determined by time in a real app
        date: new Date(),
      });
      return await res.json();
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
    },
    onError: (error) => {
      setStatus('error');
      toast({
        title: "Recognition Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for clock out
  const clockOutMutation = useMutation({
    mutationFn: async (faceDescriptor: string) => {
      const res = await apiRequest("POST", "/api/attendance", {
        faceDescriptor,
        type: 'out',
        status: 'present',
        date: new Date(),
      });
      return await res.json();
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
    },
    onError: (error) => {
      setStatus('error');
      toast({
        title: "Recognition Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClockIn = async () => {
    if (!canvasRef.current) return;
    
    setStatus('processing');
    try {
      // In a real app, this would capture and process the face data
      const faceDescriptor = "sample_face_descriptor";
      clockInMutation.mutate(faceDescriptor);
    } catch (error) {
      setStatus('error');
      toast({
        title: "Recognition Failed",
        description: "Could not process face data",
        variant: "destructive",
      });
    }
  };

  const handleClockOut = async () => {
    if (!canvasRef.current) return;
    
    setStatus('processing');
    try {
      // In a real app, this would capture and process the face data
      const faceDescriptor = "sample_face_descriptor";
      clockOutMutation.mutate(faceDescriptor);
    } catch (error) {
      setStatus('error');
      toast({
        title: "Recognition Failed",
        description: "Could not process face data",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = () => {
    setStatus('waiting');
    setRecognizedUser(null);
  };

  // This would initialize face-api.js in a real app
  useEffect(() => {
    // face-api.js initialization would go here
    return () => {
      // Cleanup
    };
  }, []);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium">Face Recognition</CardTitle>
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={status === 'processing'}>
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
              <Button 
                onClick={handleClockIn} 
                className="bg-primary text-white py-2 px-6 rounded-full flex items-center justify-center mr-4 hover:bg-primary/90 transition-colors"
                disabled={status === 'processing' || clockInMutation.isPending}
              >
                <CameraIcon className="mr-2 h-4 w-4" />
                <span>Clock In</span>
              </Button>
              <Button 
                onClick={handleClockOut} 
                variant="destructive"
                className="py-2 px-6 rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors"
                disabled={status === 'processing' || clockOutMutation.isPending}
              >
                <CameraIcon className="mr-2 h-4 w-4" />
                <span>Clock Out</span>
              </Button>
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
