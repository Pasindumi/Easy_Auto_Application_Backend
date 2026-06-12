import supabase from '../config/supabase.js';
import { emitNotification } from '../utils/socket.js';

/**
 * In-App Notification Service
 * Stores notifications in the database and delivers them
 * in real-time via Socket.IO when the user is online.
 *
 * No FCM, APNs, or Expo push tokens are used.
 */

// ─── Core CRUD ────────────────────────────────────────────────────────────────

/**
 * Create a notification for a user and emit it via Socket.IO.
 *
 * @param {string} userId - Target user's UUID
 * @param {{ title: string, body: string, type: string, data?: object }} notification
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export const createNotification = async (userId, notification) => {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                title: notification.title,
                message: notification.body,
                type: notification.type || 'SYSTEM',
                data: notification.data || {},
                is_read: false,
            })
            .select()
            .single();

        if (error) throw error;

        // Deliver in real-time when user is online (no-op if offline)
        emitNotification(userId, data);

        return { success: true, data };
    } catch (error) {
        console.error('[NotificationService] createNotification error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Create the same notification for multiple users.
 *
 * @param {string[]} userIds
 * @param {{ title: string, body: string, type: string, data?: object }} notification
 * @returns {Promise<Array>}
 */
export const createNotificationForMultiple = async (userIds, notification) => {
    return Promise.all(userIds.map((uid) => createNotification(uid, notification)));
};

/**
 * Fetch paginated notifications for a user ordered by newest first.
 *
 * @param {string} userId
 * @param {{ page?: number, limit?: number }} options
 * @returns {Promise<{ success: boolean, data?: object[], total?: number, error?: string }>}
 */
export const getUserNotifications = async (userId, { page = 1, limit = 20 } = {}) => {
    try {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, error, count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        return { success: true, data, total: count };
    } catch (error) {
        console.error('[NotificationService] getUserNotifications error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Count unread notifications for a user.
 *
 * @param {string} userId
 * @returns {Promise<{ success: boolean, count?: number, error?: string }>}
 */
export const getUnreadCount = async (userId) => {
    try {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) throw error;

        return { success: true, count: count || 0 };
    } catch (error) {
        console.error('[NotificationService] getUnreadCount error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Mark a single notification as read.
 *
 * @param {string} notificationId
 * @param {string} userId - Ensures users only update their own
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export const markAsRead = async (notificationId, userId) => {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('[NotificationService] markAsRead error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Mark all of a user's notifications as read.
 *
 * @param {string} userId
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export const markAllAsRead = async (userId) => {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error('[NotificationService] markAllAsRead error:', error);
        return { success: false, error: error.message };
    }
};

// ─── Event Helpers ────────────────────────────────────────────────────────────

/**
 * Notification: Package purchased successfully.
 */
export const notifyPackagePurchase = async (userId, packageName, amount) => {
    return createNotification(userId, {
        title: '🎉 Package Purchased!',
        body: `Your ${packageName} package is now active. Amount: LKR ${amount}`,
        type: 'PURCHASE',
        data: { screen: 'Packages' },
    });
};

/**
 * Notification: Package expiring soon.
 */
export const notifyPackageExpiry = async (userId, packageName, daysRemaining) => {
    return createNotification(userId, {
        title: '⏰ Package Expiring Soon!',
        body: `Your ${packageName} package expires in ${daysRemaining} days. Renew now to avoid interruption.`,
        type: 'EXPIRY_WARNING',
        data: { screen: 'Packages' },
    });
};

/**
 * Notification: Ad limit threshold reached.
 */
export const notifyAdLimitWarning = async (userId, packageName, percentageUsed) => {
    return createNotification(userId, {
        title: '📊 Ad Limit Warning',
        body: `You've used ${percentageUsed}% of your ad limit on ${packageName}. Consider upgrading your package.`,
        type: 'AD_LIMIT_WARNING',
        data: { screen: 'Packages' },
    });
};

/**
 * Notification: Ad approved by admin.
 */
export const notifyAdApproved = async (userId, adId, adTitle) => {
    return createNotification(userId, {
        title: '✅ Ad Approved!',
        body: `Your listing "${adTitle}" has been approved and is now live.`,
        type: 'AD_APPROVED',
        data: { adId },
    });
};

/**
 * Notification: Ad rejected by admin.
 */
export const notifyAdRejected = async (userId, adId, adTitle, reason) => {
    return createNotification(userId, {
        title: '❌ Ad Rejected',
        body: reason
            ? `Your listing "${adTitle}" was rejected. Reason: ${reason}`
            : `Your listing "${adTitle}" was rejected. Please review our guidelines.`,
        type: 'AD_REJECTED',
        data: { adId },
    });
};

/**
 * Notification: Ad expired.
 */
export const notifyAdExpired = async (userId, adId, adTitle) => {
    return createNotification(userId, {
        title: '⌛ Ad Expired',
        body: `Your listing "${adTitle}" has expired. Renew your package to relist it.`,
        type: 'AD_EXPIRED',
        data: { adId },
    });
};

/**
 * Notification: New chat message received.
 */
export const notifyChatMessage = async (userId, senderName, conversationId, preview) => {
    return createNotification(userId, {
        title: `💬 New message from ${senderName}`,
        body: preview,
        type: 'CHAT_MESSAGE',
        data: { conversationId },
    });
};

/**
 * Notification: Account verification status updated.
 */
export const notifyVerificationUpdate = async (userId, isVerified) => {
    return createNotification(userId, {
        title: isVerified ? '✅ Account Verified!' : 'Verification Update',
        body: isVerified
            ? 'Congratulations! Your account has been verified. You can now post unlimited ads.'
            : 'Your account verification status has been updated. Please check your profile.',
        type: 'VERIFICATION',
        data: { screen: 'Profile' },
    });
};

/**
 * Notification: Subscription cancelled.
 */
export const notifySubscriptionCancelled = async (userId, packageName, effectiveUntil) => {
    return createNotification(userId, {
        title: '❌ Subscription Cancelled',
        body: `Your ${packageName} subscription has been cancelled. Your ads remain active until ${effectiveUntil}.`,
        type: 'SUBSCRIPTION_CANCELLED',
        data: { screen: 'Packages' },
    });
};

/**
 * Notification: Payment completed.
 */
export const notifyPaymentSuccess = async (userId, amount, packageName) => {
    return createNotification(userId, {
        title: '💳 Payment Successful',
        body: `Payment of LKR ${amount} for ${packageName} was successful.`,
        type: 'PURCHASE',
        data: { screen: 'Packages' },
    });
};

export default {
    createNotification,
    createNotificationForMultiple,
    getUserNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    notifyPackagePurchase,
    notifyPackageExpiry,
    notifyAdLimitWarning,
    notifyAdApproved,
    notifyAdRejected,
    notifyAdExpired,
    notifyChatMessage,
    notifyVerificationUpdate,
    notifySubscriptionCancelled,
    notifyPaymentSuccess,
};
