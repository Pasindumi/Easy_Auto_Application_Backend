import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import supabase from '../config/supabase.js';

/**
 * JWT Token Service
 * Handles access token and refresh token generation, verification, and management
 */

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_change_this';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your_refresh_secret_key_change_this';

// Token expiry times
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Generate access token (short-lived)
 * @param {Object} payload - User data to encode in token
 * @returns {string} - JWT access token
 */
export const generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY
  });
};

/**
 * Generate refresh token (long-lived)
 * @param {Object} payload - User data to encode in token
 * @returns {string} - JWT refresh token
 */
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY
  });
};

/**
 * Generate both access and refresh tokens
 * @param {Object} user - User object
 * @returns {Object} - Access and refresh tokens
 */
export const generateTokenPair = async (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    phone: user.phone,
    role: user.role
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Store refresh token in database
  await storeRefreshToken(user.id, refreshToken);

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY
  };
};

/**
 * Verify access token
 * @param {string} token - JWT access token
 * @returns {Object} - Decoded token payload
 */
export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Access token expired');
    }
    throw new Error('Invalid access token');
  }
};

/**
 * Verify refresh token
 * @param {string} token - JWT refresh token
 * @returns {Object} - Decoded token payload
 */
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token expired');
    }
    throw new Error('Invalid refresh token');
  }
};

/**
 * Hash token for storage
 * @param {string} token - Token to hash
 * @returns {string} - Hashed token
 */
const hashToken = async (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Store refresh token in database
 * @param {string} userId - User ID
 * @param {string} token - Refresh token
 */
export const storeRefreshToken = async (userId, token) => {
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

  const { error } = await supabase
    .from('refresh_tokens')
    .insert([{
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString()
    }]);

  if (error) {
    console.error('Error storing refresh token:', error);
    throw new Error('Failed to store refresh token');
  }
};

/**
 * Verify refresh token exists in database and is valid
 * @param {string} userId - User ID
 * @param {string} token - Refresh token
 * @returns {boolean} - Whether token is valid
 */
export const verifyRefreshTokenInDB = async (userId, token) => {
  const tokenHash = await hashToken(token);

  const { data, error } = await supabase
    .from('refresh_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('token_hash', tokenHash)
    .eq('revoked', false)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) {
    return false;
  }

  return true;
};

/**
 * Revoke a specific refresh token
 * @param {string} userId - User ID
 * @param {string} token - Refresh token to revoke
 */
export const revokeRefreshToken = async (userId, token) => {
  const tokenHash = await hashToken(token);

  const { error } = await supabase
    .from('refresh_tokens')
    .update({
      revoked: true,
      revoked_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('token_hash', tokenHash);

  if (error) {
    console.error('Error revoking refresh token:', error);
    throw new Error('Failed to revoke refresh token');
  }
};

/**
 * Revoke all refresh tokens for a user (logout from all devices)
 * @param {string} userId - User ID
 */
export const revokeAllRefreshTokens = async (userId) => {
  const { error } = await supabase
    .from('refresh_tokens')
    .update({
      revoked: true,
      revoked_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('revoked', false);

  if (error) {
    console.error('Error revoking all refresh tokens:', error);
    throw new Error('Failed to revoke refresh tokens');
  }
};

/**
 * Clean up expired refresh tokens (call periodically)
 */
export const cleanupExpiredTokens = async () => {
  const { error } = await supabase
    .from('refresh_tokens')
    .delete()
    .lt('expires_at', new Date().toISOString());

  if (error) {
    console.error('Error cleaning up expired tokens:', error);
  }
};

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Refresh token
 * @returns {Object} - New access token
 */
export const refreshAccessToken = async (refreshToken) => {
  // Verify refresh token JWT
  const decoded = verifyRefreshToken(refreshToken);

  // Verify token exists in database and is valid
  const isValid = await verifyRefreshTokenInDB(decoded.id, refreshToken);
  
  if (!isValid) {
    throw new Error('Invalid or expired refresh token');
  }

  // Get user data
  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, phone, role, name')
    .eq('id', decoded.id)
    .single();

  if (error || !user) {
    throw new Error('User not found');
  }

  // Generate new access token
  const accessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    phone: user.phone,
    role: user.role
  });

  return {
    accessToken,
    expiresIn: ACCESS_TOKEN_EXPIRY
  };
};

export default {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  storeRefreshToken,
  verifyRefreshTokenInDB,
  revokeRefreshToken,
  revokeAllRefreshTokens,
  cleanupExpiredTokens,
  refreshAccessToken
};
