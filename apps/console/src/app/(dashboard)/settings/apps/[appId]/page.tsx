// App detail settings — view an app's linked API keys and link new ones.
"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronLeft, Key, LinkIcon, Trash2 } from "lucide-react";
import { authClient } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { AppKey } from "@/lib/apps";

interface OrgKey {
  id: string;
  name: string;
  start: string;
  enabled: boolean;
  createdAt: string;
}

export default function AppDetailPage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const { appId } = use(params);

  const [keys, setKeys] = useState<AppKey[]>([]);
  const [allKeys, setAllKeys] = useState<OrgKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [selectedKeyId, setSelectedKeyId] = useState("");

  async function fetchKeys() {
    setLoading(true);
    const [linkedRes, allData] = await Promise.all([
      fetch(`/api/apps/${appId}/keys`),
      authClient.apiKey.list(),
    ]);
    if (linkedRes.ok) setKeys(await linkedRes.json());
    if (!allData.error && allData.data) {
      const list = (allData.data as unknown as { apiKeys: OrgKey[] }).apiKeys ?? [];
      setAllKeys(list);
    }
    setLoading(false);
  }

  useEffect(() => { fetchKeys(); }, [appId]);

  async function handleLink(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedKeyId) return;
    setLinking(true);
    const res = await fetch(`/api/apps/${appId}/keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyId: selectedKeyId }),
    });
    if (res.ok) {
      setSelectedKeyId("");
      await fetchKeys();
      toast.success("Key linked to app");
    } else {
      const { error } = await res.json().catch(() => ({ error: "Failed" }));
      toast.error(error ?? "Failed to link key");
    }
    setLinking(false);
  }

  // Keys not yet linked to this app (available to link)
  const linkedKeyIds = new Set(keys.map((k) => k.id));
  const availableKeys = allKeys.filter((k) => !linkedKeyIds.has(k.id));

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          href="/settings/apps"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          Apps
        </Link>
        <h1 className="text-2xl font-bold">App API Keys</h1>
        <p className="text-sm text-muted-foreground">
          Keys linked to this app send telemetry tagged with this app&apos;s ID automatically.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Link an existing key
          </CardTitle>
          <CardDescription>
            Select a key from your org to scope it to this app. Create new keys in{" "}
            <Link href="/settings/api-keys" className="underline underline-offset-2">
              API Keys
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availableKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              All org keys are already linked to this app, or you have no keys yet.
            </p>
          ) : (
            <form onSubmit={handleLink} className="flex gap-3">
              <Select value={selectedKeyId} onValueChange={setSelectedKeyId}>
                <SelectTrigger className="flex-1 h-8 text-sm">
                  <SelectValue placeholder="Select a key…" />
                </SelectTrigger>
                <SelectContent>
                  {availableKeys.map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.name ?? "Unnamed"} — {k.start}…
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" size="sm" disabled={linking || !selectedKeyId}>
                {linking ? "Linking…" : "Link"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" />
            Linked Keys
          </CardTitle>
          <CardDescription>
            These keys authenticate SDK requests and tag events with this app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No keys linked yet. Link one above.
            </p>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between rounded-md border px-4 py-3"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-sm font-medium truncate">{key.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {key.start}… · Created {key.createdAt ? formatDate(key.createdAt) : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <Badge
                      variant={key.enabled ? "secondary" : "destructive"}
                      className="text-xs"
                    >
                      {key.enabled ? "Active" : "Disabled"}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      title="Unlink key from app"
                      onClick={async () => {
                        // Unlinking = setting app_id back to null via a direct DB call.
                        // We reuse the same endpoint with appId=null via a custom route.
                        // For simplicity, we call the same POST endpoint with null to unlink.
                        const res = await fetch(`/api/apps/unlink-key`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ keyId: key.id }),
                        });
                        if (res.ok) {
                          toast.success("Key unlinked");
                          await fetchKeys();
                        } else {
                          toast.error("Failed to unlink key");
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
