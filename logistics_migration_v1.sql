-- 1. Update Communities Table with Location Data
ALTER TABLE communities 
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- 2. Create Logistics Settings Table
-- This stores thresholds for acreage and weather (Rain %)
CREATE TABLE IF NOT EXISTS logistics_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed initial settings
INSERT INTO logistics_settings (key, value)
VALUES 
    ('acreage_thresholds', '{"small": 304920, "medium": 740520}'::jsonb), -- in sq_ft (7 acres and 17 acres)
    ('rain_threshold', '60'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 3. Create Scheduled Tasks Table
-- This represents the "Planning" building, separate from history.
CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    
    -- Logistics Metadata
    service_method TEXT DEFAULT 'Both', -- Spray, Granular, Both
    is_fixed BOOLEAN DEFAULT false,
    assigned_crew TEXT, -- Can be linked to a crew table later if needed
    
    -- Structured Notes (Normalized for Briefings)
    procedure_notes TEXT,
    priority_areas TEXT,
    priority_tasks TEXT,
    spanish_notes TEXT, -- Stores the AI/Manual translation
    
    -- Attachments (Photo URLs from Supabase Storage)
    photo_urls TEXT[] DEFAULT '{}',
    
    -- Workflow Status
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Cancelled', 'Rescheduled')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Enable RLS (Security)
ALTER TABLE logistics_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_tasks ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write for now (matching typical TGS dev patterns)
CREATE POLICY "Allow all for authenticated users on logistics_settings" ON logistics_settings FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users on scheduled_tasks" ON scheduled_tasks FOR ALL TO authenticated USING (true);
