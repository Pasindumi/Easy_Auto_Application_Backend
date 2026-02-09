import express from 'express';
import { addReview, getReviewsByAdId, getReviewStats } from '../controllers/reviewController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public Routes
router.get('/:adId', getReviewsByAdId);
router.get('/stats/:adId', getReviewStats);

// Protected Routes
router.post('/', protect, addReview);

export default router;
