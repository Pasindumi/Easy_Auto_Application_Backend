import express from 'express';
import { createAd, getAds, getAdById, updateAd, adminGetAds, adminUpdateAdStatus } from '../controllers/carController.js';
import { protectAdmin } from '../middlewares/adminAuthMiddleware.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public Routes
router.get("/", getAds);
router.get("/:id", getAdById);

// Public/User Routes (Create Ad - needs auth)
router.post("/", protect, createAd);
router.put("/:id", protect, updateAd);

// Admin Routes
router.get("/admin/all", protectAdmin, adminGetAds);
router.put("/admin/:id/status", protectAdmin, adminUpdateAdStatus);

export default router;
