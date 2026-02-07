import express from 'express';
import { signupAdmin, loginAdmin, getDashboardStats, getAllUsersWithStats, banUser, blockUser, unbanUser } from '../controllers/adminController.js';
import { protectAdmin } from '../middlewares/adminAuthMiddleware.js';
import { authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/login', loginAdmin);
router.post('/signup', signupAdmin); // CAUTION: Should be restricted or removed in production

// Protected routes
router.get('/stats', protectAdmin, getDashboardStats);
router.get('/users', protectAdmin, authorize('ADMIN', 'SUPER_ADMIN', 'MODERATOR'), getAllUsersWithStats);
router.put('/users/:id/ban', protectAdmin, authorize('ADMIN', 'SUPER_ADMIN', 'MODERATOR'), banUser);
router.put('/users/:id/block', protectAdmin, authorize('ADMIN', 'SUPER_ADMIN', 'MODERATOR'), blockUser);
router.put('/users/:id/unban', protectAdmin, authorize('ADMIN', 'SUPER_ADMIN', 'MODERATOR'), unbanUser);

export default router;
