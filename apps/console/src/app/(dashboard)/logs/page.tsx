// Logs explorer page — shows structured application logs.
// Reads the watcher_app cookie to filter by the currently selected app.
import { cookies } from "next/headers";
import { getServerSession } from "@/lib/auth-server";
import { EventsExplorer } from "@/components/explorer/EventsExplorer";

export const dynamic = "force-dynamic";

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await getServerSession();
  const orgId = session?.session.activeOrganizationId ?? "";
  const jar = await cookies();
  const activeAppId = jar.get("watcher_app")?.value ?? null;

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
        appId={activeAppId}
      />
    </div>
  );
}
