-- Scope API keys to individual applications.
-- The applications table was added in 001_init.sql.
-- This migration links apikey rows (managed by better-auth) to application rows
-- so the gateway can resolve app_id from a key instead of trusting the SDK header.

ALTER TABLE apikey ADD COLUMN IF NOT EXISTS app_id TEXT REFERENCES applications(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_apikey_app_id ON apikey(app_id);
