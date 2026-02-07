ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS ad_id UUID REFERENCES public."CarAd"(id);
