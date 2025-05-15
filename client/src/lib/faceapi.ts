import * as faceapi from 'face-api.js';

// Initialize face-api with required models
export const initFaceAPI = async (): Promise<boolean> => {
    try {
        console.log("Đang tải face-api models...");

        // Đường dẫn models chính xác
        const MODEL_URL = window.location.origin + '/models';
        console.log("URL models:", MODEL_URL);

        // Tải tuần tự (không dùng Promise.all)
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        console.log("Đã tải xong SSDMobilenetv1");

        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        console.log("Đã tải xong FaceLandmark68Net");

        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        console.log("Đã tải xong FaceRecognitionNet");

        console.log("Đã tải xong tất cả models");
        return true;
    } catch (error) {
        console.error('Error loading face-api models:', error);
        throw error;
    }
};

// Export faceapi for direct use
export default faceapi; 