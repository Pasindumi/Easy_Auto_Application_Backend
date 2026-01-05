import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_change_this';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Admin Signup (Initial Seeding or Super Admin only in future)
export const signupAdmin = async (req, res) => {
    const { name, email, password, role } = req.body;

    try {
        // Check if admin exists
        const { data: existingAdmin } = await supabase
            .from('admins')
            .select('email')
            .eq('email', email)
            .single();

        if (existingAdmin) {
            return res.status(400).json({ message: 'Admin already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Insert new admin
        const { data: newAdmin, error } = await supabase
            .from('admins')
            .insert([{
                name,
                email,
                password_hash,
                role: role || 'MODERATOR', // Default to MODERATOR
                status: 'ACTIVE'
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ success: true, message: 'Admin created successfully', admin: { id: newAdmin.id, email: newAdmin.email, role: newAdmin.role, name: newAdmin.name } });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Admin Login
export const loginAdmin = async (req, res) => {
    const { email, password } = req.body;

    try {
        const { data: admin, error } = await supabase
            .from('admins')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !admin) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        if (admin.status !== 'ACTIVE') {
            return res.status(403).json({ message: 'Admin account is disabled' });
        }

        const isMatch = await bcrypt.compare(password, admin.password_hash);

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Create Token
        const token = jwt.sign(
            { id: admin.id, role: admin.role, isAdmin: true },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            admin: {
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role
            }
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get Dashboard Stats
export const getDashboardStats = async (req, res) => {
    try {
        // These could be parallelized for performance
        const { count: totalAds } = await supabase.from('CarAd').select('*', { count: 'exact', head: true });
        const { count: activeAds } = await supabase.from('CarAd').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE');
        const { count: expiredAds } = await supabase.from('CarAd').select('*', { count: 'exact', head: true }).eq('status', 'EXPIRED');
        const { count: featuredAds } = await supabase.from('CarAd').select('*', { count: 'exact', head: true }).eq('is_featured', true);
        const { count: totalVehicleTypes } = await supabase.from('vehicle_types').select('*', { count: 'exact', head: true });
        const { count: totalBrands } = await supabase.from('vehicle_brands').select('*', { count: 'exact', head: true });

        // For charts (simplified for now)
        // Group by vehicle type would require a more complex query or RPC in supabase, for now we will just return raw counts

        res.json({
            totalAds: totalAds || 0,
            activeAds: activeAds || 0,
            expiredAds: expiredAds || 0,
            featuredAds: featuredAds || 0,
            totalVehicleTypes: totalVehicleTypes || 0,
            totalBrands: totalBrands || 0,
        });

    } catch (error) {
        res.status(500).json({ message: 'Error fetching stats', error: error.message });
    }
};
