-- Update rental_ads table with missing fields from the 5-step form
ALTER TABLE public.rental_ads 
ADD COLUMN IF NOT EXISTS price_per_month NUMERIC,
ADD COLUMN IF NOT EXISTS extra_mileage_fee NUMERIC,
ADD COLUMN IF NOT EXISTS min_age INTEGER DEFAULT 21,
ADD COLUMN IF NOT EXISTS allow_smoking BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS allow_pets BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS req_deposit BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS other_conditions TEXT,
ADD COLUMN IF NOT EXISTS daily_mileage_limit NUMERIC;

-- Optional: rename acreage_limit to total_mileage_limit if needed, 
-- but we already have daily_mileage_limit now.
