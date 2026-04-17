-- Financial Intelligence Settings Table
CREATE TABLE IF NOT EXISTS financial_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed Initial Strategy (User's requested defaults)
INSERT INTO financial_settings (key, value) VALUES
('overhead_percentage', '20'),
('profit_danger_threshold', '10'),
('profit_breakeven_threshold', '50')
ON CONFLICT (key) DO NOTHING;

-- Extension of communities to track specific budget overrides if needed later
-- (Optional but good for future-proofing)
ALTER TABLE communities ADD COLUMN IF NOT EXISTS target_margin_override NUMERIC;
