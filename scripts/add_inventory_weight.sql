-- Add weight column to inventory
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS weight_per_unit numeric DEFAULT 0;

-- Update existing items with some dummy weight (optional, but good for testing if user runs it)
-- UPDATE inventory SET weight_per_unit = 0 WHERE weight_per_unit IS NULL;
