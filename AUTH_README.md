# 🔐 Authentication & Authorization System

## ✅ Implementation Complete

Your backend now has a **production-ready authentication and authorization system** with:

### 🎯 Features Implemented

1. **Phone + OTP Authentication** (Primary)
   - Send OTP to phone number
   - Verify OTP with expiry and rate limiting
   - Automatic user creation on first login
   - Mock SMS sender (ready for production SMS integration)

2. **Clerk Social Authentication** (Google/Apple/Facebook)
   - Verify Clerk session tokens
   - Sync user data from Clerk
   - Support for multiple social providers
   - Automatic user linking

3. **JWT Token Management**
   - Short-lived access tokens (15 minutes)
   - Long-lived refresh tokens (7 days)
   - Secure token storage in database
   - Token refresh endpoint
   - Logout (single & all devices)

4. **Route Protection**
   - Public routes (no auth required)
   - Protected routes (auth required)
   - Role-based access control
   - Premium user restrictions

5. **Legacy Support**
   - Email/password signup (backward compatible)
   - Email/password login (backward compatible)

## 📁 Files Created/Modified

### New Files
- ✅ `auth_migration.sql` - Database schema for auth tables
- ✅ `src/services/otpService.js` - OTP generation and SMS handling
- ✅ `src/services/clerkService.js` - Clerk integration
- ✅ `src/services/jwtService.js` - JWT token management
- ✅ `AUTH_IMPLEMENTATION.md` - Complete documentation
- ✅ `.env.example` - Environment variable template
- ✅ `scripts/test-auth.js` - Authentication testing script

### Modified Files
- ✅ `src/controllers/authController.js` - Added OTP, Clerk, token endpoints
- ✅ `src/middlewares/authMiddleware.js` - Enhanced authentication middleware
- ✅ `src/routes/authRoutes.js` - Added new auth endpoints
- ✅ `src/routes/carRoutes.js` - Added route protection comments
- ✅ `src/app.js` - Integrated all routes
- ✅ `package.json` - Added Clerk SDK dependency

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Database Migration
1. Open Supabase SQL Editor
2. Run the SQL from `auth_migration.sql`
3. Verify tables created: `otp_codes`, `refresh_tokens`

### 3. Configure Environment
```bash
# Copy example and edit
cp .env.example .env

# Required variables:
JWT_SECRET=your_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
CLERK_SECRET_KEY=your_clerk_key_here (optional for OTP-only)
```

### 4. Start Server
```bash
npm start
```

### 5. Test Authentication
```bash
node scripts/test-auth.js
```

## 📡 API Endpoints

### Phone Authentication
```bash
# 1. Send OTP
POST /api/auth/send-otp
Body: { "phone": "+1234567890" }

# 2. Verify OTP (check console for OTP in dev mode)
POST /api/auth/verify-otp
Body: { "phone": "+1234567890", "otp": "123456" }
```

### Clerk Social Auth
```bash
POST /api/auth/clerk
Body: { "sessionToken": "clerk_session_token" }
```

### Token Management
```bash
# Refresh access token
POST /api/auth/refresh
Body: { "refreshToken": "your_refresh_token" }

# Logout
POST /api/auth/logout
Headers: Authorization: Bearer {access_token}
Body: { "refreshToken": "your_refresh_token" }

# Logout all devices
POST /api/auth/logout-all
Headers: Authorization: Bearer {access_token}
```

### Legacy Endpoints (Backward Compatible)
```bash
POST /api/auth/signup
POST /api/auth/login
```

## 🔒 Route Protection Examples

### Current Protected Routes
- ✅ `POST /api/cars` - Create ad (requires auth)
- ✅ `PUT /api/cars/:id` - Update ad (requires auth)
- ✅ Admin routes - Require admin auth

### Public Routes
- ✅ `GET /api/cars` - List ads (public)
- ✅ `GET /api/cars/:id` - Get ad (public)
- ✅ `GET /` - Health check (public)

