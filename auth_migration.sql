-- Authentication and Authorization Migration
-- Run this SQL in your Supabase SQL editor

-- Update users table to support multiple auth methods
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS clerk_id text unique,
ADD COLUMN IF NOT EXISTS phone_verified boolean default false,
ADD COLUMN IF NOT EXISTS google_id text unique,
ADD COLUMN IF NOT EXISTS apple_id text unique,
ADD COLUMN IF NOT EXISTS facebook_id text unique,
ADD COLUMN IF NOT EXISTS auth_provider text default 'phone' check (auth_provider in ('phone', 'clerk', 'google', 'apple', 'facebook')),
ADD COLUMN IF NOT EXISTS last_login timestamp with time zone,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone default timezone('utc'::text, now());

-- Make email and password nullable for social auth users
ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.users ALTER COLUMN password DROP NOT NULL;

-- Make phone unique and not null for phone auth
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique_idx ON public.users(phone) WHERE phone IS NOT NULL;

-- OTP Codes Table
CREATE TABLE IF NOT EXISTS public.otp_codes (
  id uuid default uuid_generate_v4() primary key,
  phone text not null,
  otp_hash text not null,
  expires_at timestamp with time zone not null,
  attempts int default 0,
  verified boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for faster OTP lookup
CREATE INDEX IF NOT EXISTS otp_codes_phone_idx ON public.otp_codes(phone);
CREATE INDEX IF NOT EXISTS otp_codes_expires_at_idx ON public.otp_codes(expires_at);

-- Enable RLS
ALTER TABLE public.otp_codes ENABLE row level security;

-- OTP policies
DROP POLICY IF EXISTS "Allow public insert OTP" ON public.otp_codes;
CREATE POLICY "Allow public insert OTP" ON public.otp_codes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read OTP" ON public.otp_codes;
CREATE POLICY "Allow public read OTP" ON public.otp_codes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public update OTP" ON public.otp_codes;
CREATE POLICY "Allow public update OTP" ON public.otp_codes FOR UPDATE USING (true);

-- Refresh Tokens Table
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

-- Function to clean up expired OTPs (run periodically)
CREATE OR REPLACE FUNCTION clean_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM public.otp_codes 
  WHERE expires_at < now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired refresh tokens (run periodically)
CREATE OR REPLACE FUNCTION clean_expired_refresh_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM public.refresh_tokens 
  WHERE expires_at < now();
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

-- Insert test data (optional - remove in production)
-- Commented out by default
-- INSERT INTO public.users (name, email, phone, password, role, auth_provider, phone_verified)
-- VALUES ('Test User', 'test@example.com', '+1234567890', '$2a$10$dummy_hash', 'user', 'phone', true);

COMMENT ON TABLE public.otp_codes IS 'Stores OTP codes for phone number authentication';
COMMENT ON TABLE public.refresh_tokens IS 'Stores refresh tokens for JWT authentication';
COMMENT ON COLUMN public.users.clerk_id IS 'Clerk user ID for social authentication';
COMMENT ON COLUMN public.users.auth_provider IS 'Authentication provider used (phone, clerk, google, apple, facebook)';
