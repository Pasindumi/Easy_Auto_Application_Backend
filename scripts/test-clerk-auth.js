#!/usr/bin/env node

/**
 * Test script for /api/auth/clerk endpoint
 * Tests Clerk OAuth token verification and user synchronization
 * 
 * Usage:
 *   node scripts/test-clerk-auth.js <clerk_session_token>
 * 
 * Example:
 *   node scripts/test-clerk-auth.js sess_2abc123xyz
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:5000';
const CLERK_TOKEN = process.argv[2];

if (!CLERK_TOKEN) {
  console.error('\n❌ Error: Clerk session token is required\n');
  console.log('Usage: node scripts/test-clerk-auth.js <clerk_session_token>\n');
  console.log('📱 To get a Clerk session token from Expo:');
  console.log('  import { useAuth } from "@clerk/clerk-expo";');
  console.log('  const { getToken } = useAuth();');
  console.log('  const token = await getToken();');
  console.log('  console.log("Token:", token);\n');
  console.log('🌐 From Expo Web:');
  console.log('  Same code - Clerk handles web/native automatically\n');
  process.exit(1);
}

console.log('\n🔐 Testing Clerk Authentication Endpoint');
console.log('==========================================\n');
console.log(`API URL: ${API_URL}/api/auth/clerk`);
console.log(`Token: ${CLERK_TOKEN.substring(0, 30)}...`);
console.log('\n');

async function testClerkAuth() {
  try {
    console.log('📤 Sending request with Authorization: Bearer header...\n');
    
    const response = await axios.post(
      `${API_URL}/api/auth/clerk`,
      null,
      {
        headers: {
          'Authorization': `Bearer ${CLERK_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ SUCCESS! Authentication completed\n');
    console.log('Response Status:', response.status);
    console.log('\n📦 Response Data:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('\n');
    
    // Verify response structure
    const { accessToken, refreshToken, user } = response.data;
    
    console.log('🔍 Response Validation:');
    console.log(`  ✅ accessToken: ${accessToken ? 'Present (' + accessToken.substring(0, 20) + '...)' : '❌ Missing'}`);
    console.log(`  ✅ refreshToken: ${refreshToken ? 'Present (' + refreshToken.substring(0, 20) + '...)' : '❌ Missing'}`);
    console.log(`  ✅ user object: ${user ? 'Present' : '❌ Missing'}`);
    
    if (user) {
      console.log('\n👤 User Details:');
      console.log(`  ID: ${user.id || '❌ Missing'}`);
      console.log(`  Clerk ID: ${user.clerk_user_id || '❌ Missing'}`);
      console.log(`  Email: ${user.email || 'Not set'}`);
      console.log(`  Phone: ${user.phone || 'Not set'}`);
      console.log(`  Name: ${user.name || 'Not set'}`);
      console.log(`  Role: ${user.role || '❌ Missing'}`);
    }
    
    console.log('\n✨ All checks passed! You can now use these tokens:');
    console.log(`  • accessToken: Use for API calls (expires in 15min)`);
    console.log(`  • refreshToken: Use to get new accessToken (expires in 30d)`);
    console.log('\n📝 Example API call:');
    console.log(`  curl http://localhost:5000/api/cars \\`);
    console.log(`    -H "Authorization: Bearer ${accessToken?.substring(0, 30)}..."\n`);
    
  } catch (error) {
    console.error('\n❌ ERROR during authentication:\n');
    
    if (error.response) {
      // Server responded with error
      console.log('❌ Status Code:', error.response.status);
      console.log('\n📄 Error Response:');
      console.log(JSON.stringify(error.response.data, null, 2));
      
      const { error: errorMsg, code } = error.response.data;
      console.log('\n');
      console.log(`Error: ${errorMsg}`);
      console.log(`Code: ${code}`);
      
      // Provide helpful troubleshooting steps
      console.log('\n💡 Troubleshooting Steps:\n');
      
      if (code === 'AUTH_PROVIDER_ERROR') {
        console.log('1. Check server logs for detailed error messages');
        console.log('2. Verify CLERK_SECRET_KEY in .env matches your Clerk dashboard');
        console.log('3. Ensure token is fresh (not expired)');
        console.log('4. Token should start with "sess_" for session tokens');
        console.log('5. Make sure you\'re using the correct Clerk instance');
        console.log('6. Check if token is from correct environment (dev/prod)');
        console.log('\n📋 Server logs will show:');
        console.log('   - Token verification details');
        console.log('   - Specific Clerk API errors');
        console.log('   - Secret key configuration status');
      } else if (code === 'MISSING_TOKEN') {
        console.log('1. Ensure Authorization header is included');
        console.log('2. Format: Authorization: Bearer <token>');
        console.log('3. Check for typos in header name');
      } else if (code === 'DATABASE_ERROR') {
        console.log('1. Check database connection');
        console.log('2. Verify clerk_user_id column exists:');
        console.log('   Run: clerk_user_migration.sql');
        console.log('3. Check database permissions');
      }
      
    } else if (error.request) {
      // No response received
      console.log('❌ No response received from server');
      console.log(`\n💡 Troubleshooting:`);
      console.log(`  1. Check if server is running at ${API_URL}`);
      console.log(`  2. Verify server logs for startup errors`);
      console.log(`  3. Check network connectivity`);
      console.log(`  4. Try: npm start`);
    } else {
      // Request setup error
      console.log('❌ Request Error:', error.message);
    }
    
    console.log('\n');
    process.exit(1);
  }
}

testClerkAuth();
