import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Redis Configuration
 * Used for storing OTPs with TTL and rate limiting
 */

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: (times) => {
    // Stop retrying after first attempt in development
    if (times > 1) {
      return null; // Stop retrying
    }
    return null; // Don't retry at all
  },
  maxRetriesPerRequest: 1,
  enableReadyCheck: false,
  lazyConnect: true,
  enableOfflineQueue: false // Don't queue commands when disconnected
};

// Create Redis client
const redis = new Redis(redisConfig);

// Track connection state
let isConnected = false;

redis.on('connect', () => {
  isConnected = true;
  console.log('✅ Redis connected successfully');
});

redis.on('ready', () => {
  isConnected = true;
  console.log('✅ Redis ready to accept commands');
});

let errorLogged = false;

redis.on('error', (error) => {
  isConnected = false;
  
  // Only log error once to avoid spam
  if (!errorLogged) {
    console.warn('\n⚠️  Redis not available - OTP authentication disabled');
    console.warn('💡 To enable OTP: docker run -d -p 6379:6379 redis:alpine\n');
    errorLogged = true;
  }
});

redis.on('close', () => {
  isConnected = false;
  console.warn('⚠️  Redis connection closed');
});

redis.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});

// Try to connect (but don't crash if it fails)
redis.connect().catch((error) => {
  if (!errorLogged) {
    console.warn('\n⚠️  Redis not available - OTP authentication disabled');
    console.warn('💡 To enable OTP: docker run -d -p 6379:6379 redis:alpine\n');
    errorLogged = true;
  }
});

/**
 * Helper function to check if Redis is available
 */
export const isRedisAvailable = async () => {
  if (!isConnected) {
    return false;
  }
  
  try {
    await redis.ping();
    return true;
  } catch (error) {
    isConnected = false;
    return false;
  }
};

/**
 * Get Redis connection status
 */
export const getRedisStatus = () => {
  return {
    connected: isConnected,
    status: redis.status
  };
};

/**
 * Graceful shutdown
 */
export const closeRedis = async () => {
  try {
    if (isConnected) {
      await redis.quit();
      console.log('✅ Redis connection closed gracefully');
    }
  } catch (error) {
    console.error('❌ Error closing Redis connection:', error.message);
  }
};

export default redis;
