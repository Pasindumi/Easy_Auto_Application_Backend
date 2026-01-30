import express from 'express';
import {
    updateUserDetails,
    deleteUser
} from '../controllers/userController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// ============================================
// USER ENDPOINTS
// ============================================

/**
 * PUT /api/users/:id
 * Update user details
 * @param {string} id - User ID (from URL parameter)
 * @body {Object} Updated user data (name, email, phone, etc.)
 * @returns {Object} Updated user details
 */
router.put('/:id', protect, updateUserDetails);

/**
 * DELETE /api/users/:id
 * Delete user account
 * @param {string} id - User ID (from URL parameter)
 * @returns {Object} Success message
 */
router.delete('/:id', protect, deleteUser);

export default router;
