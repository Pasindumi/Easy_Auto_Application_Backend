import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

console.log('1. Starting server...');
dotenv.config();
console.log('2. Environment loaded');

import carRoutes from './routes/carRoutes.js';
console.log('3. Car routes loaded');
import authRoutes from './routes/authRoutes.js';
console.log('4. Auth routes loaded');
import adminRoutes from './routes/adminRoutes.js';
console.log('5. Admin routes loaded');
import vehicleConfigRoutes from './routes/vehicleConfigRoutes.js';
console.log('6. Vehicle config routes loaded');
import pricingRoutes from './routes/pricingRoutes.js';
console.log('7. Pricing routes loaded');
import startCronJobs from './utils/cronJobs.js';
console.log('8. Cron jobs loaded');

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

const PORT = process.env.PORT || 5000;

console.log('9. Starting to listen on port', PORT);
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
console.log('10. Listen command executed');

// Keep the process alive
process.on('SIGINT', () => {
    console.log('Server shutting down...');
    process.exit(0);
});

console.log('11. Signal handlers set');
