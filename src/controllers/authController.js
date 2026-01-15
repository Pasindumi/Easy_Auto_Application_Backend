import supabase from '../config/supabase.js';
import bcrypt from 'bcryptjs';
import * as clerkService from '../services/clerkService.js';
import * as jwtService from '../services/jwtService.js';

/**
 * Authentication Controller
 * Handles Clerk social authentication and email/password authentication
 */

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Map Clerk external account provider to our auth_provider values
 * Clerk provides: 'oauth_google', 'oauth_apple', 'oauth_facebook', etc.
 */
const mapClerkProviderToAuthProvider = (clerkUser) => {
    // Check for external accounts in the Clerk user object
    if (clerkUser.external_accounts && clerkUser.external_accounts.length > 0) {
        const provider = clerkUser.external_accounts[0].provider;
        
        if (provider.includes('google')) return 'google';
        if (provider.includes('apple')) return 'apple';
        if (provider.includes('facebook')) return 'facebook';
    }
    
    // Default to 'clerk' if we can't determine specific provider
    return 'clerk';
};

/**
 * Validate email format
 */
const isValidEmail = (email) => {
    return email && email.includes('@') && email.length >= 3;
};

/**
 * Validate password
 */
const isValidPassword = (password) => {
    return password && password.length >= 6;
};

/**
 * Validate phone (optional, but if provided must be valid)
 */
const isValidPhone = (phone) => {
    if (!phone) return true; // Phone is optional
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length >= 10;
};

/**
 * Sanitize user object (remove sensitive data)
 */
