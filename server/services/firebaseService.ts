import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getVietnamTime } from '../utils/timezone.js';

// Import firebase-admin using dynamic import to handle ES modules
let admin: any;

// Get current file path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin SDK
let firebaseApp: any;

export async function initializeFirebase() {
    if (!firebaseApp) {
        try {
            // Dynamic import firebase-admin
            if (!admin) {
                admin = await import('firebase-admin');
                // Handle both default and named exports
                admin = admin.default || admin;
            }

            // Read service account key file
            const serviceAccountPath = join(__dirname, '../../client/src/lib/faceattend-e200a-firebase-adminsdk-fbsvc-44c7631347.json');
            const serviceAccountKey = readFileSync(serviceAccountPath, 'utf8');
            const serviceAccount = JSON.parse(serviceAccountKey);

            firebaseApp = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: "https://faceattend-e200a-default-rtdb.asia-southeast1.firebasedatabase.app"
            });

            console.log('✅ Firebase Admin SDK initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing Firebase Admin SDK:', error);
            throw error;
        }
    }
    return firebaseApp;
}

// Get Firebase Realtime Database reference
export async function getDatabase() {
    if (!firebaseApp) {
        await initializeFirebase();
    }
    return admin.database();
}

// Interface for attendance screenshot data
export interface AttendanceScreenshot {
    id: string;
    name: string;
    time: string;
    base64Image: string; // Base64 image data
    employeeId?: string;
    attendanceType?: 'checkin' | 'checkout';
    timestamp?: number;
}

// Save attendance screenshot to Realtime Database with Vietnam timezone
export async function saveAttendanceScreenshot(data: { name: string; time: string; base64Image: string; employeeId?: string; attendanceType?: 'checkin' | 'checkout' }): Promise<string> {
    try {
        const db = await getDatabase();
        const screenshotsRef = db.ref('attendance-screenshots');

        // Get Vietnam time (UTC+7)
        const vietnamTime = getVietnamTime();

        // Generate unique ID
        const newScreenshotRef = screenshotsRef.push();
        const screenshotId = newScreenshotRef.key;

        if (!screenshotId) {
            throw new Error('Failed to generate screenshot ID');
        }

        // Prepare data for Realtime Database with Vietnam time
        const screenshotData: AttendanceScreenshot = {
            id: screenshotId,
            name: data.name,
            time: data.time, // Time from attendance (already adjusted)
            base64Image: data.base64Image, // Store base64 directly
            employeeId: data.employeeId || '',
            attendanceType: data.attendanceType || 'checkin',
            timestamp: vietnamTime.getTime(), // Vietnam timestamp
        };

        // Save to Realtime Database
        await newScreenshotRef.set(screenshotData);

        console.log(`✅ Attendance screenshot saved to Realtime Database with ID: ${screenshotId}`);
        return screenshotId;

    } catch (error) {
        console.error('❌ Error saving attendance screenshot to Realtime Database:', error);
        throw error;
    }
}

// Get attendance screenshots from Realtime Database
export async function getAttendanceScreenshots(limit: number = 50): Promise<AttendanceScreenshot[]> {
    try {
        const db = await getDatabase();
        const screenshotsRef = db.ref('attendance-screenshots')
            .orderByChild('timestamp')
            .limitToLast(limit);

        const snapshot = await screenshotsRef.once('value');
        const data = snapshot.val();

        if (!data) {
            return [];
        }

        // Convert to array and sort by timestamp (newest first)
        const screenshots: AttendanceScreenshot[] = Object.values(data);
        return screenshots.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    } catch (error) {
        console.error('❌ Error getting attendance screenshots from Realtime Database:', error);
        throw error;
    }
}

// Delete attendance screenshot from Realtime Database
export async function deleteAttendanceScreenshot(screenshotId: string): Promise<void> {
    try {
        const db = await getDatabase();
        const screenshotRef = db.ref(`attendance-screenshots/${screenshotId}`);

        await screenshotRef.remove();
        console.log(`✅ Attendance screenshot deleted from Realtime Database: ${screenshotId}`);

    } catch (error) {
        console.error('❌ Error deleting attendance screenshot from Realtime Database:', error);
        throw error;
    }
}
