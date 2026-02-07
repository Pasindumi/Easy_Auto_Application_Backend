import express from 'express';
import { createComplaint, getComplaints, updateComplaintStatus } from '../controllers/complaintController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { protectAdmin } from '../middlewares/adminAuthMiddleware.js';

const router = express.Router();

/**
 * @route   POST /api/complaints
 * @desc    Create a new complaint
 * @access  Private (Authenticated User)
 */
router.post('/', protect, createComplaint);

/**
 * @route   GET /api/complaints/admin
 * @desc    Get all complaints
 * @access  Private (Admin Only)
 */
router.get('/admin', protectAdmin, getComplaints);

/**
 * @route   PUT /api/complaints/admin/:id
 * @desc    Update complaint status
 * @access  Private (Admin Only)
 */
router.put('/admin/:id', protectAdmin, updateComplaintStatus);

export default router;
