-- Migration to add ban fields and update status constraint
ALTER TABLE public."CarAd" 
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ban_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ban_reason TEXT;

-- Update status constraint (using quotes to match the exact name in your error message)
ALTER TABLE public."CarAd" DROP CONSTRAINT IF EXISTS "CarAd_status_check";
ALTER TABLE public."CarAd" ADD CONSTRAINT "CarAd_status_check" CHECK (status IN ('DRAFT', 'PENDING', 'ACTIVE', 'SOLD', 'EXPIRED', 'BANNED', 'REJECTED'));

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
