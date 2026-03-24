import express from 'express';
import multer from 'multer';
import {
    createRentalAd,
    updateRentalAd,
    getRentalAds,
    getRentalAdById,
    getMyRentalAds,
    adminGetRentalAds,
    adminUpdateRentalAdStatus,
    adminVerifyRentalDocuments
} from '../controllers/rentalController.js';
import { protectAdmin } from '../middlewares/adminAuthMiddleware.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Multer Setup for memory storage (for S3 upload) - same as sell ads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const uploadFields = upload.fields([
    { name: 'images', maxCount: 10 },
    { name: 'documents', maxCount: 5 }
]);

// ============================================
// PUBLIC & USER ROUTES
// ============================================
router.get("/my-ads", protect, getMyRentalAds); // GET /api/rentals/my-ads
router.get("/", getRentalAds); // GET /api/rentals
router.post("/", protect, uploadFields, createRentalAd); // POST /api/rentals
router.get("/:id", getRentalAdById); // GET /api/rentals/:id
router.put("/:id", protect, uploadFields, updateRentalAd); // PUT /api/rentals/:id

// ============================================
// ADMIN ROUTES
// ============================================
router.get("/admin/all", protectAdmin, adminGetRentalAds); // GET /api/rentals/admin/all
router.put("/admin/:id/status", protectAdmin, adminUpdateRentalAdStatus);
router.put("/admin/:id/verify", protectAdmin, adminVerifyRentalDocuments);

export default router;
