-- Add extra_letter_price column to pricing_rules table
ALTER TABLE public.pricing_rules ADD COLUMN IF NOT EXISTS extra_letter_price numeric DEFAULT 0;

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
