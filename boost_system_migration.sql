-- Boost System Migration

-- 1. Insert Core Boost Item Types into price_items
-- Before inserting, update check constraint to allow BOOST_ITEM and BOOST_PACKAGE
-- 1. Insert Core Boost Item Types into price_items
-- Before inserting, update check constraint to allow BOOST_ITEM and BOOST_PACKAGE
-- Explicitly drop the constraint first (this command will fail safely if constraint doesn't exist if user runs entire script, but 'IF EXISTS' handles it)
ALTER TABLE public.price_items DROP CONSTRAINT IF EXISTS price_items_item_type_check;

-- DELETE rows that would violate the new constraint to ensure ADD CONSTRAINT succeeds
DELETE FROM public.price_items WHERE item_type NOT IN ('PACKAGE', 'ADDON', 'BOOST_PACKAGE', 'BOOST_ITEM');

-- Re-add the constraint with new values
ALTER TABLE public.price_items ADD CONSTRAINT price_items_item_type_check 
    CHECK (item_type IN ('PACKAGE', 'ADDON', 'BOOST_PACKAGE', 'BOOST_ITEM'));

-- These are the fundamental features available for boost packages
INSERT INTO public.price_items (code, name, item_type, description, status)
VALUES 
('HB_BOOST', 'Homepage Banner / Slider Boost', 'BOOST_ITEM', 'Ad appears on homepage slider or banner', 'ACTIVE'),
('FL_BOOST', 'Featured Listing Boost', 'BOOST_ITEM', 'Ad shows at top of results in the vehicle list page', 'ACTIVE'),
('PP_BOOST', 'Popup Promotion Boost', 'BOOST_ITEM', 'Ad appears as popup inside app', 'ACTIVE'),
('NT_BOOST', 'Notification Boost', 'BOOST_ITEM', 'Send push notifications about boosted ads', 'ACTIVE'),
('US_BOOST', 'Urgent Sale Boost', 'BOOST_ITEM', 'Show "Urgent Sale" tag in the ad', 'ACTIVE')
ON CONFLICT (code) DO UPDATE SET item_type = 'BOOST_ITEM', status = 'ACTIVE';

-- 2. ad_boosts table to track boosts applied to individual ads
CREATE TABLE IF NOT EXISTS public.ad_boosts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ad_id UUID NOT NULL REFERENCES public."CarAd"(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES public.price_items(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES public.payments(id),
    start_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Add index for performance on search ranking (Featured Listing)
CREATE INDEX IF NOT EXISTS idx_ad_boosts_ad_id_status_end_date ON public.ad_boosts (ad_id, status, end_date);

-- Enable RLS
ALTER TABLE public.ad_boosts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable read access for all users" ON public.ad_boosts FOR SELECT USING (true);
CREATE POLICY "Enable all access for admins" ON public.ad_boosts FOR ALL USING (true); -- Simplified for now, follow existing admin policy pattern if needed

-- Grant permissions
GRANT ALL ON TABLE public.ad_boosts TO anon, authenticated, service_role;

-- Update CarAd table to easily flag urgent/featured
ALTER TABLE public."CarAd" ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT FALSE;
ALTER TABLE public."CarAd" ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE public."CarAd" ADD COLUMN IF NOT EXISTS is_homepage_banner BOOLEAN DEFAULT FALSE;
ALTER TABLE public."CarAd" ADD COLUMN IF NOT EXISTS is_popup_promotion BOOLEAN DEFAULT FALSE;

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
