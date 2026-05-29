// Overview page — dashboard home.
// All data is fetched server-side from ClickHouse in parallel.
// Client components receive plain serialisable props.
import { getServerSession } from "@/lib/auth-server";
import { queryOverviewStats, queryHourlyBuckets, queryGeoDistribution } from "@/lib/clickhouse";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { EventsTrendChart } from "@/components/dashboard/EventsTrendChart";
import { EventTypeBreakdownChart } from "@/components/dashboard/EventTypeBreakdownChart";
import { ErrorRateGauge } from "@/components/dashboard/ErrorRateGauge";
import { GlobalUsersMap } from "@/components/dashboard/GlobalUsersMap";
import { LiveFeed } from "@/components/dashboard/LiveFeed";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const session = await getServerSession();
  const orgId = session?.session.activeOrganizationId ?? "";

  const [stats, buckets, geoCounts] = await Promise.all([
    queryOverviewStats(orgId),
    queryHourlyBuckets(orgId),
    queryGeoDistribution(orgId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-sm text-muted-foreground">Last 24 hours</p>
      </div>

      <StatsCards stats={stats} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <EventsTrendChart data={buckets} />
        </div>
        <div className="lg:col-span-1">
          <EventTypeBreakdownChart stats={stats} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ErrorRateGauge stats={stats} />
        </div>
        <div className="lg:col-span-2">
          <LiveFeed />
        </div>
      </div>

      <GlobalUsersMap data={geoCounts} />
    </div>
  );
}
