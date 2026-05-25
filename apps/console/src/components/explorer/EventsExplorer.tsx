// EventsExplorer — client-side filterable table used by all explorer pages.
// Clicking any row opens EventDetailSheet with the full event payload.
// For trace events that carry a trace_id the sheet offers a "View full trace" link.
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { EventDetailSheet } from "@/components/explorer/EventDetailSheet";
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
import { Eye, RefreshCw, Search } from "lucide-react";

const SEVERITY_OPTIONS = [
  "all",
  "debug",
  "info",
  "warn",
  "error",
  "critical",
] as const;

interface EventsExplorerProps {
  orgId: string;
  eventType: string;
  searchParams: Record<string, string>;
  apiPath: string;
  appId?: string | null;
}

export function EventsExplorer({
  orgId,
  eventType,
  apiPath,
  appId,
}: EventsExplorerProps) {
  const [search, setSearch]               = useState("");
  const [severity, setSeverity]           = useState("all");
  const [page, setPage]                   = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(null);
  const PAGE_SIZE = 50;

  const { data, isFetching, refetch } = useQuery<EventRow[]>({
    queryKey: [apiPath, orgId, eventType, appId, search, severity, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        orgId,
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (appId) params.set("appId", appId);
      if (search) params.set("search", search);
      if (severity !== "all") params.set("severity", severity);
      const res = await fetch(`${apiPath}?${params}`);
      if (!res.ok) throw new Error("Failed to fetch events");
      return res.json();
    },
    placeholderData: (prev) => prev,
  });

  // Columns are defined inside the component so the actions cell can close
  // over setSelectedEvent without prop drilling through ColumnDef.
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
          <Badge variant={severityVariant(s)} className="text-[10px] uppercase">
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
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedEvent(row.original);
          }}
          aria-label="View event details"
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];

  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
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
            <RefreshCw
              className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
          </Button>
        </div>

        {/* Table — onRowClick wires up full-row click; Eye button is the visible affordance */}
        <DataTable
          table={table}
          withPagination={false}
          onRowClick={(row) => setSelectedEvent(row)}
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

      {/* Detail sheet — rendered outside the table div to avoid stacking context issues */}
      <EventDetailSheet
        event={selectedEvent}
        open={selectedEvent !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedEvent(null);
        }}
      />
    </>
  );
}
