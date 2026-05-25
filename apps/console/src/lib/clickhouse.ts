// clickhouse.ts — singleton ClickHouse client for server-side Route Handlers.
//
// All telemetry data (events, audit logs, traces, metrics) lives in ClickHouse.
// This module provides the client and typed query helpers that Route Handlers use.
// It is server-only — never import this file from client components.
import { createClient } from "@clickhouse/client";

// Module-level singleton — Next.js hot-reloads in dev can create multiple
// instances, so we stash the client on globalThis to avoid connection pool bloat.
const globalForClickhouse = globalThis as unknown as {
  clickhouse: ReturnType<typeof createClient> | undefined;
};

export const clickhouse =
  globalForClickhouse.clickhouse ??
  createClient({
    url: process.env.CLICKHOUSE_URL ?? "http://localhost:8123",
    username: process.env.CLICKHOUSE_USER ?? "watcher",
    password: process.env.CLICKHOUSE_PASSWORD ?? "watcher_secret",
    database: process.env.CLICKHOUSE_DB ?? "watcher",
    clickhouse_settings: {
      // Async inserts — the dashboard is read-only, but this prevents accidental
      // blocking if someone writes a test row.
      async_insert: 0,
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForClickhouse.clickhouse = clickhouse;
}

// ── Query helpers ─────────────────────────────────────────────────────────────

// EventRow is the ClickHouse schema for the `watcher.events` table.
export interface EventRow {
  organization_id: string;
  application_id: string;
  environment: string;
  event_type: string;
  severity: string;
  message: string;
  timestamp: string;
  trace_id: string;
  span_id: string;
  parent_span_id: string;
  user_id: string;
  session_id: string;
  payload: string;
  ingested_at: string;
  sdk_version: string;
  runtime: string;
  ip_address: string;
  region: string;
}

// OverviewStats is the shape returned by the overview API route.
export interface OverviewStats {
  total_events: number;
  error_count: number;
  audit_count: number;
  log_count: number;
  trace_count: number;
  metric_count: number;
  unique_users: number;
  unique_apps: number;
}

// HourlyBucket is one data point for the events-over-time chart.
export interface HourlyBucket {
  hour: string;
  count: number;
  error_count: number;
}

// queryOverviewStats returns aggregate counts for the last 24 hours for one org.
export async function queryOverviewStats(
  orgId: string,
): Promise<OverviewStats> {
  const result = await clickhouse.query({
    query: `
      SELECT
        count()                                          AS total_events,
        countIf(severity IN ('error','critical'))       AS error_count,
        countIf(event_type = 'audit')                   AS audit_count,
        countIf(event_type = 'log')                     AS log_count,
        countIf(event_type = 'trace')                   AS trace_count,
        countIf(event_type = 'metric')                  AS metric_count,
        uniqExact(user_id)                              AS unique_users,
        uniqExact(application_id)                       AS unique_apps
      FROM watcher.events
      WHERE organization_id = {orgId: String}
        AND timestamp >= now() - INTERVAL 24 HOUR
    `,
    query_params: { orgId },
    format: "JSONEachRow",
  });

  const rows = await result.json<OverviewStats>();
  return (
    rows[0] ?? {
      total_events: 0,
      error_count: 0,
      audit_count: 0,
      log_count: 0,
      trace_count: 0,
      metric_count: 0,
      unique_users: 0,
      unique_apps: 0,
    }
  );
}

// queryHourlyBuckets returns per-hour event counts for the last 24 h chart.
export async function queryHourlyBuckets(
  orgId: string,
): Promise<HourlyBucket[]> {
  const result = await clickhouse.query({
    query: `
      SELECT
        formatDateTime(toStartOfHour(timestamp), '%H:00') AS hour,
        count()                                           AS count,
        countIf(severity IN ('error','critical'))         AS error_count
      FROM watcher.events
      WHERE organization_id = {orgId: String}
        AND timestamp >= now() - INTERVAL 24 HOUR
      GROUP BY hour
      ORDER BY hour ASC
    `,
    query_params: { orgId },
    format: "JSONEachRow",
  });

  return result.json<HourlyBucket>();
}

// queryMonthlyUsage returns the total event count for the current calendar month.
export async function queryMonthlyUsage(orgId: string): Promise<number> {
  const result = await clickhouse.query({
    query: `
      SELECT count() AS total
      FROM watcher.events
      WHERE organization_id = {orgId: String}
        AND toStartOfMonth(timestamp) = toStartOfMonth(now())
    `,
    query_params: { orgId },
    format: "JSONEachRow",
  });

  const rows = await result.json<{ total: number }>();
  return Number(rows[0]?.total ?? 0);
}

// queryEvents is a generic paginated query used by all explorer pages.
export async function queryEvents(opts: {
  orgId: string;
  eventType?: string;
  severity?: string;
  search?: string;
  limit?: number;
  offset?: number;
  from?: string;
  to?: string;
}): Promise<EventRow[]> {
  const {
    orgId,
    eventType,
    severity,
    search,
    limit = 50,
    offset = 0,
    from,
    to,
  } = opts;

  const conditions: string[] = [
    "organization_id = {orgId: String}",
  ];

  if (eventType) conditions.push("event_type = {eventType: String}");
  if (severity) conditions.push("severity = {severity: String}");
  if (search) conditions.push("message ILIKE {search: String}");
  if (from) conditions.push("timestamp >= {from: DateTime64(3)}");
  if (to) conditions.push("timestamp <= {to: DateTime64(3)}");

  const result = await clickhouse.query({
    query: `
      SELECT *
      FROM watcher.events
      WHERE ${conditions.join(" AND ")}
      ORDER BY timestamp DESC
      LIMIT {limit: UInt32}
      OFFSET {offset: UInt32}
    `,
    query_params: {
      orgId,
      eventType: eventType ?? "",
      severity: severity ?? "",
      search: search ? `%${search}%` : "",
      limit,
      offset,
      from: from ?? "",
      to: to ?? "",
    },
    format: "JSONEachRow",
  });

  return result.json<EventRow>();
}
