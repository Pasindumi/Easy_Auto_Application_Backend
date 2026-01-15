# 🔐 Clerk OAuth Endpoint - Quick Start

## ✅ Implementation Complete

The `/api/auth/clerk` endpoint is fully implemented and ready to use.

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Install Package
```bash
npm install @clerk/backend
```

### Step 2: Configure Environment
Add to your `.env` file:
```env
CLERK_SECRET_KEY=sk_test_your_key_here
JWT_SECRET=your_super_secret_key_change_this
JWT_REFRESH_SECRET=your_refresh_secret_key_change_this
```

### Step 3: Database Migration
Run in Supabase SQL Editor:
```sql
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS clerk_user_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS users_clerk_user_id_idx 
ON public.users(clerk_user_id) WHERE clerk_user_id IS NOT NULL;
```

---

## 📡 API Endpoint

### **POST** `/api/auth/clerk`

**Request:**
```http
POST /api/auth/clerk
Authorization: Bearer sess_2abc123xyz...
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "clerk_user_id": "user_2abc...",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "https://img.clerk.com/...",
    "role": "user"
  }
}
```

**Error (401):**
```json
{
  "error": "Failed to verify with authentication provider",
  "code": "AUTH_PROVIDER_ERROR"
}
```

---

## 🧪 Testing

### Verify Setup
```bash
# Windows PowerShell
.\scripts\verify-setup.ps1

# Linux/Mac
bash scripts/verify-setup.sh
```

### Test with Real Token
```bash
# Get Clerk session token from your frontend first
node scripts/test-clerk-auth.js sess_2abc123xyz...
```

### Test with cURL
```bash
curl -X POST http://localhost:5000/api/auth/clerk \
  -H "Authorization: Bearer sess_2abc123xyz..."
```

---

## 📱 Frontend Integration

### React Native / Expo
```typescript
import { useAuth } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';

const { getToken } = useAuth();

// Get Clerk token and exchange for backend tokens
const clerkToken = await getToken();

const response = await fetch('http://localhost:5000/api/auth/clerk', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${clerkToken}`
  }
});

const { accessToken, refreshToken, user } = await response.json();

// Store backend tokens
await SecureStore.setItemAsync('accessToken', accessToken);
await SecureStore.setItemAsync('refreshToken', refreshToken);
```

### Use Backend Token
```typescript
// Use accessToken for all API calls
const token = await SecureStore.getItemAsync('accessToken');

const carsResponse = await fetch('http://localhost:5000/api/cars', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

---

## 📋 Implementation Details

### What Happens?

1. Frontend sends Clerk session token via `Authorization: Bearer` header
2. Backend verifies token with Clerk using `verifyToken()` from `@clerk/backend`
3. Backend fetches user details from Clerk API
4. Backend checks if user exists in PostgreSQL by `clerk_user_id`
5. If not exists → creates new user with Clerk data
6. Backend generates JWT `accessToken` (15min) and `refreshToken` (7d) using `JWT_SECRET`
7. Backend returns tokens + user object (NOT Clerk token)
8. Frontend stores backend tokens and uses them for all API requests

### Key Features

✅ Uses `verifyToken` from `@clerk/backend` (not SDK)  
✅ Validates with `process.env.CLERK_SECRET_KEY`  
✅ Returns 401 with error code on invalid token  
✅ Checks PostgreSQL by `clerk_user_id` only  
✅ Creates user if not exists (no email/phone merging)  
✅ Generates JWT with `JWT_SECRET`  
✅ Returns `accessToken`, `refreshToken`, `user`  
✅ Never returns Clerk token to frontend  

---

## 🔒 Security

- ✅ Token verified with Clerk backend (server-side)
- ✅ Uses environment variable for secrets
- ✅ JWT signed with `JWT_SECRET`
- ✅ Refresh tokens stored as hashes
- ✅ Access tokens expire in 15 minutes
- ✅ Clerk token never exposed to frontend

---

## 📚 Documentation Files

1. **[IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md)** - Full implementation summary
2. **[CLERK_OAUTH_IMPLEMENTATION.md](CLERK_OAUTH_IMPLEMENTATION.md)** - Detailed guide
3. **[scripts/test-clerk-auth.js](scripts/test-clerk-auth.js)** - Test script
4. **[scripts/verify-setup.ps1](scripts/verify-setup.ps1)** - Windows setup checker

---

## 🐛 Troubleshooting

### "Failed to verify with authentication provider"
- Check `CLERK_SECRET_KEY` is correct in `.env`
- Ensure token is valid and not expired
- Token should start with `sess_`
- Verify Clerk instance matches

### "Authorization header with Bearer token is required"
- Include header: `Authorization: Bearer <token>`
- Token must be after "Bearer " with a space

### "Failed to create user"
- Run database migration to add `clerk_user_id` column
- Check Supabase connection
- Verify database permissions

---

## ✅ Checklist

- [ ] Install `@clerk/backend` package
- [ ] Set `CLERK_SECRET_KEY` in `.env`
- [ ] Set `JWT_SECRET` in `.env`
- [ ] Run database migration
- [ ] Run setup verification script
- [ ] Start server: `npm start`
- [ ] Test with real Clerk token
- [ ] Integrate with frontend

---

## 📞 Support

- [Clerk Backend SDK Docs](https://clerk.com/docs/references/backend/overview)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Supabase Documentation](https://supabase.com/docs)

---

**Status**: ✅ **READY TO USE**  
**Endpoint**: `POST /api/auth/clerk`  
**Last Updated**: January 9, 2026
