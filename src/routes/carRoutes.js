import express from 'express';
import multer from 'multer';
import { createAd, getAds, getAdById, updateAd, adminGetAds, adminUpdateAdStatus } from '../controllers/carController.js';
import { protectAdmin } from '../middlewares/adminAuthMiddleware.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Multer Setup for memory storage (for S3 upload)
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Public Routes
router.get("/", getAds);
router.get("/:id", getAdById);

// Public/User Routes (Create Ad - needs auth)
router.post("/", protect, upload.array('images', 10), createAd);
router.put("/:id", protect, upload.array('images', 10), updateAd);

// Admin Routes
router.get("/admin/all", protectAdmin, adminGetAds);
router.put("/admin/:id/status", protectAdmin, adminUpdateAdStatus);

export default router;
