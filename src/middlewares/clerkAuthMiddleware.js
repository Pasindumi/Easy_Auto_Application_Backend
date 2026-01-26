import { getAuth } from "@clerk/express";
import supabase from "../config/supabase.js";

/**
 * Clerk Authentication Middleware
 * 
 * This middleware:
 * 1. Checks for Clerk auth (req.auth) set by clerkMiddleware
 * 2. Returns 401 if no auth or missing userId
 * 3. Fetches user from database and attaches to req.user
 * 4. Used for protecting Clerk-authenticated routes
 * 
 * Usage: app.post('/api/protected', clerkAuth, controllerHandler)
 */
export const clerkAuth = async (req, res, next) => {
    try {
        // Get auth from Clerk middleware
        const auth = getAuth(req);

        // Check if user is authenticated with Clerk
        if (!auth || !auth.userId) {
            return res.status(401).json({
                success: false,
                error: 'Not authenticated. Clerk authentication required.',
                code: 'CLERK_NOT_AUTHENTICATED'
            });
        }

        console.log('✅ Clerk authenticated, userId:', auth.userId);

        // Try to find user in database by clerk_user_id
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, phone, name, role, avatar, is_premium, clerk_user_id')
            .eq('clerk_user_id', auth.userId)
            .single()
            .catch(() => ({ data: null, error: { code: 'PGRST116' } }));

        if (error && error.code !== 'PGRST116') {
            console.error('Database error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch user information',
                code: 'DATABASE_ERROR'
            });
        }

        if (!user) {
            // User not found - should not happen if clerkAuth was properly called
            // but respond with 401 instead of 500
            return res.status(401).json({
                success: false,
                error: 'User not found in database',
                code: 'USER_NOT_FOUND'
            });
        }

        // Attach user to request for use in route handlers
        req.user = user;
        req.auth = auth; // Also attach Clerk auth info

        next();

    } catch (error) {
        console.error('Clerk Auth Middleware Error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication error',
            code: 'AUTH_ERROR'
        });
    }
};

/**
 * Optional Clerk Authentication Middleware
 * 
 * Like clerkAuth but doesn't fail if user is not authenticated
 * Useful for routes that are public but should enhance with user data if available
 */
export const clerkAuthOptional = async (req, res, next) => {
    try {
        const auth = getAuth(req);

        if (auth && auth.userId) {
            // User is authenticated, try to fetch from database
            try {
                const { data: user } = await supabase
                    .from('users')
                    .select('id, email, phone, name, role, avatar, is_premium, clerk_user_id')
                    .eq('clerk_user_id', auth.userId)
                    .single()
                    .catch(() => ({ data: null }));

                if (user) {
                    req.user = user;
                    req.auth = auth;
                }
            } catch (err) {
                // Silently fail - user remains undefined
                console.log('Optional Clerk auth failed:', err.message);
            }
        }

        next();

    } catch (error) {
        console.error('Optional Clerk Auth Middleware Error:', error);
        // Don't fail - continue processing
        next();
    }
};
