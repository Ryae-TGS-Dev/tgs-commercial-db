-- 1. Communities Table
CREATE TABLE communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    company TEXT,
    sq_ft NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Products Table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT UNIQUE NOT NULL,
    unit_price NUMERIC(10, 2),
    coverage_sqft NUMERIC DEFAULT 8000
);

-- 3. Service History Table
CREATE TABLE service_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID REFERENCES communities(id),
    service_date DATE NOT NULL,
    monthly_revenue NUMERIC(10, 2) DEFAULT 0,
    annual_revenue NUMERIC(10, 2) DEFAULT 0,
    service_performed TEXT,
    labor_hours TEXT, -- Storing as text for now (e.g., "7 hrs 45 mins")
    crew_count INTEGER DEFAULT 0,
    service_status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Initial Products Seed
INSERT INTO products (sku, unit_price, coverage_sqft) VALUES
('16-0-8', 21.00, 8000),
('8-2-12', 0.00, 8000),
('0-0-30', 0.00, 8000),
('10-0-7', 0.00, 8000),
('25-0-5', 25.00, 8000);
