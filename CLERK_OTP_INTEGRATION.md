# Clerk OAuth + OTP Authentication Integration

## Overview

This backend now supports **dual authentication**:
1. **OTP-based authentication** via phone number (backend managed, Redis-based)
2. **OAuth authentication** via Clerk (Google, Apple, Facebook)

### Key Design Principles
- Backend always issues its own JWT tokens
- Clerk tokens are NEVER used for route authorization
- Clerk is only used for identity verification
- Backend controls all authorization and roles
- Account merging is automatic when email/phone matches

---

## Architecture

### Authentication Flow

#### OTP Flow (Phone-based)
```
1. User requests OTP → POST /api/auth/send-otp
2. Backend generates 6-digit OTP
3. OTP is hashed (bcrypt) and stored in Redis (TTL: 5 min)
4. OTP sent via SMS (mock function)
5. User submits OTP → POST /api/auth/verify-otp
6. Backend verifies OTP from Redis
7. Backend issues access + refresh tokens
8. OTP deleted from Redis after success
```

#### Clerk OAuth Flow
```
1. User logs in via Clerk (mobile app)
2. Clerk returns session token
3. Mobile sends session token → POST /api/auth/clerk
4. Backend verifies token with Clerk API
5. Backend extracts user data (email, name, etc.)
6. Backend merges account if email/phone matches existing user
7. Backend issues access + refresh tokens
8. Returns tokens + user profile
```

---

## Account Merging Logic

When a user logs in via Clerk, the backend:

1. **Checks by `clerk_user_id`** - If exists, user is already linked
2. **Checks by email** - If email matches, merge accounts
3. **Checks by phone** - If phone matches, merge accounts
4. **Creates new user** - If no match found

### Merge Example
```
Existing User:
  - phone: +1234567890
  - email: null
  - clerk_user_id: null

Clerk Login (Google):
  - email: user@gmail.com
  - clerk_user_id: user_abc123

Result:
  - phone: +1234567890
  - email: user@gmail.com  (updated)
  - clerk_user_id: user_abc123  (linked)
```

---

## API Endpoints

### 1. Send OTP
**POST** `/api/auth/send-otp`

**Request:**
```json
{
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "message": "OTP sent successfully",
  "expiresIn": 300,
  "phone": "+1234567890"
}
```

**Errors:**
- 400: Invalid phone format
- 429: Rate limited (too many requests)
- 500: Server error

---

### 2. Verify OTP
**POST** `/api/auth/verify-otp`

**Request:**
```json
{
  "phone": "+1234567890",
  "otp": "123456"
}
```

**Response:**
```json
{
  "message": "Authentication successful",
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "name": "User 7890",
    "email": null,
    "phone": "+1234567890",
    "avatar": "https://...",
    "role": "user",
    "is_premium": false
  }
}
```

**Errors:**
- 400: Invalid OTP or OTP expired
- 429: Too many failed attempts
- 500: Server error

---

### 3. Clerk OAuth Login
**POST** `/api/auth/clerk`

**Request:**
```json
{
  "sessionToken": "sess_abc123..."
}
```

**Response:**
```json
{
  "message": "Authentication successful",
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@gmail.com",
    "phone": "+1234567890",
    "avatar": "https://img.clerk.com/...",
    "role": "user",
    "is_premium": false,
    "clerk_user_id": "user_abc123"
  }
}
```

**Errors:**
- 400: Missing session token
- 401: Invalid token or authentication failed
- 429: Rate limited
- 500: Server error

---

### 4. Refresh Token
**POST** `/api/auth/refresh`

**Request:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response:**
```json
{
  "message": "Token refreshed successfully",
  "accessToken": "eyJhbGc...",
  "expiresIn": "15m"
}
```

**Errors:**
- 400: Missing refresh token
- 401: Invalid or expired refresh token
- 500: Server error

---

### 5. Get Current User
**GET** `/api/auth/me`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@gmail.com",
    "phone": "+1234567890",
    "avatar": "https://...",
    "role": "user",
    "is_premium": false,
    "auth_provider": "google",
    "last_login": "2026-01-08T10:30:00Z"
  }
}
```

---

### 6. Logout
**POST** `/api/auth/logout`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response:**
```json
{
  "message": "Logout successful"
}
```

---

### 7. Logout All Devices
**POST** `/api/auth/logout-all`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "message": "Logged out from all devices"
}
```

---

## Route Protection

### Public Routes (No Auth Required)
- `GET /api/cars` - List all ads
- `GET /api/cars/:id` - Get single ad

### Protected Routes (Auth Required)
- `POST /api/cars` - Create ad
- `PUT /api/cars/:id` - Update ad
- `DELETE /api/cars/:id` - Delete ad
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout
- `POST /api/auth/logout-all` - Logout all devices

### Admin Routes (Admin Role Required)
- `GET /api/admin/*` - Admin panel
- `POST /api/admin/*` - Admin operations

---

## Database Schema

