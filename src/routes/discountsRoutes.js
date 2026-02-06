import express from 'express';
import {
    getDiscounts,
    getActiveDiscounts,
    getDiscount,
    createDiscount,
    updateDiscount,
    deleteDiscount
} from '../controllers/discountsController.js';

import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Public routes (for mobile app)
router.get('/active', getActiveDiscounts);
router.get('/:id', getDiscount);

// Admin routes (should ideally have admin middleware)
router.get('/', getDiscounts);
router.post('/', upload.single('offer_image'), createDiscount);
router.put('/:id', upload.single('offer_image'), updateDiscount);
router.delete('/:id', deleteDiscount);

export default router;
