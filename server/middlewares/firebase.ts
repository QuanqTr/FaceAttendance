import { initializeFirebase } from "../services/firebaseService.js";

// Initialize Firebase when the middleware is loaded
let firebaseInitialized = false;

export async function initializeFirebaseMiddleware() {
    if (!firebaseInitialized) {
        try {
            await initializeFirebase();
            firebaseInitialized = true;
            console.log('🔥 Firebase initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Firebase:', error);
            // Don't throw error to prevent server from crashing
            // Firebase features will just be unavailable
        }
    }
}

// Auto-initialize when this module is imported
initializeFirebaseMiddleware();