### Users Table Updates
```sql
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS clerk_user_id text unique,
ADD COLUMN IF NOT EXISTS phone_verified boolean default false,
ADD COLUMN IF NOT EXISTS email_verified boolean default false,
ADD COLUMN IF NOT EXISTS google_id text unique,
ADD COLUMN IF NOT EXISTS apple_id text unique,
ADD COLUMN IF NOT EXISTS facebook_id text unique,
ADD COLUMN IF NOT EXISTS auth_provider text default 'phone',
ADD COLUMN IF NOT EXISTS last_login timestamp with time zone,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;
```

### Refresh Tokens Table
```sql
CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  token_hash text not null unique,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default now() not null,
  revoked boolean default false,
  revoked_at timestamp with time zone
);
```

**Note:** OTPs are stored in Redis, not in the database.

---

## Redis Configuration

### OTP Storage Schema
```
Key: otp:{phone}
Value: { hash: "bcrypt_hash", attempts: 0, createdAt: 1234567890 }
TTL: 300 seconds (5 minutes)
```

### Rate Limiting
```
Key: otp_rate:{phone}
Value: "1"
TTL: 300 seconds (5 minutes)
```

---

## Security Features

### OTP Security
- ✅ OTP hashed with bcrypt (10 rounds)
- ✅ Stored in Redis with TTL (auto-expires in 5 min)
- ✅ Maximum 5 verification attempts
- ✅ Rate limiting (1 request per 5 min per phone)
- ✅ OTP deleted after successful verification
- ✅ Never stored in database

### JWT Security
- ✅ Access tokens: HS256, 15-minute expiry
- ✅ Refresh tokens: HS256, 7-day expiry
- ✅ Refresh tokens hashed (SHA256) in database
- ✅ Token rotation on refresh
- ✅ Revocation support (logout)

### Clerk Integration
- ✅ Session token verified via Clerk backend SDK
- ✅ Clerk tokens never used for route authorization
- ✅ Backend always issues own JWT tokens
- ✅ Rate limiting handled by Clerk

---

## Environment Variables

```env
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT
JWT_SECRET=your_secret_key
JWT_REFRESH_SECRET=your_refresh_secret

# Clerk
CLERK_SECRET_KEY=sk_test_...

# Database
SUPABASE_URL=https://...
SUPABASE_KEY=your_anon_key
```

---

## Setup Instructions

### 1. Install Dependencies
```bash
npm install ioredis
```

### 2. Start Redis
```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or install locally (Windows/Mac/Linux)
```

### 3. Run Database Migration
```sql
-- Run redis_auth_migration.sql in Supabase SQL Editor
```

### 4. Update Environment Variables
```bash
cp .env.example .env
# Edit .env with your values
```

### 5. Start Server
```bash
npm run dev
```

---

## Testing

### Test OTP Flow
```bash
# 1. Send OTP
POST /api/auth/send-otp
{ "phone": "+1234567890" }

# Check console for OTP code (mock SMS)

# 2. Verify OTP
POST /api/auth/verify-otp
{ "phone": "+1234567890", "otp": "123456" }
```

### Test Clerk Flow
```bash
# 1. Get session token from mobile app (Clerk)
# 2. Send to backend
POST /api/auth/clerk
{ "sessionToken": "sess_..." }
```

### Test Refresh
```bash
POST /api/auth/refresh
{ "refreshToken": "eyJhbGc..." }
```

---

## Error Handling

| Code | Message | Meaning |
|------|---------|---------|
| 400 | Invalid phone format | Use E.164 format (+1234567890) |
| 400 | Invalid OTP | Wrong code entered |
| 401 | Invalid session token | Clerk token verification failed |
| 401 | Token expired | Access token expired, use refresh |
| 429 | Rate limited | Too many requests, wait 5 min |
| 500 | Server error | Backend error, check logs |

---

## Production Checklist

- [ ] Set up Redis in production (AWS ElastiCache, Redis Cloud, etc.)
- [ ] Configure real SMS provider (Twilio, AWS SNS)
- [ ] Use strong JWT secrets (32+ characters, random)
- [ ] Enable HTTPS
- [ ] Set up Clerk production environment
- [ ] Configure CORS for your frontend domain
- [ ] Set up monitoring and alerting
- [ ] Enable rate limiting at API gateway level
- [ ] Set up Redis persistence/backups
- [ ] Configure environment-specific configs

---

## FAQ

**Q: Why use Redis for OTPs instead of database?**
A: Redis provides automatic TTL, faster reads/writes, and better performance for short-lived data.

**Q: Can a user have both phone and Clerk login?**
A: Yes! Account merging ensures the same user record is used.

**Q: What happens if Redis goes down?**
A: OTP login will fail. Phone users should retry. OAuth via Clerk continues to work.

**Q: How do I migrate existing users?**
A: Run the migration SQL. Existing users can link Clerk accounts on first OAuth login.

**Q: Can I disable OTP or Clerk?**
A: Yes. Simply don't expose the routes or remove from frontend.

---

## Support

For issues or questions:
1. Check error logs in console
2. Verify Redis is running
3. Verify Clerk configuration
4. Check database migration was applied
5. Ensure environment variables are set

---

**Last Updated:** January 8, 2026
