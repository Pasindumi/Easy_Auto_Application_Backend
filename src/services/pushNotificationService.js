import { Expo } from 'expo-server-sdk';
import supabase from '../config/supabase.js';

// Create a new Expo SDK client
const expo = new Expo();

/**
 * Get all device tokens for a user
 * @param {string} userId - The user ID
 * @returns {Promise<string[]>} - Array of Expo push tokens
 */
export const getUserDeviceTokens = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('device_tokens')
            .select('expo_push_token')
            .eq('user_id', userId)
            .eq('is_active', true);

        if (error) throw error;

        return data?.map(d => d.expo_push_token) || [];
    } catch (error) {
        console.error('Error fetching device tokens:', error);
        return [];
    }
};

/**
 * Send push notification to a single user
 * @param {string} userId - The user ID
 * @param {object} notification - { title, body, data }
 * @returns {Promise<object>} - Result of the push notification
 */
export const sendPushNotification = async (userId, notification) => {
    try {
        const tokens = await getUserDeviceTokens(userId);

        if (tokens.length === 0) {
            console.log(`No device tokens found for user: ${userId}`);
            return { success: false, reason: 'NO_TOKENS' };
        }

        const messages = [];

        for (const pushToken of tokens) {
            // Check that the push token is valid
            if (!Expo.isExpoPushToken(pushToken)) {
                console.error(`Push token ${pushToken} is not a valid Expo push token`);
                continue;
            }

            messages.push({
                to: pushToken,
                sound: 'default',
                title: notification.title,
                body: notification.body,
                data: notification.data || {},
            });
        }

        if (messages.length === 0) {
            return { success: false, reason: 'NO_VALID_TOKENS' };
        }

        // Send notifications in chunks (Expo recommends this)
        const chunks = expo.chunkPushNotifications(messages);
        const tickets = [];

        for (const chunk of chunks) {
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            } catch (error) {
                console.error('Error sending push notification chunk:', error);
            }
        }

        // Log the notification
        await logPushNotification(userId, notification, tickets);

        return { success: true, tickets };
    } catch (error) {
        console.error('Error in sendPushNotification:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Send push notification to multiple users
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
 * Log push notification to database
 */
const logPushNotification = async (userId, notification, tickets) => {
    try {
        const hasErrors = tickets.some(t => t.status === 'error');
        
        await supabase
            .from('notification_logs')
            .insert({
                user_id: userId,
                notification_type: notification.type || 'PUSH',
                recipient_email: null, // Not applicable for push
                subject: notification.title,
                status: hasErrors ? 'PARTIAL' : 'SENT',
                error_message: hasErrors ? JSON.stringify(tickets.filter(t => t.status === 'error')) : null,
                channel: 'PUSH' // Add this column to distinguish from email
            });
    } catch (error) {
        console.error('Error logging push notification:', error);
    }
};

/**
 * Register a device token for a user
 * @param {string} userId - The user ID
 * @param {string} expoPushToken - The Expo push token
 * @param {string} deviceId - Unique device identifier (optional)
 * @param {string} platform - 'ios' or 'android'
 */
export const registerDeviceToken = async (userId, expoPushToken, deviceId = null, platform = null) => {
    try {
        // Validate the token
        if (!Expo.isExpoPushToken(expoPushToken)) {
            return { success: false, error: 'Invalid Expo push token' };
        }

        // Upsert the token (update if exists, insert if not)
        const { data, error } = await supabase
            .from('device_tokens')
            .upsert(
                {
                    user_id: userId,
                    expo_push_token: expoPushToken,
                    device_id: deviceId,
                    platform: platform,
                    is_active: true,
                    updated_at: new Date().toISOString()
                },
                {
                    onConflict: 'expo_push_token',
                    ignoreDuplicates: false
                }
            )
            .select();

        if (error) throw error;

        console.log(`Device token registered for user: ${userId}`);
        return { success: true, data };
    } catch (error) {
        console.error('Error registering device token:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Unregister a device token
 * @param {string} expoPushToken - The Expo push token to remove
 */
export const unregisterDeviceToken = async (expoPushToken) => {
    try {
        const { error } = await supabase
            .from('device_tokens')
            .update({ is_active: false })
            .eq('expo_push_token', expoPushToken);

        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error('Error unregistering device token:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Remove all device tokens for a user (e.g., on logout)
 * @param {string} userId - The user ID
 */
export const removeUserDeviceTokens = async (userId) => {
    try {
        const { error } = await supabase
            .from('device_tokens')
            .update({ is_active: false })
            .eq('user_id', userId);

        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error('Error removing user device tokens:', error);
        return { success: false, error: error.message };
    }
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
