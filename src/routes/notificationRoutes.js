import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
} from '../controllers/notificationController.js';

const router = express.Router();

// All notification routes require the app's own JWT (via protect middleware)
router.use(protect);

/**
 * GET /api/notifications
 * Returns paginated in-app notifications for the authenticated user.
 * Query: ?page=1&limit=20
 */
router.get('/', getNotifications);

/**
 * GET /api/notifications/unread-count
 * Returns the total number of unread notifications.
 * IMPORTANT: Placed before /:id routes to avoid route collision.
 */
router.get('/unread-count', getUnreadCount);

/**
 * PATCH /api/notifications/:id/read
 * Marks a single notification as read.
 */
router.patch('/:id/read', markAsRead);

/**
 * PATCH /api/notifications/read-all
 * Marks all notifications for the current user as read.
 */
router.patch('/read-all', markAllAsRead);

export default router;
