-- Applications (belong to an org)
-- Note: organizations and api_keys are managed by the IAM service (better-auth + Prisma)
-- This schema only contains watcher24-specific tables
CREATE TABLE applications (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    organization_id TEXT NOT NULL,
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, slug)
);

-- Indexes
CREATE INDEX idx_applications_org_id ON applications(organization_id);

-- Seed a local dev application
INSERT INTO applications (id, organization_id, name, slug) VALUES
    ('app_local', 'org_local', 'Test App', 'test-app');
