// DashboardWidget — renders the correct chart component for a given LayoutItem.
// Each widget type is its own sub-component so useQuery is always called
// unconditionally (React Rules of Hooks). The parent just selects which
// sub-component to mount based on widgetType.
"use client";

import { useQuery } from "@tanstack/react-query";
import type { LayoutItem } from "@/lib/dashboards-api";
import { resolveTimeRange, DEFAULT_RANGE } from "@/lib/time-range";
import { EventsTrendChart } from "@/components/dashboard/EventsTrendChart";
import { EventTypeBreakdownChart } from "@/components/dashboard/EventTypeBreakdownChart";
import { ErrorRateGauge } from "@/components/dashboard/ErrorRateGauge";
import { GlobalUsersMap } from "@/components/dashboard/GlobalUsersMap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { formatDate, severityVariant } from "@/lib/utils";
import type { EventRow, HourlyBucket, OverviewStats, GeoCountBucket } from "@/lib/clickhouse";

// ── Shared types ────────────────────────────────────────────────────────────

interface WidgetProps {
  item: LayoutItem;
  orgId: string;
  from: string;
  to: string;
}

function WidgetSkeleton() {
  return (
    <div className="h-full w-full p-4 space-y-3">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

function WidgetError({ message }: { message: string }) {
  return (
    <div className="h-full flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function emptyStats(): OverviewStats {
  return {
    total_events: 0,
    error_count: 0,
    audit_count: 0,
    log_count: 0,
    trace_count: 0,
    metric_count: 0,
    unique_users: 0,
    unique_apps: 0,
  };
}

// ── Per-type sub-components (hooks always called unconditionally) ────────────

function AreaChartWidget({ item, orgId, from, to }: WidgetProps) {
  const { data, isPending, isError } = useQuery<HourlyBucket[]>({
    queryKey: ["widget-buckets", orgId, from, to],
    queryFn: async () => {
      const p = new URLSearchParams({ from, to });
      const r = await fetch(`/api/events/overview/buckets?${p}`);
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    },
    staleTime: 30_000,
  });

  if (isPending) return <WidgetSkeleton />;
  if (isError) return <WidgetError message="Failed to load chart data" />;
  return (
    <EventsTrendChart
      data={data ?? []}
      title={item.widgetConfig.title as string | undefined}
    />
  );
}

function BarChartWidget({ item, orgId, from, to }: WidgetProps) {
  const { data, isPending, isError } = useQuery<OverviewStats>({
    queryKey: ["widget-stats", orgId, from, to],
    queryFn: async () => {
      const p = new URLSearchParams({ from, to });
      const r = await fetch(`/api/events/overview?${p}`);
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    },
    staleTime: 30_000,
  });

  if (isPending) return <WidgetSkeleton />;
  if (isError) return <WidgetError message="Failed to load chart data" />;
  return <EventTypeBreakdownChart stats={data ?? emptyStats()} />;
}

function GaugeWidget({ orgId, from, to }: WidgetProps) {
  const { data, isPending, isError } = useQuery<OverviewStats>({
    queryKey: ["widget-stats", orgId, from, to],
    queryFn: async () => {
      const p = new URLSearchParams({ from, to });
      const r = await fetch(`/api/events/overview?${p}`);
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    },
    staleTime: 30_000,
  });

  if (isPending) return <WidgetSkeleton />;
  if (isError) return <WidgetError message="Failed to load gauge data" />;
  return <ErrorRateGauge stats={data ?? emptyStats()} />;
}

function StatCardWidget({ item, orgId, from, to }: WidgetProps) {
  const metric = (item.widgetConfig.metric as string | undefined) ?? "total_events";
  const title = (item.widgetConfig.title as string | undefined) ?? "Stat";

  const { data, isPending, isError } = useQuery<OverviewStats>({
    queryKey: ["widget-stats", orgId, from, to],
    queryFn: async () => {
      const p = new URLSearchParams({ from, to });
      const r = await fetch(`/api/events/overview?${p}`);
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    },
    staleTime: 30_000,
  });

  if (isPending) return <WidgetSkeleton />;
  if (isError) return <WidgetError message="Failed to load stat" />;

  const stats = data ?? emptyStats();
  const value = stats[metric as keyof OverviewStats] ?? 0;

  return (
    <Card className="h-full border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tabular-nums">{Number(value).toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}

function WorldMapWidget({ orgId, from, to }: WidgetProps) {
  const { data, isPending, isError } = useQuery<GeoCountBucket[]>({
    queryKey: ["widget-geo", orgId, from, to],
    queryFn: async () => {
      const p = new URLSearchParams({ from, to });
      const r = await fetch(`/api/events/overview/geo?${p}`);
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    },
    staleTime: 30_000,
  });

  if (isPending) return <WidgetSkeleton />;
  if (isError) return <WidgetError message="Failed to load map data" />;
  return <GlobalUsersMap data={data ?? []} />;
}

function LogFeedWidget({ item, orgId, from, to }: WidgetProps) {
  const eventType = (item.widgetConfig.eventType as string | undefined) ?? "log";
  const title = (item.widgetConfig.title as string | undefined) ?? "Recent events";

  const { data, isPending, isError } = useQuery<EventRow[]>({
    queryKey: ["widget-log-feed", orgId, eventType, from, to],
    queryFn: async () => {
      const apiPath =
        eventType === "audit"
          ? "/api/events/audit"
          : eventType === "trace"
            ? "/api/events/traces"
            : "/api/events/logs";
      const p = new URLSearchParams({ from, to, limit: "10" });
      const r = await fetch(`${apiPath}?${p}`);
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    },
    staleTime: 15_000,
  });

  if (isPending) return <WidgetSkeleton />;
  if (isError) return <WidgetError message="Failed to load events" />;

  const rows = data ?? [];

  return (
    <Card className="h-full overflow-hidden border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-auto" style={{ maxHeight: "calc(100% - 56px)" }}>
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground text-center">No events</p>
        ) : (
          <div className="divide-y">
            {rows.map((ev, i) => (
              <div key={i} className="flex items-start gap-2 px-4 py-2">
                <Badge
                  variant={severityVariant(ev.severity)}
                  className="text-[10px] uppercase shrink-0 mt-0.5"
                >
                  {ev.severity}
                </Badge>
                <div className="min-w-0">
                  <p className="text-xs truncate">{ev.message}</p>
                  <p className="text-[10px] text-muted-foreground">{formatDate(ev.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Public component ─────────────────────────────────────────────────────────

interface DashboardWidgetProps {
  item: LayoutItem;
  orgId: string;
  range?: string;
}

export function DashboardWidget({ item, orgId, range = DEFAULT_RANGE }: DashboardWidgetProps) {
  const { from, to } = resolveTimeRange(range);
  const props: WidgetProps = { item, orgId, from, to };

  switch (item.widgetType) {
    case "area-chart":  return <AreaChartWidget {...props} />;
    case "bar-chart":   return <BarChartWidget {...props} />;
    case "gauge":       return <GaugeWidget {...props} />;
    case "stat-card":   return <StatCardWidget {...props} />;
    case "world-map":   return <WorldMapWidget {...props} />;
    case "log-feed":    return <LogFeedWidget {...props} />;
    default:            return null;
  }
}
