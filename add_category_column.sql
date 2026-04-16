-- Add category column to products table if it doesn't exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Standard';

-- Update existing records to have 'Standard' as default if they are null
UPDATE products SET category = 'Standard' WHERE category IS NULL;

-- Refresh the system cache
NOTIFY pgrst, 'reload schema';
