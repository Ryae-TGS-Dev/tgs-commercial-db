-- 1. Add Unique constraint to community names to prevent duplicates
ALTER TABLE communities ADD CONSTRAINT unique_community_name UNIQUE (name);

-- 2. Add Unique constraint to products SKU (already exists in schema but good for reinforcement)
-- ALTER TABLE products ADD CONSTRAINT unique_product_sku UNIQUE (sku);
