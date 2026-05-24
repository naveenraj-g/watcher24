// Audit explorer page — shows audit events from the ClickHouse materialized view.
// Supports search, severity filter, and pagination via query params.
import { headers } from "next/headers";
import { auth } from "@/lib/auth-server";
import { EventsExplorer } from "@/components/explorer/EventsExplorer";

export const dynamic = "force-dynamic";

export default async function AuditPage({
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
        <h1 className="text-2xl font-bold">Audit Events</h1>
        <p className="text-sm text-muted-foreground">
          Track who did what and when across your organisation
        </p>
      </div>
      <EventsExplorer
        orgId={orgId}
        eventType="audit"
        searchParams={sp}
        apiPath="/api/events/audit"
      />
    </div>
  );
}
