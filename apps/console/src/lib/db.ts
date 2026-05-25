// db.ts — singleton pg Pool for the IAM PostgreSQL database.
//
// The console reads from the IAM database to list and manage applications and
// their API key associations. It never writes to better-auth managed tables
// (user, session, apikey) — only to the watcher24-specific `applications` table
// and the `app_id` column on `apikey`.
//
// Server-only — never import this from client components.
import { Pool } from "pg";

const globalForPg = globalThis as unknown as { pgPool: Pool | undefined };

export const db: Pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString:
      process.env.IAM_DATABASE_URL ??
      "postgres://postgres:postgres@localhost:5432/iam",
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = db;
}
