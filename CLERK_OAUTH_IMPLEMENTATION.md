# Clerk OAuth Implementation Guide

## Overview
This document describes the implementation of the `/api/auth/clerk` endpoint for validating Clerk OAuth login tokens and syncing users to the PostgreSQL database.

---

## 📋 Requirements Checklist

✅ **Token Verification**: Uses `verifyToken` from `@clerk/backend`  
✅ **Environment Variable**: Uses `process.env.CLERK_SECRET_KEY`  
✅ **Error Handling**: Returns 401 with specific error codes  
✅ **Database Sync**: Checks PostgreSQL `users` table by `clerk_user_id`  
✅ **User Creation**: Creates new user if not exists  
✅ **JWT Generation**: Issues backend `accessToken` and `refreshToken` using `JWT_SECRET`  
✅ **Response Format**: Returns tokens and user object (no Clerk token)  
✅ **Authorization Header**: Accepts `Bearer <clerk_token>` format  

---

## 🔧 Installation

### 1. Install Required Package

```bash
npm install @clerk/backend
```

### 2. Environment Variables

Add to your `.env` file:

```env
CLERK_SECRET_KEY=sk_test_xxxxx
JWT_SECRET=your_super_secret_key_change_this
JWT_REFRESH_SECRET=your_refresh_secret_key_change_this
```

### 3. Database Schema

Ensure your `users` table has the `clerk_user_id` column:

```sql
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS clerk_user_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS users_clerk_user_id_idx 
ON public.users(clerk_user_id) WHERE clerk_user_id IS NOT NULL;
```

---

## 🚀 API Endpoint

### **POST** `/api/auth/clerk`

Validates a Clerk OAuth session token and returns backend JWT tokens.

#### Request Headers
```http
Authorization: Bearer <clerk_session_token>
```

#### Success Response (200)
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "clerk_user_id": "user_2abc123xyz",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "https://img.clerk.com/...",
    "role": "user",
    "created_at": "2026-01-09T..."
  }
}
```

#### Error Responses

**400 - Missing Token**
```json
{
  "error": "Authorization header with Bearer token is required",
  "code": "MISSING_TOKEN"
}
```

**401 - Invalid Token**
```json
{
  "error": "Failed to verify with authentication provider",
  "code": "AUTH_PROVIDER_ERROR"
}
```

**500 - Server Error**
```json
{
  "error": "Internal server error",
  "code": "SERVER_ERROR"
}
```

---

## 🔄 Authentication Flow

```
1. Frontend obtains Clerk session token
   ↓
2. Send token to /api/auth/clerk via Authorization header
   ↓
3. Backend verifies token with Clerk using verifyToken()
   ↓
4. Backend fetches user details from Clerk
   ↓
5. Check if user exists in PostgreSQL by clerk_user_id
   ↓
6a. IF EXISTS: Use existing user
6b. IF NOT EXISTS: Create new user with Clerk data
   ↓
7. Generate backend JWT accessToken & refreshToken
   ↓
8. Return tokens + user object to frontend
   ↓
9. Frontend stores tokens and uses them for all API requests
```

---

## 📝 Implementation Details

### File: `src/services/clerkService.js`

```javascript
import { verifyToken } from '@clerk/backend';
import { createClerkClient } from '@clerk/clerk-sdk-node';

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

/**
 * Verify Clerk session token using @clerk/backend
 */
export const verifyClerkToken = async (sessionToken) => {
  if (!CLERK_SECRET_KEY) {
    throw new Error('Clerk is not configured');
  }

  const session = await verifyToken(sessionToken, {
    secretKey: CLERK_SECRET_KEY
  });
  
  return session; // Contains { sub: userId, ... }
};

/**
 * Get user data from Clerk
 */
export const getClerkUser = async (userId) => {
  const clerkClient = createClerkClient({ 
    secretKey: CLERK_SECRET_KEY 
  });
  
  const user = await clerkClient.users.getUser(userId);
  return user;
};

/**
 * Extract user information
 */
export const extractClerkUserData = (clerkUser) => {
  const primaryEmail = clerkUser.emailAddresses?.find(
    email => email.id === clerkUser.primaryEmailAddressId
  );
  
  return {
    clerk_user_id: clerkUser.id,
    email: primaryEmail?.emailAddress || null,
    name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || null,
    avatar_url: clerkUser.imageUrl || null
  };
};
```

### File: `src/controllers/authController.js`

```javascript
export const clerkAuth = async (req, res) => {
  try {
    // 1. Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({ 
        error: 'Authorization header with Bearer token is required',
        code: 'MISSING_TOKEN'
      });
    }
    
    const sessionToken = authHeader.split(' ')[1];

    // 2. Verify token with Clerk
    let session, clerkUser, userData;
    
    try {
      session = await clerkService.verifyClerkToken(sessionToken);
      
      if (!session || !session.sub) {
        return res.status(401).json({ 
          error: 'Failed to verify with authentication provider',
          code: 'AUTH_PROVIDER_ERROR'
        });
      }

      clerkUser = await clerkService.getClerkUser(session.sub);
      userData = clerkService.extractClerkUserData(clerkUser);
    } catch (clerkError) {
      return res.status(401).json({ 
        error: 'Failed to verify with authentication provider',
        code: 'AUTH_PROVIDER_ERROR'
      });
    }

    // 3. Check if user exists by clerk_user_id
    let user = null;
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_user_id', userData.clerk_user_id)
      .single();

    if (existingUser) {
      user = existingUser;
    } else {
      // 4. Create new user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{
          clerk_user_id: userData.clerk_user_id,
          email: userData.email,
          name: userData.name,
          avatar: userData.avatar_url,
          role: 'user',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (createError) {
        return res.status(500).json({ 
          error: 'Failed to create user',
          code: 'DATABASE_ERROR'
        });
      }
      
      user = newUser;
    }

    // 5. Generate backend JWT tokens (using JWT_SECRET)
    const tokens = await jwtService.generateTokenPair(user);

    // 6. Return response (no Clerk token)
    res.status(200).json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: user
    });

  } catch (error) {
    console.error('Clerk Auth Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
};
```

### File: `src/services/jwtService.js`

```javascript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

/**
 * Generate both access and refresh tokens
 */
export const generateTokenPair = async (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    phone: user.phone,
    role: user.role
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: '15m'
  });

  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: '7d'
  });

  // Store refresh token hash in database
  await storeRefreshToken(user.id, refreshToken);

  return { accessToken, refreshToken };
};
```

---

## 🧪 Testing

### Using cURL

```bash
# 1. Get Clerk session token from your frontend
# 2. Test the endpoint

