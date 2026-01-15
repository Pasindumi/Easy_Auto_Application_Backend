import { createClerkClient } from '@clerk/clerk-sdk-node';

/**
 * Clerk Integration Service
 * Handles Clerk session verification
 */

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const CLERK_PUBLISHABLE_KEY = process.env.CLERK_PUBLISHABLE_KEY;

if (!CLERK_SECRET_KEY && process.env.NODE_ENV !== 'development') {
  console.warn('⚠️  CLERK_SECRET_KEY is not set. Clerk authentication will not work.');
}

// Initialize Clerk client
const clerkClient = CLERK_SECRET_KEY ? createClerkClient({ secretKey: CLERK_SECRET_KEY }) : null;

/**
 * Verify Clerk session token using @clerk/clerk-sdk-node
 * @param {string} sessionToken - Clerk session token from client (JWT or session ID)
 * @returns {Object} - Verified session with user data
 */
export const verifyClerkToken = async (sessionToken) => {
  if (!CLERK_SECRET_KEY || !clerkClient) {
    console.error('❌ CLERK_SECRET_KEY is not configured');
    throw new Error('Clerk is not configured. Please set CLERK_SECRET_KEY environment variable.');
  }

  try {
    console.log('🔐 Verifying Clerk token...');
    console.log('Token length:', sessionToken?.length);
    console.log('Token preview:', sessionToken?.substring(0, 30) + '...');
    console.log('Secret key configured:', !!CLERK_SECRET_KEY);

    let session;
    let userId;

    // Check if token is a session ID (starts with 'sess_') or a JWT
    if (sessionToken.startsWith('sess_')) {
      console.log('📋 Token appears to be a session ID');
      // Get session by ID
      session = await clerkClient.sessions.getSession(sessionToken);
      userId = session.userId;
    } else {
      console.log('📋 Token appears to be a JWT, verifying...');
      // For JWT tokens, we need to verify and get the session
      // Try to verify the JWT token directly
      try {
        session = await clerkClient.sessions.verifySession(sessionToken, sessionToken);
        userId = session.userId;
      } catch (verifyError) {
        console.log('⚠️  Direct verification failed, trying to get user from token...');
        // If that fails, try to decode and get user
        // The frontend might be sending the user's session token from getToken()
        // In that case, we should use verifyToken from @clerk/backend
        const { verifyToken } = await import('@clerk/backend');
        const decoded = await verifyToken(sessionToken, {
          secretKey: CLERK_SECRET_KEY,
          jwtKey: CLERK_PUBLISHABLE_KEY
        });
        
        if (!decoded || !decoded.sub) {
          throw new Error('Invalid token payload');
        }
        
        userId = decoded.sub;
        // Create a mock session object since we verified the JWT
        session = { id: decoded.sid || 'jwt-verified', userId: decoded.sub };
      }
    }

    if (!session || !userId) {
      console.error('❌ Session verification returned invalid data');
      throw new Error('Invalid session token');
    }

    console.log('✅ Session verified successfully');
    console.log('Session ID:', session.id);
    console.log('User ID:', userId);

    // Fetch user details to get email and name
    const user = await clerkClient.users.getUser(userId);

    if (!user) {
      console.error('❌ Failed to fetch user details');
      throw new Error('Failed to fetch user details');
    }

    console.log('✅ User details fetched successfully');
    console.log('User email:', user.emailAddresses?.[0]?.emailAddress);
    
    // Return standardized payload similar to JWT token
    return {
      sub: user.id,
      email: user.emailAddresses?.[0]?.emailAddress || user.primaryEmailAddress?.emailAddress || null,
      first_name: user.firstName || null,
      last_name: user.lastName || null,
      phone_number: user.phoneNumbers?.[0]?.phoneNumber || user.primaryPhoneNumber?.phoneNumber || null,
      image_url: user.imageUrl || user.profileImageUrl || null,
      sessionId: session.id
    };
  } catch (error) {
    console.error('❌ Clerk token verification error:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Check for specific Clerk error messages
    if (error.message?.includes('not signed in') || error.message?.includes('Not signed in')) {
      throw new Error('Clerk session invalid or expired. Please sign in again.');
    } else if (error.message?.includes('not found') || error.status === 404) {
      throw new Error('Session not found or expired');
    } else if (error.message?.includes('unauthorized') || error.status === 401) {
      throw new Error('Invalid session token');
    } else if (error.message?.includes('expired')) {
      throw new Error('Token has expired');
    } else if (error.clerkError) {
      // Handle Clerk-specific errors
      throw new Error(error.message || 'Clerk authentication failed');
    }

    throw error; // Re-throw to handle in controller
  }
};

/**
 * Fetch full user details from Clerk Backend API
 * @param {string} userId - Clerk User ID (sub)
 * @returns {Object} - Complete user object from Clerk
 */
export const getUser = async (userId) => {
  if (!CLERK_SECRET_KEY || !clerkClient) {
    throw new Error('Clerk is not configured');
  }

  try {
    console.log(`📡 Fetching full Clerk profile for: ${userId}...`);

    // Use Clerk client to fetch user
    const userData = await clerkClient.users.getUser(userId);

    if (!userData) {
      throw new Error('User not found');
    }

    console.log('✅ Clerk profile fetched successfully');

    return {
      id: userData.id,
      email: userData.emailAddresses?.[0]?.emailAddress || userData.primaryEmailAddress?.emailAddress || null,
      first_name: userData.firstName,
      last_name: userData.lastName,
      image_url: userData.imageUrl || userData.profileImageUrl,
      phone_number: userData.phoneNumbers?.[0]?.phoneNumber || userData.primaryPhoneNumber?.phoneNumber || null
    };
  } catch (error) {
    console.error('❌ Error fetching user from Clerk:', error.message);
    throw error;
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
