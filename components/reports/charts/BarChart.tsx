"use client";

import { useState } from "react";
import { fmtAxis, chartColor } from "@/components/reports/types";
import type { ChartData } from "@/components/reports/types";

const W = 560;
const ML = 44, MR = 8, MT = 10, MB = 28;
const CW = W - ML - MR;

interface Props {
  data: ChartData;
  height?: number;
  /** Render multiple series as grouped bars (default) or a single series */
  grouped?: boolean;
}

export function BarChart({ data, height = 180, grouped = false }: Props) {
  const [hover, setHover] = useState<{ bar: number; series: number } | null>(null);
  const { labels, series } = data;

  const CH = height - MT - MB;

  const allVals = series.flatMap((s) => s.data).filter(Number.isFinite);
  if (allVals.length === 0 || labels.length === 0)
    return <p className="text-xs text-slate-500 text-center py-6">No data</p>;

  const maxV = Math.max(...allVals, 1);
  const n = labels.length;
  const sCount = series.length;

  const slotW = CW / n;
  const groupPad = slotW * 0.18;
  const barW = grouped
    ? (slotW - groupPad * 2) / sCount
    : slotW - groupPad * 2;

  const xBarLeft = (barIdx: number, seriesIdx: number) => {
    const slotLeft = barIdx * slotW + groupPad;
    return grouped ? slotLeft + seriesIdx * barW : slotLeft;
  };
  const yOf = (v: number) => CH - (v / maxV) * CH;
  const hOf = (v: number) => (v / maxV) * CH;

  return (
    <div className="relative" onMouseLeave={() => setHover(null)}>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="w-full"
        style={{ height, display: "block" }}
      >
        <g transform={`translate(${ML},${MT})`}>
          {/* Y grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = CH * (1 - t);
            return (
              <g key={t}>
                <line x1={0} x2={CW} y1={y} y2={y} stroke="#1e293b" strokeWidth={1} />
                <text x={-6} y={y + 4} fontSize={9} fill="#475569" textAnchor="end">
                  {fmtAxis(maxV * t)}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {series.map((s, si) => {
            const color = s.color ?? chartColor(si);
            return s.data.map((v, bi) => {
              const isHov =
                hover?.bar === bi && (grouped ? hover.series === si : true);
              const x = xBarLeft(bi, si);
              const y = yOf(v);
              const h = hOf(v);
              return (
                <g key={`${si}-${bi}`}>
                  <rect
                    x={x} y={y} width={barW} height={h}
                    fill={color}
                    opacity={isHov ? 1 : 0.75}
                    rx={3}
                    style={{ cursor: "pointer", transition: "opacity .1s" }}
                    onMouseEnter={() => setHover({ bar: bi, series: si })}
                  />
                  {isHov && (
                    <text
                      x={x + barW / 2}
                      y={y - 4}
                      fontSize={9}
                      fill="#f1f5f9"
                      textAnchor="middle"
                    >
                      {fmtAxis(v)}
                    </text>
                  )}
                </g>
              );
            });
          })}

          {/* X labels */}
          {labels.map((l, i) => (
            <text
              key={i}
              x={i * slotW + slotW / 2}
              y={CH + 18}
              fontSize={9}
              fill="#475569"
              textAnchor="middle"
            >
              {l.length > 9 ? l.slice(0, 9) : l}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}
