// auth-server.ts — server-side session helper for the console.
//
// The console proxies /api/auth/* to the IAM service (see next.config.ts).
// Session cookies are therefore set on the console's own origin. Server
// components read the session by forwarding the incoming cookies to IAM.
// There is no local better-auth instance — IAM is the single auth authority.
import { headers } from "next/headers";
import { cache } from "react";

export type OrgSummary = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
};

export type ConsoleUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: string;
};

export type ConsoleSession = {
  id: string;
  token: string;
  expiresAt: string;
  userId: string;
  activeOrganizationId: string | null;
  organizations: OrgSummary[];
  permissions: string[];
};

export type AuthResponse = {
  user: ConsoleUser;
  session: ConsoleSession;
};

// getServerSession fetches the current session from IAM by forwarding the
// browser's cookies. React cache() de-duplicates calls within one render pass
// so multiple layouts/pages sharing the same request hit IAM only once.
export const getServerSession = cache(async (): Promise<AuthResponse | null> => {
  const hdrs = await headers();
  const cookie = hdrs.get("cookie") ?? "";

  // IAM_URL is only needed for direct server-to-server calls (bypasses proxy).
  const iamUrl = process.env.IAM_URL ?? "http://localhost:5000";

  try {
    const res = await fetch(`${iamUrl}/api/auth/get-session`, {
      headers: { cookie },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.user) return null;

    return data as AuthResponse;
  } catch {
    return null;
  }
});
