-- Run once against the existing Neon/PostgreSQL database.
-- All statements are idempotent so deployments can safely retry them.
ALTER TABLE services ADD COLUMN IF NOT EXISTS coordinates JSONB;
ALTER TABLE services ADD COLUMN IF NOT EXISTS geocoding_status VARCHAR(24) NOT NULL DEFAULT 'pending';
ALTER TABLE services ADD COLUMN IF NOT EXISTS geocoding_confidence DOUBLE PRECISION;
ALTER TABLE services ADD COLUMN IF NOT EXISTS geocoded_address TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS ix_services_geocoding_status ON services (geocoding_status);
