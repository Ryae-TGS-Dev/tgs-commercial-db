-- TGS PRICING UPDATE: DATABASE SETUP (Idempotent)
-- This version explicitly adds missing columns to existing tables.

-- 1. Add columns for locking in old prices
ALTER TABLE service_history 
ADD COLUMN IF NOT EXISTS applied_labor_rate NUMERIC,
ADD COLUMN IF NOT EXISTS applied_contract_value NUMERIC;

ALTER TABLE service_product_usage 
ADD COLUMN IF NOT EXISTS applied_unit_price NUMERIC;

-- 2. Create the Price History table structure
CREATE TABLE IF NOT EXISTS pricing_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date DATE NOT NULL,
  end_date DATE,
  type TEXT NOT NULL DEFAULT 'labor',
  rate NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ENSURE NEW COLUMNS EXIST (For those who ran an older version)
ALTER TABLE pricing_timeline ADD COLUMN IF NOT EXISTS ref_id TEXT;
ALTER TABLE pricing_timeline ADD COLUMN IF NOT EXISTS target_id UUID;

-- 4. Secure the table
ALTER TABLE pricing_timeline ENABLE ROW LEVEL SECURITY;

-- 5. Set access rules
DROP POLICY IF EXISTS "Allow public read access" ON pricing_timeline;
CREATE POLICY "Allow public read access" ON pricing_timeline FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated manage access" ON pricing_timeline;
CREATE POLICY "Allow authenticated manage access" ON pricing_timeline FOR ALL USING (auth.role() = 'authenticated');

-- 6. Force Supabase to refresh its cache
NOTIFY pgrst, 'reload schema';
