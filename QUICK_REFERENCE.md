# 🚀 Quick Reference - Authentication API

## 📞 Endpoints

### 1️⃣ Send OTP
```http
POST /api/auth/send-otp
Content-Type: application/json

{
  "phone": "+1234567890"
}
```
**Response:** `{ "message": "OTP sent", "expiresIn": 600 }`

---

### 2️⃣ Verify OTP
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "phone": "+1234567890",
  "otp": "123456"
}
```
**Response:** 
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": { "id": "...", "name": "...", ... }
}
```

---

### 3️⃣ Clerk Social Auth
```http
POST /api/auth/clerk
Content-Type: application/json

{
  "sessionToken": "clerk_session_token"
}
```

---

### 4️⃣ Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

---

### 5️⃣ Protected Route Example
```http
POST /api/cars
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "title": "Car Title",
  "price": 10000,
  ...
}
```

---

## 🔑 Token Flow

1. **Login** → Get `accessToken` + `refreshToken`
2. **API Calls** → Use `accessToken` in `Authorization: Bearer {token}`
3. **Token Expires** (15 min) → Call `/api/auth/refresh` with `refreshToken`
4. **Get New** `accessToken` → Continue using API
5. **Logout** → Call `/api/auth/logout` to revoke tokens

---

## 🛡️ Route Protection

| Route | Access |
|-------|--------|
| `GET /api/cars` | Public ✅ |
| `GET /api/cars/:id` | Public ✅ |
| `POST /api/cars` | Protected 🔒 |
| `PUT /api/cars/:id` | Protected 🔒 |
| `DELETE /api/cars/:id` | Protected 🔒 |

---

## 🧪 Quick Test

```bash
# 1. Send OTP
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890"}'

# 2. Check server console for OTP

# 3. Verify OTP
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890", "otp": "PASTE_OTP_HERE"}'

# 4. Save accessToken from response

# 5. Call protected endpoint
curl -X POST http://localhost:5000/api/cars \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "price": 10000, ...}'
```

---

## 📋 Setup Steps

1. **Install**: `npm install` ✅ (Done)
2. **Database**: Run `auth_migration.sql` in Supabase ⚠️ (Required)
3. **Config**: Set `JWT_SECRET` in `.env` ⚠️ (Required)
4. **Test**: `node scripts/test-auth.js` ✅
5. **Use**: Start calling endpoints! 🚀

---

## 🔧 Environment Variables

```env
JWT_SECRET=your_secret_key
JWT_REFRESH_SECRET=your_refresh_key
CLERK_SECRET_KEY=optional_clerk_key
```

---

## ⚠️ Important Notes

- **OTP in Dev**: Check server console (not SMS)
- **Token Lifetime**: Access = 15 min, Refresh = 7 days
- **Phone Format**: Must be E.164 format (+1234567890)
- **Clerk**: Optional - only if using social auth

---

## 📚 Full Docs

- `AUTH_README.md` - Getting started
- `AUTH_IMPLEMENTATION.md` - Complete guide
- `IMPLEMENTATION_SUMMARY.md` - What was built

---

**✨ Ready to authenticate!**
