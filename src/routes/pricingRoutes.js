import express from 'express';
import {
    getPriceItems,
    createPriceItem,
    updatePriceItem,
    deletePriceItem,
    getPricingRules,
    createPricingRule,
    deletePricingRule,
    getPackageFeatures,
    addPackageFeature,
    deletePackageFeature,
    getPackageIncludedItems,
    addPackageIncludedItem,
    removePackageIncludedItem,
    getPublicPackages
} from '../controllers/pricingController.js';

const router = express.Router();

// Price Items
router.get('/items', getPriceItems);
router.post('/items', createPriceItem);
router.put('/items/:id', updatePriceItem);
router.delete('/items/:id', deletePriceItem);

// Pricing Rules
router.get('/rules', getPricingRules);
router.post('/rules', createPricingRule);
router.delete('/rules/:id', deletePricingRule);

// Package Features
router.get('/features', getPackageFeatures);
router.post('/features', addPackageFeature);
router.delete('/features/:id', deletePackageFeature);

// Package Included Items
router.get('/package-items/:packageId', getPackageIncludedItems);
router.post('/package-items', addPackageIncludedItem);
router.delete('/package-items/:id', removePackageIncludedItem);

// Public Routes
router.get('/public-packages', getPublicPackages);

export default router;
