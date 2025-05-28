import { createServer, Server } from "http";
import { app } from "./app";
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
    const port = 5000;
    server.listen({
        port,
        host: "0.0.0.0",
        reusePort: true,
    }, () => {
        log(`serving on port ${port}`);
    });

    return server;
}

// Start the server
startServer().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
}); 