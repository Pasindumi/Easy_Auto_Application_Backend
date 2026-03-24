import express from 'express';
import {
    addAppReview,
    getAppReviews,
    getAppReviewStats,
    replyToAppReview,
    deleteAppReview
} from '../controllers/appReviewController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { protectAdmin } from '../middlewares/adminAuthMiddleware.js';

const router = express.Router();

// Public Routes
router.get('/', getAppReviews);
router.get('/stats', getAppReviewStats);

// Protected Routes (User)
router.post('/', protect, addAppReview);
router.delete('/:reviewId', protect, deleteAppReview); // User can delete their own

// Admin Routes
router.post('/:reviewId/reply', protectAdmin, replyToAppReview);
router.delete('/:reviewId/admin', protectAdmin, deleteAppReview); // Explicit admin delete route

export default router;
