import { verifyToken } from "@clerk/express";
import { createClerkClient } from "@clerk/backend";

/**
 * Clerk Integration Service
 * Handles Clerk session token verification using @clerk/express
 */

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

if (!CLERK_SECRET_KEY && process.env.NODE_ENV !== 'development') {
  console.warn('⚠️  CLERK_SECRET_KEY is not set. Clerk authentication will not work.');
}

// Initialize Clerk backend client for user fetches
const clerkClient = CLERK_SECRET_KEY ? createClerkClient({ secretKey: CLERK_SECRET_KEY }) : null;

/**
 * Verify Clerk session token using @clerk/express
 * Accepts JWT tokens from React Native (@clerk/clerk-expo)
 * @param {string} token - Clerk JWT token from client (from getToken())
 * @returns {Object} - Verified token payload with user data
 */
export const verifyClerkToken = async (token) => {
  if (!CLERK_SECRET_KEY) {
    console.error('❌ CLERK_SECRET_KEY is not configured');
    throw new Error('Clerk is not configured. Please set CLERK_SECRET_KEY environment variable.');
  }

  try {
    console.log('🔐 Verifying Clerk token...');
    console.log('Token length:', token?.length);
    console.log('Token preview:', token?.substring(0, 30) + '...');

    // Verify the JWT token using @clerk/express
    const decoded = await verifyToken(token, {
      secretKey: CLERK_SECRET_KEY,
    });

    if (!decoded || !decoded.sub) {
      console.error('❌ Token verification returned invalid payload');
      throw new Error('Invalid token payload');
    }

    console.log('✅ Token verified successfully');
    console.log('Clerk User ID:', decoded.sub);

    // Extract email from the token
    // The token should contain the user's email
    const email = decoded.email || null;
    
    console.log('📋 Token payload:', {
      sub: decoded.sub,
      email: email,
      aud: decoded.aud,
      iss: decoded.iss,
    });

    // Return standardized payload
    return {
      sub: decoded.sub,
      email: email,
      sessionId: decoded.sid || null,
      orgId: decoded.org_id || null,
      orgSlug: decoded.org_slug || null,
      // Raw decoded token for additional data
      decoded: decoded
    };
  } catch (error) {
    console.error('❌ Clerk token verification error:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    if (error.message?.includes('expired')) {
      throw new Error('Token has expired. Please sign in again.');
    } else if (error.message?.includes('invalid') || error.message?.includes('malformed')) {
      throw new Error('Invalid or malformed token.');
    } else if (error.message?.includes('no valid signature')) {
      throw new Error('Token signature verification failed.');
    }

    throw error;
  }
};

/**
 * Get user details from Clerk (requires backend API call)
 * Note: @clerk/express doesn't provide user fetching; this would require 
 * using Clerk's REST API directly if needed
 * @param {string} userId - Clerk User ID
 * @returns {Object} - User data from database should be used instead
 */
export const getUser = async (userId) => {
  if (!clerkClient) {
    throw new Error('Clerk backend client not initialized');
  }

  try {
    console.log(`📡 Fetching Clerk user profile for: ${userId}`);
    const userData = await clerkClient.users.getUser(userId);

    if (!userData) {
      throw new Error('User not found');
    }

    // Normalize fields we care about
    return {
      id: userData.id,
      email:
        userData?.emailAddresses?.[0]?.emailAddress ||
        userData?.primaryEmailAddress?.emailAddress ||
        null,
      first_name: userData.firstName || null,
      last_name: userData.lastName || null,
      image_url: userData.imageUrl || userData.profileImageUrl || null,
      phone_number:
        userData?.phoneNumbers?.[0]?.phoneNumber ||
        userData?.primaryPhoneNumber?.phoneNumber ||
        null,
      external_accounts: userData.externalAccounts || []
    };
  } catch (error) {
    console.error('❌ Error fetching Clerk user:', error.message);
    throw error;
  }
};

/**
 * Verify Clerk webhook signature
 * For use with Clerk webhooks (not token verification)
 * @param {Object} req - Express request object
 * @param {string} webhookSecret - Clerk webhook secret
 * @returns {boolean} - Whether signature is valid
 */
export const verifyClerkWebhook = (req, webhookSecret) => {
  // Clerk webhook verification logic
  const signature = req.headers['svix-signature'];
  const timestamp = req.headers['svix-timestamp'];
  const payload = JSON.stringify(req.body);

  // TODO: Implement actual signature verification using Clerk's Svix webhook verification
  // Refer to Clerk docs for svix verification

  return true;
};
