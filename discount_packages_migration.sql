-- Create discount_packages table to link discounts to specific packages (price_items)
CREATE TABLE IF NOT EXISTS public.discount_packages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    discount_id UUID NOT NULL REFERENCES public.discounts(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES public.price_items(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(discount_id, package_id)
);

-- Enable RLS
ALTER TABLE public.discount_packages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable read access for all users" ON public.discount_packages FOR SELECT USING (true);
CREATE POLICY "Enable all access for admins" ON public.discount_packages FOR ALL USING (
    auth.jwt() ->> 'email' IN (SELECT email FROM admins)
);

-- Grant permissions
GRANT ALL ON TABLE public.discount_packages TO anon, authenticated, service_role;
