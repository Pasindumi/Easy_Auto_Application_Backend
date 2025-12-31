import supabase from '../config/supabase.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_change_this';

// Signup
export const signup = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        if (!email || !password || !name || !phone) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if user already exists
        const { data: existingUser, error: searchError } = await supabase
            .from('users')
            .select('*')
            .or(`email.eq.${email},phone.eq.${phone}`)
            .single();

        // If existingUser is found, return error
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email or phone already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert([
                {
                    name,
                    email,
                    phone,
                    password: hashedPassword,
                    role: 'user', // default role
                    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&auto=format"
                }
            ])
            .select()
            .single();

        if (createError) {
            throw createError;
        }

        // Generate Token
        const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, {
            expiresIn: '7d',
        });

        res.status(201).json({
            message: 'User created successfully',
            token,
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                phone: newUser.phone,
                avatar: newUser.avatar,
                role: newUser.role
            }
        });

    } catch (error) {
        console.error('Signup Error:', error);
        res.status(500).json({ error: 'Server error during signup' });
    }
};

// Login
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate Token
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
            expiresIn: '7d',
        });

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                avatar: user.avatar,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
};
