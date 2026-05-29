"use client";

// EventsTrendChart — area chart showing total events vs errors over 24 hours.
import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HourlyBucket } from "@/lib/clickhouse";

interface EventsTrendChartProps {
  data: HourlyBucket[];
}

export function EventsTrendChart({ data }: EventsTrendChartProps) {
  // Sort by hour string so the x-axis always reads 00:00 → 23:00
  const chartData = useMemo(
    () =>
      [...data]
        .sort((a, b) => a.hour.localeCompare(b.hour))
        .map((b) => ({ hour: b.hour, events: b.count, errors: b.error_count })),
    [data],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Events over 24 h</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            No data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="eventsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="errorsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-5)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--chart-5)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid var(--border)", background: "var(--card)" }}
                labelStyle={{ color: "var(--foreground)" }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="events" name="Events" stroke="var(--chart-1)" fill="url(#eventsGradient)" strokeWidth={2} />
              <Area type="monotone" dataKey="errors" name="Errors" stroke="var(--chart-5)" fill="url(#errorsGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