## 🧪 Testing

### Manual Test Flow
1. **Start server**: `npm start`
2. **Send OTP**:
   ```bash
   curl -X POST http://localhost:5000/api/auth/send-otp \
     -H "Content-Type: application/json" \
     -d '{"phone": "+1234567890"}'
   ```
3. **Check console** for OTP code
4. **Verify OTP**:
   ```bash
   curl -X POST http://localhost:5000/api/auth/verify-otp \
     -H "Content-Type: application/json" \
     -d '{"phone": "+1234567890", "otp": "YOUR_OTP_HERE"}'
   ```
5. **Use returned access token** to call protected endpoints

### Automated Tests
```bash
node scripts/test-auth.js
```

## 📦 Database Schema

### Users Table (Updated)
- Added: `clerk_id`, `phone_verified`, `google_id`, `apple_id`, `facebook_id`
- Added: `auth_provider`, `last_login`, `updated_at`
- Modified: `email` and `password` now nullable (for social auth)

### OTP Codes Table (New)
- `id`, `phone`, `otp_hash`, `expires_at`, `attempts`, `verified`
- Automatic cleanup of expired OTPs

### Refresh Tokens Table (New)
- `id`, `user_id`, `token_hash`, `expires_at`, `revoked`
- Tracks all active sessions per user

## 🔐 Security Features

- ✅ OTP expiry (10 minutes)
- ✅ OTP rate limiting (3 attempts)
- ✅ Refresh token rotation
- ✅ Token revocation (logout)
- ✅ Secure password hashing (bcrypt)
- ✅ JWT access token expiry (15 minutes)
- ✅ Database-backed token validation
- ✅ Role-based access control
- ✅ Phone number format validation

## 🎨 Client Integration Examples

### React/Next.js Example
```javascript
// 1. Send OTP
const sendOTP = async (phone) => {
  const response = await fetch('/api/auth/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone })
  });
  return response.json();
};

// 2. Verify OTP
const verifyOTP = async (phone, otp) => {
  const response = await fetch('/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp })
  });
  const data = await response.json();
  
  // Store tokens
  localStorage.setItem('refreshToken', data.refreshToken);
  // Store accessToken in memory/state (not localStorage)
  return data;
};

// 3. Call protected API
const createAd = async (adData, accessToken) => {
  const response = await fetch('/api/cars', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(adData)
  });
  return response.json();
};

// 4. Refresh token on expiry
const refreshAccessToken = async (refreshToken) => {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  return response.json();
};
```

## 📚 Documentation

See **`AUTH_IMPLEMENTATION.md`** for:
- Complete API documentation
- Middleware usage examples
- SMS integration guides
- Troubleshooting tips
- Production deployment checklist

## 🔧 Production Checklist

Before deploying to production:

1. ✅ Run database migration
2. ✅ Set strong JWT secrets
3. ✅ Configure Clerk (if using social auth)
4. ⚠️ **Replace mock SMS with real service** (Twilio/AWS SNS)
5. ✅ Enable HTTPS
6. ✅ Set up rate limiting
7. ✅ Configure CORS properly
8. ✅ Set up monitoring/logging
9. ✅ Schedule token cleanup cron job

## 🆘 Troubleshooting

### Server won't start
- Check `.env` file exists with required variables
- Run `npm install` to ensure all dependencies installed

### OTP not sending
- In development: Check server console for OTP
- In production: Configure SMS service in `otpService.js`

### "Clerk is not configured" warning
- Normal if not using social auth
- Set `CLERK_SECRET_KEY` in `.env` to enable

### Token expired errors
- Normal behavior for access tokens (15 min)
- Client should call `/api/auth/refresh`

## 📞 Support

For questions or issues:
1. Check `AUTH_IMPLEMENTATION.md` for detailed docs
2. Review console logs for error details
3. Verify environment variables are set
4. Test with `scripts/test-auth.js`

---

**🎉 Your authentication system is ready to use!**
