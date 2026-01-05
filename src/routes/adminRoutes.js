import express from 'express';
import { signupAdmin, loginAdmin, getDashboardStats } from '../controllers/adminController.js';
import { protectAdmin } from '../middlewares/adminAuthMiddleware.js';

const router = express.Router();

// Public routes
router.post('/login', loginAdmin);
router.post('/signup', signupAdmin); // CAUTION: Should be restricted or removed in production

// Protected routes
router.get('/stats', protectAdmin, getDashboardStats);

export default router;
