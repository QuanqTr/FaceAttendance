import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CameraIcon, RefreshCw, Loader2, LogIn, LogOut } from "lucide-react";
import { RecognitionStatus } from "@/components/face-recognition/recognition-status";
import { FaceDetector } from "@/components/face-recognition/face-detector";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export function AttendanceRecognition() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<RecognitionStatusType>('waiting');
  const [recognizedUser, setRecognizedUser] = useState<RecognizedUser | null>(null);
  const [currentAttendanceType, setCurrentAttendanceType] = useState<'checkin' | 'checkout'>('checkin');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const componentMounted = useRef(true);
  const [detectedFaceDescriptor, setDetectedFaceDescriptor] = useState<string | null>(null);
  const [autoProcessing, setAutoProcessing] = useState(false);

  // Fetch employee's today work hours if recognized
  const { data: workHoursData } = useQuery({
    queryKey: ['workHours', recognizedUser?.id],
    queryFn: async () => {
      if (!recognizedUser?.id) return null;

      const today = format(new Date(), 'yyyy-MM-dd');
      const res = await apiRequest("GET", `/api/work-hours/employee/${recognizedUser.id}?date=${today}`);

      if (!res.ok) return null;
      return await res.json();
    },
    enabled: !!recognizedUser?.id && status === 'success',
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

  // Hàm trích xuất dữ liệu employee từ error object
  const extractEmployeeData = (error: any): any => {
    console.log("Extracting employee data from error object", error);

    // Các vị trí có thể chứa dữ liệu employee
    const possiblePaths = [
      // Đường dẫn phổ biến
      error.response?.data?.employee,
      error.data?.employee,
      error.response?.employee,
      error.employee,

      // Đường dẫn trực tiếp 
      error.response?.data,
      error.data,

      // Kiểm tra nếu response là một array
      ...(Array.isArray(error.response?.data) ? error.response.data : []),
      ...(Array.isArray(error.data) ? error.data : [])
    ].filter(Boolean); // Lọc các giá trị null/undefined

    // Tìm trong các vị trí có thể
    for (const path of possiblePaths) {
      // Kiểm tra xem đối tượng có phải là employee data không
      if (path && (path.id || path.employeeId || path.employee_id)) {
        console.log("Found employee data at:", path);
        return path;
      }

      // Kiểm tra xem có thuộc tính employee không
      if (path && path.employee && (path.employee.id || path.employee.employeeId)) {
        console.log("Found nested employee data:", path.employee);
        return path.employee;
      }
    }

    return null; // Không tìm thấy dữ liệu employee
  };

  // Mutation for clock in
  const clockInMutation = useMutation({
    mutationFn: async (faceDescriptor: string) => {
      try {
        const res = await apiRequest("POST", "/api/time-logs", {
          faceDescriptor,
          type: 'checkin',
        });

        // Nếu đến đây, nghĩa là API đã thành công
        const data = res.data;
        console.log("Clock-in API success response:", data);
        return data;
      } catch (error: any) {
        console.log("Phân tích error object:", error);

        // Khi có lỗi, đầu tiên kiểm tra xem có dữ liệu employee trong errorData không
        if (error.response?.errorData?.employee) {
          const data = error.response.errorData;
          return {
            ...data,
            wasSuccessful: true,
            _error: new Error(data.message || 'Clock-in warning')
          };
        }

        // Nếu không tìm thấy thông tin employee, thì throw lỗi
        throw error;
      }
    },
    onSuccess: (data) => {
      // Kiểm tra xem dữ liệu có phải là loại đặc biệt từ lỗi không
      if (data._error) {
        console.log("Check-in with warning:", data._error.message);
        // Hiển thị thông báo cảnh báo nhưng vẫn coi là thành công
        toast({
          title: "Check-in Successful with Warning",
          description: data._error.message,
          variant: "default", // Sử dụng variant default thay vì warning
        });
      } else {
        // Trường hợp thành công hoàn toàn
        let employeeName = "Employee";

        // Kiểm tra trước khi truy cập thuộc tính của employee
        if (data.employee && typeof data.employee === 'object') {
          const firstName = data.employee.firstName || '';
          const lastName = data.employee.lastName || '';
          employeeName = `${firstName} ${lastName}`.trim() || "Employee";
        }

        toast({
          title: "Clocked In",
          description: `Successfully clocked in ${employeeName}`,
        });
      }

      setStatus('success');

      // Tạo recognized user với kiểm tra an toàn
      const employeeData = data.employee || {};
      const employeeDepartment = employeeData.department || {};

      setRecognizedUser({
        id: data.employeeId || 0,
        employeeId: employeeData.employeeId || '',
        name: employeeData.firstName && employeeData.lastName ?
          `${employeeData.firstName} ${employeeData.lastName}` : "Employee",
        department: employeeDepartment.name || 'Unknown',
        time: new Date(data.logTime || new Date()).toLocaleTimeString(),
        attendanceType: 'checkin',
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
        const res = await apiRequest("POST", "/api/time-logs", {
          faceDescriptor,
          type: 'checkout',
        });

        // Nếu đến đây, nghĩa là API đã thành công
        const data = res.data;
        console.log("Clock-out API success response:", data);
        return data;
      } catch (error: any) {
        console.log("Phân tích error object:", error);

        // Khi có lỗi, đầu tiên kiểm tra xem có dữ liệu employee trong errorData không
        if (error.response?.errorData?.employee) {
          const data = error.response.errorData;
          return {
            ...data,
            wasSuccessful: true,
            _error: new Error(data.message || 'Clock-out warning')
          };
        }

        // Nếu không tìm thấy thông tin employee, thì throw lỗi
        throw error;
      }
    },
    onSuccess: (data) => {
      // Kiểm tra xem dữ liệu có phải là loại đặc biệt từ lỗi không
      if (data._error) {
        console.log("Check-out with warning:", data._error.message);
        // Hiển thị thông báo cảnh báo nhưng vẫn coi là thành công
        toast({
          title: "Check-out Successful with Warning",
          description: data._error.message,
          variant: "default", // Sử dụng variant default thay vì warning
        });
      } else {
        // Trường hợp thành công hoàn toàn
        let employeeName = "Employee";

        // Kiểm tra trước khi truy cập thuộc tính của employee
        if (data.employee && typeof data.employee === 'object') {
          const firstName = data.employee.firstName || '';
          const lastName = data.employee.lastName || '';
          employeeName = `${firstName} ${lastName}`.trim() || "Employee";
        }

        toast({
          title: "Clocked Out",
          description: `Successfully clocked out ${employeeName}`,
        });
      }

      setStatus('success');

      // Tạo recognized user với kiểm tra an toàn
      const employeeData = data.employee || {};
      const employeeDepartment = employeeData.department || {};

      setRecognizedUser({
        id: data.employeeId || 0,
        employeeId: employeeData.employeeId || '',
        name: employeeData.firstName && employeeData.lastName ?
          `${employeeData.firstName} ${employeeData.lastName}` : "Employee",
        department: employeeDepartment.name || 'Unknown',
        time: new Date(data.logTime || new Date()).toLocaleTimeString(),
        attendanceType: 'checkout',
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

  const handleClockIn = async (providedDescriptor?: string) => {
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

    setCurrentAttendanceType('checkin');
    setIsProcessing(true);
    setStatus('processing');
    let apiSuccess = false;
    let response = null;

    try {
      // Sử dụng descriptor đã cung cấp hoặc lấy mới
      const faceDescriptor = providedDescriptor || await captureFaceDescriptor();

      try {
        response = await clockInMutation.mutateAsync(faceDescriptor);
        // If we get here, it means the API call was successful
        apiSuccess = true;

        // Làm mới dữ liệu time logs
        queryClient.invalidateQueries({ queryKey: ['timeLogs'] });

        return response;
      } catch (error: any) {
        console.log("Phân tích error object:", error);

        // Kiểm tra nhiều nơi có thể chứa thông tin employee
        const employeeData = extractEmployeeData(error);

        if (employeeData) {
          // Nếu tìm thấy dữ liệu employee trong error, coi như thành công
          console.log("Tìm thấy dữ liệu employee trong error, xử lý như thành công:", employeeData);
          apiSuccess = true;

          // Use the employee data to set recognized user
          setStatus('success');
          setRecognizedUser({
            id: employeeData.id,
            employeeId: employeeData.employeeId || employeeData.employee_id || '',
            name: employeeData.name
              ? employeeData.name
              : employeeData.firstName && employeeData.lastName
                ? `${employeeData.firstName} ${employeeData.lastName}`
                : employeeData.first_name && employeeData.last_name
                  ? `${employeeData.first_name} ${employeeData.last_name}`
                  : 'Unknown User',
            department: employeeData.department?.name || employeeData.departmentName || 'Unknown',
            time: new Date().toLocaleTimeString(),
            attendanceType: 'checkin',
          });

          toast({
            title: "Clocked In",
            description: "Successfully clocked in",
          });
          setIsProcessing(false);

          // Làm mới dữ liệu time logs
          queryClient.invalidateQueries({ queryKey: ['timeLogs'] });

          return error.response?.data || error.data;
        }

        // Nếu không tìm thấy dữ liệu nhân viên, thử kiểm tra xem có bản ghi mới không
        if (error.response?.data?.employeeId || error.data?.employeeId) {
          const empId = error.response?.data?.employeeId || error.data?.employeeId;
          const isTimeLogCreated = await checkForNewTimeLog(empId, 'checkin');

          if (isTimeLogCreated) {
            console.log("Phát hiện time log mới được tạo, xử lý như thành công");
            apiSuccess = true;
            setStatus('success');
            // Hiển thị thông báo thành công
            toast({
              title: "Clocked In",
              description: "Successfully clocked in. Time log has been recorded.",
            });
            setIsProcessing(false);
            return;
          }
        }

        // Actual error handling for failed operations
        console.error("Clock-in error:", error);

        // Trích xuất thông báo lỗi từ API
        let errorMessage = error.message || "Could not process face data";
        let errorTitle = "Recognition Failed";

        // Xử lý các loại lỗi cụ thể
        if (errorMessage.includes("Bạn đã check-in trước đó")) {
          errorTitle = "Check-in Failed";
          errorMessage = "Bạn đã check-in trước đó. Vui lòng check-out trước khi check-in lại.";
        } else if (errorMessage.includes("Vui lòng đợi ít nhất 1 phút")) {
          errorTitle = "Check-in Failed";
          errorMessage = "Vui lòng đợi ít nhất 1 phút trước khi check-in lại.";
        } else if (errorMessage.includes("Face descriptor is required")) {
          errorTitle = "Check-in Failed";
          errorMessage = "Không nhận diện được khuôn mặt. Vui lòng thử lại.";
        } else if (errorMessage.includes("Invalid face descriptor")) {
          errorTitle = "Check-in Failed";
          errorMessage = "Dữ liệu khuôn mặt không hợp lệ. Vui lòng thử lại.";
        } else if (errorMessage.includes("Không thể nhận diện khuôn mặt")) {
          errorTitle = "Check-in Failed";
          errorMessage = "Không thể nhận diện khuôn mặt. Vui lòng thử lại với ánh sáng tốt hơn.";
        }

        toast({
          title: errorTitle,
          description: errorMessage,
          variant: "destructive",
        });

        throw error;
      }
    } catch (error: any) {
      console.error("Face recognition error:", error);
      if (!apiSuccess) {
        setStatus('error');
        setIsProcessing(false);
      }
    }
  };

  const handleClockOut = async (providedDescriptor?: string) => {
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

    setCurrentAttendanceType('checkout');
    setIsProcessing(true);
    setStatus('processing');
    let apiSuccess = false;
    let response = null;

    try {
      // Sử dụng descriptor đã cung cấp hoặc lấy mới
      const faceDescriptor = providedDescriptor || await captureFaceDescriptor();

      try {
        response = await clockOutMutation.mutateAsync(faceDescriptor);
        // If we get here, it means the API call was successful
        apiSuccess = true;

        // Làm mới dữ liệu time logs
        queryClient.invalidateQueries({ queryKey: ['timeLogs'] });

        return response;
      } catch (error: any) {
        console.log("Phân tích error object:", error);

        // Kiểm tra nhiều nơi có thể chứa thông tin employee
        const employeeData = extractEmployeeData(error);

        if (employeeData) {
          // Nếu tìm thấy dữ liệu employee trong error, coi như thành công
          console.log("Tìm thấy dữ liệu employee trong error, xử lý như thành công:", employeeData);
          apiSuccess = true;

          // Use the employee data to set recognized user
          setStatus('success');
          setRecognizedUser({
            id: employeeData.id,
            employeeId: employeeData.employeeId || employeeData.employee_id || '',
            name: employeeData.name
              ? employeeData.name
              : employeeData.firstName && employeeData.lastName
                ? `${employeeData.firstName} ${employeeData.lastName}`
                : employeeData.first_name && employeeData.last_name
                  ? `${employeeData.first_name} ${employeeData.last_name}`
                  : 'Unknown User',
            department: employeeData.department?.name || employeeData.departmentName || 'Unknown',
            time: new Date().toLocaleTimeString(),
            attendanceType: 'checkout',
          });

          toast({
            title: "Clocked Out",
            description: "Successfully clocked out",
          });
          setIsProcessing(false);

          // Làm mới dữ liệu time logs
          queryClient.invalidateQueries({ queryKey: ['timeLogs'] });

          return error.response?.data || error.data;
        }

        // Nếu không tìm thấy dữ liệu nhân viên, thử kiểm tra xem có bản ghi mới không
        if (error.response?.data?.employeeId || error.data?.employeeId) {
          const empId = error.response?.data?.employeeId || error.data?.employeeId;
          const isTimeLogCreated = await checkForNewTimeLog(empId, 'checkout');

          if (isTimeLogCreated) {
            console.log("Phát hiện time log mới được tạo, xử lý như thành công");
            apiSuccess = true;
            setStatus('success');
            // Hiển thị thông báo thành công
            toast({
              title: "Clocked Out",
              description: "Successfully clocked out. Time log has been recorded.",
            });
            setIsProcessing(false);
            return;
          }
        }

        // Actual error handling for failed operations
        console.error("Clock-out error:", error);

        // Trích xuất thông báo lỗi từ API
        let errorMessage = error.message || "Could not process face data";
        let errorTitle = "Recognition Failed";

        // Xử lý các loại lỗi cụ thể
        if (errorMessage.includes("Bạn chưa check-in hôm nay")) {
          errorTitle = "Check-out Failed";
          errorMessage = "Bạn chưa check-in hôm nay. Vui lòng check-in trước khi check-out.";
        } else if (errorMessage.includes("Không có check-in nào cần check-out")) {
          errorTitle = "Check-out Failed";
          errorMessage = "Không có check-in nào cần check-out. Vui lòng check-in trước.";
        } else if (errorMessage.includes("Vui lòng đợi ít nhất 1 phút")) {
          errorTitle = "Check-out Failed";
          errorMessage = "Vui lòng đợi ít nhất 1 phút trước khi check-out lại.";
        } else if (errorMessage.includes("Face descriptor is required")) {
          errorTitle = "Check-out Failed";
          errorMessage = "Không nhận diện được khuôn mặt. Vui lòng thử lại.";
        } else if (errorMessage.includes("Invalid face descriptor")) {
          errorTitle = "Check-out Failed";
          errorMessage = "Dữ liệu khuôn mặt không hợp lệ. Vui lòng thử lại.";
        } else if (errorMessage.includes("Không thể nhận diện khuôn mặt")) {
          errorTitle = "Check-out Failed";
          errorMessage = "Không thể nhận diện khuôn mặt. Vui lòng thử lại với ánh sáng tốt hơn.";
        }

        toast({
          title: errorTitle,
          description: errorMessage,
          variant: "destructive",
        });

        throw error;
      }
    } catch (error: any) {
      console.error("Face recognition error:", error);
      if (!apiSuccess) {
        setStatus('error');
        setIsProcessing(false);
      }
    }
  };

  const handleRefresh = () => {
    setStatus('waiting');
    setRecognizedUser(null);
    setIsProcessing(false);
  };

  // Xử lý khi nhận diện khuôn mặt thành công
  const handleFaceRecognized = (descriptor: string, person: any) => {
    if (isProcessing || !person) return;

    // Lưu descriptor để sử dụng khi cần
    setDetectedFaceDescriptor(descriptor);

    // Nếu đang ở chế độ tự động xử lý, thực hiện check-in/check-out ngay
    if (autoProcessing) {
      if (currentAttendanceType === 'checkin') {
        handleClockIn(descriptor);
      } else {
        handleClockOut(descriptor);
      }
    }
  };

  // Thêm toggle cho chế độ tự động
  const toggleAutoProcessing = () => {
    setAutoProcessing(prev => !prev);
    toast({
      title: autoProcessing ? "Auto Mode Disabled" : "Auto Mode Enabled",
      description: autoProcessing
        ? "You'll need to click buttons to clock in/out"
        : "System will automatically process when a face is recognized",
    });
  };

  // Kiểm tra xem một bản ghi chấm công mới có được tạo không
  const checkForNewTimeLog = async (employeeId: number, type: string): Promise<boolean> => {
    try {
      console.log(`Kiểm tra log mới cho employee ID: ${employeeId}, type: ${type}`);
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');

      // Truy vấn time log mới nhất của nhân viên
      const res = await apiRequest("GET", `/api/time-logs/latest/${employeeId}?date=${today}&type=${type}`);

      if (!res.ok) {
        console.log("Không tìm thấy log mới");
        return false;
      }

      const data = await res.json();
      console.log("Dữ liệu log mới nhất:", data);

      if (!data || !data.log_time) {
        return false;
      }

      const logTime = new Date(data.log_time);
      const timeDiffSeconds = (now.getTime() - logTime.getTime()) / 1000;

      // Nếu thời gian log trong vòng 1 phút, coi như thành công
      return timeDiffSeconds <= 60;
    } catch (error) {
      console.error("Lỗi kiểm tra time log:", error);
      return false;
    }
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
          <div className="flex items-center gap-2">
            <Button
              variant={autoProcessing ? "default" : "outline"}
              size="sm"
              onClick={toggleAutoProcessing}
              title={autoProcessing ? "Disable auto mode" : "Enable auto mode"}
            >
              Auto {autoProcessing ? "ON" : "OFF"}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isProcessing}>
              <RefreshCw className="h-4 w-4 mr-1" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <FaceDetector
              videoRef={videoRef}
              canvasRef={canvasRef}
              status={status}
              onFaceRecognized={handleFaceRecognized}
            />

            <div className="mt-4 flex justify-center">
              {isCameraReady ? (
                <>
                  <Button
                    onClick={() => handleClockIn()}
                    className="bg-green-600 text-white py-2 px-6 rounded-full flex items-center justify-center mr-4 hover:bg-green-700 transition-colors"
                    disabled={isProcessing || clockInMutation.isPending || status === 'processing'}
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    <span>Clock In</span>
                  </Button>
                  <Button
                    onClick={() => handleClockOut()}
                    variant="destructive"
                    className="py-2 px-6 rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors"
                    disabled={isProcessing || clockOutMutation.isPending || status === 'processing'}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
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
              attendanceType={currentAttendanceType}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
