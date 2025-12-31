import express from "express";
import cors from "cors";
import morgan from "morgan";
import carRoutes from "./routes/carRoutes.js";
import startCronJobs from "./utils/cronJobs.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Routes
app.use("/api/cars", carRoutes);

app.get("/", (req, res) => {
  res.send("Backend is running...");
});

// Start Cron Jobs
startCronJobs();

export default app;
