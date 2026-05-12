import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_KEY;

const supabaseServiceKey = serviceRoleKey || anonKey;

if (!supabaseUrl) {
  console.error('Supabase URL is missing in environment variables');
}

if (!serviceRoleKey) {
  console.warn('Supabase Service Role Key is missing! Falling back to Anon Key. RLS will be active.');
} else {
  console.log('Supabase Service Role Key loaded successfully. RLS will be bypassed.');
}

// Use service role key to bypass RLS since we're using custom JWT authentication
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export default supabase;
