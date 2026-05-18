import * as pushNotificationService from '../services/pushNotificationService.js';

/**
 * Register a device token for push notifications
 * POST /api/devices/register
 */
export const registerDevice = async (req, res) => {
    try {
        console.log('[Device] Register request received:', req.body);
        
        const userId = req.auth?.userId;
        console.log('[Device] User ID:', userId);
        
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Unauthorized' 
            });
        }

        const { expoPushToken, deviceId, platform } = req.body;

        if (!expoPushToken) {
            return res.status(400).json({ 
                success: false, 
                message: 'expoPushToken is required' 
            });
        }

        const result = await pushNotificationService.registerDeviceToken(
            userId,
            expoPushToken,
            deviceId,
            platform
        );

        if (result.success) {
            return res.status(200).json({
                success: true,
                message: 'Device registered successfully'
            });
        } else {
            return res.status(400).json({
                success: false,
                message: result.error || 'Failed to register device'
            });
        }
    } catch (error) {
        console.error('Error in registerDevice:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

/**
 * Unregister a device token
 * POST /api/devices/unregister
 */
export const unregisterDevice = async (req, res) => {
    try {
        const { expoPushToken } = req.body;

        if (!expoPushToken) {
            return res.status(400).json({ 
                success: false, 
                message: 'expoPushToken is required' 
            });
        }

        const result = await pushNotificationService.unregisterDeviceToken(expoPushToken);

        if (result.success) {
            return res.status(200).json({
                success: true,
                message: 'Device unregistered successfully'
            });
        } else {
            return res.status(400).json({
                success: false,
                message: result.error || 'Failed to unregister device'
            });
        }
    } catch (error) {
        console.error('Error in unregisterDevice:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Remove all device tokens for the current user (logout)
 * POST /api/devices/logout
 */
export const logoutAllDevices = async (req, res) => {
    try {
        const userId = req.auth?.userId;
        
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Unauthorized' 
            });
        }

        const result = await pushNotificationService.removeUserDeviceTokens(userId);

        if (result.success) {
            return res.status(200).json({
                success: true,
                message: 'All devices logged out successfully'
            });
        } else {
            return res.status(400).json({
                success: false,
                message: result.error || 'Failed to logout devices'
            });
        }
    } catch (error) {
        console.error('Error in logoutAllDevices:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Test push notification (for development)
 * POST /api/devices/test-push
 */
export const testPushNotification = async (req, res) => {
    try {
        const userId = req.auth?.userId;
        
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Unauthorized' 
            });
        }

        const { title, body } = req.body;

        const result = await pushNotificationService.sendPushNotification(userId, {
            title: title || 'Test Notification',
            body: body || 'This is a test push notification from Easy Auto!',
            data: { type: 'TEST' }
        });

        return res.status(200).json({
            success: result.success,
            message: result.success ? 'Test notification sent' : result.reason || result.error,
            tickets: result.tickets
        });
    } catch (error) {
        console.error('Error in testPushNotification:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
