"use client";

import { useState } from "react";
import { fmtAxis, chartColor } from "@/components/reports/types";

export interface HBarRow {
  label: string;
  value: number;
  subValue?: number;
  subLabel?: string;
  color?: string;
}

interface Props {
  rows: HBarRow[];
  maxValue?: number;
  showRank?: boolean;
  onRowClick?: (row: HBarRow) => void;
}

export function HorizontalBars({ rows, maxValue, showRank = false, onRowClick }: Props) {
  const [hov, setHov] = useState<number | null>(null);

  if (!rows.length)
    return <p className="text-xs text-slate-500 text-center py-6">No data</p>;

  const max = maxValue ?? Math.max(...rows.map((r) => r.value), 1);

  return (
    <div className="flex flex-col gap-2 w-full">
      {rows.map((row, i) => {
        const pct = Math.max(2, (row.value / max) * 100);
        const color = row.color ?? chartColor(i);
        const isHov = hov === i;

        return (
          <div
            key={i}
            className={`flex items-center gap-2 ${onRowClick ? "cursor-pointer" : "cursor-default"}`}
            onMouseEnter={() => setHov(i)}
            onMouseLeave={() => setHov(null)}
            onClick={() => onRowClick?.(row)}
          >
            {showRank && (
              <span className="text-[10px] text-slate-600 w-4 text-right flex-shrink-0">
                {i + 1}
              </span>
            )}
            <span
              className="text-xs text-slate-400 truncate flex-shrink-0"
              style={{ width: 88 }}
              title={row.label}
            >
              {row.label}
            </span>
            <div className="flex-1 h-5 bg-slate-800 rounded-sm overflow-hidden relative">
              <div
                className="h-full rounded-sm transition-all duration-200"
                style={{
                  width: `${pct}%`,
                  background: color,
                  opacity: isHov ? 1 : 0.72,
                }}
              />
              {isHov && (
                <span className="absolute right-1.5 top-0 bottom-0 flex items-center text-[10px] text-white font-semibold">
                  {fmtAxis(row.value)}
                </span>
              )}
            </div>
            <span className="text-xs text-slate-300 font-semibold w-10 text-right flex-shrink-0">
              {fmtAxis(row.value)}
            </span>
            {row.subValue != null && (
              <span className="text-[10px] text-slate-500 w-14 text-right flex-shrink-0">
                {row.subLabel ?? ""} {fmtAxis(row.subValue)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
