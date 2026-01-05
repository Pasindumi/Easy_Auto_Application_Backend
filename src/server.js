import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import carRoutes from './routes/carRoutes.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import vehicleConfigRoutes from './routes/vehicleConfigRoutes.js';
import startCronJobs from './utils/cronJobs.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Start Cron Jobs
startCronJobs();

// Routes
app.use('/api/cars', carRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/vehicle-config', vehicleConfigRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT} `));
