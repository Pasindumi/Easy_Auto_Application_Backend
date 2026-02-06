import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import supabase from '../config/supabase.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_change_this';

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
            success: true,
            data: {
                ads: {
                    total: totalAds || 0,
                    active: activeAds || 0,
                    expired: expiredAds || 0,
                    featured: featuredAds || 0,
                },
                vehicleTypes: totalVehicleTypes || 0,
                brands: totalBrands || 0,
            }
        });

    } catch (error) {
        res.status(500).json({ message: 'Error fetching stats', error: error.message });
    }
};

// Get All Users with Ad Statistics
export const getAllUsersWithStats = async (req, res) => {
    try {
        // 1. Fetch all users
        const { data: users, error: userError } = await supabase
            .from('users')
            .select('id, name, email, phone, role, created_at')
            .order('created_at', { ascending: false });

        if (userError) throw userError;

        // 2. Fetch all ads to calculate stats per user
        // Note: For very large datasets, this might need optimization using RPC/SQL aggregates
        const { data: ads, error: adsError } = await supabase
            .from('CarAd')
            .select('seller_id, status');

        if (adsError) throw adsError;

        // 3. Aggregate stats
        const statsMap = {};
        ads.forEach(ad => {
            if (!ad.seller_id) return;
            if (!statsMap[ad.seller_id]) {
                statsMap[ad.seller_id] = { posted: 0, drafted: 0 };
            }
            if (ad.status === 'ACTIVE') statsMap[ad.seller_id].posted++;
            else if (ad.status === 'DRAFT') statsMap[ad.seller_id].drafted++;
        });

        // 4. Merge stats into user objects
        const usersWithStats = users.map(user => ({
            ...user,
            stats: statsMap[user.id] || { posted: 0, drafted: 0 }
        }));

        res.json({
            success: true,
            data: usersWithStats
        });
    } catch (error) {
        console.error('Error in getAllUsersWithStats:', error);
        res.status(500).json({ success: false, message: 'Server error fetching users', error: error.message });
    }
};

