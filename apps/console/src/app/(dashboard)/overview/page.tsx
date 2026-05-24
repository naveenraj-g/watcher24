// Overview page — the dashboard home.  Shows 24-hour KPI cards, an events-over-
// time chart, and the live WebSocket feed.  All heavy data is fetched server-side
// from ClickHouse; the live feed is client-only.
import { getServerSession } from "@/lib/auth-server";
import { queryOverviewStats, queryHourlyBuckets } from "@/lib/clickhouse";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { EventsChart } from "@/components/dashboard/EventsChart";
import { LiveFeed } from "@/components/dashboard/LiveFeed";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const session = await getServerSession();
  const orgId = session?.session.activeOrganizationId ?? "";

  // Fetch stats and chart data in parallel — both hit ClickHouse independently.
  const [stats, buckets] = await Promise.all([
    queryOverviewStats(orgId),
    queryHourlyBuckets(orgId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-sm text-muted-foreground">Last 24 hours</p>
      </div>

      <StatsCards stats={stats} />

      <div className="grid gap-6 lg:grid-cols-2">
        <EventsChart data={buckets} />
        {/*
          apiKey is null until the user creates one in Settings.
          The LiveFeed gracefully handles the null state.
        */}
        <LiveFeed apiKey={null} />
      </div>
    </div>
  );
}
