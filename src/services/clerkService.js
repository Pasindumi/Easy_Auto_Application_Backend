import { verifyToken } from '@clerk/backend';

/**
 * Clerk Integration Service
 * Handles Clerk session verification
 */

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

if (!CLERK_SECRET_KEY && process.env.NODE_ENV !== 'development') {
  console.warn('⚠️  CLERK_SECRET_KEY is not set. Clerk authentication will not work.');
}

/**
 * Verify Clerk session token using @clerk/backend
 * @param {string} sessionToken - Clerk session token from client
 * @returns {Object} - Verified token payload with user data
 */
export const verifyClerkToken = async (sessionToken) => {
  if (!CLERK_SECRET_KEY) {
    console.error('❌ CLERK_SECRET_KEY is not configured');
    throw new Error('Clerk is not configured. Please set CLERK_SECRET_KEY environment variable.');
  }

  try {
    console.log('🔐 Verifying Clerk token...');
    console.log('Token length:', sessionToken?.length);
    console.log('Secret key length:', CLERK_SECRET_KEY?.length);
    
    // Verify the session token using @clerk/backend with clock skew tolerance
    const payload = await verifyToken(sessionToken, {
      secretKey: CLERK_SECRET_KEY,
      clockSkewInMs: 300000 // 5 minutes clock skew tolerance
    });
    
    if (!payload) {
      console.error('❌ verifyToken returned null/undefined');
      throw new Error('Invalid session token');
    }

    console.log('✅ Token verified successfully');
    console.log('Payload keys:', Object.keys(payload));
    
    return payload; // Returns token payload with sub, email, first_name, etc.
  } catch (error) {
    console.error('❌ Clerk token verification error:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    // Provide more specific error messages
    if (error.message?.includes('not before')) {
      console.error('⚠️  Clock skew detected - token nbf claim is in the future');
      console.error('💡 Solution: Synchronize server system time or increase clockSkewInMs');
      throw new Error('Token not yet valid (clock skew issue)');
    } else if (error.message?.includes('JWS')) {
      throw new Error('Invalid token signature');
    } else if (error.message?.includes('expired')) {
      throw new Error('Token has expired');
    }
    
    throw error; // Re-throw to handle in controller
  }
};

/**
 * Verify Clerk webhook signature
 * @param {Object} req - Express request object
 * @param {string} webhookSecret - Clerk webhook secret
 * @returns {boolean} - Whether signature is valid
 */
export const verifyClerkWebhook = (req, webhookSecret) => {
  // Clerk webhook verification logic
  // Implementation depends on Clerk's webhook signature verification
  const signature = req.headers['svix-signature'];
  const timestamp = req.headers['svix-timestamp'];
  const payload = JSON.stringify(req.body);
  
  // TODO: Implement actual signature verification
  // This is a placeholder - refer to Clerk docs for actual implementation
  
  return true;
};
