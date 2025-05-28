import { app } from "./app.js";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`💚 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔧 Test all endpoints at: http://localhost:${PORT}/api/*`);
}); 