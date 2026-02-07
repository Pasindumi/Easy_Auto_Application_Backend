-- Migration to add user status, ban expiry, and ban reason
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS ban_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ban_reason TEXT;

-- Create an index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
