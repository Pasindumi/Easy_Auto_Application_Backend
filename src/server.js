import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import carRoutes from './routes/carRoutes.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import vehicleConfigRoutes from './routes/vehicleConfigRoutes.js';
import pricingRoutes from './routes/pricingRoutes.js';
import discountsRoutes from './routes/discountsRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import userRoutes from './routes/userRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import favoriteRoutes from './routes/favoriteRoutes.js';
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
app.use('/api/pricing', pricingRoutes);
app.use('/api/discounts', discountsRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/favorites', favoriteRoutes);


const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT} `));
