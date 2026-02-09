import express from 'express';
import {
    getPriceItems,
    createPriceItem,
    updatePriceItem,
    deletePriceItem,
    getPricingRules,
    createPricingRule,
    updatePricingRule,
    deletePricingRule,
    getPackageFeatures,
    addPackageFeature,
    deletePackageFeature,
    getPackageIncludedItems,
    addPackageIncludedItem,
    removePackageIncludedItem,
    getPublicPackages,
    getPackageAdLimits,
    addPackageAdLimit,
    deletePackageAdLimit,
    getUserActivePackage,
    unsubscribeUserPackage,
    getAllSubscribers,
    getSubscriberUsage
} from '../controllers/pricingController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { protectAdmin } from '../middlewares/adminAuthMiddleware.js';

const router = express.Router();

// Price Items
router.get('/items', getPriceItems);
router.post('/items', protectAdmin, createPriceItem); // Keep existing for compatibility if needed, but standardizing
router.put('/items/:id', protectAdmin, updatePriceItem);
router.delete('/items/:id', protectAdmin, deletePriceItem);

// Admin Price Items (Explicit)
router.get('/admin/items', protectAdmin, getPriceItems);
router.post('/admin/items', protectAdmin, createPriceItem);
router.put('/admin/items/:id', protectAdmin, updatePriceItem);
router.delete('/admin/items/:id', protectAdmin, deletePriceItem);

// Pricing Rules
router.get('/rules', getPricingRules);
router.post('/rules', protectAdmin, createPricingRule);
router.put('/rules/:id', protectAdmin, updatePricingRule);
router.delete('/rules/:id', protectAdmin, deletePricingRule);

// Admin Pricing Rules (Explicit)
router.get('/admin/rules', protectAdmin, getPricingRules);
router.post('/admin/rules', protectAdmin, createPricingRule);
router.put('/admin/rules/:id', protectAdmin, updatePricingRule);
router.delete('/admin/rules/:id', protectAdmin, deletePricingRule);

// Package Features
router.get('/features', getPackageFeatures);
router.post('/features', addPackageFeature);
router.delete('/features/:id', deletePackageFeature);

// Admin Package Features
router.get('/admin/features', protectAdmin, getPackageFeatures);
router.post('/admin/features', protectAdmin, addPackageFeature);
router.delete('/admin/features/:id', protectAdmin, deletePackageFeature);

// Package Included Items
router.get('/package-items/:packageId', getPackageIncludedItems);
router.post('/package-items', addPackageIncludedItem);
router.delete('/package-items/:id', removePackageIncludedItem);

// Admin Package Included Items
router.get('/admin/package-items/:packageId', protectAdmin, getPackageIncludedItems);
router.post('/admin/package-items', protectAdmin, addPackageIncludedItem);
router.delete('/admin/package-items/:id', protectAdmin, removePackageIncludedItem);

// Package Ad Limits
router.get('/package-limits/:packageId', getPackageAdLimits);
router.post('/package-limits', addPackageAdLimit);
router.delete('/package-limits/:id', deletePackageAdLimit);

// Admin Package Ad Limits
router.get('/admin/package-limits/:packageId', protectAdmin, getPackageAdLimits);
router.post('/admin/package-limits', protectAdmin, addPackageAdLimit);
router.delete('/admin/package-limits/:id', protectAdmin, deletePackageAdLimit);

// Public Routes
router.get('/public-packages', getPublicPackages);

// User Package Routes
router.get('/active-package', protect, getUserActivePackage);
router.post('/unsubscribe', protect, unsubscribeUserPackage);

// Admin Subscription Routes
router.get('/admin/subscribers', protectAdmin, authorize('ADMIN', 'SUPER_ADMIN', 'MODERATOR'), getAllSubscribers);
router.get('/admin/subscriber-usage/:userId/:packageId', protectAdmin, authorize('ADMIN', 'SUPER_ADMIN', 'MODERATOR'), getSubscriberUsage);

export default router;
