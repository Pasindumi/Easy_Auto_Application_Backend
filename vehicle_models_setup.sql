-- Create vehicle_models table
CREATE TABLE IF NOT EXISTS vehicle_models (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    brand_id UUID NOT NULL REFERENCES vehicle_brands(id) ON DELETE CASCADE,
    vehicle_type_id UUID NOT NULL REFERENCES vehicle_types(id) ON DELETE CASCADE,
    model_name TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    created_by_admin UUID REFERENCES admins(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS Policies (Optional but recommended if RLS is enabled)
ALTER TABLE vehicle_models ENABLE ROW LEVEL SECURITY;

-- Allow full access (for admin/app management)
-- For a production app, you might want more granular policies based on auth.uid()
CREATE POLICY "Allow all access" ON vehicle_models
    FOR ALL USING (true);
