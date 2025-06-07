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
            console.log('⚠️ Server will continue without Firebase features');
            console.log('📸 Screenshot saving will be disabled');

            // Mark as initialized to prevent retry loops
            firebaseInitialized = true;

            // Don't throw error to prevent server from crashing
            // Firebase features will just be unavailable
        }
    }
}

// Auto-initialize when this module is imported
initializeFirebaseMiddleware();
