-- Add unit column to products table if it doesn't exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'BAG';

-- Update existing records to have 'BAG' as default if they are null
UPDATE products SET unit = 'BAG' WHERE unit IS NULL;

-- Notify schema cache refresh
NOTIFY pgrst, 'reload schema';
