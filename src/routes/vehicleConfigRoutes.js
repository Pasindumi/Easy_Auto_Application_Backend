import express from 'express';
import {
    getVehicleTypes, createVehicleType, updateVehicleTypeStatus,
    getAttributesByType, createAttribute, updateAttribute,
    getBrandsByType, createBrand,
    getModelsByType, createModel
} from '../controllers/vehicleConfigController.js';
import { protectAdmin } from '../middlewares/adminAuthMiddleware.js';

const router = express.Router();

// Public Routes (Read-only for App)
router.get('/types', getVehicleTypes);
router.get('/attributes/:typeId', getAttributesByType);
router.get('/brands/:typeId', getBrandsByType);
router.get('/models/:typeId', getModelsByType);

// Admin Routes (Write access)
router.post('/types', protectAdmin, createVehicleType);
router.put('/types/:id/status', protectAdmin, updateVehicleTypeStatus);

router.post('/attributes', protectAdmin, createAttribute);
router.put('/attributes/:id', protectAdmin, updateAttribute);

router.post('/brands', protectAdmin, createBrand);
router.post('/models', protectAdmin, createModel);

export default router;
