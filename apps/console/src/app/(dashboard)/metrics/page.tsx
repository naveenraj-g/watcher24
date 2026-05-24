// Metrics explorer page — shows metric events with numeric payload values.
import { headers } from "next/headers";
import { auth } from "@/lib/auth-server";
import { EventsExplorer } from "@/components/explorer/EventsExplorer";

export const dynamic = "force-dynamic";

export default async function MetricsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const orgId =
    (session?.session as { activeOrganizationId?: string })
      ?.activeOrganizationId ?? "";

  const sp = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Metrics</h1>
        <p className="text-sm text-muted-foreground">
          Custom application metrics and performance measurements
        </p>
      </div>
      <EventsExplorer
        orgId={orgId}
        eventType="metric"
        searchParams={sp}
        apiPath="/api/events/metrics"
      />
    </div>
  );
}
