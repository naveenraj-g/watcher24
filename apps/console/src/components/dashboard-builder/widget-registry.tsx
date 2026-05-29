// widget-registry.tsx — maps widget type strings to display metadata and
// the React component that renders each widget given its config + live data.
// Adding a new widget type means adding one entry here — the grid and picker
// pick it up automatically.
"use client";

import type { WidgetType, WidgetConfig } from "@/lib/dashboards-api";
import {
  Activity, BarChart2, Gauge, Map, List, TrendingUp,
} from "lucide-react";

export interface WidgetMeta {
  type: WidgetType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultW: number; // grid columns (max 12)
  defaultH: number; // grid rows
  defaultConfig: WidgetConfig;
}

export const WIDGET_REGISTRY: WidgetMeta[] = [
  {
    type: "area-chart",
    label: "Events trend",
    description: "Area chart of events + errors over the selected time range",
    icon: TrendingUp,
    defaultW: 6,
    defaultH: 4,
    defaultConfig: { title: "Events trend" },
  },
  {
    type: "bar-chart",
    label: "Event types",
    description: "Horizontal bar chart showing log / audit / trace / metric counts",
    icon: BarChart2,
    defaultW: 4,
    defaultH: 4,
    defaultConfig: { title: "By event type" },
  },
  {
    type: "gauge",
    label: "Error rate",
    description: "Radial gauge showing the 24-hour error rate as a percentage",
    icon: Gauge,
    defaultW: 3,
    defaultH: 4,
    defaultConfig: { title: "Error rate" },
  },
  {
    type: "stat-card",
    label: "Stat card",
    description: "Single KPI number — total events, unique users, or apps",
    icon: Activity,
    defaultW: 3,
    defaultH: 2,
    defaultConfig: { title: "Total events", metric: "total_events" },
  },
  {
    type: "world-map",
    label: "Global map",
    description: "Choropleth map of event distribution by country",
    icon: Map,
    defaultW: 8,
    defaultH: 5,
    defaultConfig: { title: "Global distribution" },
  },
  {
    type: "log-feed",
    label: "Log feed",
    description: "Recent events table filtered by type and severity",
    icon: List,
    defaultW: 6,
    defaultH: 5,
    defaultConfig: { title: "Recent logs", eventType: "log" },
  },
];

export function getWidgetMeta(type: WidgetType): WidgetMeta {
  return (
    WIDGET_REGISTRY.find((w) => w.type === type) ?? WIDGET_REGISTRY[0]!
  );
}