curl -X POST http://localhost:5000/api/auth/clerk \
  -H "Authorization: Bearer sess_2abc123xyz..." \
  -H "Content-Type: application/json"
```

### Expected Response

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNjczMDAwMDAwLCJleHAiOjE2NzMwMDA5MDB9.xxxxx",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "clerk_user_id": "user_2abc123xyz",
    "email": "test@example.com",
    "name": "Test User",
    "avatar": "https://img.clerk.com/...",
    "role": "user",
    "created_at": "2026-01-09T10:30:00.000Z"
  }
}
```

### Test Invalid Token

```bash
curl -X POST http://localhost:5000/api/auth/clerk \
  -H "Authorization: Bearer invalid_token"
```

Response:
```json
{
  "error": "Failed to verify with authentication provider",
  "code": "AUTH_PROVIDER_ERROR"
}
```

---

## 📱 Frontend Integration

### React Native / Expo with Clerk

```typescript
import { useAuth } from '@clerk/clerk-expo';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export const authenticateWithBackend = async () => {
  const { getToken } = useAuth();
  
  // Get Clerk session token
  const clerkToken = await getToken();
  
  // Send to backend
  const response = await axios.post(`${API_URL}/auth/clerk`, null, {
    headers: {
      'Authorization': `Bearer ${clerkToken}`
    }
  });
  
  const { accessToken, refreshToken, user } = response.data;
  
  // Store backend tokens (not Clerk token)
  await SecureStore.setItemAsync('accessToken', accessToken);
  await SecureStore.setItemAsync('refreshToken', refreshToken);
  
  return { accessToken, refreshToken, user };
};

// Use backend token for API calls
export const fetchUserData = async () => {
  const token = await SecureStore.getItemAsync('accessToken');
  
  return axios.get(`${API_URL}/users/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
};
```

### React.js Web with Clerk

```javascript
import { useAuth } from '@clerk/clerk-react';

const { getToken } = useAuth();

const handleLogin = async () => {
  const clerkToken = await getToken();
  
  const response = await fetch('http://localhost:5000/api/auth/clerk', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${clerkToken}`
    }
  });
  
  const { accessToken, refreshToken, user } = await response.json();
  
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
};
```

---

## 🔒 Security Notes

1. **Never return Clerk tokens to frontend** ✅ Implementation returns only backend JWT
2. **Always verify tokens on backend** ✅ Uses `verifyToken()` from `@clerk/backend`
3. **Use HTTPS in production** ⚠️ Configure reverse proxy (nginx/caddy)
4. **Rotate JWT secrets regularly** ⚠️ Update `JWT_SECRET` periodically
5. **Store refresh tokens securely** ✅ Hashed in database
6. **Validate all inputs** ✅ Checks Authorization header format

---

## 🐛 Troubleshooting

### Error: "Clerk is not configured"
**Solution**: Set `CLERK_SECRET_KEY` in `.env` file

### Error: "Failed to verify with authentication provider"
**Causes**:
- Invalid/expired Clerk token
- Wrong `CLERK_SECRET_KEY`
- Network issue reaching Clerk API

**Solution**: 
- Check Clerk Dashboard for correct secret key
- Ensure token is recent (not expired)
- Verify network connectivity

### Error: "Failed to create user"
**Causes**:
- Missing database columns
- Unique constraint violation
- Database connection issue

**Solution**:
- Run migration SQL to add `clerk_user_id` column
- Check database logs
- Verify Supabase connection

---

## ✅ Production Checklist

- [ ] Install `@clerk/backend` package
- [ ] Set `CLERK_SECRET_KEY` in production environment
- [ ] Set strong `JWT_SECRET` and `JWT_REFRESH_SECRET`
- [ ] Run database migration for `clerk_user_id` column
- [ ] Test endpoint with real Clerk token
- [ ] Configure HTTPS/SSL
- [ ] Set up monitoring and logging
- [ ] Implement rate limiting
- [ ] Test error scenarios

---

## 📚 References

- [Clerk Backend SDK](https://clerk.com/docs/references/backend/overview)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [PostgreSQL Supabase Docs](https://supabase.com/docs/guides/database)

---

**Status**: ✅ Implementation Complete  
**Last Updated**: January 9, 2026
