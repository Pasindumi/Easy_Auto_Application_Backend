import express from "express";
import cors from "cors";
import morgan from "morgan";
import { clerkMiddleware } from "@clerk/express";
import authRoutes from "./routes/authRoutes.js";
import carRoutes from "./routes/carRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import vehicleConfigRoutes from "./routes/vehicleConfigRoutes.js";
import pricingRoutes from "./routes/pricingRoutes.js";
import discountsRoutes from "./routes/discountsRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import favoriteRoutes from "./routes/favoriteRoutes.js";
import complaintRoutes from "./routes/complaintRoutes.js";
import boostRoutes from "./routes/boostRoutes.js";
import startCronJobs from "./utils/cronJobs.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Initialize Clerk middleware globally
// This makes req.auth available on all routes
app.use(
  clerkMiddleware({
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  })
);

// Public Routes
app.get("/", (req, res) => {
  res.send("Backend is running...");
});

// API Routes
app.use("/api/auth", authRoutes); // Authentication routes
app.use("/api/cars", carRoutes); // Car/Ads routes (has mixed public/protected)
app.use("/api/admin", adminRoutes); // Admin routes
app.use("/api/vehicle-config", vehicleConfigRoutes); // Vehicle configuration routes
app.use("/api/pricing", pricingRoutes); // Pricing routes
app.use("/api/discounts", discountsRoutes); // Discounts routes
app.use("/api/payment", paymentRoutes); // Payment routes
app.use("/api/users", userRoutes); // User routes
app.use("/api/reports", reportRoutes); // Ad report routes
app.use("/api/favorites", favoriteRoutes); // Favorite routes
app.use("/api/complaints", complaintRoutes); // Complaints routes
app.use("/api/boosts", boostRoutes); // Boost routes

// Start Cron Jobs
startCronJobs();

export default app;
