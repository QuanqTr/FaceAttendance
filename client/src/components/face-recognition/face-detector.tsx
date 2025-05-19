import { useEffect, useRef, useState } from "react";
import { Camera, VideoOff, Settings, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RecognitionStatusType } from "@/components/dashboard/attendance-recognition";
import * as faceapi from 'face-api.js';
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

type CameraDevice = {
  deviceId: string;
  label: string;
  kind: string;
};

type RecognizedPerson = {
  name: string;
  confidence: number;
  employeeId?: number;
};

type FaceDetectorProps = {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  status: RecognitionStatusType;
  modelsPreloaded?: boolean;
  onFaceRecognized?: (descriptor: string, person: RecognizedPerson | null) => void;
};

// Thêm interface cho dữ liệu nhân viên
interface EmployeeWithFace {
  id: number;
  firstName: string;
  lastName: string;
  faceDescriptor: string;
}

export function FaceDetector({ videoRef, canvasRef, status, modelsPreloaded = false, onFaceRecognized }: FaceDetectorProps) {
  const { toast } = useToast();
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("Camera access denied");
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [isCameraOn, setIsCameraOn] = useState(true);
  const modelsLoaded = useRef(false);
  const intervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const componentMounted = useRef(true);
  const initAttempts = useRef(0);
  const maxInitAttempts = 3;

  // State lưu trữ phát hiện khuôn mặt trước đó để làm mịn hiển thị
  const lastDetectionsRef = useRef<faceapi.FaceDetection[]>([]);
  const detectionCountRef = useRef(0);
  const stableDetectionRef = useRef<boolean>(false);
  // Thêm biến để theo dõi trạng thái nhận diện ổn định
  const lastSuccessfulDetectionTimeRef = useRef<number>(0);
  const successBoxOpacityRef = useRef<number>(0);

  // Thêm state để lưu thông tin người được nhận diện
  const [recognizedPerson, setRecognizedPerson] = useState<RecognizedPerson | null>(null);

  // Thêm biến để kiểm soát việc nhận diện
  const detectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);

  // Thêm state để lưu trữ danh sách nhân viên có face descriptor
  const [employeesWithFace, setEmployeesWithFace] = useState<EmployeeWithFace[]>([]);

  // Fetch danh sách nhân viên có face descriptor từ API
  const { data: employeesData, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employeesWithFace'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/employees');
        if (!response.ok) {
          throw new Error('Failed to fetch employees');
        }
        const data = await response.json();
        console.log('Fetched employees:', data);

        // Lọc những nhân viên có face descriptor
        const employeesWithFace = data.employees.filter(
          (emp: any) => emp.faceDescriptor && emp.faceDescriptor !== ''
        );

        console.log(`Found ${employeesWithFace.length} employees with face descriptors`);
        return employeesWithFace;
      } catch (error) {
        console.error('Error fetching employees:', error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Cập nhật state khi có dữ liệu mới
  useEffect(() => {
    if (employeesData && Array.isArray(employeesData)) {
      setEmployeesWithFace(employeesData);
    }
  }, [employeesData]);

  const getAvailableCameras = async () => {
    try {
      console.log("Getting available cameras...");

      // Đảm bảo API enumerateDevices có sẵn
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.error("enumerateDevices is not supported in this browser");
        setErrorMessage("Camera detection is not supported in your browser");
        setCameraError(true);
        return [];
      }

      // Thử lấy quyền truy cập camera trước khi liệt kê
      try {
        // Yêu cầu quyền truy cập camera trước để có được nhãn đầy đủ
        const tempStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
        // Dừng stream ngay sau khi nhận được quyền truy cập
        tempStream.getTracks().forEach(track => track.stop());
        console.log("Successfully got temporary camera access");
      } catch (permError) {
        console.warn("Could not get temporary camera access:", permError);
        // Tiếp tục mà không có quyền truy cập tạm thời
      }

      // Lấy danh sách thiết bị
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      console.log(`Found ${cameras.length} camera(s)`, cameras);

      // Nếu không có camera nào được tìm thấy
      if (cameras.length === 0) {
        setErrorMessage("No camera devices detected");
        setCameraError(true);
        return [];
      }

      // Nếu không có nhãn camera, thử lại lần nữa với quyền truy cập
      if (cameras.length > 0 && !cameras[0].label) {
        console.log("No camera labels available, requesting camera access...");
        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          // Dừng stream ngay lập tức, chúng ta chỉ cần nó để lấy nhãn
          tempStream.getTracks().forEach(track => track.stop());
          // Bây giờ lấy lại các thiết bị để có nhãn
          const refreshedDevices = await navigator.mediaDevices.enumerateDevices();
          const refreshedCameras = refreshedDevices.filter(device => device.kind === 'videoinput');
          cameras.splice(0, cameras.length, ...refreshedCameras);
        } catch (e) {
          console.warn("Could not get camera access for labels:", e);
          // Tiếp tục với các nhãn generic
        }
      }

      // Tạo danh sách camera với nhãn
      const cameraDevices = cameras.map((camera, index) => ({
        deviceId: camera.deviceId,
        label: camera.label || `Camera ${index + 1}`, // Thêm index để dễ phân biệt
        kind: camera.kind
      }));

      if (!componentMounted.current) return [];

      setAvailableCameras(cameraDevices);
      console.log("Available cameras set:", cameraDevices);

      // Nếu không có camera nào được chọn, chọn camera đầu tiên
      if (cameras.length > 0 && !selectedCamera) {
        // Thử tìm camera trước - nhiều thiết bị có camera trước là camera thứ 2
        const frontCamera = cameras.find(camera =>
          camera.label &&
          (camera.label.toLowerCase().includes('front') ||
            camera.label.toLowerCase().includes('user') ||
            camera.label.toLowerCase().includes('facetime'))
        );

        // Nếu tìm thấy camera trước, chọn nó
        if (frontCamera) {
          setSelectedCamera(frontCamera.deviceId);
          console.log("Selected front camera:", frontCamera.deviceId, frontCamera.label);
        } else {
          // Ngược lại, chọn camera đầu tiên
          setSelectedCamera(cameras[0].deviceId);
          console.log("Selected first camera:", cameras[0].deviceId);
        }
      }

      return cameraDevices;
    } catch (error) {
      console.error("Error enumerating cameras:", error);
      setErrorMessage("Could not detect cameras. Please check your browser permissions.");
      setCameraError(true);
      return [];
    }
  };

  const stopCurrentStream = () => {
    if (streamRef.current) {
      console.log("Stopping existing camera stream");
      const tracks = streamRef.current.getTracks();
      tracks.forEach(track => {
        track.stop();
        console.log(`Stopped track: ${track.kind}`);
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async (deviceId?: string) => {
    if (!componentMounted.current) {
      console.log("Component not mounted, cancelling camera start");
      return;
    }

    setIsLoading(true);
    initAttempts.current += 1;
    console.log(`Start camera attempt ${initAttempts.current}/${maxInitAttempts}`);

    try {
      if (!videoRef.current) {
        console.error("Video element not found");
        if (componentMounted.current) {
          setErrorMessage("Video element not found or not accessible");
          setCameraError(true);
          setIsLoading(false);
        }
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("getUserMedia is not supported in this browser");
        if (componentMounted.current) {
          setErrorMessage("Your browser doesn't support camera access");
          setCameraError(true);
          setIsLoading(false);
        }
        return;
      }

      stopCurrentStream();

      // Kiểm tra trạng thái camera trước khi thử khởi tạo
      const checkCameraStatus = async () => {
        try {
          // Thử lấy danh sách thiết bị
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(device => device.kind === 'videoinput');

          if (videoDevices.length === 0) {
            throw new Error("No camera devices found");
          }

          // Nếu có deviceId, kiểm tra xem thiết bị có tồn tại không
          if (deviceId && !videoDevices.some(device => device.deviceId === deviceId)) {
            throw new Error("Specified camera device not found");
          }

          return true;
        } catch (error) {
          console.error("Camera status check failed:", error);
          return false;
        }
      };

      // Kiểm tra trạng thái camera
      const cameraAvailable = await checkCameraStatus();
      if (!cameraAvailable) {
        throw new Error("Camera is not available or not properly connected");
      }

      // Thử khởi tạo camera với các cấu hình khác nhau
      const tryCameraConfig = async () => {
        // Create an array of valid configurations without null values
        const configs: MediaStreamConstraints[] = [
          // Cấu hình cơ bản
          { video: true, audio: false },
        ];

        // Add deviceId configuration if available
        if (deviceId) {
          configs.push({
            video: { deviceId: { exact: deviceId } },
            audio: false
          });
        }

        // Add facingMode configuration as a fallback
        configs.push({
          video: { facingMode: "user" },
          audio: false
        });

        for (const config of configs) {
          try {
            console.log("Trying camera configuration:", JSON.stringify(config));

            // Thêm timeout cho mỗi lần thử
            const timeoutPromise = new Promise<MediaStream>((_, reject) => {
              setTimeout(() => reject(new Error("Camera initialization timeout")), 5000);
            });

            const stream = await Promise.race([
              navigator.mediaDevices.getUserMedia(config),
              timeoutPromise
            ]);

            if (stream) {
              return stream;
            }
          } catch (err) {
            console.warn("Configuration failed:", err);
            continue;
          }
        }
        throw new Error("All camera configurations failed");
      };

      try {
        const stream = await tryCameraConfig();

        if (!stream) {
          throw new Error('Failed to get camera stream');
        }

        // Lưu stream
        streamRef.current = stream;

        // Đảm bảo component vẫn mounted
        if (!componentMounted.current || !videoRef.current) {
          stopCurrentStream();
          return;
        }

        // Gán stream cho video element
        console.log("Setting stream to video element");
        videoRef.current.srcObject = stream;
        videoRef.current.style.display = 'block';

        // Thiết lập các thuộc tính video
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        videoRef.current.autoplay = true;

        // Đợi video sẵn sàng với timeout ngắn hơn
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error("Video element not available"));
            return;
          }

          const handlePlaying = () => {
            console.log("Video is now playing");
            if (videoRef.current) {
              videoRef.current.removeEventListener('playing', handlePlaying);
            }
            resolve();
          };

          videoRef.current.addEventListener('playing', handlePlaying);

          // Timeout ngắn hơn cho việc phát video
          const videoTimeout = setTimeout(() => {
            if (videoRef.current && videoRef.current.readyState >= 2) {
              console.log("Video is ready even though playing event wasn't fired");
              resolve();
            } else {
              reject(new Error("Video playback timeout"));
            }
          }, 3000);

          videoRef.current.onloadedmetadata = () => {
            console.log("Video metadata loaded");
            if (videoRef.current) {
              videoRef.current.play().catch(e => {
                console.error("Error playing video after metadata loaded:", e);
                reject(e);
              });
            }
          };

          return () => clearTimeout(videoTimeout);
        });

        // Camera đã khởi tạo thành công
        if (componentMounted.current) {
          setCameraActive(true);
          setCameraError(false);
          console.log("Camera is now active");
          initAttempts.current = 0;
          setIsLoading(false);

          // Refresh danh sách camera
          if (availableCameras.some(camera => !camera.label || camera.label.startsWith('Camera '))) {
            getAvailableCameras();
          }
        }
      } catch (e) {
        console.error("Error accessing camera:", e);

        if (!componentMounted.current) {
          return;
        }

        // Xử lý các lỗi cụ thể
        let errorMsg = "Camera access failed";

        if (e instanceof Error) {
          if (e.name === 'NotReadableError' || e.name === 'TrackStartError') {
            errorMsg = "Camera might be in use by another application. Please close other apps that might be using the camera.";
          } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
            errorMsg = "No camera found. Please connect a camera and try again.";
          } else if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
            errorMsg = "Camera access denied. Please check your browser permissions.";
          } else if (e.name === 'AbortError' || e.message?.includes('timeout')) {
            errorMsg = "Camera initialization timed out. Please try again.";
          } else if (e.message) {
            errorMsg = e.message;
          }
        }

        // Thử lại nếu còn lần thử
        if (initAttempts.current < maxInitAttempts && componentMounted.current) {
          console.log(`Error encountered, retrying camera initialization (attempt ${initAttempts.current}/${maxInitAttempts})`);
          setIsLoading(false);
          setTimeout(() => {
            if (componentMounted.current) {
              startCamera(deviceId);
            }
          }, 2000);
          return;
        }

        if (componentMounted.current) {
          setErrorMessage(errorMsg);
          setCameraError(true);
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error("Unexpected error in startCamera:", error);
      if (componentMounted.current) {
        setErrorMessage("An unexpected error occurred while starting the camera");
        setCameraError(true);
        setIsLoading(false);
      }
    }
  };

  // Helper function to check if a model file exists
  const checkModelFile = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (e) {
      console.error(`Error checking model file at ${url}:`, e);
      return false;
    }
  };

  // Modified fetch for specific content-type
  const fetchWithContentType = async (uri: RequestInfo, init?: RequestInit) => {
    const options = {
      ...init,
      headers: {
        ...init?.headers,
        'Accept': 'application/json'
      }
    };

    const response = await fetch(uri, options);
    if (!response.ok) {
      throw new Error(`Fetch failed: ${uri} (${response.status})`);
    }

    return response;
  };

  // Load face-api.js models
  useEffect(() => {
    componentMounted.current = true;

    const loadModels = async () => {
      if (!componentMounted.current) return;

      setIsLoading(true);
      try {
        // Nếu model đã được tải trước từ component cha, hoặc đã tải trong component này
        if (modelsPreloaded || modelsLoaded.current) {
          console.log("Models already loaded, skipping loading step");
          modelsLoaded.current = true;
          setIsModelLoaded(true);
          setIsLoading(false);
          return;
        }

        // Set the path to the models - use absolute path to ensure correct loading
        // Avoid using window.location.origin as it might cause issues in some environments
        const MODEL_URL = '/models';
        console.log("Loading face models from:", MODEL_URL);

        // Try both absolute and relative paths
        const MODEL_PATHS = [
          MODEL_URL,
          `${window.location.origin}${MODEL_URL}`,
        ];

        let validModelPath = '';
        for (const path of MODEL_PATHS) {
          const modelExists = await checkModelFile(`${path}/tiny_face_detector_model-weights_manifest.json`);
          if (modelExists) {
            validModelPath = path;
            console.log(`Found valid model path: ${validModelPath}`);
            break;
          }
        }

        if (!validModelPath) {
          throw new Error('Face detection models not found. Please check the server configuration.');
        }

        // Configure face-api.js to use explicit net names
        faceapi.env.monkeyPatch({
          Canvas: HTMLCanvasElement,
          Image: HTMLImageElement,
          ImageData: ImageData,
          Video: HTMLVideoElement,
          createCanvasElement: () => document.createElement('canvas'),
          createImageElement: () => document.createElement('img')
        });

        try {
          // Load models using our modified options
          console.log("Loading tinyFaceDetector...");
          await faceapi.nets.tinyFaceDetector.load(validModelPath);
          console.log("Loaded tinyFaceDetector");

          console.log("Loading SsdMobilenetv1...");
          await faceapi.nets.ssdMobilenetv1.load(validModelPath);
          console.log("Loaded SsdMobilenetv1");

          console.log("Loading faceLandmark68Net...");
          await faceapi.nets.faceLandmark68Net.load(validModelPath);
          console.log("Loaded faceLandmark68Net");

          console.log("Loading faceLandmark68TinyNet...");
          await faceapi.nets.faceLandmark68TinyNet.load(validModelPath);
          console.log("Loaded faceLandmark68TinyNet");

          console.log("Loading faceRecognitionNet...");
          await faceapi.nets.faceRecognitionNet.load(validModelPath);
          console.log("Loaded faceRecognitionNet");

          console.log("Loading faceExpressionNet...");
          await faceapi.nets.faceExpressionNet.load(validModelPath);
          console.log("Loaded faceExpressionNet");

          console.log('Face-api models loaded successfully');

          if (componentMounted.current) {
            modelsLoaded.current = true;
            setIsModelLoaded(true);

            // Notify user that models loaded successfully
            toast({
              title: "Face recognition ready",
              description: "All models loaded successfully",
            });
          }
        } catch (e) {
          console.error('Error during model loading:', e);
          setErrorMessage(e instanceof Error ? e.message : "Failed to load face recognition models");
          setCameraError(true);
        }
      } catch (error) {
        console.error('Error in loadModels function:', error);
        setErrorMessage(error instanceof Error ? error.message : "Failed to initialize face recognition");
        setCameraError(true);
      } finally {
        if (componentMounted.current) {
          setIsLoading(false);
        }
      }
    };

    // Load models and get cameras in parallel
    loadModels();
    getAvailableCameras();

    return () => {
      console.log("FaceDetector component unmounting - cleaning up resources");
      componentMounted.current = false;

      // Clear any detection intervals
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Stop camera streams
      stopCurrentStream();

      // Reset state refs to prevent memory leaks
      modelsLoaded.current = false;
      initAttempts.current = 0;

      // Reset face detection state
      lastDetectionsRef.current = [];
      detectionCountRef.current = 0;
      stableDetectionRef.current = false;
      lastSuccessfulDetectionTimeRef.current = 0;
      successBoxOpacityRef.current = 0;

      // Remove any active listeners from the video element
      if (videoRef.current) {
        videoRef.current.onloadedmetadata = null;
        videoRef.current.onplaying = null;
        videoRef.current.onpause = null;
        videoRef.current.onerror = null;
      }
    };
  }, [toast]);

  // Setup camera when the camera device is selected
  useEffect(() => {
    if (!selectedCamera || !componentMounted.current) return;
    console.log("Camera selected, checking if we can start it...", selectedCamera);

    // Only start camera if models are loaded or we're retrying after an error
    if (isModelLoaded || cameraError) {
      // Delay camera initialization to ensure the videoRef is properly initialized
      const initCamera = setTimeout(() => {
        if (videoRef.current) {
          console.log("Starting camera with selected device", selectedCamera);
          startCamera(selectedCamera);
        } else {
          console.error("Video element still not available after delay");
          setCameraError(true);
          setErrorMessage("Video element not available. Please refresh the page.");
          setIsLoading(false);
        }
      }, 500); // Add a small delay to ensure React has fully mounted the component

      return () => {
        clearTimeout(initCamera);
      };
    } else {
      console.log("Waiting for models to load before starting camera");
    }
  }, [selectedCamera, isModelLoaded, cameraError]);

  // Also add a direct check for the videoRef in the component return
  useEffect(() => {
    // Log the presence of video element for debugging
    console.log("Video element ref check:", {
      hasVideoRef: !!videoRef.current,
      hasCanvasRef: !!canvasRef.current
    });
  }, []);

  // Add a manual init button to help if automatic initialization fails
  const handleManualInit = () => {
    console.log("Manual camera initialization requested");
    if (videoRef.current) {
      console.log("Video element available, starting camera");
      startCamera(selectedCamera || undefined);
    } else {
      console.error("Video element not available for manual init");
      toast({
        title: "Initialization Error",
        description: "Video element not available. Try refreshing the page.",
        variant: "destructive",
      });
    }
  };

  // Setup face detection when both camera and models are ready
  useEffect(() => {
    if (!componentMounted.current) return;

    const setupFaceDetection = () => {
      if (!videoRef.current || !canvasRef.current || !isModelLoaded || !cameraActive || status === 'processing') {
        return;
      }

      // Clear any existing intervals
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }

      // Set an interval to detect faces - giảm xuống 200ms
      intervalRef.current = window.setInterval(detectFaces, 200);

      return () => {
        if (intervalRef.current !== null) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (detectionTimeoutRef.current !== null) {
          clearTimeout(detectionTimeoutRef.current);
          detectionTimeoutRef.current = null;
        }
        isProcessingRef.current = false;
      };
    };

    setupFaceDetection();

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (detectionTimeoutRef.current !== null) {
        clearTimeout(detectionTimeoutRef.current);
        detectionTimeoutRef.current = null;
      }
      isProcessingRef.current = false;
    };
  }, [canvasRef, videoRef, cameraActive, isModelLoaded, status]);

  // Handle camera permission changes
  useEffect(() => {
    if (!componentMounted.current) return;

    const handlePermissionChange = () => {
      console.log("Permission status changed, refreshing camera");
      getAvailableCameras();
      if (selectedCamera) {
        startCamera(selectedCamera);
      }
    };

    try {
      // Try to set up permission change listener
      navigator.permissions?.query({ name: 'camera' as PermissionName })
        .then(permissionStatus => {
          permissionStatus.onchange = handlePermissionChange;
        })
        .catch(e => console.warn("Could not set up permission listener:", e));
    } catch (e) {
      console.warn("Browser doesn't support permission API:", e);
    }

    return () => {
      // Cleanup permission listener if possible
      try {
        navigator.permissions?.query({ name: 'camera' as PermissionName })
          .then(permissionStatus => {
            permissionStatus.onchange = null;
          })
          .catch(() => { });
      } catch (e) {
        // Ignore cleanup errors
      }
    };
  }, [selectedCamera]);

  // Manually retry camera when button is clicked
  const handleRetryCamera = () => {
    console.log("Manually retrying camera...");
    setCameraError(false);
    setIsLoading(true);

    // Try to get cameras again
    getAvailableCameras().then(cameras => {
      if (cameras.length > 0) {
        setSelectedCamera(cameras[0].deviceId);
      } else {
        // If no cameras found, try with default
        startCamera();
      }
    });
  };

  // Thêm hàm xử lý bật tắt camera
  const toggleCamera = () => {
    if (isCameraOn) {
      // Tắt camera
      stopCurrentStream();
      setIsCameraOn(false);
      setCameraActive(false);
      // Reset lỗi nếu có
      if (cameraError) {
        setCameraError(false);
        setErrorMessage("Camera access denied");
      }

      // Reset các trạng thái camera
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Reset các biến trạng thái phát hiện khuôn mặt
      lastDetectionsRef.current = [];
      detectionCountRef.current = 0;
      stableDetectionRef.current = false;
      lastSuccessfulDetectionTimeRef.current = 0;
      successBoxOpacityRef.current = 0;

      initAttempts.current = 0;

      toast({
        title: "Camera Off",
        description: "Camera has been turned off",
      });
    } else {
      // Bật camera
      setIsCameraOn(true);
      setIsLoading(true); // Hiển thị loading khi bật lại camera
      setCameraError(false); // Reset lỗi
      initAttempts.current = 0; // Reset số lần thử

      // Reset các biến trạng thái phát hiện khuôn mặt
      lastDetectionsRef.current = [];
      detectionCountRef.current = 0;
      stableDetectionRef.current = false;
      lastSuccessfulDetectionTimeRef.current = 0;
      successBoxOpacityRef.current = 0;

      // Sử dụng setTimeout để đảm bảo UI được cập nhật trước
      setTimeout(() => {
        try {
          // Nếu có camera đã chọn thì sử dụng, ngược lại thì thử lấy tất cả camera
          if (selectedCamera && componentMounted.current) {
            startCamera(selectedCamera);
          } else {
            // Có thể cần refresh lại danh sách camera
            getAvailableCameras().then(cameras => {
              if (cameras.length > 0 && componentMounted.current) {
                startCamera(cameras[0].deviceId);
              } else if (componentMounted.current) {
                // Nếu không tìm thấy camera nào, thử khởi động với camera mặc định
                startCamera();
              }
            }).catch(err => {
              console.error("Error getting cameras:", err);
              if (componentMounted.current) {
                startCamera(); // Thử với camera mặc định
              }
            });
          }

          if (componentMounted.current) {
            toast({
              title: "Camera On",
              description: "Camera has been turned on",
            });
          }
        } catch (error) {
          console.error("Error turning camera on:", error);

          if (componentMounted.current) {
            setIsLoading(false);
            setCameraError(true);
            setErrorMessage("Failed to turn on camera. Please try again.");

            toast({
              title: "Camera Error",
              description: "Failed to turn on camera. Please try again.",
              variant: "destructive",
            });
          }
        }
      }, 100);
    }
  };

  // Sửa đổi hàm detectFaces để sử dụng dữ liệu từ API
  const detectFaces = async () => {
    if (!videoRef.current || !canvasRef.current || !cameraActive || isProcessingRef.current || !isCameraOn) {
      return;
    }

    // Kiểm tra xem mô hình đã được tải chưa
    if (!faceapi.nets.ssdMobilenetv1.isLoaded) {
      console.warn("SsdMobilenetv1 model not loaded yet, skipping detection");
      isProcessingRef.current = false;
      return;
    }

    isProcessingRef.current = true;

    try {
      // Kiểm tra xem có nhân viên nào có face descriptor không
      if (employeesWithFace.length === 0) {
        isProcessingRef.current = false;
        return;
      }

      // Ensure the canvas dimensions match the video
      const displaySize = {
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight
      };

      if (canvasRef.current.width !== displaySize.width || canvasRef.current.height !== displaySize.height) {
        canvasRef.current.width = displaySize.width;
        canvasRef.current.height = displaySize.height;
      }

      // Detect faces with landmarks and descriptors
      const detections = await faceapi.detectAllFaces(
        videoRef.current,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 })
      )
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (!detections || detections.length === 0) {
        isProcessingRef.current = false;
        return;
      }

      // Get the 2D context from canvas with null check
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) {
        console.warn("Could not get 2D context from canvas");
        isProcessingRef.current = false;
        return;
      }

      // Clear previous drawings
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      if (detections.length > 0) {
        // Tạo danh sách descriptor từ dữ liệu nhân viên
        const labeledDescriptorsFromDB = employeesWithFace
          .filter(emp => emp.faceDescriptor) // Lọc những nhân viên có face descriptor
          .map(emp => {
            try {
              // Parse face descriptor từ chuỗi JSON hoặc chuỗi phân tách bằng dấu phẩy
              let descriptor;
              if (typeof emp.faceDescriptor === 'string') {
                if (emp.faceDescriptor.startsWith('[') || emp.faceDescriptor.startsWith('{')) {
                  descriptor = JSON.parse(emp.faceDescriptor);
                } else {
                  descriptor = emp.faceDescriptor.split(',').map(Number);
                }
              } else if (Array.isArray(emp.faceDescriptor)) {
                descriptor = emp.faceDescriptor;
              } else {
                console.error(`Invalid face descriptor format for employee ${emp.id}`);
                return null;
              }

              // Kiểm tra descriptor có hợp lệ không
              if (Array.isArray(descriptor) && descriptor.length === 128) {
                return {
                  name: `${emp.firstName} ${emp.lastName}`,
                  employeeId: emp.id,
                  descriptor: new Float32Array(descriptor)
                };
              }
              return null;
            } catch (error) {
              console.error(`Error parsing face descriptor for employee ${emp.id}:`, error);
              return null;
            }
          })
          .filter(Boolean); // Lọc bỏ các giá trị null

        // So sánh với dữ liệu từ cơ sở dữ liệu
        const bestMatch = detections.map(detection => {
          const distances = labeledDescriptorsFromDB
            .filter(labeled => labeled !== null) // Lọc bỏ các giá trị null
            .map(labeled => ({
              name: labeled!.name,
              employeeId: labeled!.employeeId,
              distance: faceapi.euclideanDistance(detection.descriptor, labeled!.descriptor)
            }));

          // Nếu không có descriptor nào, trả về null
          if (distances.length === 0) {
            return null;
          }

          const best = distances.reduce((prev, curr) =>
            prev.distance < curr.distance ? prev : curr
          );

          return {
            name: best.name,
            employeeId: best.employeeId,
            confidence: 1 - best.distance,
            detection
          };
        }).filter(Boolean); // Lọc bỏ các giá trị null

        if (bestMatch.length > 0) {
          const bestMatchResult = bestMatch[0];

          // Chỉ hiển thị kết quả khi độ tin cậy > 60%
          if (bestMatchResult && bestMatchResult.confidence > 0.6) {
            setRecognizedPerson({
              name: bestMatchResult.name,
              employeeId: bestMatchResult.employeeId,
              confidence: bestMatchResult.confidence
            });

            // Gọi callback nếu có
            if (onFaceRecognized && bestMatchResult.detection.descriptor) {
              // Chuyển descriptor thành chuỗi
              const descriptorString = Array.from(bestMatchResult.detection.descriptor).toString();
              onFaceRecognized(descriptorString, {
                name: bestMatchResult.name,
                employeeId: bestMatchResult.employeeId,
                confidence: bestMatchResult.confidence
              });
            }
          } else {
            setRecognizedPerson(null);
          }

          // Vẽ kết quả
          const resizedDetections = faceapi.resizeResults(detections, displaySize);

          // Double check canvas and context are still available before drawing
          if (canvasRef.current && ctx) {
            resizedDetections.forEach((detection, i) => {
              if (i >= bestMatch.length) return;

              const matchInfo = bestMatch[i];
              if (!matchInfo) return;

              const box = detection.detection.box;
              const drawBox = new faceapi.draw.DrawBox(box, {
                label: matchInfo.confidence > 0.6
                  ? `${matchInfo.name} (${Math.round(matchInfo.confidence * 100)}%)`
                  : 'Chưa nhận diện',
                boxColor: matchInfo.confidence > 0.6 ? 'green' : 'red'
              });

              // Ensure canvas element is not null before drawing
              if (canvasRef.current) {
                drawBox.draw(canvasRef.current);
              }
            });
          }
        } else {
          setRecognizedPerson(null);
        }
      } else {
        setRecognizedPerson(null);
      }
    } catch (error) {
      console.error('Error detecting faces:', error);
      setRecognizedPerson(null);
    } finally {
      isProcessingRef.current = false;
    }
  };

  // Thêm useEffect để đảm bảo video đã sẵn sàng
  useEffect(() => {
    if (!videoRef.current) return;

    const handleVideoReady = () => {
      if (videoRef.current && videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
        console.log('Video is ready with dimensions:', {
          width: videoRef.current.videoWidth,
          height: videoRef.current.videoHeight
        });
      }
    };

    videoRef.current.addEventListener('loadedmetadata', handleVideoReady);
    videoRef.current.addEventListener('loadeddata', handleVideoReady);

    return () => {
      if (videoRef.current) {
        videoRef.current.removeEventListener('loadedmetadata', handleVideoReady);
        videoRef.current.removeEventListener('loadeddata', handleVideoReady);
      }
    };
  }, []);

  return (
    <div className="relative w-full">
      <div className={cn(
        "relative rounded-lg overflow-hidden aspect-video bg-black border-2 border-dashed",
        status === 'processing' ? "border-amber-500" : "border-primary",
        cameraError ? "border-destructive" : "",
        "flex items-center justify-center"
      )}>
        {/* Always render the video and canvas but only show when active */}
        <video
          ref={videoRef}
          className={cn(
            "absolute inset-0 w-full h-full object-contain md:object-cover",
            cameraActive && isCameraOn ? "block" : "hidden"
          )}
          autoPlay
          playsInline
          muted
          style={{
            imageRendering: "auto",
            objectFit: "cover",
            background: "#000"
          }}
          onError={(e) => {
            console.error("Video element error:", e);
            setErrorMessage("Video playback error");
            setCameraError(true);
          }}
        />
        <canvas
          ref={canvasRef}
          className={cn(
            "absolute inset-0 w-full h-full",
            cameraActive && isCameraOn ? "block" : "hidden"
          )}
          style={{
            imageRendering: "auto"
          }}
        />

        {/* Camera controls */}
        <div className="absolute top-2 right-2 z-10 flex items-center space-x-2">
          {/* Nút bật tắt camera */}
          <Button
            variant="outline"
            size="icon"
            className="bg-background/80 backdrop-blur-sm hover:bg-background/90"
            onClick={toggleCamera}
            title={isCameraOn ? "Turn camera off" : "Turn camera on"}
          >
            {isCameraOn ? (
              <VideoOff className="h-4 w-4" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </Button>

          {/* Dropdown chọn camera */}
          {cameraActive && (
            <Select
              value={selectedCamera}
              onValueChange={(value) => {
                setSelectedCamera(value);
              }}
            >
              <SelectTrigger className="w-[180px] bg-background/80 backdrop-blur-sm">
                <SelectValue placeholder="Select camera" />
              </SelectTrigger>
              <SelectContent>
                {availableCameras.map((camera) => (
                  <SelectItem key={camera.deviceId} value={camera.deviceId}>
                    {camera.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Nội dung hiển thị khi camera không hoạt động */}
        {(!cameraActive || !isCameraOn) && (
          <div className="text-center p-4 z-10">
            {isLoading && isCameraOn ? (
              <>
                <Loader2 className="mx-auto text-primary h-12 w-12 mb-2 animate-spin" />
                <p className="text-foreground">Initializing camera</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Please wait, loading components...
                </p>
              </>
            ) : cameraError && isCameraOn ? (
              <>
                <VideoOff className="mx-auto text-destructive h-12 w-12 mb-2" />
                <p className="text-foreground">{errorMessage}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Please check your camera permissions in browser settings
                </p>
                <div className="flex flex-col gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={handleRetryCamera}
                  >
                    Retry Camera
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleManualInit}
                  >
                    Manual Initialize
                  </Button>
                </div>
              </>
            ) : !isCameraOn ? (
              <>
                <VideoOff className="mx-auto text-muted-foreground h-12 w-12 mb-2" />
                <p className="text-foreground">Camera is turned off</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Click the camera button to turn it on
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={toggleCamera}
                >
                  Turn On Camera
                </Button>
              </>
            ) : (
              <>
                <Camera className="mx-auto text-primary h-12 w-12 mb-2" />
                <p className="text-foreground">Camera will display here</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Position your face in the frame
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={handleManualInit}
                >
                  Initialize Camera
                </Button>
              </>
            )}
          </div>
        )}

        {/* Hiển thị thông tin người được nhận diện */}
        {recognizedPerson && (
          <div className="absolute top-4 left-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg">
            <div className="font-semibold">Đã nhận diện: {recognizedPerson.name}</div>
            <div className="text-sm">Độ tin cậy: {Math.round(recognizedPerson.confidence * 100)}%</div>
          </div>
        )}
      </div>
    </div>
  );
}
