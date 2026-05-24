// GET /api/events/audit — paginated audit event query.
// Accepts: orgId, limit, offset, search, severity query params.
// The orgId param is validated against the session's active org to prevent
// cross-tenant data leakage.
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { queryEvents } from "@/lib/clickhouse";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionOrgId =
    (session.session as { activeOrganizationId?: string })
      .activeOrganizationId ?? "";

  const sp = req.nextUrl.searchParams;

  // Guard: the orgId in the query must match the session's active org.
  const requestedOrgId = sp.get("orgId") ?? "";
  if (requestedOrgId !== sessionOrgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const events = await queryEvents({
    orgId: sessionOrgId,
    eventType: "audit",
    search: sp.get("search") ?? undefined,
    severity: sp.get("severity") ?? undefined,
    limit: Number(sp.get("limit") ?? 50),
    offset: Number(sp.get("offset") ?? 0),
  });

  return NextResponse.json(events);
}
