# Clerk OAuth Debug Guide

## 🔧 Implementation Status

✅ **COMPLETE** - Enhanced with comprehensive debug logging

---

## 📋 Quick Checklist

Before testing, ensure:

1. ✅ Server is running: `npm start`
2. ✅ `CLERK_SECRET_KEY` is set in `.env`
3. ✅ Database migration applied: `clerk_user_migration.sql`
4. ✅ Clerk token obtained from Expo app

---

## 🧪 Testing the Endpoint

### Step 1: Get Clerk Token from Expo

**In your Expo app (works for both Web and Native):**

```typescript
import { useAuth } from "@clerk/clerk-expo";

const { getToken } = useAuth();

// Get token (works on Expo Web, Dev Client, and Production)
const token = await getToken();
console.log("Clerk Token:", token);
```

### Step 2: Test with Script

```bash
node scripts/test-clerk-auth.js sess_2abc123xyz...
```

### Step 3: Or Test with cURL

```bash
curl -X POST http://localhost:5000/api/auth/clerk \
  -H "Authorization: Bearer sess_2abc123xyz..." \
  -v
```

---

## 🐛 Debug Logs Explained

When you make a request, the server logs will show:

```
=== Clerk OAuth Request ===
Received Authorization: Bearer sess_2abc123xyz...
CLERK_SECRET_KEY exists: true
🔍 Verifying token with Clerk...
🔐 Verifying Clerk token...
Token length: 450
Secret key length: 48
✅ Token verified successfully
Payload keys: [ 'sub', 'email', 'first_name', ... ]
✅ Token verified successfully
Clerk User ID: user_2abc123
📋 Extracted data: { clerkUserId: 'user_2abc...', email: 'user@example.com', ... }
🔍 Looking up user by clerk_user_id...
✅ Found existing user by clerk_user_id: uuid-here
🔑 Generating JWT tokens...
✅ JWT tokens generated successfully
=== Clerk OAuth Success ===
```

---

## ❌ Common Errors & Solutions

### Error: "Failed to verify with authentication provider" (401)

**Check these in order:**

1. **Is CLERK_SECRET_KEY set correctly?**
   ```bash
   # In .env file
   CLERK_SECRET_KEY=sk_test_your_actual_key_here
   ```
   
   Look for log: `CLERK_SECRET_KEY exists: false` → means not set

2. **Is token expired?**
   - Clerk tokens expire after some time
   - Generate fresh token from app
   - Look for log: `Error message: expired`

3. **Wrong Clerk instance?**
   - Development vs Production keys
   - Make sure frontend and backend use same Clerk project
   - Check Clerk Dashboard → API Keys

4. **Token format wrong?**
   - Should start with `sess_` for session tokens
   - Look for log: `Token length: 0` → means token not extracted

**Debug logs to check:**
```
❌ Clerk token verification error:
Error name: JWSInvalid
Error message: signature verification failed
```
→ Means CLERK_SECRET_KEY doesn't match

```
❌ Clerk token verification error:
Error message: Token has expired
```
→ Generate fresh token

### Error: "Authorization header with Bearer token is required" (400)

**Solution:**
- Include header: `Authorization: Bearer <token>`
- Check for typos in "Authorization" or "Bearer"
- Ensure space between "Bearer" and token

**Debug log:**
```
❌ No token found in Authorization header
```

### Error: "Failed to create user" or "Failed to update user" (500)

**Solution:**
1. Run database migration:
   ```sql
   -- In Supabase SQL Editor
   ALTER TABLE public.users 
   ADD COLUMN IF NOT EXISTS clerk_user_id TEXT UNIQUE;
   ```

2. Check database connection
3. Verify Supabase credentials in `.env`

**Debug logs:**
```
❌ User creation error: { message: 'column "clerk_user_id" does not exist' }
```
→ Run migration

---

## 📊 Expected Flow

### First-time User (OAuth)

```
1. Frontend: getToken() → sess_2abc...
2. Frontend: POST /api/auth/clerk with Bearer token
3. Backend: Verify with Clerk ✅
4. Backend: Extract user data from token
5. Backend: No user found in DB
6. Backend: Create new user with clerk_user_id
7. Backend: Generate JWT tokens
8. Backend: Return accessToken + refreshToken + user
9. Frontend: Store tokens, user logged in ✅
```

### Existing User (Merge by email)

```
1. User exists in DB (from OTP auth)
2. User signs in with OAuth
3. Backend: Verify token ✅
4. Backend: No clerk_user_id match
5. Backend: Found match by email ✅
6. Backend: Update user with clerk_user_id
7. Backend: Generate JWT tokens
8. Backend: Return tokens
9. Account merged ✅
```

### Returning OAuth User

```
1. User exists with clerk_user_id
2. Backend: Verify token ✅
3. Backend: Found by clerk_user_id ✅
4. Backend: Generate JWT tokens
5. Backend: Return tokens
6. User logged in ✅
```

---

## 🔍 Verifying Success

After successful auth, you should receive:

```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "phone": "+1234567890",
    "name": "John Doe",
    "avatar": "https://img.clerk.com/...",
    "clerk_user_id": "user_2abc123",
    "role": "buyer"
  }
}
```

**Verify in database:**
```sql
SELECT id, email, clerk_user_id, role, created_at 
FROM users 
WHERE clerk_user_id IS NOT NULL;
```

---

## 🧪 Testing Different Scenarios

### Test 1: New OAuth User
```bash
# First time sign-in with Google/Apple
node scripts/test-clerk-auth.js <fresh_token>
# Expected: New user created
```

### Test 2: Merge with Existing Email
```bash
# 1. Create user via OTP with email test@example.com
# 2. Sign in with OAuth using same email
node scripts/test-clerk-auth.js <token_with_same_email>
# Expected: User updated with clerk_user_id
```

### Test 3: Returning User
```bash
# User already has clerk_user_id
node scripts/test-clerk-auth.js <token>
# Expected: User found immediately, no DB writes
```

### Test 4: Use Backend Tokens
```bash
# Use accessToken from response
curl http://localhost:5000/api/cars \
  -H "Authorization: Bearer <accessToken>"
# Expected: Protected route works ✅
```

---

## 📱 Expo-Specific Notes

### Works on All Platforms

✅ Expo Web (browser)
✅ Expo Dev Client (iOS/Android simulator/device)
✅ Production builds (standalone apps)

### Getting Token in Expo

**Same code works everywhere:**
```typescript
const { getToken } = useAuth();
const token = await getToken();
```

**Clerk automatically handles:**
- Web session cookies → JWT token
- Native secure storage → JWT token
- Token refresh
- Expiry

### Common Expo Issues

**Issue: Token is null**
```typescript
const token = await getToken();
if (!token) {
  console.log("User not signed in");
}
```
→ User must be signed in first with Clerk

**Issue: Token format different**
- All tokens should start with `sess_`
- If not, check Clerk configuration
- Ensure using session tokens, not client tokens

---

## 🔑 Environment Variables

Required in `.env`:

```env
# Clerk
CLERK_SECRET_KEY=sk_test_xxxxx

# JWT
JWT_SECRET=your_super_secret_key_change_this
JWT_REFRESH_SECRET=your_refresh_secret_key_change_this

# Database
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=xxx
```

---

## 📞 Still Having Issues?

1. **Check server logs** - Look for detailed error messages
2. **Verify Clerk Dashboard** - API keys, instance settings
3. **Test with fresh token** - Generate new token from app
4. **Check database** - Ensure migration applied
5. **Review debug logs** - Full flow logged with emojis

---

**Last Updated:** January 9, 2026
**Status:** ✅ Production Ready with Debug Logging
