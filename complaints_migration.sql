-- Create complaints table
CREATE TABLE IF NOT EXISTS complaints (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    category TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REVIEWED', 'RESOLVED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can insert their own complaints
CREATE POLICY "Users can insert their own complaints" 
ON complaints FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Admins can view all complaints
CREATE POLICY "Admins can view all complaints" 
ON complaints FOR SELECT 
TO authenticated 
USING (true); -- Assuming admin check is done in the backend controller

-- Admins can update all complaints
CREATE POLICY "Admins can update all complaints" 
ON complaints FOR UPDATE 
TO authenticated 
USING (true); -- Assuming admin check is done in the backend controller

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_user_id ON complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at);
