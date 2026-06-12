import supabase from '../config/supabase.js';

/**
 * Send in-app notification to a single user
 * @param {string} userId - The user ID
 * @param {object} notification - { title, body, data, type }
 * @returns {Promise<object>} - Result of the notification
 */
export const sendPushNotification = async (userId, notification) => {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                title: notification.title,
                message: notification.body,
                type: notification.type || 'SYSTEM',
                data: notification.data || {},
                is_read: false
            })
            .select()
            .single();

        if (error) throw error;

        // Also log to notification_logs for history
        await logNotificationToHistory(userId, notification);

        return { success: true, data };
    } catch (error) {
        console.error('Error in sendInAppNotification:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Log notification to history table
 */
const logNotificationToHistory = async (userId, notification) => {
    try {
        await supabase
            .from('notification_logs')
            .insert({
                user_id: userId,
                notification_type: notification.type || 'IN_APP',
                recipient_email: null,
                subject: notification.title,
                status: 'SENT',
                channel: 'IN_APP'
            });
    } catch (error) {
        console.error('Error logging notification history:', error);
    }
};

/**
 * Send notification to multiple users
 * @param {string[]} userIds - Array of user IDs
 * @param {object} notification - { title, body, data }
 */
export const sendPushNotificationToMultiple = async (userIds, notification) => {
    const results = await Promise.all(
        userIds.map(userId => sendPushNotification(userId, notification))
    );
    return results;
};

/**
 * Removed: Register a device token (No longer needed without push)
 */
export const registerDeviceToken = async (userId, token) => {
    return { success: true, message: 'Device token registration disabled (push notifications removed)' };
};

/**
 * Removed: Unregister a device token
 */
export const unregisterDeviceToken = async (token) => {
    return { success: true };
};

/**
 * Removed: Remove all device tokens
 */
export const removeUserDeviceTokens = async (userId) => {
    return { success: true };
};

/**
 * Removed: Get all device tokens
 */
export const getUserDeviceTokens = async (userId) => {
    return [];
};

// ============================================
// NOTIFICATION HELPERS FOR SPECIFIC EVENTS
// ============================================

/**
 * Send Package Purchase push notification
 */
export const sendPackagePurchasePush = async (userId, packageName, amount) => {
    return sendPushNotification(userId, {
        title: '🎉 Package Purchased!',
        body: `Your ${packageName} package is now active. Amount: LKR ${amount}`,
        data: {
            type: 'PACKAGE_PURCHASE',
            screen: 'Dashboard'
        },
        type: 'PURCHASE'
    });
};

/**
 * Send Package Expiry Warning push notification
 */
export const sendPackageExpiryPush = async (userId, packageName, daysRemaining) => {
    return sendPushNotification(userId, {
        title: '⏰ Package Expiring Soon!',
        body: `Your ${packageName} package expires in ${daysRemaining} days. Renew now to avoid interruption.`,
        data: {
            type: 'PACKAGE_EXPIRY',
            screen: 'Packages'
        },
        type: 'EXPIRY_WARNING'
    });
};

/**
 * Send Ad Limit Warning push notification
 */
export const sendAdLimitWarningPush = async (userId, packageName, percentageUsed) => {
    return sendPushNotification(userId, {
        title: '📊 Ad Limit Warning',
        body: `You've used ${percentageUsed}% of your ad limit on ${packageName}. Consider upgrading your package.`,
        data: {
            type: 'AD_LIMIT_WARNING',
            screen: 'Packages'
        },
        type: 'AD_LIMIT_WARNING'
    });
};

export default {
    sendPushNotification,
    sendPushNotificationToMultiple,
    registerDeviceToken,
    unregisterDeviceToken,
    removeUserDeviceTokens,
    getUserDeviceTokens,
    sendPackagePurchasePush,
    sendPackageExpiryPush,
    sendAdLimitWarningPush
};

