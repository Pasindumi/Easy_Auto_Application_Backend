import express from "express";
import { generateHash, initiatePayment, handlePaymentNotify, getMyPayments, mockPaymentSuccess, getActiveSubscription, unsubscribeUser, activateFreeAdByPackage } from "../controllers/paymentController.js";
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Route to generate PayHere hash
router.post("/generate-hash", generateHash);

// Route to initiate payment (Server-Side HTML Generation)
router.post("/initiate", protect, initiatePayment);

// Mock Payment Route (Bypass Gateway)
router.post("/mock-success", mockPaymentSuccess);

// Route to handle PayHere notification (Callback)
router.post("/notify", handlePaymentNotify);

// Route to get my payment history
router.get("/my-history", protect, getMyPayments);

// Route to get active subscription
router.get("/active-subscription", protect, getActiveSubscription);

// Route to unsubscribe
router.post("/unsubscribe", protect, unsubscribeUser);

// Route to activate free ad via package benefit
router.post("/activate-free-ad", protect, activateFreeAdByPackage);

// Route for PayHere Notification
router.post("/notify", handlePaymentNotification);

export default router;
