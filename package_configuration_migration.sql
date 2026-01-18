-- Add vehicle_type_id column to package_included_items table
ALTER TABLE public.package_included_items ADD COLUMN IF NOT EXISTS vehicle_type_id uuid REFERENCES public.vehicle_types(id) ON DELETE SET NULL;

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
