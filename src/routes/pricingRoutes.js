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
router.post('/items', createPriceItem);
router.put('/items/:id', updatePriceItem);
router.delete('/items/:id', deletePriceItem);

// Pricing Rules
router.get('/rules', getPricingRules);
router.post('/rules', createPricingRule);
router.put('/rules/:id', updatePricingRule);
router.delete('/rules/:id', deletePricingRule);

// Package Features
router.get('/features', getPackageFeatures);
router.post('/features', addPackageFeature);
router.delete('/features/:id', deletePackageFeature);

// Package Included Items
router.get('/package-items/:packageId', getPackageIncludedItems);
router.post('/package-items', addPackageIncludedItem);
router.delete('/package-items/:id', removePackageIncludedItem);

// Package Ad Limits
router.get('/package-limits/:packageId', getPackageAdLimits);
router.post('/package-limits', addPackageAdLimit);
router.delete('/package-limits/:id', deletePackageAdLimit);

// Public Routes
router.get('/public-packages', getPublicPackages);

// User Package Routes
router.get('/active-package', protect, getUserActivePackage);
router.post('/unsubscribe', protect, unsubscribeUserPackage);

// Admin Subscription Routes
router.get('/admin/subscribers', protectAdmin, authorize('ADMIN', 'SUPER_ADMIN', 'MODERATOR'), getAllSubscribers);
router.get('/admin/subscriber-usage/:userId/:packageId', protectAdmin, authorize('ADMIN', 'SUPER_ADMIN', 'MODERATOR'), getSubscriberUsage);

export default router;
