// GET /api/events/metrics — paginated metric event query.
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
  if ((sp.get("orgId") ?? "") !== sessionOrgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const events = await queryEvents({
    orgId: sessionOrgId,
    eventType: "metric",
    search: sp.get("search") ?? undefined,
    severity: sp.get("severity") ?? undefined,
    limit: Number(sp.get("limit") ?? 50),
    offset: Number(sp.get("offset") ?? 0),
  });

  return NextResponse.json(events);
}
