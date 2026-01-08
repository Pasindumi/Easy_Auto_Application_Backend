import supabase from '../config/supabase.js';
import bcrypt from 'bcryptjs';
import * as otpService from '../services/otpService.js';
import * as clerkService from '../services/clerkService.js';
import * as jwtService from '../services/jwtService.js';

/**
 * Authentication Controller
 * Handles OTP-based authentication and Clerk social authentication
 */

// ============================================
// OTP AUTHENTICATION FLOW
// ============================================

/**
 * Send OTP to phone number
 * POST /auth/send-otp
 * Body: { phone }
 */
export const sendOTP = async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({ error: 'Phone number is required' });
        }

        // Validate phone format
        if (!otpService.validatePhoneNumber(phone)) {
            return res.status(400).json({ 
                error: 'Invalid phone number format. Use E.164 format (e.g., +1234567890)' 
            });
        }

        // Check rate limiting
        const isRateLimited = await otpService.checkRateLimit(phone);
        if (isRateLimited) {
            return res.status(429).json({ 
                error: 'Too many OTP requests. Please try again later.',
                retryAfter: 300 // 5 minutes
            });
        }

        // Generate OTP
        const otp = otpService.generateOTP();
        const otpHash = await otpService.hashOTP(otp);

        // Store OTP in Redis with TTL
        await otpService.storeOTP(phone, otpHash);

        // Set rate limit
        await otpService.setRateLimit(phone);

        // Send OTP via SMS
        await otpService.sendOTPSMS(phone, otp);

        res.status(200).json({
            message: 'OTP sent successfully',
            expiresIn: otpService.getOTPTTL(), // seconds
            phone: phone
        });

    } catch (error) {
        console.error('Send OTP Error:', error);
        
        if (error.message.includes('Redis is not available')) {
            return res.status(503).json({ 
                error: 'OTP service temporarily unavailable. Please try again later or use alternative login method.',
                details: 'Redis connection required. Please contact support.',
                code: 'SERVICE_UNAVAILABLE'
            });
        }
        
        res.status(500).json({ error: 'Failed to send OTP' });
    }
};

/**
 * Verify OTP and authenticate user
 * POST /auth/verify-otp
 * Body: { phone, otp }
 */
export const verifyOTP = async (req, res) => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({ error: 'Phone and OTP are required' });
        }

        // Get OTP data from Redis
        const otpData = await otpService.getOTP(phone);

        if (!otpData) {
            return res.status(400).json({ 
                error: 'No OTP found for this phone number or OTP has expired' 
            });
        }

        // Check attempts
        if (otpService.checkOTPRateLimit(otpData.attempts)) {
            await otpService.deleteOTP(phone);
            return res.status(429).json({ 
                error: 'Too many failed attempts. Please request a new OTP.' 
            });
        }

        // Verify OTP
        const isValid = await otpService.verifyOTP(otp, otpData.hash);

        if (!isValid) {
            // Increment attempts
            await otpService.incrementAttempts(phone);
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        // OTP verified - delete from Redis
        await otpService.deleteOTP(phone);

        // Find or create user
        let { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('phone', phone)
            .single();

        // If user doesn't exist, create new user
        if (!user) {
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert([{
                    phone,
                    name: `User ${phone.slice(-4)}`,
                    role: 'user',
                    auth_provider: 'phone',
                    phone_verified: true,
                    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&auto=format"
                }])
                .select()
                .single();

            if (createError) {
                throw createError;
            }

            user = newUser;
        } else {
            // Update last login and phone verified status
            await supabase
                .from('users')
                .update({ 
                    last_login: new Date().toISOString(),
                    phone_verified: true
                })
                .eq('id', user.id);
        }

        // Generate JWT tokens
        const tokens = await jwtService.generateTokenPair(user);

        res.status(200).json({
            message: 'Authentication successful',
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                avatar: user.avatar,
                role: user.role,
                is_premium: user.is_premium
            }
        });

    } catch (error) {
        console.error('Verify OTP Error:', error);
        
        if (error.message.includes('Redis is not available')) {
            return res.status(503).json({ 
                error: 'OTP service temporarily unavailable. Please try again later or use alternative login method.',
                details: 'Redis connection required. Please contact support.',
                code: 'SERVICE_UNAVAILABLE'
            });
        }
        
        res.status(500).json({ error: 'Failed to verify OTP' });
    }
};

