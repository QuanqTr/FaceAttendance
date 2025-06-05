import { useCallback, useState } from 'react';
import html2canvas from 'html2canvas';

export interface ScreenshotOptions {
    quality?: number;
    format?: 'png' | 'jpeg' | 'jpg';
    backgroundColor?: string;
    scale?: number;
}

export interface ScreenshotResult {
    base64: string;
    blob: Blob;
    canvas: HTMLCanvasElement;
}

export function useScreenshot() {
    const [isCapturing, setIsCapturing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const captureElement = useCallback(async (
        element: HTMLElement,
        options: ScreenshotOptions = {}
    ): Promise<ScreenshotResult | null> => {
        if (!element) {
            setError('Element not found');
            return null;
        }

        setIsCapturing(true);
        setError(null);

        try {
            const {
                quality = 0.9,
                format = 'png',
                backgroundColor = 'transparent',
                scale = 1
            } = options;

            // Capture the element using html2canvas
            const canvas = await html2canvas(element, {
                backgroundColor,
                scale,
                useCORS: true,
                allowTaint: true,
                logging: false,
                width: element.offsetWidth,
                height: element.offsetHeight
            });

            // Convert canvas to base64
            const base64 = canvas.toDataURL(`image/${format}`, quality);

            // Convert canvas to blob
            const blob = await new Promise<Blob>((resolve) => {
                canvas.toBlob((blob) => {
                    resolve(blob!);
                }, `image/${format}`, quality);
            });

            return {
                base64,
                blob,
                canvas
            };

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to capture screenshot';
            setError(errorMessage);
            console.error('Screenshot capture error:', err);
            return null;
        } finally {
            setIsCapturing(false);
        }
    }, []);

    const captureCanvas = useCallback(async (
        canvas: HTMLCanvasElement,
        options: ScreenshotOptions = {}
    ): Promise<ScreenshotResult | null> => {
        if (!canvas) {
            setError('Canvas not found');
            return null;
        }

        setIsCapturing(true);
        setError(null);

        try {
            const {
                quality = 0.9,
                format = 'png'
            } = options;

            // Convert canvas to base64
            const base64 = canvas.toDataURL(`image/${format}`, quality);

            // Convert canvas to blob
            const blob = await new Promise<Blob>((resolve) => {
                canvas.toBlob((blob) => {
                    resolve(blob!);
                }, `image/${format}`, quality);
            });

            return {
                base64,
                blob,
                canvas: canvas // Return the original canvas
            };

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to capture canvas';
            setError(errorMessage);
            console.error('Canvas capture error:', err);
            return null;
        } finally {
            setIsCapturing(false);
        }
    }, []);

    const captureVideo = useCallback(async (
        video: HTMLVideoElement,
        options: ScreenshotOptions = {}
    ): Promise<ScreenshotResult | null> => {
        if (!video) {
            setError('Video element not found');
            return null;
        }

        setIsCapturing(true);
        setError(null);

        try {
            const {
                quality = 0.9,
                format = 'png'
            } = options;

            // Create a canvas to capture the video frame
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
                throw new Error('Failed to get canvas context');
            }

            // Set canvas dimensions to match video
            canvas.width = video.videoWidth || video.offsetWidth;
            canvas.height = video.videoHeight || video.offsetHeight;

            // Draw the current video frame to canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Convert canvas to base64
            const base64 = canvas.toDataURL(`image/${format}`, quality);

            // Convert canvas to blob
            const blob = await new Promise<Blob>((resolve) => {
                canvas.toBlob((blob) => {
                    resolve(blob!);
                }, `image/${format}`, quality);
            });

            return {
                base64,
                blob,
                canvas
            };

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to capture video frame';
            setError(errorMessage);
            console.error('Video capture error:', err);
            return null;
        } finally {
            setIsCapturing(false);
        }
    }, []);

    return {
        captureElement,
        captureCanvas,
        captureVideo,
        isCapturing,
        error,
        clearError: () => setError(null)
    };
}
