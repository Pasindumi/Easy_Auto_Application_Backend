import express from "express";
import { generateHash, initiatePayment, handlePaymentNotification } from "../controllers/paymentController.js";

const router = express.Router();

// Route to generate PayHere hash
router.post("/generate-hash", generateHash);

// Route to initiate payment (Server-Side HTML Generation)
router.post("/initiate", initiatePayment);

// Route for PayHere Notification
router.post("/notify", handlePaymentNotification);

export default router;
