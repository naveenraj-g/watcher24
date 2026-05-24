// auth.ts — browser-side auth client for the console.
//
// The console proxies /api/auth/* to IAM, so all authClient calls go to
// the console's own origin (which Next.js then forwards to IAM). This keeps
// the session cookie on the console's domain and avoids CORS issues.
"use client";

import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";
import { apiKeyClient } from "@better-auth/api-key/client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL!,
  plugins: [
    organizationClient(),
    apiKeyClient(),
  ],
});
