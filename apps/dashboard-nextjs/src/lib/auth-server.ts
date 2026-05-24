// auth-server.ts — the server-side better-auth instance for the dashboard.
//
// The dashboard shares the same PostgreSQL database and BETTER_AUTH_SECRET as
// the IAM service.  This means any user who already has an IAM account can log
// in to the dashboard with the same credentials, and sessions created here are
// stored in the shared `session` table.
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { apiKey } from "@better-auth/api-key";
import { Pool } from "pg";

export const auth = betterAuth({
  // Connect to the same PostgreSQL as the IAM so sessions and users are shared.
  database: new Pool({
    connectionString: process.env.DATABASE_URL!,
  }),

  // Must match IAM's BETTER_AUTH_SECRET — session tokens are validated against
  // the shared database and signed with this secret.
  secret: process.env.BETTER_AUTH_SECRET!,

  baseURL: process.env.BETTER_AUTH_URL!,

  emailAndPassword: {
    enabled: true,
  },

  plugins: [
    // organization() lets us read the user's activeOrganizationId from the session,
    // which scopes all ClickHouse queries to the correct tenant.
    organization(),

    // apiKey() lets the settings page list and manage API keys for the org.
    apiKey(),

    // nextCookies() is required for server-side cookie access in Next.js App Router.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
