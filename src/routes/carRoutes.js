import express from 'express';
import supabase from '../config/supabase.js';
import multer from 'multer';
import { createAd, getAds, getAdById } from '../controllers/carController.js';

const router = express.Router();

router.post("/", createAd);
router.get("/", getAds);
router.get("/:id", getAdById);

export default router;
