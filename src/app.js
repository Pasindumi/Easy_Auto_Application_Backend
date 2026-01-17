import express from "express";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes.js";
import carRoutes from "./routes/carRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import vehicleConfigRoutes from "./routes/vehicleConfigRoutes.js";
import pricingRoutes from "./routes/pricingRoutes.js";
import discountsRoutes from "./routes/discountsRoutes.js";
import startCronJobs from "./utils/cronJobs.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

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

// Start Cron Jobs
startCronJobs();

export default app;
