import express from 'express';
import {
    getBoostItems,
    getBoostPackages,
    applyBoost,
    getAdBoosts
} from '../controllers/boostController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { protectAdmin } from '../middlewares/adminAuthMiddleware.js';
import { authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public / User Routes
router.get('/items', getBoostItems); // Get core boost items
router.get('/packages', getBoostPackages); // Get boost packages
router.get('/ad/:adId', getAdBoosts); // Get active boosts for an ad
router.post('/apply', protect, applyBoost); // Apply boost to ad (after payment)

// Admin Routes (Admins can also use the generic pricing routes to manage BOOST_PACKAGE items)
router.get('/admin/items', protectAdmin, authorize('ADMIN', 'SUPER_ADMIN', 'MODERATOR'), getBoostItems);

export default router;
