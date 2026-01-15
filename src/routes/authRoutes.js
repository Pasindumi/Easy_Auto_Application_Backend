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
    login
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

export default router;
