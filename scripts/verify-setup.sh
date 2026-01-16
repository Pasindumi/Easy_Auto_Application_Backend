#!/bin/bash

# Quick Setup Script for Clerk OAuth Implementation
# Run this script to verify your setup

echo "🔍 Checking Clerk OAuth Implementation Setup"
echo "=============================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
  echo "❌ .env file not found"
  echo "   Create .env file with:"
  echo "   CLERK_SECRET_KEY=sk_test_xxxxx"
  echo "   JWT_SECRET=your_secret_key"
  echo "   JWT_REFRESH_SECRET=your_refresh_secret"
  exit 1
else
  echo "✅ .env file exists"
fi

# Check for CLERK_SECRET_KEY
if grep -q "CLERK_SECRET_KEY=" .env; then
  echo "✅ CLERK_SECRET_KEY configured"
else
  echo "❌ CLERK_SECRET_KEY not found in .env"
  exit 1
fi

# Check for JWT_SECRET
if grep -q "JWT_SECRET=" .env; then
  echo "✅ JWT_SECRET configured"
else
  echo "❌ JWT_SECRET not found in .env"
  exit 1
fi

# Check if @clerk/backend is installed
if [ -d "node_modules/@clerk/backend" ]; then
  echo "✅ @clerk/backend package installed"
else
  echo "⚠️  @clerk/backend not installed"
  echo "   Run: npm install @clerk/backend"
  exit 1
fi

# Check if files exist
echo ""
echo "📁 Checking implementation files:"
if [ -f "src/services/clerkService.js" ]; then
  echo "✅ src/services/clerkService.js"
else
  echo "❌ src/services/clerkService.js missing"
  exit 1
fi

if [ -f "src/controllers/authController.js" ]; then
  echo "✅ src/controllers/authController.js"
else
  echo "❌ src/controllers/authController.js missing"
  exit 1
fi

if [ -f "src/routes/authRoutes.js" ]; then
  echo "✅ src/routes/authRoutes.js"
else
  echo "❌ src/routes/authRoutes.js missing"
  exit 1
fi

if [ -f "src/services/jwtService.js" ]; then
  echo "✅ src/services/jwtService.js"
else
  echo "❌ src/services/jwtService.js missing"
  exit 1
fi

echo ""
echo "🎉 All checks passed!"
echo ""
echo "📋 Next steps:"
echo "1. Run database migration (see redis_auth_migration.sql)"
echo "2. Start server: npm start"
echo "3. Test endpoint: node scripts/test-clerk-auth.js <clerk_token>"
echo ""
