"use client";

import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card } from "@/ui/components/Card";

export type BurndownPoint = {
  date: string; // YYYY-MM-DD
  value: number; // cumulative net EUR
};

type Props = {
  points: BurndownPoint[];
  height?: number;
  title: string;
  subtitle: string;
  currencyLabel: string;
  emptyTitle: string;
  emptyBody: string;
  formatCurrency: (value: number) => string;
};

function shortDay(iso: string): string {
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}`;
}

export function FinancesBurndownChart({
  points,
  height = 260,
  title,
  subtitle,
  currencyLabel,
  emptyTitle,
  emptyBody,
  formatCurrency,
}: Props) {
  const data = useMemo(
    () => (points ?? []).map((p) => ({ date: p.date, label: shortDay(p.date), value: p.value })),
    [points]
  );

  if (!data.length) {
    return (
      <Card className="h-[260px]">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-fh-muted">{subtitle}</div>
        <div className="mt-6 text-sm text-fh-muted">{emptyBody}</div>
        <div className="sr-only">{emptyTitle}</div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{title}</div>
          <div className="text-xs text-fh-muted truncate">{subtitle}</div>
        </div>
        <div className="text-xs text-fh-muted">{currencyLabel}</div>
      </div>

      <div className="mt-3" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={64}
              tickFormatter={(v) => formatCurrency(Number(v))}
            />
            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.15)" }}
              contentStyle={{ background: "#0B1220", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10 }}
              labelStyle={{ color: "rgba(255,255,255,0.8)" }}
              formatter={(v) => formatCurrency(Number(v))}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="rgba(76,175,80,0.95)"
              strokeWidth={2.2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
