-- Database update for Special Services tracking
ALTER TABLE service_history ADD COLUMN IF NOT EXISTS is_special_service BOOLEAN DEFAULT false;
ALTER TABLE service_history ADD COLUMN IF NOT EXISTS is_one_time_service BOOLEAN DEFAULT false;
ALTER TABLE service_history ADD COLUMN IF NOT EXISTS service_category TEXT DEFAULT 'Contract Maintenance';
