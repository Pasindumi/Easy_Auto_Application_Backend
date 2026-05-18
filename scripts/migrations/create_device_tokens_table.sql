-- Migration: Create device_tokens table for push notifications
-- Run this SQL in your Supabase SQL Editor

-- Create the device_tokens table
CREATE TABLE IF NOT EXISTS device_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    expo_push_token TEXT NOT NULL UNIQUE,
    device_id TEXT,
    platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_is_active ON device_tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_device_tokens_expo_push_token ON device_tokens(expo_push_token);

-- Add RLS policies (adjust based on your security requirements)
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own device tokens
CREATE POLICY "Users can insert own device tokens" ON device_tokens
    FOR INSERT WITH CHECK (true);

-- Policy: Users can update their own device tokens
CREATE POLICY "Users can update own device tokens" ON device_tokens
    FOR UPDATE USING (true);

-- Policy: Service role can read all tokens (for sending notifications)
CREATE POLICY "Service role can read all tokens" ON device_tokens
    FOR SELECT USING (true);

-- Optional: Add a 'channel' column to notification_logs table to distinguish email vs push
-- Run this if the column doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notification_logs' AND column_name = 'channel'
    ) THEN
        ALTER TABLE notification_logs ADD COLUMN channel TEXT DEFAULT 'EMAIL';
    END IF;
END $$;

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_device_tokens_updated_at ON device_tokens;
CREATE TRIGGER update_device_tokens_updated_at
    BEFORE UPDATE ON device_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comment on table
COMMENT ON TABLE device_tokens IS 'Stores Expo push notification tokens for mobile app users';
