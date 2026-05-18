import express from 'express';
import { requireAuth } from '@clerk/express';
import * as deviceController from '../controllers/deviceController.js';

const router = express.Router();

// Register device token for push notifications
router.post('/register', requireAuth(), deviceController.registerDevice);

// Unregister a specific device token
router.post('/unregister', deviceController.unregisterDevice);

// Remove all device tokens for user (on logout)
router.post('/logout', requireAuth(), deviceController.logoutAllDevices);

// Test push notification (development only)
router.post('/test-push', requireAuth(), deviceController.testPushNotification);

export default router;
