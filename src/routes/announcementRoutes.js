import express from 'express';
import {
    getAnnouncements,
    getActiveAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement
} from '../controllers/announcementController.js';

const router = express.Router();

// Public routes
router.get('/active', getActiveAnnouncements);

// Admin routes (should ideally have admin middleware)
router.get('/', getAnnouncements);
router.post('/', createAnnouncement);
router.put('/:id', updateAnnouncement);
router.delete('/:id', deleteAnnouncement);

export default router;
