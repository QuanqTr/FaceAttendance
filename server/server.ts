import { createServer, Server } from "http";
import { app } from "./app.js";
import { setupVite, serveStatic, log } from "./vite";

async function startServer(): Promise<Server> {
    const server = createServer(app);

    // Setup Vite for development or static files for production
    if (app.get("env") === "development") {
        await setupVite(app, server);
    } else {
        serveStatic(app);
    }

    // Start the server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
        log(`Server running on port ${PORT}`);
        log(`Health check: http://localhost:${PORT}/api/health`);
        log(`Test all endpoints at: http://localhost:${PORT}/api/*`);
    });

    return server;
}

// Start the server
startServer().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
}); 