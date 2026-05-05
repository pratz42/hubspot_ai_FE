"use client";

import { useState } from "react";
import { fmtAxis, chartColor } from "@/components/reports/types";
import type { ChartData } from "@/components/reports/types";

const R = 52;
const STROKE = 18;
const CX = 70;
const CY = 70;
const CIRC = 2 * Math.PI * R;

interface Props {
  data: ChartData;
  height?: number;
  showLegend?: boolean;
}

export function DonutChart({ data, height = 160, showLegend = true }: Props) {
  const [hov, setHov] = useState<number | null>(null);
  const { labels, series } = data;

  const values = labels.map((_, i) => series[0]?.data[i] ?? 0);
  const total = values.reduce((a, b) => a + b, 0);

  if (total === 0 || labels.length === 0)
    return <p className="text-xs text-slate-500 text-center py-6">No data</p>;

  let offset = 0;
  const segments = values.map((v, i) => {
    const frac = v / total;
    const dash = frac * CIRC;
    const gap = CIRC - dash;
    const seg = { i, v, label: labels[i], dash, gap, offset, frac };
    offset += dash;
    return seg;
  });

  const size = CX * 2;

  return (
    <div className="flex items-center gap-4">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ flexShrink: 0 }}
      >
        {/* track */}
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke="#1e293b"
          strokeWidth={STROKE}
        />
        {segments.map((seg) => {
          const color = chartColor(seg.i);
          const isHov = hov === seg.i;
          return (
            <circle
              key={seg.i}
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke={color}
              strokeWidth={isHov ? STROKE + 3 : STROKE}
              strokeDasharray={`${seg.dash} ${seg.gap}`}
              strokeDashoffset={-seg.offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${CX} ${CY})`}
              opacity={hov !== null && !isHov ? 0.5 : 1}
              style={{ cursor: "pointer", transition: "stroke-width .12s, opacity .12s" }}
              onMouseEnter={() => setHov(seg.i)}
              onMouseLeave={() => setHov(null)}
            />
          );
        })}
        {/* centre label */}
        {hov !== null ? (
          <>
            <text x={CX} y={CY - 4} textAnchor="middle" fontSize={11} fill="#f1f5f9" fontWeight="700">
              {fmtAxis(segments[hov].v)}
            </text>
            <text x={CX} y={CY + 10} textAnchor="middle" fontSize={8} fill="#94a3b8">
              {Math.round(segments[hov].frac * 100)}%
            </text>
          </>
        ) : (
          <>
            <text x={CX} y={CY - 4} textAnchor="middle" fontSize={11} fill="#f1f5f9" fontWeight="700">
              {fmtAxis(total)}
            </text>
            <text x={CX} y={CY + 10} textAnchor="middle" fontSize={8} fill="#94a3b8">
              total
            </text>
          </>
        )}
      </svg>

      {showLegend && (
        <div className="flex flex-col gap-1.5 min-w-0">
          {segments.map((seg) => {
            const color = chartColor(seg.i);
            return (
              <div
                key={seg.i}
                className="flex items-center gap-1.5 cursor-pointer"
                onMouseEnter={() => setHov(seg.i)}
                onMouseLeave={() => setHov(null)}
              >
                <div
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ background: color }}
                />
                <span className="text-xs text-slate-400 truncate">{seg.label}</span>
                <span className="text-xs text-slate-300 font-semibold ml-auto pl-2">
                  {fmtAxis(seg.v)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
