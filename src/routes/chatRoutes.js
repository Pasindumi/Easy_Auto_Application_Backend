import express from 'express';
import {
    searchUsers,
    getConversations,
    getMessages,
    startConversation,
    sendMessage
} from '../controllers/chatController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All chat routes are protected
router.use(protect);

/**
 * @route GET /api/chat/users/search
 */
router.get('/users/search', searchUsers);

/**
 * @route GET /api/chat/conversations
 */
router.get('/conversations', getConversations);

/**
 * @route GET /api/chat/conversations/:id/messages
 */
router.get('/conversations/:id/messages', getMessages);

/**
 * @route POST /api/chat/conversations
 */
router.post('/conversations', startConversation);

/**
 * @route POST /api/chat/conversations/:id/messages
 */
router.post('/conversations/:id/messages', sendMessage);

export default router;
