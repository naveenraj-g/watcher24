// Logs explorer page — shows structured application logs.
import { headers } from "next/headers";
import { auth } from "@/lib/auth-server";
import { EventsExplorer } from "@/components/explorer/EventsExplorer";

export const dynamic = "force-dynamic";

export default async function LogsPage({
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
        <h1 className="text-2xl font-bold">Logs</h1>
        <p className="text-sm text-muted-foreground">
          Structured application logs across all environments
        </p>
      </div>
      <EventsExplorer
        orgId={orgId}
        eventType="log"
        searchParams={sp}
        apiPath="/api/events/logs"
      />
    </div>
  );
}
