-- 1. Add Category to Products
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Uncategorized';

-- Automatically categorize some known products
UPDATE products SET category = 'Fertilizer' WHERE sku LIKE '%-%-%';
UPDATE products SET category = 'Herbicide' WHERE sku ILIKE '%herbicide%' OR sku ILIKE '%ranger%' OR sku ILIKE '%8 way%';
UPDATE products SET category = 'Specialty' WHERE sku ILIKE '%gypsum%' OR sku ILIKE '%trimtect%';
