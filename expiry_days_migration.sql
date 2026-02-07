-- Migration to add expiry_days to vehicle_types table
ALTER TABLE vehicle_types ADD COLUMN expiry_days INTEGER DEFAULT 30;

-- Update existing records to 30 days if null
UPDATE vehicle_types SET expiry_days = 30 WHERE expiry_days IS NULL;
