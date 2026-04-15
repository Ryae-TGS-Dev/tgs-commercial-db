-- Enable RLS on all tables
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_product_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_pricing_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_leaders ENABLE ROW LEVEL SECURITY;

-- Add permissive policies for internal operations
-- Since this is an internal tool, we'll allow all authenticated and anon users (via API key) to perform operations.
-- In a production multi-tenant app, we would use auth.uid() checks here.

-- 1. Communities
CREATE POLICY "Enable all for everyone" ON communities FOR ALL USING (true) WITH CHECK (true);

-- 2. Service History
CREATE POLICY "Enable all for everyone" ON service_history FOR ALL USING (true) WITH CHECK (true);

-- 3. Service Product Usage
CREATE POLICY "Enable all for everyone" ON service_product_usage FOR ALL USING (true) WITH CHECK (true);

-- 4. Products
CREATE POLICY "Enable all for everyone" ON products FOR ALL USING (true) WITH CHECK (true);

-- 5. Community Pricing Splits
CREATE POLICY "Enable all for everyone" ON community_pricing_splits FOR ALL USING (true) WITH CHECK (true);

-- 6. App Settings
CREATE POLICY "Enable all for everyone" ON app_settings FOR ALL USING (true) WITH CHECK (true);

-- 7. Crew Leaders
CREATE POLICY "Enable all for everyone" ON crew_leaders FOR ALL USING (true) WITH CHECK (true);