// ============================================
// CLERK SOCIAL AUTHENTICATION
// ============================================

/**
 * Authenticate user with Clerk session token
 * POST /auth/clerk
 * Headers: Authorization: Bearer <clerk_token>
 */
export const clerkAuth = async (req, res) => {
    try {
        // Debug logging
        console.log('=== Clerk OAuth Request ===');
        console.log('Received Authorization:', req.headers.authorization?.substring(0, 50) + '...');
        console.log('CLERK_SECRET_KEY exists:', !!process.env.CLERK_SECRET_KEY);
        
        // Extract token from Authorization header
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            console.log('❌ No token found in Authorization header');
            return res.status(400).json({ 
                error: 'Authorization header with Bearer token is required',
                code: 'MISSING_TOKEN'
            });
        }

        // Verify Clerk session token using @clerk/backend
        let payload;
        
        try {
            console.log('🔍 Verifying token with Clerk...');
            payload = await clerkService.verifyClerkToken(token);
            
            if (!payload || !payload.sub) {
                console.log('❌ Token verification returned invalid payload');
                return res.status(401).json({ 
                    error: 'Failed to verify with authentication provider',
                    code: 'AUTH_PROVIDER_ERROR'
                });
            }
            
            console.log('✅ Token verified successfully');
            console.log('Clerk User ID:', payload.sub);
        } catch (clerkError) {
            console.error('❌ Clerk verification error:', clerkError.message);
            console.error('Error details:', clerkError);
            
            return res.status(401).json({ 
                error: 'Failed to verify with authentication provider',
                code: 'AUTH_PROVIDER_ERROR'
            });
        }

        // Extract user data from token payload
        const clerkUserId = payload.sub;
        const email = payload.email || null;
        const firstName = payload.first_name || null;
        const lastName = payload.last_name || null;
        const imageUrl = payload.image_url || payload.avatar_url || null;
        const phone = payload.phone_number || null;
        
        const name = [firstName, lastName].filter(Boolean).join(' ') || null;

        console.log('📋 Extracted data:', { clerkUserId, email, phone, name });

        // Account merging logic - priority: clerk_user_id → email → phone
        let user = null;

        // 1. Try to find by clerk_user_id
        console.log('🔍 Looking up user by clerk_user_id...');
        const { data: clerkMatch } = await supabase
            .from('users')
            .select('*')
            .eq('clerk_user_id', clerkUserId)
            .single();

        if (clerkMatch) {
            console.log('✅ Found existing user by clerk_user_id:', clerkMatch.id);
            user = clerkMatch;
        } else {
            // 2. Try to find by email
            let existingUser = null;
            
            if (email) {
                console.log('🔍 Looking up user by email...');
                const { data: emailMatch } = await supabase
                    .from('users')
                    .select('*')
                    .eq('email', email)
                    .single();
                
                existingUser = emailMatch;
                if (existingUser) {
                    console.log('✅ Found existing user by email:', existingUser.id);
                }
            }

            // 3. Try to find by phone if no email match
            if (!existingUser && phone) {
                console.log('🔍 Looking up user by phone...');
                const { data: phoneMatch } = await supabase
                    .from('users')
                    .select('*')
                    .eq('phone', phone)
                    .single();
                
                existingUser = phoneMatch;
                if (existingUser) {
                    console.log('✅ Found existing user by phone:', existingUser.id);
                }
            }

            if (existingUser) {
                // Match found - update clerk_user_id if missing
                console.log('🔄 Updating user with clerk_user_id...');
                const { data: updatedUser, error: updateError } = await supabase
                    .from('users')
                    .update({
                        clerk_user_id: clerkUserId,
                        email: email || existingUser.email,
                        name: name || existingUser.name,
                        avatar: imageUrl || existingUser.avatar,
                        phone: phone || existingUser.phone
                    })
                    .eq('id', existingUser.id)
                    .select()
                    .single();

                if (updateError) {
                    console.error('❌ User update error:', updateError);
                    return res.status(500).json({ 
                        error: 'Failed to update user',
                        code: 'DATABASE_ERROR'
                    });
                }
                
                console.log('✅ User updated successfully');
                user = updatedUser;
            } else {
                // No match - create new user
                console.log('➕ Creating new user...');
                const { data: newUser, error: createError } = await supabase
                    .from('users')
                    .insert([{
                        clerk_user_id: clerkUserId,
                        email: email,
                        phone: phone,
                        name: name || 'User',
                        avatar: imageUrl,
                        role: 'buyer',
                        created_at: new Date().toISOString()
                    }])
                    .select()
                    .single();

                if (createError) {
                    console.error('❌ User creation error:', createError);
                    return res.status(500).json({ 
                        error: 'Failed to create user',
                        code: 'DATABASE_ERROR'
                    });
                }
                
                console.log('✅ New user created:', newUser.id);
                user = newUser;
            }
        }

        // Generate backend JWT tokens using JWT_SECRET
        console.log('🔑 Generating JWT tokens...');
        const tokens = await jwtService.generateTokenPair(user);
        console.log('✅ JWT tokens generated successfully');

        // Return accessToken, refreshToken, and user object
        console.log('=== Clerk OAuth Success ===');
        res.status(200).json({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                name: user.name,
                avatar: user.avatar,
                clerk_user_id: user.clerk_user_id,
                role: user.role
            }
        });

    } catch (error) {
        console.error('❌ Clerk Auth Error:', error);
        
        res.status(500).json({ 
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
};

// ============================================
// TOKEN REFRESH
// ============================================

/**
 * Get current authenticated user
 * GET /auth/me
 * Headers: Authorization: Bearer {token}
 */
export const getCurrentUser = async (req, res) => {
    try {
        // User is already attached by protect middleware
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ 
                error: 'Not authenticated',
                code: 'NOT_AUTHENTICATED'
            });
        }

        // Get fresh user data
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, phone, name, role, avatar, is_premium, auth_provider, last_login')
            .eq('id', userId)
            .single();

        if (error || !user) {
            return res.status(404).json({ 
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        res.status(200).json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                avatar: user.avatar,
                role: user.role,
                is_premium: user.is_premium,
                auth_provider: user.auth_provider,
                last_login: user.last_login
            }
        });

    } catch (error) {
        console.error('Get Current User Error:', error);
        res.status(500).json({ 
            error: 'Failed to get user information',
            code: 'SERVER_ERROR'
        });
    }
};

