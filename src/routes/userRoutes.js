import express from 'express';
import multer from 'multer';
import {
    updateUserDetails,
    deleteUser
} from '../controllers/userController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ============================================
// USER ENDPOINTS
// ============================================

/**
 * PUT /api/users/:id
 * Update user details (name, email, phone) and profile picture
 * @param {string} id - User ID (from URL parameter)
 * @body {Object} Updated user data (name, email, phone) and optional image file
 * @returns {Object} Updated user details with avatar URL
 */
router.put('/:id', protect, upload.any(), updateUserDetails);

/**
 * DELETE /api/users/:id
 * Delete user account
 * @param {string} id - User ID (from URL parameter)
 * @returns {Object} Success message
 */
router.delete('/:id', protect, deleteUser);

export default router;
