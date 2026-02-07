-- SQL Script to Fix "price_items" Check Constraint
-- Run this script if you encounter "violates check constraint" errors during migration.

-- 1. Drop existing constraint
ALTER TABLE public.price_items DROP CONSTRAINT IF EXISTS price_items_item_type_check;

-- 2. DELETE rows that would violate the new constraint
-- (Clean up invalid 'BOOST' if any, but keep 'AD', 'EXTRA')
-- DELETE FROM public.price_items WHERE item_type NOT IN ('AD', 'EXTRA', 'PACKAGE', 'ADDON', 'BOOST_PACKAGE', 'BOOST_ITEM');

-- 3. Add corrected constraint allowing ALL VALID TYPES
ALTER TABLE public.price_items ADD CONSTRAINT price_items_item_type_check 
    CHECK (item_type IN ('AD', 'EXTRA', 'PACKAGE', 'ADDON', 'BOOST_PACKAGE', 'BOOST_ITEM'));

-- 3. Verify by checking if the constraint exists (Optional, just for confirmation)
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'price_items_item_type_check';
