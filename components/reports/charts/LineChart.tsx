"use client";

import { useState } from "react";
import { fmtAxis, chartColor } from "@/components/reports/types";
import type { ChartData } from "@/components/reports/types";

const W = 560;
const ML = 44, MR = 12, MT = 10, MB = 28;
const CW = W - ML - MR;

/** Build a smooth SVG cubic-bezier path through an array of {x,y} points. */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i - 1].x + pts[i].x) / 2;
    d += ` C${cx.toFixed(1)},${pts[i - 1].y.toFixed(1)} ${cx.toFixed(1)},${pts[i].y.toFixed(1)} ${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)}`;
  }
  return d;
}

interface Props {
  data: ChartData;
  height?: number;
  showArea?: boolean;
}

export function LineChart({ data, height = 180, showArea = true }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const { labels, series } = data;

  const CH = height - MT - MB;

  const allVals = series.flatMap((s) => s.data).filter(Number.isFinite);
  if (allVals.length === 0 || labels.length === 0)
    return <p className="text-xs text-slate-500 text-center py-6">No data</p>;

  const maxV = Math.max(...allVals, 1);
  const minV = Math.min(0, ...allVals);
  const range = maxV - minV || 1;

  const xOf = (i: number) =>
    labels.length > 1 ? (i / (labels.length - 1)) * CW : CW / 2;
  const yOf = (v: number) => CH - ((v - minV) / range) * CH;

  const GRID_TICKS = 4;

  return (
    <div className="relative w-full" onMouseLeave={() => setHover(null)}>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="w-full"
        style={{ height, display: "block" }}
      >
        <g transform={`translate(${ML},${MT})`}>
          {/* Y grid lines */}
          {Array.from({ length: GRID_TICKS + 1 }).map((_, gi) => {
            const frac = gi / GRID_TICKS;
            const y = CH * frac;
            const v = maxV - frac * range;
            return (
              <g key={gi}>
                <line
                  x1={0} x2={CW} y1={y} y2={y}
                  stroke="#1e293b" strokeWidth={1}
                />
                <text x={-6} y={y + 4} fontSize={9} fill="#475569" textAnchor="end">
                  {fmtAxis(v)}
                </text>
              </g>
            );
          })}

          {/* Hover guide */}
          {hover !== null && (
            <line
              x1={xOf(hover)} x2={xOf(hover)} y1={0} y2={CH}
              stroke="#f97316" strokeWidth={1} strokeDasharray="3,3" opacity={0.5}
            />
          )}

          {/* Series */}
          {series.map((s, si) => {
            const color = s.color ?? chartColor(si);
            const pts = s.data.map((v, i) => ({ x: xOf(i), y: yOf(v) }));
            const linePath = smoothPath(pts);
            const areaPath =
              linePath +
              ` L${pts[pts.length - 1].x.toFixed(1)},${CH} L${pts[0].x.toFixed(1)},${CH} Z`;

            return (
              <g key={si}>
                {showArea && (
                  <path d={areaPath} fill={color} opacity={0.07} />
                )}
                <path
                  d={linePath}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {pts.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={hover === i ? 4 : 2.5}
                    fill={color}
                    stroke="#0f172a"
                    strokeWidth={1.5}
                    style={{ cursor: "pointer", transition: "r .1s" }}
                    onMouseEnter={() => setHover(i)}
                  />
                ))}
              </g>
            );
          })}

          {/* X-axis labels */}
          {labels.map((l, i) => (
            <text
              key={i}
              x={xOf(i)}
              y={CH + 18}
              fontSize={9}
              fill="#475569"
              textAnchor="middle"
            >
              {l.length > 7 ? l.slice(0, 7) : l}
            </text>
          ))}

          {/* Hover tooltip */}
          {hover !== null && (() => {
            const tooltipX = Math.min(xOf(hover) + 10, CW - 90);
            const tooltipY = Math.max(
              Math.min(...series.map((s) => yOf(s.data[hover] ?? 0))) - 8,
              2,
            );
            return (
              <g transform={`translate(${tooltipX},${tooltipY})`}>
                <rect
                  x={0} y={0}
                  width={86}
                  height={series.length * 14 + 10}
                  rx={4}
                  fill="#1e293b"
                  stroke="#334155"
                  strokeWidth={1}
                />
                <text x={6} y={11} fontSize={9} fill="#94a3b8" fontWeight="600">
                  {labels[hover]}
                </text>
                {series.map((s, si) => {
                  const color = s.color ?? chartColor(si);
                  const v = s.data[hover];
                  return (
                    <text
                      key={si}
                      x={6}
                      y={22 + si * 13}
                      fontSize={9}
                      fill={color}
                    >
                      {s.label}: {v != null ? fmtAxis(v) : "—"}
                    </text>
                  );
                })}
              </g>
            );
          })()}
        </g>
      </svg>
    </div>
  );
}
