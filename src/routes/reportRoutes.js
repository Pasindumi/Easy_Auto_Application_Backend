import express from 'express';
import { createReport, getReports, updateReportStatus } from '../controllers/reportController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { protectAdmin } from '../middlewares/adminAuthMiddleware.js';

const router = express.Router();

// User Routes
router.post('/', protect, createReport);

// Admin Routes
router.get('/admin', protectAdmin, getReports);
router.put('/admin/:id', protectAdmin, updateReportStatus);

export default router;
