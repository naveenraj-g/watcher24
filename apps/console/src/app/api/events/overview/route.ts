// GET /api/events/overview — returns 24-hour aggregate stats and hourly buckets
// for the authenticated user's active organisation.
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import {
  queryOverviewStats,
  queryHourlyBuckets,
} from "@/lib/clickhouse";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = session.session.activeOrganizationId ?? "";

  const [stats, buckets] = await Promise.all([
    queryOverviewStats(orgId),
    queryHourlyBuckets(orgId),
  ]);

  return NextResponse.json({ stats, buckets });
}
