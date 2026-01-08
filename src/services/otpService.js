import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import redis, { isRedisAvailable } from '../config/redis.js';

/**
 * OTP Service - Redis-based Implementation
 * Handles OTP generation, verification, storage in Redis, and SMS sending (mock)
 * 
 * Redis Schema:
 * Key: otp:{phone}
 * Value: JSON { hash: string, attempts: number, createdAt: timestamp }
 * TTL: 300 seconds (5 minutes)
 */

const OTP_TTL = 300; // 5 minutes
const MAX_OTP_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 300; // 5 minutes between requests

/**
 * Check if Redis is available before operations
 */
const checkRedis = async () => {
  const available = await isRedisAvailable();
  if (!available) {
    throw new Error('Redis is not available. Please start Redis server to use OTP authentication.');
  }
  return true;
};

// Generate a 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Hash OTP for secure storage
export const hashOTP = async (otp) => {
  const saltRounds = 10;
  return await bcrypt.hash(otp, saltRounds);
};

// Verify OTP against hash
export const verifyOTP = async (otp, hash) => {
  return await bcrypt.compare(otp, hash);
};

/**
 * Store OTP in Redis with TTL
 * @param {string} phone - Phone number
 * @param {string} otpHash - Hashed OTP
 * @returns {Promise<boolean>} - Success status
 */
export const storeOTP = async (phone, otpHash) => {
  await checkRedis(); // Check Redis availability
  
  const key = `otp:${phone}`;
  const data = {
    hash: otpHash,
    attempts: 0,
    createdAt: Date.now()
  };
  
  try {
    await redis.setex(key, OTP_TTL, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Redis storeOTP error:', error);
    throw new Error('Failed to store OTP. Redis connection issue.');
  }
};

/**
 * Get OTP data from Redis
 * @param {string} phone - Phone number
 * @returns {Promise<object|null>} - OTP data or null
 */
export const getOTP = async (phone) => {
  await checkRedis(); // Check Redis availability
  
  const key = `otp:${phone}`;
  
  try {
    const data = await redis.get(key);
    if (!data) return null;
    
    return JSON.parse(data);
  } catch (error) {
    console.error('Redis getOTP error:', error);
    throw new Error('Failed to retrieve OTP. Redis connection issue.');
  }
};

/**
 * Increment OTP verification attempts
 * @param {string} phone - Phone number
 * @returns {Promise<number>} - New attempt count
 */
export const incrementAttempts = async (phone) => {
  const key = `otp:${phone}`;
  
  try {
    const data = await getOTP(phone);
    if (!data) return 0;
    
    data.attempts += 1;
    
    // Get remaining TTL
    const ttl = await redis.ttl(key);
    await redis.setex(key, ttl > 0 ? ttl : OTP_TTL, JSON.stringify(data));
    
    return data.attempts;
  } catch (error) {
    console.error('Redis incrementAttempts error:', error);
    throw new Error('Failed to increment OTP attempts');
  }
};

/**
 * Delete OTP from Redis
 * @param {string} phone - Phone number
 * @returns {Promise<boolean>} - Success status
 */
export const deleteOTP = async (phone) => {
  const key = `otp:${phone}`;
  
  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.error('Redis deleteOTP error:', error);
    return false;
  }
};

/**
 * Check if phone has rate limit active
 * @param {string} phone - Phone number
 * @returns {Promise<boolean>} - Whether rate limited
 */
export const checkRateLimit = async (phone) => {
  const key = `otp_rate:${phone}`;
  
  try {
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    console.error('Redis checkRateLimit error:', error);
    return false;
  }
};

/**
 * Set rate limit for phone
 * @param {string} phone - Phone number
 * @returns {Promise<void>}
 */
export const setRateLimit = async (phone) => {
  const key = `otp_rate:${phone}`;
  
  try {
    await redis.setex(key, RATE_LIMIT_WINDOW, '1');
  } catch (error) {
    console.error('Redis setRateLimit error:', error);
  }
};


// Mock SMS Sender - Replace with real SMS service (Twilio, AWS SNS, etc.)
export const sendSMS = async (phone, message) => {
  console.log('==============================================');
  console.log('📱 MOCK SMS SENDER');
  console.log('==============================================');
  console.log(`To: ${phone}`);
  console.log(`Message: ${message}`);
  console.log('==============================================');
  
  // In production, integrate with real SMS service:
  // Example with Twilio:
  // const twilio = require('twilio');
  // const client = twilio(ACCOUNT_SID, AUTH_TOKEN);
  // await client.messages.create({
  //   body: message,
  //   from: TWILIO_PHONE,
  //   to: phone
  // });
  
  return {
    success: true,
    messageId: crypto.randomUUID(),
    timestamp: new Date().toISOString()
  };
};

// Send OTP via SMS
export const sendOTPSMS = async (phone, otp) => {
  const message = `Your Easy Auto verification code is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`;
  return await sendSMS(phone, message);
};

// Validate phone number format (basic validation)
export const validatePhoneNumber = (phone) => {
  // Basic E.164 format validation
  // Adjust regex based on your requirements
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
};

// Rate limiting helper - check if too many attempts
export const checkOTPRateLimit = (attempts, maxAttempts = MAX_OTP_ATTEMPTS) => {
  return attempts >= maxAttempts;
};

// Calculate OTP expiry (returns seconds for Redis TTL)
export const getOTPTTL = () => {
  return OTP_TTL;
};

// Check if OTP is expired (handled by Redis TTL, but kept for compatibility)
export const isOTPExpired = (createdAt) => {
  const now = Date.now();
  const elapsed = (now - createdAt) / 1000; // seconds
  return elapsed > OTP_TTL;
};

export default {
  generateOTP,
  hashOTP,
  verifyOTP,
  storeOTP,
  getOTP,
  incrementAttempts,
  deleteOTP,
  checkRateLimit,
  setRateLimit,
  sendSMS,
  sendOTPSMS,
  validatePhoneNumber,
  checkOTPRateLimit,
  getOTPTTL,
  isOTPExpired
};

