-- Migration: Add clerk_user_id column to users table
-- Purpose: Enable Clerk OAuth integration and user synchronization
-- Date: 2026-01-09

-- Add clerk_user_id column with UNIQUE constraint
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS clerk_user_id TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id 
ON public.users(clerk_user_id) 
WHERE clerk_user_id IS NOT NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'clerk_user_id';

-- Example: Check existing users
-- SELECT id, email, phone, clerk_user_id, role, created_at 
-- FROM users 
-- ORDER BY created_at DESC 
-- LIMIT 10;
