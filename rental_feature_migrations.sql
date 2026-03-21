-- Rental Ads Feature Migration

-- 1. Create rental_ads table
CREATE TABLE public.rental_ads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    seller_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    vehicle_type_id UUID REFERENCES public.vehicle_types(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT,
    price_per_day NUMERIC NOT NULL,
    price_per_week NUMERIC NOT NULL,
    min_rental_duration INTEGER DEFAULT 1,
    max_rental_duration INTEGER,
    security_deposit NUMERIC DEFAULT 0,
    mileage_limit NUMERIC,
    status TEXT DEFAULT 'DRAFT', -- 'DRAFT', 'ACTIVE', 'PAUSED', 'PENDING_APPROVAL'
    verification_status TEXT DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
    is_banned BOOLEAN DEFAULT FALSE,
    views_count INTEGER DEFAULT 0,
    expiry_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create rental_ad_details table (Static Vehicle Details)
CREATE TABLE public.rental_ad_details (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ad_id UUID REFERENCES public.rental_ads(id) ON DELETE CASCADE,
    condition TEXT,
    brand TEXT,
    model TEXT,
    year INTEGER,
    transmission TEXT,
    fuel_type TEXT,
    body_type TEXT,
    engine_capacity NUMERIC,
    mileage NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create rental_ad_images table
CREATE TABLE public.rental_ad_images (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ad_id UUID REFERENCES public.rental_ads(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create rental_ad_documents table (For Verification)
CREATE TABLE public.rental_ad_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ad_id UUID REFERENCES public.rental_ads(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL, -- e.g., 'Vehicle Registration', 'Insurance'
    document_url TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create rental_ad_calendar table (Availability)
CREATE TABLE public.rental_ad_calendar (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ad_id UUID REFERENCES public.rental_ads(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'UNAVAILABLE', 'BOOKED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger function if it doesn't already exist (often does in Supabase)
-- Using a standard updated_at trigger
CREATE OR REPLACE FUNCTION update_rental_modified_column()   
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;   
END;
$$ language 'plpgsql';

-- Add triggers to update updated_at automatically
CREATE TRIGGER update_rental_ads_modtime 
BEFORE UPDATE ON public.rental_ads 
FOR EACH ROW EXECUTE PROCEDURE update_rental_modified_column();

CREATE TRIGGER update_rental_ad_documents_modtime 
BEFORE UPDATE ON public.rental_ad_documents 
FOR EACH ROW EXECUTE PROCEDURE update_rental_modified_column();

-- Setup RLS (Row Level Security) - Basic Policies
ALTER TABLE public.rental_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_ad_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_ad_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_ad_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_ad_calendar ENABLE ROW LEVEL SECURITY;

-- Note: In a real Supabase environment you'd add specific RLS policies here. 
-- For speed, if the system uses service roles mostly or relies on basic policies, you can adjust these.
-- Example permissive policies for testing (to be restricted later):
CREATE POLICY "Public can view active rental ads" ON public.rental_ads FOR SELECT USING (status = 'ACTIVE');
CREATE POLICY "Owners can manage rental ads" ON public.rental_ads FOR ALL USING (auth.uid() = seller_id);

CREATE POLICY "Public can view rental ad details" ON public.rental_ad_details FOR SELECT USING (true);
CREATE POLICY "Owners can manage rental ad details" ON public.rental_ad_details FOR ALL USING (
    EXISTS (SELECT 1 FROM public.rental_ads WHERE id = rental_ad_details.ad_id AND seller_id = auth.uid())
);

CREATE POLICY "Public can view rental images" ON public.rental_ad_images FOR SELECT USING (true);
CREATE POLICY "Owners can manage rental images" ON public.rental_ad_images FOR ALL USING (
    EXISTS (SELECT 1 FROM public.rental_ads WHERE id = rental_ad_images.ad_id AND seller_id = auth.uid())
);

CREATE POLICY "Owners can manage rental documents" ON public.rental_ad_documents FOR ALL USING (
    EXISTS (SELECT 1 FROM public.rental_ads WHERE id = rental_ad_documents.ad_id AND seller_id = auth.uid())
);

CREATE POLICY "Public can view rental calendar" ON public.rental_ad_calendar FOR SELECT USING (true);
CREATE POLICY "Owners can manage rental calendar" ON public.rental_ad_calendar FOR ALL USING (
    EXISTS (SELECT 1 FROM public.rental_ads WHERE id = rental_ad_calendar.ad_id AND seller_id = auth.uid())
);

-- Update Payments Table to support rental ads
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS rental_ad_id UUID REFERENCES public.rental_ads(id) ON DELETE CASCADE;