/**
 * Refresh access token
 * POST /auth/refresh
 * Body: { refreshToken }
 */
export const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token is required' });
        }

        // Refresh access token
        const result = await jwtService.refreshAccessToken(refreshToken);

        res.status(200).json({
            message: 'Token refreshed successfully',
            ...result
        });

    } catch (error) {
        console.error('Refresh Token Error:', error);
        res.status(401).json({ error: error.message || 'Failed to refresh token' });
    }
};

// ============================================
// LOGOUT
// ============================================

/**
 * Logout user (revoke refresh token)
 * POST /auth/logout
 * Body: { refreshToken }
 */
export const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        const userId = req.user?.id; // From auth middleware

        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token is required' });
        }

        // Revoke refresh token
        await jwtService.revokeRefreshToken(userId, refreshToken);

        res.status(200).json({ message: 'Logout successful' });

    } catch (error) {
        console.error('Logout Error:', error);
        res.status(500).json({ error: 'Failed to logout' });
    }
};

/**
 * Logout from all devices (revoke all refresh tokens)
 * POST /auth/logout-all
 */
export const logoutAll = async (req, res) => {
    try {
        const userId = req.user?.id; // From auth middleware

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Revoke all refresh tokens
        await jwtService.revokeAllRefreshTokens(userId);

        res.status(200).json({ message: 'Logged out from all devices' });

    } catch (error) {
        console.error('Logout All Error:', error);
        res.status(500).json({ error: 'Failed to logout from all devices' });
    }
};

// ============================================
// LEGACY SUPPORT (Keep for backward compatibility)
// ============================================

/**
 * Legacy signup endpoint
 * POST /auth/signup
 */
export const signup = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert([{
                name,
                email,
                phone,
                password: hashedPassword,
                role: 'user',
                auth_provider: 'email',
                avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&auto=format"
            }])
            .select()
            .single();

        if (createError) {
            throw createError;
        }

        // Generate JWT tokens
        const tokens = await jwtService.generateTokenPair(newUser);

        res.status(201).json({
            message: 'User created successfully',
            ...tokens,
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

/**
 * Legacy login endpoint
 * POST /auth/login
 */
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

        if (error || !user || !user.password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        await supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', user.id);

        // Generate JWT tokens
        const tokens = await jwtService.generateTokenPair(user);

        res.json({
            message: 'Login successful',
            ...tokens,
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
