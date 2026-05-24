// auth.ts — the browser-side better-auth client for the dashboard.
//
// All client components use this singleton to call auth endpoints
// (signIn, signOut, getSession, etc.) without importing server-only code.
"use client";

import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";
import { apiKeyClient } from "@better-auth/api-key/client";

export const authClient = createAuthClient({
  // The dashboard's own origin — better-auth routes requests through /api/auth/*.
  baseURL: process.env.NEXT_PUBLIC_APP_URL!,

  plugins: [
    // Gives access to authClient.organization.* methods (switch active org, etc.)
    organizationClient(),

    // Gives access to authClient.apiKey.* methods (list, create, revoke keys)
    apiKeyClient(),
  ],
});

export type ClientSession = typeof authClient.$Infer.Session;
