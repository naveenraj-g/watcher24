// GET /api/events/overview — returns 24-hour aggregate stats and hourly buckets
// for the authenticated user's active organisation.
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import {
  queryOverviewStats,
  queryHourlyBuckets,
} from "@/lib/clickhouse";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId =
    (session.session as { activeOrganizationId?: string })
      .activeOrganizationId ?? "";

  const [stats, buckets] = await Promise.all([
    queryOverviewStats(orgId),
    queryHourlyBuckets(orgId),
  ]);

  return NextResponse.json({ stats, buckets });
}
