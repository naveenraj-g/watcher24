// LiveFeed — a real-time event stream panel on the overview page.
// Connects to the realtime-go WebSocket service and renders a scrolling list
// of the most recent events.  Requires an API key to authenticate.
"use client";

import { useRealtimeEvents } from "@/hooks/useRealtimeEvents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Wifi, WifiOff, X, Radio } from "lucide-react";
import { formatRelativeTime, severityVariant } from "@/lib/utils";

interface LiveFeedProps {
  // apiKey must be a valid watcher API key for the org — obtained from /settings.
  apiKey: string | null;
}

// LiveFeed renders the live event stream powered by the realtime-go WebSocket.
// Shows a connect prompt if no apiKey is provided.
export function LiveFeed({ apiKey }: LiveFeedProps) {
  const { events, connected, error, clear } = useRealtimeEvents({
    apiKey,
    maxEvents: 50,
    enabled: !!apiKey,
  });

  if (!apiKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Radio className="h-4 w-4" />
            Live Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <WifiOff className="h-8 w-8" />
            <p>Create an API key in Settings to enable the live feed.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Radio className="h-4 w-4" />
          Live Feed
          {connected ? (
            <Wifi className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={clear}
          className="h-7 text-xs"
        >
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {error && (
          <p className="px-4 py-2 text-xs text-destructive">{error}</p>
        )}
        <ScrollArea className="h-72">
          {events.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              Waiting for events…
            </div>
          ) : (
            <div className="divide-y">
              {events.map((ev, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-2.5">
                  <Badge
                    variant={severityVariant(ev.severity)}
                    className="shrink-0 mt-0.5 text-[10px] uppercase"
                  >
                    {ev.severity}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{ev.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {ev.event_type}
                      {ev.application_id && ` · ${ev.application_id}`}
                      {" · "}
                      {formatRelativeTime(ev.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