const sanitizeUser = (user) => {
    const { password, ...sanitized } = user;
    return sanitized;
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
                success: false,
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
                    success: false,
                    error: 'Failed to verify with authentication provider',
                    code: 'AUTH_PROVIDER_ERROR'
                });
            }

            console.log('✅ Token verified successfully');
            console.log('Clerk User ID:', payload.sub);
        } catch (clerkError) {
            console.error('❌ Clerk verification error:', clerkError.message);
            console.error('Error details:', clerkError);
            
            // Provide more specific error messages to frontend
            let errorMessage = 'Failed to verify with authentication provider';
            if (clerkError.message?.includes('not signed in') || clerkError.message?.includes('Not signed in')) {
                errorMessage = 'Not signed in with Clerk. Please authenticate again.';
            } else if (clerkError.message?.includes('expired')) {
                errorMessage = 'Clerk session expired. Please sign in again.';
            } else if (clerkError.message?.includes('invalid')) {
                errorMessage = 'Invalid Clerk session token.';
            }

            return res.status(401).json({
                success: false,
                error: errorMessage,
                code: 'AUTH_PROVIDER_ERROR',
                details: clerkError.message
            });
        }

        // Extract user data from token payload
        const clerkUserId = payload.sub;
        let email = payload.email || null;
        let firstName = payload.first_name || null;
        let lastName = payload.last_name || null;
        let imageUrl = payload.image_url || payload.avatar_url || null;
        let phone = payload.phone_number || null;

        // CRITICAL: If data is missing (common with default session tokens), 
        // fetch the full profile from Clerk Backend API
        if (!email || !firstName) {
            console.log('⚠️  User data missing in token. Fetching full profile from Clerk...');
            try {
                const fullUser = await clerkService.getUser(clerkUserId);
                email = email || fullUser.email;
                firstName = firstName || fullUser.first_name;
                lastName = lastName || fullUser.last_name;
                imageUrl = imageUrl || fullUser.image_url;
                phone = phone || fullUser.phone_number;
                console.log('✅ Full profile retrieved:', { email, firstName, lastName });
            } catch (err) {
                console.warn('⚠️  Could not fetch full Clerk profile. Proceeding with token data.');
            }
        }

        const name = [firstName, lastName].filter(Boolean).join(' ') || null;

        console.log('📋 Extracted data:', { clerkUserId, email, phone, name });

        // Determine the auth provider from Clerk user data
        // Try to get full Clerk user to determine provider
        let authProvider = 'clerk'; // default
        try {
            const fullClerkUser = await clerkService.getUser(clerkUserId);
            authProvider = mapClerkProviderToAuthProvider(fullClerkUser);
            console.log('🔐 Determined auth provider:', authProvider);
        } catch (err) {
            console.warn('⚠️  Could not determine specific provider, using default: clerk');
        }

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
                    .eq('email', email.toLowerCase().trim())
                    .single();

                existingUser = emailMatch;
                if (existingUser) {
                    console.log('✅ Found existing user by email:', existingUser.id);
                    console.log('📝 Existing auth_provider:', existingUser.auth_provider);
                    
                    // MERGE RULE: Attach clerk_user_id to existing user
                    // Update auth_provider to social provider
                    // Do NOT overwrite password if it exists
                    console.log('🔄 Merging social login with existing account...');
                    const updateData = {
                        clerk_user_id: clerkUserId,
                        auth_provider: authProvider,
                        email: email || existingUser.email,
                        name: name || existingUser.name,
                        avatar: imageUrl || existingUser.avatar,
                        phone: phone || existingUser.phone,
                        last_login: new Date().toISOString()
                    };
                    
                    // Only update password if user doesn't have one
                    if (!existingUser.password) {
                        updateData.password = null;
                    }
                    
                    const { data: updatedUser, error: updateError } = await supabase
                        .from('users')
                        .update(updateData)
                        .eq('id', existingUser.id)
                        .select()
                        .single();

                    if (updateError) {
                        console.error('❌ User update error:', updateError);
                        return res.status(500).json({
                            success: false,
                            error: 'Failed to update user',
                            code: 'DATABASE_ERROR'
                        });
                    }

                    console.log('✅ User merged successfully');
                    user = updatedUser;
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
                    
                    // MERGE RULE: Attach clerk_user_id
                    console.log('🔄 Updating user with clerk_user_id and social provider...');
                    const updateData = {
                        clerk_user_id: clerkUserId,
                        auth_provider: authProvider,
                        email: email || existingUser.email,
                        name: name || existingUser.name,
                        avatar: imageUrl || existingUser.avatar,
                        phone: phone || existingUser.phone,
                        last_login: new Date().toISOString()
                    };
                    
                    // Only update password if user doesn't have one
                    if (!existingUser.password) {
                        updateData.password = null;
                    }
                    
                    const { data: updatedUser, error: updateError } = await supabase
                        .from('users')
                        .update(updateData)
                        .eq('id', existingUser.id)
                        .select()
                        .single();

                    if (updateError) {
                        console.error('❌ User update error:', updateError);
                        return res.status(500).json({
                            success: false,
                            error: 'Failed to update user',
                            code: 'DATABASE_ERROR'
                        });
                    }

                    console.log('✅ User updated successfully');
                    user = updatedUser;
                }
            }

            if (!existingUser) {
                // No match - create new social user
                console.log('➕ Creating new social user...');

                const { data: newUser, error: createError } = await supabase
                    .from('users')
                    .insert([{
                        clerk_user_id: clerkUserId,
                        email: email,
                        phone: phone,
                        name: name || 'User',
                        avatar: imageUrl,
                        password: null, // Social users don't have passwords
                        auth_provider: authProvider, // google/apple/facebook/clerk
                        role: 'user',
                        is_premium: false,
                        created_at: new Date().toISOString()
                    }])
                    .select()
                    .single();

                if (createError) {
                    console.error('❌ User creation error:', createError);
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to create user',
                        code: 'DATABASE_ERROR'
                    });
                }

                console.log('✅ New user created:', newUser.id);
                user = newUser;
            } else if (!user) { // If existingUser was found but not assigned to 'user' yet
                user = existingUser;
            }
        }

        // Generate backend JWT tokens using JWT_SECRET
        console.log('🔑 Generating JWT tokens...');
        const tokens = await jwtService.generateTokenPair(user);
        console.log('✅ JWT tokens generated successfully');

        // Update last_login (non-blocking)
        supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', user.id)
            .then(() => {})
            .catch(err => console.warn('Failed to update last_login:', err));

        // Sanitize and return user (no password in response)
        const sanitizedUser = sanitizeUser(user);

        // Return accessToken, refreshToken, and user object (matching frontend expectations)
        console.log('=== Clerk OAuth Success ===');
        res.status(200).json({
            success: true,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: {
                id: sanitizedUser.id,
                email: sanitizedUser.email,
                phone: sanitizedUser.phone,
                name: sanitizedUser.name,
                avatar: sanitizedUser.avatar,
                role: sanitizedUser.role,
                is_premium: sanitizedUser.is_premium || false,
                auth_provider: sanitizedUser.auth_provider
            }
        });

    } catch (error) {
        console.error('❌ Clerk Auth Error:', error);

        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR',
            details: error.message
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
// EMAIL/PASSWORD AUTHENTICATION
// ============================================

/**
 * Normal Email/Password Signup
 * POST /auth/signup
 * Body: { name, email, phone (optional), password }
 */
export const signup = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({ 
                error: 'Name, email, and password are required' 
            });
        }

        // Validate name
        if (name.trim().length < 2) {
            return res.status(400).json({ 
                error: 'Name must be at least 2 characters long' 
            });
        }

        // Validate email format
        if (!isValidEmail(email)) {
            return res.status(400).json({ 
                error: 'Invalid email format. Email must contain "@"' 
            });
        }

        // Validate password strength
        if (!isValidPassword(password)) {
            return res.status(400).json({ 
                error: 'Password must be at least 6 characters long' 
            });
        }

        // Validate phone if provided
        if (phone && !isValidPhone(phone)) {
            return res.status(400).json({ 
                error: 'Invalid phone number. Must contain at least 10 digits' 
            });
        }

        // Check if user already exists (email must be unique)
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('id, email')
            .eq('email', email.toLowerCase().trim())
            .single();

        if (existingUser) {
            return res.status(400).json({ 
                error: 'User with this email already exists' 
            });
        }

        // Hash password with bcrypt (cost factor 10)
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user with auth_provider='password' and clerk_user_id = NULL (normal email/password signup)
        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert([{
                name: name.trim(),
                email: email.toLowerCase().trim(),
                phone: phone ? phone.trim() : null,
                password: hashedPassword,
                auth_provider: 'password', // Email/password authentication
                clerk_user_id: null, // NULL for password auth (only used for social login)
                role: 'user',
                is_premium: false,
                avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&auto=format",
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (createError) {
            console.error('Database error during signup:', createError);
            
            // Check for specific DB errors
            if (createError.code === '23505') { // Unique constraint violation
                return res.status(400).json({ 
                    error: 'User with this email already exists' 
                });
            }
            
            throw createError;
        }

        if (!newUser) {
            throw new Error('Failed to create user - no data returned');
        }

        console.log('✅ New user created:', newUser.id, newUser.email);

        // Generate backend JWT access and refresh tokens
        const tokens = await jwtService.generateTokenPair(newUser);

        if (!tokens || !tokens.accessToken || !tokens.refreshToken) {
            throw new Error('Failed to generate authentication tokens');
        }

        // Sanitize and return user data (no password in response)
        const sanitizedUser = sanitizeUser(newUser);

        res.status(201).json({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: {
                id: sanitizedUser.id,
                name: sanitizedUser.name,
                email: sanitizedUser.email,
                phone: sanitizedUser.phone,
                avatar: sanitizedUser.avatar,
                role: sanitizedUser.role,
                is_premium: sanitizedUser.is_premium || false,
                auth_provider: sanitizedUser.auth_provider
            }
        });

    } catch (error) {
        console.error('❌ Signup Error:', error);
        
        // Don't leak internal error details to client
        res.status(500).json({ 
            error: 'Server error during signup. Please try again later.' 
        });
    }
};

/**
 * Normal Email/Password Login
 * POST /auth/login
 * Body: { email, password }
 */
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({ 
                error: 'Email and password are required' 
            });
        }

        // Validate email format
        if (!isValidEmail(email)) {
            return res.status(400).json({ 
                error: 'Invalid email format' 
            });
        }

        // Find user by email
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase().trim())
            .single();

        // Generic error message to prevent user enumeration
        const invalidCredsMessage = 'Invalid email or password';

        if (fetchError || !user) {
            return res.status(401).json({ error: invalidCredsMessage });
        }

        // CRITICAL: Check if user registered with password auth
        // Users with social-only accounts (google/apple/facebook/clerk) cannot login with password
        if (user.auth_provider !== 'password') {
            return res.status(401).json({ 
                error: `This account uses ${user.auth_provider} login. Please sign in with your ${user.auth_provider} account.`,
                code: 'SOCIAL_LOGIN_REQUIRED',
                provider: user.auth_provider
            });
        }

        // Check if user has a password (should always exist for auth_provider='password')
        if (!user.password) {
            console.error('❌ Data inconsistency: auth_provider=password but no password hash found');
            return res.status(401).json({ 
                error: 'Account data error. Please contact support.' 
            });
        }

        // Verify password with bcrypt
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: invalidCredsMessage });
        }

        console.log('✅ User logged in:', user.id, user.email);

        // Update last login timestamp (non-blocking)
        supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', user.id)
            .then(() => {})
            .catch(err => console.warn('Failed to update last_login:', err));

        // Generate backend JWT access and refresh tokens
        const tokens = await jwtService.generateTokenPair(user);

        if (!tokens || !tokens.accessToken || !tokens.refreshToken) {
            throw new Error('Failed to generate authentication tokens');
        }

        // Sanitize and return user data (no password in response)
        const sanitizedUser = sanitizeUser(user);

        res.status(200).json({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: {
                id: sanitizedUser.id,
                name: sanitizedUser.name,
                email: sanitizedUser.email,
                phone: sanitizedUser.phone,
                avatar: sanitizedUser.avatar,
                role: sanitizedUser.role,
                is_premium: sanitizedUser.is_premium || false,
                auth_provider: sanitizedUser.auth_provider
            }
        });

    } catch (error) {
        console.error('❌ Login Error:', error);
        
        // Don't leak internal error details to client
        res.status(500).json({ 
            error: 'Server error during login. Please try again later.' 
        });
    }
};
