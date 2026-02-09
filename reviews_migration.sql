-- Drop table if it exists to ensure clean slate with correct FK
DROP TABLE IF EXISTS public.reviews;

-- Create reviews table
CREATE TABLE public.reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ad_id UUID NOT NULL REFERENCES public."CarAd"(id) ON DELETE CASCADE,
    -- Changed reference from auth.users to public.users to allow joining with user profile data
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(ad_id, user_id)
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. Everyone can view reviews
CREATE POLICY "Reviews are public" 
ON public.reviews FOR SELECT 
USING (true);

-- 2. Authenticated users can insert their own reviews
CREATE POLICY "Users can create reviews" 
ON public.reviews FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- 3. Users can update their own reviews
CREATE POLICY "Users can update own reviews" 
ON public.reviews FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

-- 4. Users can delete their own reviews
CREATE POLICY "Users can delete own reviews" 
ON public.reviews FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_ad_id ON public.reviews(ad_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);
