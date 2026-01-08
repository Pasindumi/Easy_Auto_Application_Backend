# Authentication & Authorization Implementation Guide

## Overview
This backend now supports multiple authentication methods:
1. **Phone + OTP** (Primary method)
2. **Social Login** via Clerk (Google, Apple, Facebook)
3. **Legacy Email/Password** (Backward compatibility)

## Installation

### 1. Install Dependencies
```bash
npm install
```

This will install:
- `@clerk/clerk-sdk-node` - Clerk SDK for social authentication
- All existing dependencies

### 2. Run Database Migration
Execute the SQL migration in your Supabase SQL Editor:

```bash
# Open the file: auth_migration.sql
# Copy contents and run in Supabase SQL Editor
```

This creates:
- `otp_codes` table - Stores OTP codes for phone authentication
- `refresh_tokens` table - Stores refresh tokens for JWT
- Updates `users` table with new columns for multi-auth support

### 3. Configure Environment Variables
Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:
- `JWT_SECRET` - Secret key for access tokens
- `JWT_REFRESH_SECRET` - Secret key for refresh tokens
- `CLERK_SECRET_KEY` - Get from https://dashboard.clerk.com (for social auth)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Your Supabase anon key

## API Endpoints

### 🔐 Phone + OTP Authentication

#### 1. Send OTP
```http
POST /api/auth/send-otp
Content-Type: application/json

{
  "phone": "+1234567890"
}
```

Response:
```json
{
  "message": "OTP sent successfully",
  "expiresIn": 600,
  "phone": "+1234567890"
}
```

**Note:** In development, OTP is logged to console. In production, integrate with SMS service (Twilio, AWS SNS, etc.)

#### 2. Verify OTP
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "phone": "+1234567890",
  "otp": "123456"
}
```

Response:
```json
{
  "message": "Authentication successful",
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": "15m",
  "user": {
    "id": "uuid",
    "name": "User 7890",
    "phone": "+1234567890",
    "role": "user"
  }
}
```

### 🔑 Clerk Social Authentication

#### Authenticate with Clerk
```http
POST /api/auth/clerk
Content-Type: application/json

{
  "sessionToken": "clerk_session_token_here"
}
```

The backend:
1. Verifies the Clerk session token
2. Extracts user data from Clerk
3. Creates/updates user in database
4. Issues backend JWT tokens

Response: Same format as OTP verification

### 🔄 Token Management

#### Refresh Access Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

Response:
```json
{
  "message": "Token refreshed successfully",
  "accessToken": "new_access_token",
  "expiresIn": "15m"
}
```

#### Logout (Single Device)
```http
POST /api/auth/logout
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

#### Logout All Devices
```http
POST /api/auth/logout-all
Authorization: Bearer {access_token}
```

### 📧 Legacy Authentication (Backward Compatibility)

#### Signup
```http
POST /api/auth/signup
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "password": "secure_password"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "secure_password"
}
```

## Route Protection

### Public Routes (No Authentication)
- `GET /api/cars` - List all ads
- `GET /api/cars/:id` - Get single ad
- `GET /` - Health check

### Protected Routes (Authentication Required)
- `POST /api/cars` - Create ad
- `PUT /api/cars/:id` - Update ad
- `DELETE /api/cars/:id` - Delete ad
- Any POST/PUT/DELETE operations

### How to Protect Routes
```javascript
import { protect, authorize, requirePremium } from '../middlewares/authMiddleware.js';

// Require authentication
router.post('/profile', protect, updateProfile);

// Require specific role
router.delete('/users/:id', protect, authorize('admin'), deleteUser);

// Require premium subscription
router.get('/premium-features', protect, requirePremium, getPremiumContent);
```

## Token Flow

### Access Token
- **Lifetime:** 15 minutes
- **Purpose:** API authentication
- **Storage:** Client memory/state (NOT localStorage)

### Refresh Token
- **Lifetime:** 7 days
- **Purpose:** Get new access tokens
- **Storage:** Secure HttpOnly cookie or secure storage
- **Database:** Hashed and stored for validation

### Token Refresh Flow
1. Client detects expired access token (401 with code `TOKEN_EXPIRED`)
2. Client calls `/api/auth/refresh` with refresh token
3. Backend validates refresh token
4. Backend issues new access token
5. Client retries original request

## Middleware Examples

### Basic Authentication
```javascript
import { protect } from '../middlewares/authMiddleware.js';

router.get('/profile', protect, (req, res) => {
  // req.user contains authenticated user
  res.json({ user: req.user });
});
```

### Optional Authentication
```javascript
import { optionalAuth } from '../middlewares/authMiddleware.js';

router.get('/ads', optionalAuth, (req, res) => {
  // req.user exists if token provided, undefined otherwise
  const ads = req.user ? getAdsForUser(req.user) : getPublicAds();
  res.json({ ads });
});
```

### Role-Based Access
```javascript
import { protect, authorize } from '../middlewares/authMiddleware.js';

router.post('/admin/users', protect, authorize('admin'), createUser);
```

## Security Best Practices

1. **Never expose refresh tokens** in response bodies when not needed
2. **Use HTTPS** in production
3. **Rotate secrets** regularly
4. **Set strong JWT_SECRET** values
5. **Implement rate limiting** on OTP endpoints
6. **Monitor failed authentication attempts**
7. **Use secure cookie flags** for refresh tokens
8. **Implement CORS properly**

## SMS Integration (Production)

The OTP service includes a mock SMS sender. For production:

### Option 1: Twilio
```javascript
// In src/services/otpService.js
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const sendSMS = async (phone, message) => {
  await client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone
  });
};
```

### Option 2: AWS SNS
```javascript
import AWS from 'aws-sdk';
const sns = new AWS.SNS();

export const sendSMS = async (phone, message) => {
  await sns.publish({
    Message: message,
    PhoneNumber: phone
  }).promise();
};
```

## Testing

### Test OTP Flow
```bash
# 1. Send OTP
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890"}'

# 2. Check console for OTP code
# 3. Verify OTP
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890", "otp": "123456"}'
```

### Test Protected Routes
```bash
# Get access token from authentication response
TOKEN="your_access_token_here"

# Call protected endpoint
curl -X POST http://localhost:5000/api/cars \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Ad", ...}'
```

## Troubleshooting

### "Clerk is not configured" Error
- Ensure `CLERK_SECRET_KEY` is set in `.env`
- Get your key from https://dashboard.clerk.com

### "Access token expired" Error
- Normal behavior - access tokens expire after 15 minutes
- Client should call `/api/auth/refresh` with refresh token

### OTP Not Sending
- In development, OTP is logged to console
- In production, configure SMS service credentials

### "Invalid refresh token" Error
- Refresh token expired (7 days)
- Refresh token revoked via logout
- User must re-authenticate

## Migration from Old System

If you have existing users with email/password:
1. **No action needed** - legacy endpoints still work
2. Users can continue using `/api/auth/login`
3. Gradually migrate users to OTP or social auth
4. Update client apps to use new authentication flow

## Database Cleanup

Run periodic cleanup for expired tokens:

```javascript
// Add to src/utils/cronJobs.js
import cron from 'node-cron';
import * as jwtService from '../services/jwtService.js';

// Run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  await jwtService.cleanupExpiredTokens();
  console.log('Expired tokens cleaned');
});
```

## Support

For issues or questions:
1. Check console logs for detailed error messages
2. Verify environment variables are set correctly
3. Ensure database migration completed successfully
4. Check that tokens haven't expired
