import { Express } from "express";
import { saveScreenshot, getScreenshots, checkFirebaseConnection } from "../controllers/screenshotController";

export function screenshotRoutes(app: Express) {
    // Screenshot endpoints
    
    // Save attendance screenshot to Firebase
    app.post("/api/screenshots/attendance", saveScreenshot);
    
    // Get attendance screenshots from Firebase
    app.get("/api/screenshots/attendance", getScreenshots);
    
    // Health check for Firebase connection
    app.get("/api/screenshots/health", checkFirebaseConnection);
}
