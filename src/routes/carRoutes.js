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
// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================
router.get("/", getAds); // GET /api/cars - List all ads
router.get("/:id", getAdById); // GET /api/cars/:id - Get single ad

// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================
router.post("/", protect, createAd); // POST /api/cars - Create new ad
router.put("/:id", protect, updateAd); // PUT /api/cars/:id - Update ad
// DELETE route would go here if implemented: router.delete("/:id", protect, deleteAd);

// ============================================
// ADMIN ROUTES (Admin authentication required)
// ============================================
router.get("/admin/all", protectAdmin, adminGetAds); // GET /api/cars/admin/all
router.put("/admin/:id/status", protectAdmin, adminUpdateAdStatus); // PUT /api/cars/admin/:id/status

export default router;
