# Quick Start Guide - Clerk OAuth + Redis OTP Authentication

## What Was Implemented

✅ **Redis-based OTP System**
- OTPs stored in Redis with 5-minute TTL
- Bcrypt hashing for security
- Rate limiting (5 attempts, 5-minute cooldown)
- Auto-deletion after verification

✅ **Clerk OAuth Integration**
- Google, Apple, Facebook login via Clerk
- Session token verification
- Backend JWT issuance (Clerk tokens NOT used for routes)

✅ **Account Merging**
- Automatic account linking by email/phone
- Seamless user experience across auth methods

✅ **JWT Token Management**
- Access tokens (15 min expiry)
- Refresh tokens (7 days, stored in DB)
- Token rotation and revocation

✅ **Security Features**
- Bcrypt password/OTP hashing
- SHA256 token hashing
- Rate limiting
- Token expiry and revocation

---

## Quick Setup (5 Minutes)

### Step 1: Install Redis
```bash
# Using Docker (easiest)
docker run -d -p 6379:6379 --name redis redis:alpine

# Verify
docker ps
```

### Step 2: Update .env
```bash
# Copy example
cp .env.example .env

# Edit .env - Add:
REDIS_HOST=localhost
REDIS_PORT=6379
CLERK_SECRET_KEY=sk_test_your_clerk_key
JWT_SECRET=your_strong_random_secret_here
JWT_REFRESH_SECRET=your_strong_refresh_secret_here
```

### Step 3: Run Database Migration
```sql
-- Open Supabase SQL Editor
-- Run: redis_auth_migration.sql
```

### Step 4: Start Server
```bash
npm install  # Already done (ioredis added)
npm run dev
```

---

## API Endpoints

### OTP Authentication
```bash
# 1. Send OTP
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890"}'

# Check console for OTP code (mock SMS)

# 2. Verify OTP
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890", "otp": "123456"}'
```

### Clerk OAuth
```bash
# From mobile app, get Clerk session token, then:
curl -X POST http://localhost:5000/api/auth/clerk \
  -H "Content-Type: application/json" \
  -d '{"sessionToken": "sess_abc123..."}'
```

### Refresh Token
```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "your_refresh_token"}'
```

### Protected Routes
```bash
# Use access token in Authorization header
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer your_access_token"
```

---

## Testing Checklist

- [ ] Redis is running (`docker ps` or check service)
- [ ] Database migration applied
- [ ] .env variables configured
- [ ] Server starts without errors
- [ ] POST /api/auth/send-otp works (check console for OTP)
- [ ] POST /api/auth/verify-otp returns tokens
- [ ] POST /api/auth/clerk works (requires Clerk account)
- [ ] POST /api/auth/refresh rotates tokens
- [ ] Protected routes require Authorization header

---

## Project Structure

```
src/
├── config/
│   ├── redis.js          ← NEW: Redis client configuration
│   └── supabase.js       ← Existing database client
├── services/
│   ├── otpService.js     ← UPDATED: Redis-based OTP management
│   ├── clerkService.js   ← Existing: Clerk verification
│   └── jwtService.js     ← Existing: JWT token management
├── controllers/
│   └── authController.js ← UPDATED: Account merging logic
├── middlewares/
│   └── authMiddleware.js ← UPDATED: JWT verification
└── routes/
    └── authRoutes.js     ← Existing: All auth endpoints
```

---

## What Changed

### New Files
- `src/config/redis.js` - Redis client with error handling
- `redis_auth_migration.sql` - Database schema updates
- `CLERK_OTP_INTEGRATION.md` - Full documentation

### Updated Files
- `src/services/otpService.js` - Now uses Redis instead of DB
- `src/controllers/authController.js` - Account merging in Clerk auth
- `src/middlewares/authMiddleware.js` - Updated to include clerk_user_id
- `.env.example` - Added Redis configuration

### Database Changes
- Added `clerk_user_id` column to users table
- Added indexes for performance
- Refresh tokens table (already existed)
- OTP codes table no longer needed (using Redis)

---

## Account Merging Examples

### Example 1: Phone → Clerk
```
1. User signs up with phone: +1234567890
2. Later, user logs in with Google (email: user@gmail.com)
3. Backend links accounts:
   - clerk_user_id: user_abc123
   - phone: +1234567890
   - email: user@gmail.com
   - Same user record
```

### Example 2: Email → Phone
```
1. User logs in with Google (email: user@gmail.com)
2. Later, adds phone number via OTP
3. Backend links accounts:
   - clerk_user_id: user_abc123
   - email: user@gmail.com
   - phone: +1234567890
   - Same user record
```

---

## Common Issues

### Redis Connection Error
```
❌ Redis connection error: connect ECONNREFUSED
```
**Solution:** Start Redis (`docker start redis` or `redis-server`)

### OTP Not Found
```
❌ No OTP found for this phone number
```
**Solution:** OTP expired (5 min). Request new OTP.

### Clerk Token Invalid
```
❌ Invalid session token
```
**Solution:** Check CLERK_SECRET_KEY in .env matches dashboard.

### Token Expired
```
❌ Access token expired
```
**Solution:** Use refresh token endpoint to get new access token.

---

## Production Deployment

### Before Going Live:
1. **Redis**
   - Use managed Redis (AWS ElastiCache, Redis Cloud)
   - Enable persistence
   - Set up backups

2. **SMS Provider**
   - Replace mock SMS with Twilio/AWS SNS
   - Update `otpService.sendSMS()`

3. **Security**
   - Use strong JWT secrets (32+ chars)
   - Enable HTTPS
   - Configure CORS properly
   - Rate limit at API gateway

4. **Monitoring**
   - Set up Redis monitoring
   - Log failed auth attempts
   - Alert on high error rates

---

## Integration with Mobile App

### iOS/Android with Clerk
```javascript
// 1. User logs in with Clerk (mobile SDK)
const session = await clerk.getSession();

// 2. Send session token to backend
const response = await fetch('https://api.yourapp.com/api/auth/clerk', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionToken: session.token })
});

// 3. Store backend tokens
const { accessToken, refreshToken, user } = await response.json();
await SecureStore.setItemAsync('accessToken', accessToken);
await SecureStore.setItemAsync('refreshToken', refreshToken);

// 4. Use accessToken for all API requests
fetch('https://api.yourapp.com/api/cars', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

---

## Next Steps

1. ✅ Set up Redis
2. ✅ Run migration
3. ✅ Test OTP flow
4. ✅ Test Clerk flow
5. ⏳ Configure production SMS
6. ⏳ Set up production Redis
7. ⏳ Deploy to production
8. ⏳ Monitor and optimize

---

## Support Resources

- **Full Documentation:** `CLERK_OTP_INTEGRATION.md`
- **Database Migration:** `redis_auth_migration.sql`
- **Environment Setup:** `.env.example`
- **Clerk Dashboard:** https://dashboard.clerk.com
- **Redis Documentation:** https://redis.io/docs

---

**Implementation Date:** January 8, 2026  
**Backend Engineer:** Senior Backend Engineer  
**Status:** ✅ Complete and Ready for Testing
