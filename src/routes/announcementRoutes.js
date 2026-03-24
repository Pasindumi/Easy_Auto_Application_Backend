import express from 'express';
import {
    getAnnouncements,
    getActiveAnnouncements,
    getAnnouncement,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement
} from '../controllers/announcementController.js';

import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Public routes (for mobile app)
router.get('/active', getActiveAnnouncements);
router.get('/:id', getAnnouncement);

// Admin routes
router.get('/', getAnnouncements);
router.post('/', upload.single('image'), createAnnouncement);
router.put('/:id', upload.single('image'), updateAnnouncement);
router.delete('/:id', deleteAnnouncement);

export default router;
