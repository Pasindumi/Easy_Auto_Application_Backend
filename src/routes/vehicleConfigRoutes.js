import express from 'express';
import {
    getVehicleTypes, createVehicleType, updateVehicleType, updateVehicleTypeStatus, deleteVehicleType,
    getAttributesByType, createAttribute, updateAttribute,

    getBrandsByType, createBrand, updateBrand, getAllBrands,
    getModelsByType, createModel, getModelsByBrand,
    getConditionsByType, createCondition, deleteCondition
} from '../controllers/vehicleConfigController.js';
import { protectAdmin } from '../middlewares/adminAuthMiddleware.js';
import multer from 'multer';

// Multer Setup
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const router = express.Router();

// Public Routes (Read-only for App)
router.get('/types', getVehicleTypes);
router.get('/attributes/:typeId', getAttributesByType);
router.get('/brands', getAllBrands); // GET /api/vehicle-config/brands?type_id=...&random=true
router.get('/brands/:typeId', getBrandsByType);
router.get('/models/:typeId', getModelsByType);
router.get('/models/by-brand/:brandId', getModelsByBrand);
router.get('/conditions/:typeId', getConditionsByType);

// Admin Routes (Write access)
router.post('/types', protectAdmin, createVehicleType);
router.put('/types/:id', protectAdmin, updateVehicleType);
router.put('/types/:id/status', protectAdmin, updateVehicleTypeStatus);
router.delete('/types/:id', protectAdmin, deleteVehicleType);


router.post('/attributes', protectAdmin, createAttribute);
router.put('/attributes/:id', protectAdmin, updateAttribute);

router.post('/brands', protectAdmin, upload.single('brand_image'), createBrand);
router.put('/brands/:id', protectAdmin, upload.single('brand_image'), updateBrand);
router.post('/models', protectAdmin, createModel);
router.post('/conditions', protectAdmin, createCondition);
router.delete('/conditions/:id', protectAdmin, deleteCondition);

export default router;
