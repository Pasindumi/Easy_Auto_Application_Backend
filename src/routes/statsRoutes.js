import express from 'express';
import { getAppStats } from '../controllers/statsController.js';

const router = express.Router();

// Public route to get landing page stats
router.get('/', getAppStats);

export default router;
