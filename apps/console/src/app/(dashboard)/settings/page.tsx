// Settings page — lets users manage API keys for their organisation.
// API keys are used to authenticate SDK ingestion and the realtime WebSocket feed.
"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Copy, KeyRound, Trash2, Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface ApiKey {
  id: string;
  name: string;
  start: string;
  createdAt: string;
  expiresAt: string | null;
  enabled: boolean;
}

// SettingsPage renders the API key management panel.
export default function SettingsPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  async function fetchKeys() {
    setLoading(true);
    const { data, error } = await authClient.apiKey.list();
    if (!error && data) {
      const list = (data as unknown as { apiKeys: ApiKey[] }).apiKeys ?? [];
      setKeys(list);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchKeys();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const { data, error } = await authClient.apiKey.create({
      name: newKeyName || "Default",
    });
    if (error) {
      toast.error(error.message ?? "Failed to create key");
    } else if (data) {
      setCreatedKey((data as { key: string }).key);
      setNewKeyName("");
      await fetchKeys();
      toast.success("API key created");
    }
    setCreating(false);
  }

  async function handleRevoke(id: string) {
    const { error } = await authClient.apiKey.delete({ keyId: id });
    if (error) {
      toast.error(error.message ?? "Failed to revoke key");
    } else {
      toast.success("Key revoked");
      await fetchKeys();
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.info("Copied to clipboard");
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage API keys for SDK ingestion and the live feed
        </p>
      </div>

      {/* New key created — show it once */}
      {createdKey && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="text-sm text-green-800 dark:text-green-300">
              New API key created
            </CardTitle>
            <CardDescription className="text-green-700 dark:text-green-400">
              Copy this key now — it will never be shown again.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <code className="flex-1 rounded bg-green-100 dark:bg-green-900/40 px-3 py-1.5 text-xs font-mono break-all">
              {createdKey}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(createdKey)}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCreatedKey(null)}
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create new key */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create API Key
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex gap-3">
            <div className="flex-1 space-y-1">
              <Label htmlFor="key-name" className="text-xs">
                Key name (optional)
              </Label>
              <Input
                id="key-name"
                placeholder="e.g. production-backend"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" size="sm" disabled={creating}>
                {creating ? "Creating…" : "Create"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Existing keys */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            API Keys
          </CardTitle>
          <CardDescription>
            Keys are used to authenticate SDK ingestion and the live feed WebSocket.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No API keys yet. Create one above.
            </p>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between rounded-md border px-4 py-3"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{key.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {key.start}…
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created {formatDate(key.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={key.enabled ? "secondary" : "destructive"}
                      className="text-xs"
                    >
                      {key.enabled ? "Active" : "Disabled"}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleRevoke(key.id)}
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
