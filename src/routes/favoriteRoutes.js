import express from 'express';
import { toggleFavorite, getFavorites, getIsFavorite } from '../controllers/favoriteController.js';
import { protect, optionalAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Get user's favorites
router.get('/', protect, getFavorites);

// Toggle a favorite
router.post('/toggle', protect, toggleFavorite);

// Check if an ad is favorited
router.get('/check/:ad_id', optionalAuth, getIsFavorite);

export default router;
