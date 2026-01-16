# Clerk OAuth Testing Guide

## ✅ Implementation Status: COMPLETE

The Clerk OAuth integration is **fully implemented** with automatic user syncing and account merging.

---

## 📋 What's Already Implemented

✅ **POST /api/auth/clerk** endpoint  
✅ Clerk session token verification  
✅ User extraction from Clerk  
✅ Automatic user creation in PostgreSQL  
✅ Account merging by email/phone  
✅ Backend JWT token issuance  
✅ clerk_user_id stored in users table  

---

## 🧪 How to Test

### Step 1: Set Up Clerk Secret Key

Ensure your `.env` file has:
```env
CLERK_SECRET_KEY=sk_test_your_actual_clerk_secret_key
```

Get this from: https://dashboard.clerk.com → API Keys → Secret Keys

### Step 2: Get Session Token from Clerk

From your mobile app or frontend:

```javascript
// React Native / Expo
import { useAuth } from '@clerk/clerk-expo';

const { getToken } = useAuth();
const sessionToken = await getToken();
```

```javascript
// React Web
import { useAuth } from '@clerk/clerk-react';

const { getToken } = useAuth();
const sessionToken = await getToken();
```

### Step 3: Call Backend Endpoint

```bash
curl -X POST http://localhost:5000/api/auth/clerk \
  -H "Content-Type: application/json" \
  -d '{
    "sessionToken": "YOUR_CLERK_SESSION_TOKEN_HERE"
  }'
```

**Or using your ngrok URL:**
```bash
curl -X POST https://your-ngrok-url.ngrok.io/api/auth/clerk \
  -H "Content-Type: application/json" \
  -d '{
    "sessionToken": "YOUR_CLERK_SESSION_TOKEN_HERE"
  }'
```

### Step 4: Expected Response

**Success (200 OK):**
```json
{
  "message": "Authentication successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "name": "John Doe",
    "email": "john@gmail.com",
    "phone": "+1234567890",
    "avatar": "https://img.clerk.com/...",
    "role": "user",
    "is_premium": false,
    "clerk_user_id": "user_abc123xyz"
  }
}
```

**Error (401):**
```json
{
  "error": "Invalid session token",
  "code": "INVALID_TOKEN"
}
```

---

## 🔄 Account Merging Flow

### Scenario 1: New User (First Time Login)
```
1. User logs in with Google via Clerk
2. Backend receives session token
3. Backend verifies with Clerk → Gets email: john@gmail.com
4. Backend checks: No user with this clerk_user_id
5. Backend checks: No user with this email
6. Backend creates NEW user record
7. Backend issues JWT tokens
```

### Scenario 2: Existing OTP User Logs in with Google
```
1. User previously logged in via OTP with phone: +1234567890
2. User now logs in with Google (email: john@gmail.com, same phone)
3. Backend receives session token
4. Backend verifies with Clerk
5. Backend checks: No user with this clerk_user_id
6. Backend checks: Found user with matching phone!
7. Backend MERGES: Links clerk_user_id to existing user
8. Backend issues JWT tokens
```

### Scenario 3: Returning OAuth User
```
1. User previously logged in with Google
2. User logs in again with Google
3. Backend receives session token
4. Backend verifies with Clerk
5. Backend checks: Found user with this clerk_user_id
6. Backend updates last_login timestamp
7. Backend issues JWT tokens
```

---

## 🗄️ Database Schema

Make sure you've run the migration:

```sql
-- File: redis_auth_migration.sql
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS clerk_user_id TEXT UNIQUE;
```

To verify:
```sql
-- Check if column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'clerk_user_id';
```

---

## 🔍 Debugging

### Check if user was created:
```sql
SELECT id, email, phone, clerk_user_id, auth_provider, created_at
FROM users
WHERE clerk_user_id IS NOT NULL;
```

### Check backend logs:
```bash
# Your server should show:
✅ Clerk session verified
✅ User created in database
✅ JWT tokens issued
```

### Common Issues:

**1. "Invalid session token"**
- Session token expired (15 min default)
- Wrong CLERK_SECRET_KEY in .env
- Using development key in production

**2. "Failed to verify with authentication provider"**
- Clerk API is down
- Network issue
- Rate limited

**3. User not created in database**
- Database connection issue
- Missing clerk_user_id column
- RLS policy blocking insert

---

## 🔐 Security Notes

1. ✅ Session token is verified with Clerk backend SDK
2. ✅ Clerk tokens are NOT used for route authorization
3. ✅ Backend always issues own JWT tokens
4. ✅ clerk_user_id is unique (prevents duplicates)
5. ✅ Account merging prevents multiple records

---

## 📱 Mobile App Integration

### React Native / Expo Example:

```typescript
import { useAuth } from '@clerk/clerk-expo';
import axios from 'axios';

const API_URL = 'https://your-ngrok-url.ngrok.io/api';

export const loginWithClerk = async () => {
  const { getToken } = useAuth();
  
  try {
    // Get Clerk session token
    const sessionToken = await getToken();
    
    // Send to backend
    const response = await axios.post(`${API_URL}/auth/clerk`, {
      sessionToken
    });
    
    const { accessToken, refreshToken, user } = response.data;
    
    // Store tokens
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
    
    // Use accessToken for all future API requests
    return { user, accessToken };
    
  } catch (error) {
    console.error('Login failed:', error.response?.data);
    throw error;
  }
};

// Use backend token for API calls
export const fetchUserCars = async () => {
  const accessToken = await SecureStore.getItemAsync('accessToken');
  
  const response = await axios.get(`${API_URL}/cars`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  
  return response.data;
};
```

---

## ✅ Verification Checklist

- [ ] Clerk secret key configured in .env
- [ ] Database migration applied (clerk_user_id column exists)
- [ ] Server running without errors
- [ ] POST /api/auth/clerk endpoint accessible
- [ ] Session token obtained from Clerk
- [ ] Backend responds with accessToken + refreshToken
- [ ] User record created in PostgreSQL users table
- [ ] clerk_user_id populated in database
- [ ] Backend JWT tokens work for protected routes

---

## 🎯 Quick Test Flow

1. **Start backend:**
   ```bash
   npm start
   # Should see: Server running on port 5000
   ```

2. **Expose with ngrok (for mobile testing):**
   ```bash
   npx ngrok http 5000
   # Copy the https URL
   ```

3. **Login via Clerk in mobile app**

4. **Get session token:**
   ```javascript
   const token = await getToken();
   console.log('Session token:', token);
   ```

5. **Call backend:**
   ```bash
   curl -X POST https://your-url.ngrok.io/api/auth/clerk \
     -H "Content-Type: application/json" \
     -d '{"sessionToken": "PASTE_TOKEN_HERE"}'
   ```

6. **Verify in database:**
   ```sql
   SELECT * FROM users ORDER BY created_at DESC LIMIT 1;
   ```

7. **Use backend token:**
   ```bash
   curl http://localhost:5000/api/auth/me \
     -H "Authorization: Bearer YOUR_BACKEND_ACCESS_TOKEN"
   ```

---

## 📞 Support

Everything is already implemented! If you're getting errors:

1. Check CLERK_SECRET_KEY is correct
2. Verify database migration ran successfully
3. Ensure session token is fresh (< 15 min old)
4. Check server logs for detailed errors

The endpoint is live at: **POST /api/auth/clerk**

Just send the Clerk session token and the backend will:
✅ Verify it
✅ Create/merge user
✅ Return backend JWT tokens

Happy testing! 🚀
