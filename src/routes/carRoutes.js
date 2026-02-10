import express from 'express';
import multer from 'multer';
import { createAd, getAds, getAdById, updateAd, adminGetAds, adminUpdateAdStatus, adminBanAd, adminUnbanAd, getMyAds, deleteAd } from '../controllers/carController.js';
import { protectAdmin } from '../middlewares/adminAuthMiddleware.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Multer Setup for memory storage (for S3 upload)
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ============================================
// PUBLIC & USER ROUTES
// ============================================

// 1. Specific Routes (Must come before /:id)
router.get("/my-ads", protect, getMyAds); // GET /api/cars/my-ads

// 2. Collection Routes
router.get("/", getAds); // GET /api/cars - List all ads
router.post("/", protect, upload.array('images', 10), createAd); // POST /api/cars - Create new ad

// 3. Generic ID Routes
router.get("/:id", getAdById); // GET /api/cars/:id - Get single ad
router.put("/:id", protect, upload.array('images', 10), updateAd); // PUT /api/cars/:id - Update ad
router.delete("/:id", protect, deleteAd); // DELETE /api/cars/:id - Delete ad

// ============================================
// ADMIN ROUTES (Admin authentication required)
// ============================================
router.get("/admin/all", protectAdmin, adminGetAds); // GET /api/cars/admin/all
router.put("/admin/:id/status", protectAdmin, adminUpdateAdStatus); // PUT /api/cars/admin/:id/status
router.put("/admin/:id/ban", protectAdmin, adminBanAd); // PUT /api/cars/admin/:id/ban
router.put("/admin/:id/unban", protectAdmin, adminUnbanAd); // PUT /api/cars/admin/:id/unban

export default router;
