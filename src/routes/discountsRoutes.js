import express from 'express';
import {
    getDiscounts,
    getActiveDiscounts,
    createDiscount,
    updateDiscount,
    deleteDiscount
} from '../controllers/discountsController.js';

const router = express.Router();

// Public routes (for mobile app)
router.get('/active', getActiveDiscounts);

// Admin routes (should ideally have admin middleware)
router.get('/', getDiscounts);
router.post('/', createDiscount);
router.put('/:id', updateDiscount);
router.delete('/:id', deleteDiscount);

export default router;
