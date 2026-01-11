"use client";

import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type BurndownPoint = {
  date: string;  // YYYY-MM-DD
  value: number; // cumulative net EUR
};

function eur(n: number): string {
  try {
    return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
  } catch {
    return `€${Math.round(n)}`;
  }
}

function shortDay(iso: string): string {
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}`;
}

export function FinancesBurndownChart({ points, height = 260 }: { points: BurndownPoint[]; height?: number }) {
  const data = useMemo(
    () => (points ?? []).map((p) => ({ date: p.date, label: shortDay(p.date), value: p.value })),
    [points],
  );

  if (!data.length) {
    return (
      <div className="h-[260px] rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm font-medium">Evolución mensual</div>
        <div className="mt-1 text-xs text-white/60">Monthly Burndown</div>
        <div className="mt-6 text-sm text-white/60">Aún no hay datos suficientes para graficar.</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">Evolución mensual</div>
          <div className="text-xs text-white/60 truncate">Monthly Burndown</div>
        </div>
        <div className="text-xs text-white/50">EUR</div>
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
              width={56}
              tickFormatter={(v) => eur(Number(v))}
            />
            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.15)" }}
              contentStyle={{ background: "#0B1220", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10 }}
              labelStyle={{ color: "rgba(255,255,255,0.8)" }}
              formatter={(v) => eur(Number(v))}
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
    </div>
  );
}