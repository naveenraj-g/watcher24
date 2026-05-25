"use client";
// TraceSpanTree — visualises a distributed trace as an interactive span tree.
// Spans are arranged into a parent/child hierarchy via span_id / parent_span_id.
// Clicking a span row opens EventDetailSheet with the full span payload.

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { EventDetailSheet } from "@/components/explorer/EventDetailSheet";
import { severityVariant, formatDate } from "@/lib/utils";
import type { EventRow } from "@/lib/clickhouse";

// ─── Tree model ───────────────────────────────────────────────────────────────

interface SpanNode {
  span: EventRow;
  children: SpanNode[];
  depth: number;
  offsetMs: number;
}

// buildTree converts a flat span list into a parent/child tree.
// Spans without a recognised parent_span_id become roots.
function buildTree(spans: EventRow[]): SpanNode[] {
  const sorted = [...spans].sort(
    (a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const rootTime =
    sorted.length > 0 ? new Date(sorted[0].timestamp).getTime() : 0;

  // Index by span_id. Fall back to a synthetic key for spans with no ID.
  const byKey = new Map<string, SpanNode>();
  sorted.forEach((span, i) => {
    const key = span.span_id || `__span_${i}`;
    byKey.set(key, {
      span,
      children: [],
      depth: 0,
      offsetMs: new Date(span.timestamp).getTime() - rootTime,
    });
  });

  const spanKeys = new Set(byKey.keys());
  const roots: SpanNode[] = [];

  for (const node of byKey.values()) {
    const parentKey = node.span.parent_span_id;
    if (parentKey && spanKeys.has(parentKey)) {
      byKey.get(parentKey)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Assign depths with a depth-first walk.
  function setDepth(node: SpanNode, depth: number) {
    node.depth = depth;
    for (const child of node.children) setDepth(child, depth + 1);
  }
  for (const root of roots) setDepth(root, 0);

  return roots;
}

// flattenTree returns nodes in depth-first order for sequential rendering.
function flattenTree(nodes: SpanNode[]): SpanNode[] {
  const out: SpanNode[] = [];
  function visit(node: SpanNode) {
    out.push(node);
    for (const child of node.children) visit(child);
  }
  for (const root of nodes) visit(root);
  return out;
}

// ─── Span row ─────────────────────────────────────────────────────────────────

function SpanRow({
  node,
  onClick,
}: {
  node: SpanNode;
  onClick: () => void;
}) {
  const indentRem = node.depth * 1.25;
  const offsetLabel =
    node.offsetMs === 0 ? "root" : `+${node.offsetMs}ms`;

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-b-0 group/row"
    >
      {/* Indent spacer */}
      <span style={{ width: `${indentRem}rem`, flexShrink: 0 }} />

      {/* Connector dot */}
      <span className="h-1.5 w-1.5 rounded-full bg-border shrink-0 group-hover/row:bg-primary/60 transition-colors" />

      {/* Time offset — right-aligned in a fixed column */}
      <span className="text-[11px] font-mono text-muted-foreground w-16 text-right shrink-0">
        {offsetLabel}
      </span>

      {/* Severity badge */}
      <Badge
        variant={severityVariant(node.span.severity)}
        className="text-[10px] uppercase shrink-0"
      >
        {node.span.severity}
      </Badge>

      {/* Message — takes all remaining space */}
      <span className="text-sm truncate flex-1 min-w-0">
        {node.span.message}
      </span>

      {/* App ID — truncated on the right */}
      {node.span.application_id && (
        <span className="text-xs font-mono text-muted-foreground shrink-0 truncate max-w-[10rem] hidden sm:block">
          {node.span.application_id}
        </span>
      )}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface TraceSpanTreeProps {
  spans: EventRow[];
}

export function TraceSpanTree({ spans }: TraceSpanTreeProps) {
  const [selectedSpan, setSelectedSpan] = useState<EventRow | null>(null);

  const roots      = buildTree(spans);
  const flatSpans  = flattenTree(roots);
  const totalMs    = flatSpans.at(-1)?.offsetMs ?? 0;
  const firstSpan  = spans[0];

  return (
    <>
      {/* Summary strip */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground mb-6">
        <span>
          <span className="text-foreground font-semibold">{spans.length}</span>{" "}
          {spans.length === 1 ? "span" : "spans"}
        </span>
        {totalMs > 0 && (
          <span>
            <span className="text-foreground font-semibold">{totalMs}ms</span>{" "}
            total
          </span>
        )}
        {firstSpan && (
          <span>{formatDate(firstSpan.timestamp)}</span>
        )}
      </div>

      {/* Span tree table */}
      <div className="rounded-lg border overflow-hidden">
        {/* Column headers */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/40 border-b text-xs font-medium text-muted-foreground">
          <span className="w-16 text-right shrink-0">Offset</span>
          <span className="w-14 shrink-0">Severity</span>
          <span className="flex-1">Span</span>
          <span className="hidden sm:block w-[10rem] shrink-0">App</span>
        </div>

        {flatSpans.length === 0 ? (
          <div className="h-24 flex items-center justify-center text-sm text-muted-foreground">
            No spans found for this trace.
          </div>
        ) : (
          flatSpans.map((node, i) => (
            <SpanRow
              key={`${node.span.span_id}-${i}`}
              node={node}
              onClick={() => setSelectedSpan(node.span)}
            />
          ))
        )}
      </div>

      <EventDetailSheet
        event={selectedSpan}
        open={selectedSpan !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedSpan(null);
        }}
      />
    </>
  );
}
