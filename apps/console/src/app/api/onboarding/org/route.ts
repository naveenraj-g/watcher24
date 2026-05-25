// POST /api/onboarding/org — creates an organisation and sets it as active.
//
// Handles both auth mechanisms so this works regardless of whether the user
// arrived via cookie-based session (IAM proxy) or OAuth PKCE access_token:
//
//   Cookie session:  better-auth.session_token forwarded in the IAM calls.
//   OAuth session:   console.access_token used as Authorization: Bearer header.
//
// Called by the onboarding create-org page instead of the client-side
// authClient.organization calls, which require a session cookie on the
// console domain (not present in the pure-OAuth PKCE flow).
import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";

export async function POST(request: Request) {
  const { name, slug } = await request.json();

  if (!name?.trim() || !slug?.trim()) {
    return NextResponse.json({ error: "name and slug are required." }, { status: 400 });
  }

  const iamUrl = process.env.IAM_URL ?? "http://localhost:5000";

  // Build the auth headers: prefer forwarding the cookie session; fall back
  // to the OAuth access_token as a Bearer token.
  const hdrs = await headers();
  const cookieHeader = hdrs.get("cookie") ?? "";
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("console.access_token")?.value;

  const authHeaders: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(cookieHeader ? { cookie: cookieHeader } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };

  // Step 1: create the organisation.
  const createRes = await fetch(`${iamUrl}/api/auth/organization/create`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ name: name.trim(), slug: slug.trim() }),
  });

  const createData = await createRes.json();

  if (!createRes.ok) {
    return NextResponse.json(
      { error: createData.message ?? createData.error ?? "Failed to create organisation." },
      { status: createRes.status },
    );
  }

  const orgId: string = createData.id;

  // Step 2: set the new org as the active org in the session / user context.
  const setActiveRes = await fetch(`${iamUrl}/api/auth/organization/set-active`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ organizationId: orgId }),
  });

  if (!setActiveRes.ok) {
    const errData = await setActiveRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: errData.message ?? errData.error ?? "Organisation created but failed to activate it." },
      { status: setActiveRes.status },
    );
  }

  return NextResponse.json({ orgId });
}
