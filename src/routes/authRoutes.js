import express from 'express';
import {
    // Clerk Social Authentication
    clerkAuth,
    // Token Management
    refreshToken,
    logout,
    logoutAll,
    getCurrentUser,
    // Legacy Authentication (backward compatibility)
    signup,
    login,
    // Password Reset with OTP
    forgotPassword,
    verifyOTP,
    resetPassword,
    changePassword,
    getSessions,
    getSecurityAlerts,
    requestEmailChange,
    verifyEmailChange,
    requestPhoneChange,
    verifyPhoneChange,
    enable2FA,
    disable2FA
} from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// ============================================
// USER INFO
// ============================================
router.get('/me', protect, getCurrentUser);

// ============================================
// CLERK SOCIAL AUTHENTICATION (PRIMARY METHOD)
// ============================================
router.post('/clerk', clerkAuth);

// ============================================
// TOKEN MANAGEMENT
// ============================================
router.post('/refresh', refreshToken);
router.post('/logout', protect, logout);
router.post('/logout-all', protect, logoutAll);

// ============================================
// LEGACY ROUTES (BACKWARD COMPATIBILITY)
// ============================================
router.post('/signup', signup);
router.post('/login', login);

// ============================================
// PASSWORD RESET WITH OTP
// ============================================
router.post('/forgot', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

// ============================================
// SECURITY SETTINGS
// ============================================
router.post('/change-password', protect, changePassword);
router.get('/sessions', protect, getSessions);
router.get('/security-alerts', protect, getSecurityAlerts);
router.post('/email/request', protect, requestEmailChange);
router.post('/email/verify', protect, verifyEmailChange);
router.post('/phone/request', protect, requestPhoneChange);
router.post('/phone/verify', protect, verifyPhoneChange);
router.post('/2fa/enable', protect, enable2FA);
router.post('/2fa/disable', protect, disable2FA);

export default router;
