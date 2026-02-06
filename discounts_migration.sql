-- Migration for Discounts & Offers

-- Create Discounts Table
CREATE TABLE IF NOT EXISTS public.discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FIXED')),
    value DECIMAL(10, 2) NOT NULL,
    is_first_time_user BOOLEAN DEFAULT FALSE,
    min_bulk_ads INTEGER DEFAULT 0,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    color_theme TEXT,
    offer_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Join Table for Discounts and Vehicle Types (Categories)
CREATE TABLE IF NOT EXISTS public.discount_vehicle_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discount_id UUID REFERENCES public.discounts(id) ON DELETE CASCADE,
    vehicle_type_id UUID REFERENCES public.vehicle_types(id) ON DELETE CASCADE,
    UNIQUE(discount_id, vehicle_type_id)
);

-- Row Level Security (RLS)
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_vehicle_types ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies if any
DROP POLICY IF EXISTS "Allow public read for active discounts" ON public.discounts;
DROP POLICY IF EXISTS "Allow public read for discount vehicle types" ON public.discount_vehicle_types;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.discounts;
DROP POLICY IF EXISTS "Allow all for authenticated users on join table" ON public.discount_vehicle_types;

-- Policy for Public read (Mobile App)
CREATE POLICY "Allow public read for active discounts" ON public.discounts
    FOR SELECT USING (TRUE); -- Allow all for now to debug, then restrict to status ACTIVE

CREATE POLICY "Allow public read for discount vehicle types" ON public.discount_vehicle_types
    FOR SELECT USING (TRUE);

-- Policy for Admin CRUD (If not using service_role)
CREATE POLICY "Allow all for authenticated users" ON public.discounts
    FOR ALL USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Allow all for authenticated users on join table" ON public.discount_vehicle_types
    FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Function to update updated_at
-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_discounts_updated_at ON public.discounts;
CREATE TRIGGER update_discounts_updated_at
    BEFORE UPDATE ON public.discounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
