CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Organizations
CREATE TABLE organizations (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Applications (belong to an org)
CREATE TABLE applications (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, slug)
);

-- API Keys (used by SDKs to authenticate to the gateway)
CREATE TABLE api_keys (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    application_id  TEXT REFERENCES applications(id) ON DELETE SET NULL,
    name            TEXT NOT NULL,
    key_hash        TEXT NOT NULL UNIQUE,  -- SHA-256 of the raw key, never store plaintext
    key_prefix      TEXT NOT NULL,         -- first 8 chars for display (e.g. "wtch_abc1")
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at    TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_org_id ON api_keys(organization_id);
CREATE INDEX idx_applications_org_id ON applications(organization_id);

-- Seed a default org and API key for local development
INSERT INTO organizations (id, name, slug) VALUES
    ('org_local', 'Local Dev Org', 'local-dev');

INSERT INTO applications (id, organization_id, name, slug) VALUES
    ('app_local', 'org_local', 'Test App', 'test-app');

-- Raw key: wtch_localdevkey0000 — hash stored is SHA-256 of that string
INSERT INTO api_keys (id, organization_id, application_id, name, key_hash, key_prefix) VALUES
    (
        'key_local',
        'org_local',
        'app_local',
        'Local Dev Key',
        encode(digest('wtch_localdevkey0000', 'sha256'), 'hex'),
        'wtch_loc'
    );
