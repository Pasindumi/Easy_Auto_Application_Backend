# Redis Setup Guide

## ❌ Redis Connection Error Fix

If you're seeing the error: **"Redis connection error: connect ECONNREFUSED"**, it means Redis is not running on your machine.

---

## ✅ Quick Fix (3 Options)

### Option 1: Docker (Easiest - Recommended)

```bash
# Start Redis using Docker
docker run -d -p 6379:6379 --name redis redis:alpine

# Verify it's running
docker ps

# Stop Redis
docker stop redis

# Start Redis again later
docker start redis
```

**Advantages:** 
- Fast and easy
- No installation needed
- Works on Windows/Mac/Linux

---

### Option 2: Windows Installation

#### Using WSL2 (Recommended)
```bash
# In WSL2 terminal
sudo apt update
sudo apt install redis-server
sudo service redis-server start

# Verify
redis-cli ping
# Should return: PONG
```

#### Using Windows Binary
1. Download from: https://github.com/microsoftarchive/redis/releases
2. Extract to `C:\Redis`
3. Run `redis-server.exe`
4. Keep the terminal open

---

### Option 3: Mac Installation

```bash
# Using Homebrew
brew install redis

# Start Redis
brew services start redis

# Verify
redis-cli ping
# Should return: PONG
```

---

## 🧪 Test Redis Connection

```bash
# Test if Redis is running
redis-cli ping

# Should return: PONG
```

Or test from Node.js:
```javascript
const Redis = require('ioredis');
const redis = new Redis();

redis.ping().then(() => {
  console.log('✅ Redis connected!');
}).catch((error) => {
  console.error('❌ Redis not running:', error.message);
});
```

---

## 🔧 Alternative: Use Cloud Redis (Production)

### AWS ElastiCache
1. Create ElastiCache cluster
2. Get endpoint URL
3. Update `.env`:
```env
REDIS_HOST=your-cluster.cache.amazonaws.com
REDIS_PORT=6379
```

### Redis Cloud (Free Tier)
1. Sign up at: https://redis.com/try-free/
2. Create database
3. Get connection details
4. Update `.env`:
```env
REDIS_HOST=redis-12345.c123.us-east-1.redis.cloud.com
REDIS_PORT=12345
REDIS_PASSWORD=your_password
```

---

## ⚙️ Environment Configuration

Update your `.env` file:

```env
# Local Development
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Production (example)
# REDIS_HOST=your-redis-host.com
# REDIS_PORT=6379
# REDIS_PASSWORD=your_secure_password
# REDIS_DB=0
```

---

## 🚀 Start Your Backend

After starting Redis:

```bash
# Start backend
npm run dev

# You should see:
# ✅ Redis connected successfully
# ✅ Redis ready to accept commands
```

---

## 🔍 Troubleshooting

### Error: "connect ECONNREFUSED 127.0.0.1:6379"
**Cause:** Redis is not running  
**Fix:** Start Redis using one of the methods above

### Error: "Redis connection timeout"
**Cause:** Wrong host/port or firewall blocking  
**Fix:** 
- Check `REDIS_HOST` and `REDIS_PORT` in `.env`
- Check firewall settings
- Verify Redis is listening: `netstat -an | grep 6379`

### Error: "NOAUTH Authentication required"
**Cause:** Redis requires password  
**Fix:** Add `REDIS_PASSWORD` to `.env`

### Redis works but OTP doesn't send
**Cause:** Redis is working, but mock SMS isn't configured  
**Fix:** This is normal! Check console logs for OTP code:
```
📱 MOCK SMS SENDER
To: +1234567890
Message: Your verification code is: 123456
```

---

## 🎯 What Happens Without Redis?

If Redis is not running, your backend will:

✅ **Still start** (won't crash)  
✅ **Clerk OAuth login works** (doesn't need Redis)  
✅ **Email/password login works** (doesn't need Redis)  
❌ **OTP authentication disabled** (requires Redis)

**Error message shown:**
```json
{
  "error": "OTP service temporarily unavailable",
  "code": "SERVICE_UNAVAILABLE"
}
```

---

## 📊 Verify Redis is Working

### 1. Start Redis
```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

### 2. Test OTP Flow
```bash
# Send OTP
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890"}'

# Should return:
# {
#   "message": "OTP sent successfully",
#   "expiresIn": 300,
#   "phone": "+1234567890"
# }
```

### 3. Check Redis Data
```bash
# Connect to Redis CLI
docker exec -it redis redis-cli

# List all keys
KEYS *

# Should show:
# 1) "otp:+1234567890"
# 2) "otp_rate:+1234567890"

# Get OTP data
GET otp:+1234567890

# Check TTL
TTL otp:+1234567890
# Should show remaining seconds (e.g., 298)
```

---

## 🏃 Quick Start Recap

```bash
# 1. Start Redis
docker run -d -p 6379:6379 --name redis redis:alpine

# 2. Verify Redis
docker ps

# 3. Start backend
npm run dev

# 4. Test OTP endpoint
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890"}'

# 5. Check console for OTP code
# 6. Verify OTP
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890", "otp": "123456"}'
```

---

## 💡 Pro Tips

### Keep Redis Running
```bash
# Docker - Redis starts automatically on system boot
docker update --restart unless-stopped redis
```

### Monitor Redis
```bash
# Check Redis stats
docker exec -it redis redis-cli INFO

# Monitor commands in real-time
docker exec -it redis redis-cli MONITOR
```

### Backup Redis Data
```bash
# Save Redis snapshot
docker exec -it redis redis-cli SAVE

# Copy backup file
docker cp redis:/data/dump.rdb ./redis-backup.rdb
```

---

## 📞 Still Having Issues?

1. ✅ **Verify Redis is installed:** `docker --version` or `redis-cli --version`
2. ✅ **Check if Redis is running:** `docker ps` or `redis-cli ping`
3. ✅ **Check backend logs:** Look for "Redis connected successfully"
4. ✅ **Test connection:** Use redis-cli or Node.js script above
5. ✅ **Check firewall:** Ensure port 6379 is not blocked

**Need more help?** Check the main documentation:
- [CLERK_OTP_INTEGRATION.md](CLERK_OTP_INTEGRATION.md)
- [QUICK_START.md](QUICK_START.md)

---

**Summary:** Install Docker, run one command, and you're done! 🎉
