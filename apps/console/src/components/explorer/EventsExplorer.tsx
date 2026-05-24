// EventsExplorer — client-side filterable table used by all explorer pages.
// Fetches events from the passed apiPath, supports search + severity filter,
// and paginates client-side over the returned result set.
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, severityVariant } from "@/lib/utils";
import type { EventRow } from "@/lib/clickhouse";
import { Search, RefreshCw } from "lucide-react";

const SEVERITY_OPTIONS = [
  "all",
  "debug",
  "info",
  "warn",
  "error",
  "critical",
] as const;

// Column definition — shared across all explorer pages.
const columns: ColumnDef<EventRow, unknown>[] = [
  {
    accessorKey: "timestamp",
    header: "Time",
    cell: ({ getValue }) => (
      <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
        {formatDate(getValue<string>())}
      </span>
    ),
  },
  {
    accessorKey: "severity",
    header: "Severity",
    cell: ({ getValue }) => {
      const s = getValue<string>();
      return (
        <Badge
          variant={severityVariant(s)}
          className="text-[10px] uppercase"
        >
          {s}
        </Badge>
      );
    },
  },
  {
    accessorKey: "message",
    header: "Message",
    cell: ({ getValue }) => (
      <span className="text-sm max-w-xs block truncate">
        {getValue<string>()}
      </span>
    ),
  },
  {
    accessorKey: "application_id",
    header: "App",
    cell: ({ getValue }) => (
      <span className="text-xs font-mono text-muted-foreground">
        {getValue<string>() || "—"}
      </span>
    ),
  },
  {
    accessorKey: "environment",
    header: "Env",
    cell: ({ getValue }) => (
      <span className="text-xs">{getValue<string>() || "—"}</span>
    ),
  },
  {
    accessorKey: "user_id",
    header: "User",
    cell: ({ getValue }) => {
      const uid = getValue<string>();
      return (
        <span className="text-xs font-mono text-muted-foreground">
          {uid ? uid.slice(0, 8) + "…" : "—"}
        </span>
      );
    },
  },
];

interface EventsExplorerProps {
  orgId: string;
  eventType: string;
  searchParams: Record<string, string>;
  apiPath: string;
}

// EventsExplorer fetches events from the given apiPath and renders a searchable,
// severity-filtered table.  The orgId is passed to the API route as a query param.
export function EventsExplorer({
  orgId,
  eventType,
  apiPath,
}: EventsExplorerProps) {
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const queryKey = [apiPath, orgId, eventType, search, severity, page];

  const { data, isFetching, refetch } = useQuery<EventRow[]>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        orgId,
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (search) params.set("search", search);
      if (severity !== "all") params.set("severity", severity);
      const res = await fetch(`${apiPath}?${params}`);
      if (!res.ok) throw new Error("Failed to fetch events");
      return res.json();
    },
    placeholderData: (prev) => prev,
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search messages…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-8 h-9"
          />
        </div>
        <Select
          value={severity}
          onValueChange={(v) => {
            setSeverity(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-36 h-9">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            {SEVERITY_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "all" ? "All severities" : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-9"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data ?? []}
        isLoading={isFetching && !data}
        emptyMessage={`No ${eventType} events found`}
      />

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {data?.length ?? 0} results
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!data || data.length < PAGE_SIZE}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
