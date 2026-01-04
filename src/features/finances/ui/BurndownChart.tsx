"use client";

import { useMemo, useRef, useState } from "react";

import type { FinanceTransaction, IsoMonth } from "../financesTypes";
import { formatEurFromCents, clampInt } from "../financesFormat";
import { buildDailySeries, buildCumulativeBurndown } from "../financesSelectors";

type Props = {
  month: IsoMonth;
  transactions: FinanceTransaction[];
  forecastMode: boolean;
  forecastExtraOutflowCents: number; // positive
  onForecastExtraChange: (cents: number) => void;
};

type Point = { day: string; y: number; outflow: number };

export function BurndownChart(props: Props) {
  const width = 920;
  const height = 220;
  const pad = { l: 12, r: 12, t: 10, b: 26 };

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const series = useMemo(() => {
    const daily = buildDailySeries(props.transactions, props.month);
    const outflowDaily = daily.map((d) => ({ day: d.day, spentOutflowCents: d.spentOutflowCents }));
    const cum = buildCumulativeBurndown(outflowDaily);

    const days = cum.map((c) => c.day);
    const cumulative = cum.map((c) => c.cumulativeOutflowCents);

    const last = cumulative[cumulative.length - 1] ?? 0;
    const maxY = Math.max(1, Math.max(...cumulative) + Math.max(0, props.forecastExtraOutflowCents));
    const projectedEnd = last + Math.max(0, props.forecastExtraOutflowCents);

    return { days, cumulative, last, maxY, projectedEnd };
  }, [props.transactions, props.month, props.forecastExtraOutflowCents]);

  const x0 = pad.l;
  const x1 = width - pad.r;
  const y0 = pad.t;
  const y1 = height - pad.b;

  function xAt(i: number) {
    const n = Math.max(1, series.days.length - 1);
    const t = i / n;
    return x0 + t * (x1 - x0);
  }

  function yAt(cumOutflow: number) {
    const t = cumOutflow / series.maxY;
    return y1 - t * (y1 - y0);
  }

  const points: Point[] = series.days.map((day, i) => ({
    day,
    y: yAt(series.cumulative[i] ?? 0),
    outflow: series.cumulative[i] ?? 0,
  }));

  // Ghost band (normalidad): derivado del max actual
  const band = {
    min: Math.round(series.maxY * 0.55),
    max: Math.round(series.maxY * 0.85),
  };

  const pathActual = (() => {
    if (!points.length) return "";
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  })();

  const projectedLine = (() => {
    const n = points.length;
    if (n < 2) return "";

    const lastIdx = n - 1;
    const xA = xAt(lastIdx);
    const yA = yAt(series.cumulative[lastIdx] ?? 0);

    const xB = x1;
    const yB = yAt(series.projectedEnd);

    return `M ${xA.toFixed(2)} ${yA.toFixed(2)} L ${xB.toFixed(2)} ${yB.toFixed(2)}`;
  })();

  const handle = { x: x1, y: yAt(series.projectedEnd) };

  function nearestIndex(clientX: number): number {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const x = clientX - rect.left;
    const t = (x - x0) / Math.max(1, x1 - x0);
    return clampInt(Math.round(t * (points.length - 1)), 0, Math.max(0, points.length - 1));
  }

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    setHoverIdx(nearestIndex(e.clientX));
  }

  function onLeave() {
    setHoverIdx(null);
  }

  function onDownHandle(e: React.MouseEvent) {
    if (!props.forecastMode) return;
    e.preventDefault();
    setDragging(true);
  }

  function onUp() {
    setDragging(false);
  }

  function onMoveDrag(e: React.MouseEvent<SVGSVGElement>) {
    if (!dragging || !props.forecastMode) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const y = e.clientY - rect.top;
    const clampedY = clampInt(y, y0, y1);

    const t = (y1 - clampedY) / Math.max(1, y1 - y0);
    const projected = Math.round(t * series.maxY);

    const extra = Math.max(0, projected - series.last);
    props.onForecastExtraChange(extra);
  }

  const tooltip = (() => {
    if (hoverIdx === null) return null;
    if (hoverIdx < 0 || hoverIdx >= points.length) return null;
    const p = points[hoverIdx];
    if (!p) return null;

    const x = xAt(hoverIdx);
    const y = p.y;

    const dayIdx = Math.max(1, hoverIdx);
    const projectedAtEnd = Math.round((p.outflow / dayIdx) * (points.length - 1));

    return { x, y, day: p.day, outflow: p.outflow, projectedAtEnd };
  })();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">Burn-down (gasto acumulado)</div>
        {props.forecastMode ? (
          <div className="text-xs text-fh-muted">Forecast mode activo — arrastra el punto del final para simular</div>
        ) : (
          <div className="text-xs text-fh-muted">Hover para detalles diarios</div>
        )}
      </div>

      <div className="rounded-2xl border border-fh-border bg-fh-surface p-3">
        <svg
          ref={svgRef}
          width="100%"
          viewBox={`0 0 ${width} ${height}`}
          className="block h-[220px] w-full"
          onMouseMove={(e) => {
            onMove(e);
            onMoveDrag(e);
          }}
          onMouseLeave={onLeave}
          onMouseUp={onUp}
        >
          <rect
            x={x0}
            y={yAt(band.max)}
            width={x1 - x0}
            height={yAt(band.min) - yAt(band.max)}
            fill="currentColor"
            opacity="0.06"
            className="text-fh-muted"
          />

          <line x1={x0} y1={y1} x2={x1} y2={y1} stroke="currentColor" opacity="0.18" className="text-fh-muted" />

          <path d={pathActual} fill="none" stroke="currentColor" strokeWidth="2.2" className="text-fh-text" opacity="0.9" />

          <path d={projectedLine} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="6 6" opacity="0.55" className="text-fh-muted" />

          <circle
            cx={handle.x}
            cy={handle.y}
            r={6}
            fill="currentColor"
            className={props.forecastMode ? "text-fh-accent" : "text-fh-muted"}
            opacity={props.forecastMode ? 0.95 : 0.35}
            onMouseDown={onDownHandle}
          />

          {tooltip ? (
            <>
              <line x1={tooltip.x} y1={y0} x2={tooltip.x} y2={y1} stroke="currentColor" opacity="0.15" className="text-fh-muted" />
              <circle cx={tooltip.x} cy={tooltip.y} r={4} fill="currentColor" className="text-fh-accent" opacity="0.9" />
            </>
          ) : null}
        </svg>

        {tooltip ? (
          <div className="mt-2 grid gap-1 text-xs text-fh-muted md:grid-cols-3">
            <div>
              <span className="font-medium text-fh-text">{tooltip.day}</span>
            </div>
            <div>
              Acumulado: <span className="font-medium text-fh-text">{formatEurFromCents(tooltip.outflow)}</span>
            </div>
            <div>
              Proyección fin de mes:{" "}
              <span className="font-medium text-fh-text">{formatEurFromCents(tooltip.projectedAtEnd + props.forecastExtraOutflowCents)}</span>
            </div>
          </div>
        ) : (
          <div className="mt-2 text-xs text-fh-muted">
            Normalidad (3M): banda gris sutil — te muestra tu rango típico sin alertas rojas.
          </div>
        )}
      </div>
    </div>
  );
}