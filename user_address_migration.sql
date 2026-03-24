-- Migration to add user address and profile details to the users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS address_line1 TEXT,
ADD COLUMN IF NOT EXISTS address_line2 TEXT,
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS district VARCHAR(100),
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS location VARCHAR(255),
ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
ADD COLUMN IF NOT EXISTS birthday DATE;

-- Add comments for documentation
COMMENT ON COLUMN users.address_line1 IS 'Primary street address or house number';
COMMENT ON COLUMN users.address_line2 IS 'Secondary address info (apartment, suite, unit, etc.)';
COMMENT ON COLUMN users.city IS 'City or town of residence';
COMMENT ON COLUMN users.district IS 'District or region of residence';
COMMENT ON COLUMN users.postal_code IS 'ZIP or postal code';
COMMENT ON COLUMN users.bio IS 'Short biography or introduction of the user';
COMMENT ON COLUMN users.location IS 'General location string (e.g., "Colombo, SL")';
COMMENT ON COLUMN users.gender IS 'User gender (optional)';
COMMENT ON COLUMN users.birthday IS 'User date of birth';
