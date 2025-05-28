import express from "express";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { registerRoutes } from "./routes/index.js";
import { setupAuth } from "./middlewares/auth.js";

// Get current file path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Setup authentication (bao gồm session và passport)
setupAuth(app);

// Register all routes from new structure
registerRoutes(app);

// Serve static files from client build (only in production or when client is built)
const clientDistPath = path.resolve(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

// SPA fallback - serve index.html for any non-API routes
app.get('*', (req, res) => {
    // Skip if it's an API route
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }

    // Serve index.html for all other routes (SPA routing)
    const indexPath = path.join(clientDistPath, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            // If client build doesn't exist, show development message
            res.status(404).json({
                message: "🚀 Face Timekeeping API Server",
                version: "2.0.0",
                status: "running",
                note: "Client build not found. Run 'npm run build' in client directory or access API endpoints directly.",
                endpoints: {
                    health: "/api/health",
                    departments: "/api/departments",
                    employees: "/api/employeeall",
                    auth: "/api/auth/login"
                }
            });
        }
    });
});

export default app; 