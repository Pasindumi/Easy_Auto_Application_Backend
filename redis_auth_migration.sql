-- Enhanced Authentication Migration for Redis-based OTP and Clerk Integration
-- This migration adds support for Clerk OAuth and uses Redis for OTP storage

-- Update users table to support Clerk and multiple auth methods
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS clerk_user_id text unique,
ADD COLUMN IF NOT EXISTS phone_verified boolean default false,
ADD COLUMN IF NOT EXISTS email_verified boolean default false,
ADD COLUMN IF NOT EXISTS google_id text unique,
ADD COLUMN IF NOT EXISTS apple_id text unique,
ADD COLUMN IF NOT EXISTS facebook_id text unique,
ADD COLUMN IF NOT EXISTS auth_provider text default 'phone' check (auth_provider in ('phone', 'clerk', 'google', 'apple', 'facebook')),
ADD COLUMN IF NOT EXISTS last_login timestamp with time zone,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone default timezone('utc'::text, now());

-- Make email and password nullable for social auth users
ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.users ALTER COLUMN password DROP NOT NULL;

-- Make phone unique when present
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique_idx ON public.users(phone) WHERE phone IS NOT NULL;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS users_clerk_user_id_idx ON public.users(clerk_user_id) WHERE clerk_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_google_id_idx ON public.users(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_apple_id_idx ON public.users(apple_id) WHERE apple_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_facebook_id_idx ON public.users(facebook_id) WHERE facebook_id IS NOT NULL;

-- DROP old OTP table if it exists (we're using Redis now)
-- Uncomment if you want to remove DB-based OTP storage
-- DROP TABLE IF EXISTS public.otp_codes CASCADE;

-- Keep or create Refresh Tokens Table (still stored in DB)
CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  token_hash text not null unique,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  revoked boolean default false,
  revoked_at timestamp with time zone
);

-- Index for faster token lookup
CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx ON public.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_token_hash_idx ON public.refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS refresh_tokens_expires_at_idx ON public.refresh_tokens(expires_at);

-- Enable RLS
ALTER TABLE public.refresh_tokens ENABLE row level security;

-- Refresh token policies
DROP POLICY IF EXISTS "Allow public insert refresh tokens" ON public.refresh_tokens;
CREATE POLICY "Allow public insert refresh tokens" ON public.refresh_tokens FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read refresh tokens" ON public.refresh_tokens;
CREATE POLICY "Allow public read refresh tokens" ON public.refresh_tokens FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public update refresh tokens" ON public.refresh_tokens;
CREATE POLICY "Allow public update refresh tokens" ON public.refresh_tokens FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete refresh tokens" ON public.refresh_tokens;
CREATE POLICY "Allow public delete refresh tokens" ON public.refresh_tokens FOR DELETE USING (true);

-- Optional: Auth Providers Linking Table (for extensibility)
CREATE TABLE IF NOT EXISTS public.auth_providers (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  provider text not null check (provider in ('phone', 'clerk', 'google', 'apple', 'facebook')),
  provider_user_id text,
  linked_at timestamp with time zone default timezone('utc'::text, now()) not null,
  UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS auth_providers_user_id_idx ON public.auth_providers(user_id);
CREATE INDEX IF NOT EXISTS auth_providers_provider_idx ON public.auth_providers(provider);

ALTER TABLE public.auth_providers ENABLE row level security;

DROP POLICY IF EXISTS "Allow public all auth_providers" ON public.auth_providers;
CREATE POLICY "Allow public all auth_providers" ON public.auth_providers FOR ALL USING (true);

-- Function to clean up expired refresh tokens (run periodically via cron)
CREATE OR REPLACE FUNCTION clean_expired_refresh_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM public.refresh_tokens 
  WHERE expires_at < now() OR revoked = true;
END;
$$ LANGUAGE plpgsql;

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to users table
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.refresh_tokens IS 'Stores refresh tokens for JWT authentication';
COMMENT ON TABLE public.auth_providers IS 'Links users to multiple authentication providers';
COMMENT ON COLUMN public.users.clerk_user_id IS 'Clerk user ID for OAuth authentication (Google, Apple, Facebook via Clerk)';
COMMENT ON COLUMN public.users.auth_provider IS 'Primary authentication provider used (phone, clerk, google, apple, facebook)';
COMMENT ON COLUMN public.users.phone_verified IS 'Whether phone number has been verified via OTP';
COMMENT ON COLUMN public.users.email_verified IS 'Whether email has been verified';

-- Note: OTPs are now stored in Redis with TTL (3-5 minutes) instead of the database
-- Redis Key Format: otp:{phone} -> { hash, attempts, createdAt }
