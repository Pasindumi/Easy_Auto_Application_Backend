import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { initSocket } from './utils/socket.js';

const PORT = process.env.PORT || 5000;

// Create HTTP server
const httpServer = createServer(app);

const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : ["*"];

// Initialize Socket.io
const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Pass io to our socket utility
initSocket(io);

httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`=== Easy Auto Backend ===`);
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
