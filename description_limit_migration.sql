-- Add description_limit column to pricing_rules table
ALTER TABLE public.pricing_rules ADD COLUMN IF NOT EXISTS description_limit integer DEFAULT 500;

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
