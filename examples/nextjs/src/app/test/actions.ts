"use server";
// Server Actions for the SDK test page.
// Each action fires a real event through the server-side Watcher client
// and returns a serializable result so the client can update its event log.

import { watcher } from "@/lib/watcher";

export interface ActionResult {
  ok: true;
  type: "audit" | "log" | "trace" | "metric";
  eventType: string;
  severity?: string;
  sentAt: string;
}

export async function serverAudit(eventType: string): Promise<ActionResult> {
  watcher.audit(eventType, {
    userId: "test-user",
    payload: { source: "test-page", triggeredAt: new Date().toISOString() },
  });
  return { ok: true, type: "audit", eventType, sentAt: new Date().toISOString() };
}

export async function serverLog(severity: string, eventType: string): Promise<ActionResult> {
  watcher.log(severity, eventType, {
    payload: { source: "test-page", triggeredAt: new Date().toISOString() },
  });
  return { ok: true, type: "log", eventType, severity, sentAt: new Date().toISOString() };
}

export async function serverTrace(eventType: string): Promise<ActionResult> {
  const traceId = crypto.randomUUID();
  const spanId = crypto.randomUUID();
  watcher.trace(eventType, {
    userId: "test-user",
    traceId,
    spanId,
    payload: { source: "test-page", traceId, spanId, triggeredAt: new Date().toISOString() },
  });
  return { ok: true, type: "trace", eventType, sentAt: new Date().toISOString() };
}

export async function serverMetric(eventType: string, value: number): Promise<ActionResult> {
  watcher.metric(eventType, {
    payload: { value, source: "test-page", triggeredAt: new Date().toISOString() },
  });
  return { ok: true, type: "metric", eventType, sentAt: new Date().toISOString() };
}
