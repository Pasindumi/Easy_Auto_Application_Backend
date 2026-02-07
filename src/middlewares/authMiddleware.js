import * as jwtService from '../services/jwtService.js';
import supabase from '../config/supabase.js';

/**
 * Authentication Middleware
 * Protects routes by verifying JWT access tokens
 */

/**
 * Main authentication middleware
 * Verifies access token and attaches user to request
 */
export const protect = async (req, res, next) => {
    try {
        let token;

        // Extract token from Authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Not authorized. No token provided.'
            });
        }

        // Verify token
        const decoded = jwtService.verifyAccessToken(token);

        // Get user from database
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, phone, name, role, avatar, is_premium, clerk_user_id, status, ban_expires_at, ban_reason')
            .eq('id', decoded.id)
            .single();

        if (error || !user) {
            return res.status(401).json({
                success: false,
                error: 'Not authorized. User not found.'
            });
        }

        // Check for BLOCKED or BANNED status
        if (user.status === 'BLOCKED') {
            return res.status(403).json({
                success: false,
                error: 'Your account has been permanently blocked by an administrator.',
                code: 'USER_BLOCKED'
            });
        }

        if (user.status === 'BANNED') {
            const now = new Date();
            const expiresAt = new Date(user.ban_expires_at);

            if (expiresAt > now) {
                return res.status(403).json({
                    success: false,
                    error: `Your account is temporarily banned until ${expiresAt.toLocaleString()}. Reason: ${user.ban_reason}`,
                    code: 'USER_BANNED',
                    ban_expires_at: user.ban_expires_at,
                    ban_reason: user.ban_reason
                });
            } else {
                // Ban expired, set status back to ACTIVE
                await supabase
                    .from('users')
                    .update({ status: 'ACTIVE', ban_expires_at: null, ban_reason: null })
                    .eq('id', user.id);
                user.status = 'ACTIVE';
            }
        }

        // Attach user to request
        req.user = user;
        next();

    } catch (error) {
        console.error('Auth Middleware Error:', error);

        if (error.message === 'Access token expired') {
            return res.status(401).json({
                success: false,
                error: 'Access token expired. Please refresh your token.',
                code: 'TOKEN_EXPIRED'
            });
        }

        return res.status(401).json({
            success: false,
            error: 'Not authorized. Invalid token.'
        });
    }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but allows request to continue even without token
 */
export const optionalAuth = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (token) {
            try {
                const decoded = jwtService.verifyAccessToken(token);

                const { data: user } = await supabase
                    .from('users')
                    .select('id, email, phone, name, role, avatar, is_premium')
                    .eq('id', decoded.id)
                    .single();

                if (user) {
                    req.user = user;
                }
            } catch (error) {
                // Silently fail - user remains undefined
                console.log('Optional auth failed:', error.message);
            }
        }

        next();
    } catch (error) {
        next();
    }
};

/**
 * Role-based authorization middleware
 * Requires specific role(s) to access route
 * @param  {...string} roles - Allowed roles
 */
export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Not authorized. Please login.'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: `Access denied. Required role: ${roles.join(' or ')}`
            });
        }

        next();
    };
};

/**
 * Premium user middleware
 * Requires premium subscription
 */
export const requirePremium = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Not authorized. Please login.'
        });
    }

    if (!req.user.is_premium) {
        return res.status(403).json({
            success: false,
            error: 'This feature requires a premium subscription.'
        });
    }

    next();
};

export default { protect, optionalAuth, authorize, requirePremium };
