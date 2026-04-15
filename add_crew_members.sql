-- Migration: Add crew_members to service_history table

ALTER TABLE service_history
ADD COLUMN IF NOT EXISTS crew_members TEXT;
