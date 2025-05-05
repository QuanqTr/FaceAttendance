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

type CameraDevice = {
  deviceId: string;
  label: string;
  kind: string;
};

type FaceDetectorProps = {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  status: RecognitionStatusType;
};

export function FaceDetector({ videoRef, canvasRef, status }: FaceDetectorProps) {
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

    // Tăng số lần thử
    initAttempts.current += 1;
    console.log(`Start camera attempt ${initAttempts.current}/${maxInitAttempts}`);

    try {
      // Check if videoRef exists and is accessible
      if (!videoRef.current) {
        console.error("Video element not found");
        if (componentMounted.current) {
          setErrorMessage("Video element not found or not accessible");
          setCameraError(true);
          setIsLoading(false);
        }
        return;
      }

      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("getUserMedia is not supported in this browser");
        if (componentMounted.current) {
          setErrorMessage("Your browser doesn't support camera access");
          setCameraError(true);
          setIsLoading(false);
        }
        return;
      }

      // Stop existing stream if any
      stopCurrentStream();

      // Cấu hình camera với chất lượng cao hơn
      const constraints = {
        video: {
          width: { ideal: 640, min: 480 },     // Tăng độ phân giải lên cao hơn
          height: { ideal: 480, min: 360 },    // Tăng độ phân giải lên cao hơn
          frameRate: { ideal: 24, min: 15 },   // Tăng tốc độ khung hình cho video mượt hơn
          aspectRatio: { ideal: 1.33333 },     // Tỷ lệ 4:3 chuẩn cho nhận diện khuôn mặt
          facingMode: deviceId ? undefined : "user", // Ưu tiên camera trước mặt nếu không chỉ định deviceId
          deviceId: deviceId ? { exact: deviceId } : undefined,
        },
        audio: false
      };

      try {
        console.log("Requesting camera with constraints:", JSON.stringify(constraints));

        // Thiết lập thời gian chờ ngắn hơn và thử lại nhanh hơn
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
          console.warn("First camera attempt failed, trying fallback constraints", err);
          // Nếu thất bại với cấu hình ban đầu, thử lại với cấu hình tạm chấp nhận
          const fallbackConstraints = {
            video: {
              facingMode: "user",
              width: { ideal: 480, min: 320 },   // Vẫn giữ độ phân giải khá tốt
              height: { ideal: 360, min: 240 },  // Vẫn giữ độ phân giải khá tốt
              frameRate: { ideal: 20, min: 10 }  // Giảm fps một chút nhưng vẫn đủ mượt
            },
            audio: false
          };

          try {
            stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
          } catch (secondErr) {
            console.warn("Second camera attempt failed, trying basic constraints", secondErr);
            // Thử lần cuối với cấu hình cơ bản nhất
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          }
        }

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

        // Thiết lập các thuộc tính video để cải thiện hiệu suất
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        videoRef.current.autoplay = true;

        // Chỉ đặt lại các cờ khi video thực sự bắt đầu phát
        const videoReadyPromise = new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error("Video element not available"));
            return;
          }

          // Sự kiện phát triển
          const handlePlaying = () => {
            console.log("Video is now playing");
            if (videoRef.current) {
              videoRef.current.removeEventListener('playing', handlePlaying);
            }
            resolve();
          };

          // Theo dõi sự kiện playing
          videoRef.current.addEventListener('playing', handlePlaying);

          // Đồng thời theo dõi loadedmetadata để đảm bảo khả năng tương thích
          videoRef.current.onloadedmetadata = () => {
            console.log("Video metadata loaded");
            if (videoRef.current) {
              videoRef.current.play().catch(e => {
                console.error("Error playing video after metadata loaded:", e);
              });
            }
          };
        });

        // Đặt thời gian chờ ngắn cho quá trình khởi động video
        const timeoutPromise = new Promise<void>((_, reject) => {
          const timeoutId = setTimeout(() => {
            if (videoRef.current && videoRef.current.readyState >= 2) {
              console.log("Video is ready even though playing event wasn't fired");
              // Có thể phát nhưng không nhận được sự kiện playing
              return;
            }
            reject(new Error("Video startup timed out"));
          }, 5000); // Tăng timeout lên 5 giây

          // Lưu timeout ID để có thể hủy nếu component unmount
          return () => clearTimeout(timeoutId);
        });

        try {
          // Đợi video bắt đầu phát hoặc timeout
          await Promise.race([videoReadyPromise, timeoutPromise]);

          // Video đã bắt đầu phát hoặc có readyState đủ cao
          if (componentMounted.current) {
            setCameraActive(true);
            setCameraError(false);
            console.log("Camera is now active");

            // Reset số lần thử
            initAttempts.current = 0;

            // Refresh danh sách camera để lấy nhãn
            if (availableCameras.some(camera => !camera.label || camera.label.startsWith('Camera '))) {
              getAvailableCameras();
            }
          }
        } catch (timeoutError) {
          console.error("Camera startup timed out:", timeoutError);

          // Kiểm tra xem camera có thực sự hoạt động không mặc dù timeout
          if (videoRef.current && videoRef.current.readyState >= 2 && componentMounted.current) {
            console.log("Camera appears to be working despite timeout");
            setCameraActive(true);
            setCameraError(false);
            return;
          }

          // Nếu vẫn còn lần thử, thử lại với độ trễ
          if (initAttempts.current < maxInitAttempts && componentMounted.current) {
            console.log(`Retrying camera initialization (attempt ${initAttempts.current}/${maxInitAttempts})`);
            setIsLoading(false);
            setTimeout(() => {
              if (componentMounted.current) {
                startCamera(deviceId);
              }
            }, 1000);
            return;
          } else if (componentMounted.current) {
            throw new Error("Camera initialization timed out after multiple attempts");
          }
        }
      } catch (e) {
        console.error("Error accessing camera:", e);

        if (!componentMounted.current) {
          return; // Don't update state if component unmounted
        }

        // Phát hiện và xử lý các lỗi cụ thể
        let errorMsg = "Camera access failed";

        if (e instanceof Error) {
          if (e.name === 'NotReadableError' || e.name === 'TrackStartError') {
            errorMsg = "Camera might be in use by another application. Please close other apps that might be using the camera.";
          } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
            errorMsg = "No camera found. Please connect a camera and try again.";
          } else if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
            errorMsg = "Camera access denied. Please check your browser permissions.";
          } else if (e.name === 'AbortError') {
            errorMsg = "Camera initialization timed out. Please try again.";
          } else if (e.message) {
            errorMsg = e.message;
          }
        }

        // Nếu vẫn còn lần thử, thử lại với độ trễ
        if (initAttempts.current < maxInitAttempts && componentMounted.current) {
          console.log(`Error encountered, retrying camera initialization (attempt ${initAttempts.current}/${maxInitAttempts})`);
          setIsLoading(false);
          setTimeout(() => {
            if (componentMounted.current) {
              startCamera(deviceId);
            }
          }, 1000);
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
        if (modelsLoaded.current) {
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
        console.log("Not setting up face detection:", {
          videoRef: !!videoRef.current,
          canvasRef: !!canvasRef.current,
          isModelLoaded,
          cameraActive,
          status
        });
        return;
      }

      console.log("Setting up face detection interval");

      // Clear any existing intervals
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }

      // Set an interval to detect faces
      intervalRef.current = window.setInterval(async () => {
        if (!componentMounted.current || !videoRef.current || !canvasRef.current) return;

        // Make sure video is playing and ready
        if (videoRef.current.paused || videoRef.current.ended || videoRef.current.readyState < 2) return;

        try {
          // Get video dimensions
          const displaySize = {
            width: videoRef.current.videoWidth || videoRef.current.width || 640,
            height: videoRef.current.videoHeight || videoRef.current.height || 480
          };

          // Match canvas size to video
          if (canvasRef.current) {
            faceapi.matchDimensions(canvasRef.current, displaySize);
          }

          // Sử dụng phương pháp đơn giản nhất - chỉ phát hiện khuôn mặt
          const detections = await faceapi.detectAllFaces(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions({
              inputSize: 320,
              scoreThreshold: 0.65
            })
          );

          // Vẽ kết quả nếu component vẫn mounted
          if (componentMounted.current && canvasRef.current && detections.length > 0) {
            const resizedDetections = faceapi.resizeResults(detections, displaySize);
            const ctx = canvasRef.current.getContext('2d');

            if (ctx) {
              // Xóa canvas
              ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

              // Vẽ các phát hiện khuôn mặt
              resizedDetections.forEach(detection => {
                // Lấy thông tin box
                const box = detection.box;
                const score = detection.score;

                // Vẽ khung khuôn mặt
                ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
                ctx.lineWidth = 3;
                ctx.lineJoin = 'round';
                ctx.strokeRect(box.x, box.y, box.width, box.height);

                // Vẽ thông tin nhận diện
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.fillRect(box.x, box.y - 20, 90, 20);

                ctx.font = 'bold 16px Arial';
                ctx.fillStyle = 'rgba(255, 255, 255, 1)';
                ctx.fillText('Đã nhận diện', box.x + 5, box.y - 5);
              });
            }
          }
        } catch (e) {
          console.error("Error in face detection:", e);
        }
      }, 300); // Đặt lại thành 300ms - cân bằng giữa mượt mà và hiệu suất
    };

    setupFaceDetection();

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
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
      </div>
    </div>
  );
}


