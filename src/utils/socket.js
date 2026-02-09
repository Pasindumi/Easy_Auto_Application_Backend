let io;

export const initSocket = (socketIo) => {
    io = socketIo;

    io.on('connection', (socket) => {
        console.log(`New client connected: ${socket.id}`);

        // Join a private room for the user
        socket.on('join', (userId) => {
            if (userId) {
                socket.join(userId);
                console.log(`User ${userId} joined their private room`);
            }
        });

        // Handle joining a conversation room
        socket.on('join_conversation', (conversationId) => {
            if (conversationId) {
                socket.join(conversationId);
                console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
            }
        });

        // Handle typing status
        socket.on('typing', ({ conversationId, userId, isTyping }) => {
            socket.to(conversationId).emit('typing', { userId, isTyping });
        });

        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`);
        });
    });
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};

/**
 * Emit a message to all participants in a conversation via Socket.io
 * @param {string} conversationId - The conversation ID
 * @param {Object} messageData - The message data to emit
 */
export const emitMessage = (conversationId, messageData) => {
    if (io) {
        io.to(conversationId).emit('new_message', messageData);
    }
};

/**
 * Emit a notification to a specific user
 * @param {string} userId - The user ID
 * @param {Object} notificationData - The notification data
 */
export const emitNotification = (userId, notificationData) => {
    if (io) {
        io.to(userId).emit('notification', notificationData);
    }
};
