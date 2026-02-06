-- Add brand_image column to vehicle_brands
ALTER TABLE public.vehicle_brands ADD COLUMN IF NOT EXISTS brand_image TEXT;

-- Update RLS policies (if needed, but usually table-level RLS handles it)
-- Since "Allow public all brands" is already 'all using (true)', no changes needed for RLS.
