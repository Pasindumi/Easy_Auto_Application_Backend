import * as notificationService from '../services/inAppNotificationService.js';

/**
 * Notification Controller
 *
 * All routes are protected by the `protect` middleware (authMiddleware.js).
 * The authenticated user is available as req.user (set by protect).
 */

// ─── GET /api/notifications ───────────────────────────────────────────────────

/**
 * Get paginated notifications for the authenticated user.
 *
 * Query params:
 *   page  (number, default 1)
 *   limit (number, default 20, max 50)
 */
export const getNotifications = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

        const result = await notificationService.getUserNotifications(userId, { page, limit });

        if (!result.success) {
            return res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
        }

        return res.status(200).json({
            success: true,
            data: result.data,
            pagination: {
                page,
                limit,
                total: result.total,
                totalPages: Math.ceil(result.total / limit),
                hasMore: page * limit < result.total,
            },
        });
    } catch (error) {
        console.error('[NotificationController] getNotifications error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── GET /api/notifications/unread-count ─────────────────────────────────────

/**
 * Get the total count of unread notifications for the authenticated user.
 */
export const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const result = await notificationService.getUnreadCount(userId);

        if (!result.success) {
            return res.status(500).json({ success: false, message: 'Failed to fetch unread count' });
        }

        return res.status(200).json({
            success: true,
            count: result.count,
        });
    } catch (error) {
        console.error('[NotificationController] getUnreadCount error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── PATCH /api/notifications/:id/read ───────────────────────────────────────

/**
 * Mark a single notification as read.
 * Only the notification's owner can mark it as read.
 */
export const markAsRead = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        if (!id) {
            return res.status(400).json({ success: false, message: 'Notification ID is required' });
        }

        const result = await notificationService.markAsRead(id, userId);

        if (!result.success) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found or access denied',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Notification marked as read',
            data: result.data,
        });
    } catch (error) {
        console.error('[NotificationController] markAsRead error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ─── PATCH /api/notifications/read-all ───────────────────────────────────────

/**
 * Mark all notifications for the authenticated user as read.
 */
export const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const result = await notificationService.markAllAsRead(userId);

        if (!result.success) {
            return res.status(500).json({ success: false, message: 'Failed to mark notifications as read' });
        }

        return res.status(200).json({
            success: true,
            message: 'All notifications marked as read',
        });
    } catch (error) {
        console.error('[NotificationController] markAllAsRead error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
