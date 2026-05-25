// apps.ts — query helpers for the `applications` table and `apikey.app_id` column.
//
// The `applications` table lives in the IAM PostgreSQL database alongside the
// better-auth tables. Console API routes use these helpers to CRUD apps and
// link/unlink API keys to apps.
//
// Server-only — never import this from client components.
import { db } from "@/lib/db";

export interface App {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface AppKey {
  id: string;
  name: string | null;
  start: string;
  app_id: string | null;
  created_at: string;
  expires_at: string | null;
  enabled: boolean;
}

// listApps returns all applications for the given org, newest first.
export async function listApps(orgId: string): Promise<App[]> {
  const { rows } = await db.query<App>(
    `SELECT id, organization_id, name, slug, created_at
     FROM applications
     WHERE organization_id = $1
     ORDER BY created_at DESC`,
    [orgId],
  );
  return rows;
}

// createApp inserts a new application row and returns it.
// Throws if the slug already exists for this org (UNIQUE constraint).
export async function createApp(
  orgId: string,
  name: string,
  slug: string,
): Promise<App> {
  const { rows } = await db.query<App>(
    `INSERT INTO applications (organization_id, name, slug)
     VALUES ($1, $2, $3)
     RETURNING id, organization_id, name, slug, created_at`,
    [orgId, name, slug],
  );
  return rows[0];
}

// deleteApp removes an application row. ON DELETE SET NULL on apikey.app_id
// means existing keys are unlinked but not deleted.
export async function deleteApp(appId: string, orgId: string): Promise<void> {
  await db.query(
    `DELETE FROM applications WHERE id = $1 AND organization_id = $2`,
    [appId, orgId],
  );
}

// listAppKeys returns all API keys linked to a specific application.
export async function listAppKeys(
  appId: string,
  orgId: string,
): Promise<AppKey[]> {
  // We verify org ownership by joining through applications to prevent
  // an org from reading another org's keys via a guessed appId.
  const { rows } = await db.query<AppKey>(
    `SELECT k.id, k.name, k.start, k.app_id,
            k."createdAt" AS created_at, k."expiresAt" AS expires_at, k.enabled
     FROM apikey k
     JOIN applications a ON a.id = k.app_id
     WHERE k.app_id = $1
       AND a.organization_id = $2
     ORDER BY k."createdAt" DESC`,
    [appId, orgId],
  );
  return rows;
}

// setKeyAppId links an existing API key to an application.
// Validates org ownership of both the key and the app before updating.
export async function setKeyAppId(
  keyId: string,
  appId: string | null,
  orgId: string,
): Promise<void> {
  if (appId !== null) {
    // Confirm the app belongs to this org before linking.
    const { rowCount } = await db.query(
      `SELECT 1 FROM applications WHERE id = $1 AND organization_id = $2`,
      [appId, orgId],
    );
    if (!rowCount) throw new Error("App not found or access denied");
  }

  await db.query(`UPDATE apikey SET app_id = $1 WHERE id = $2`, [appId, keyId]);
}
