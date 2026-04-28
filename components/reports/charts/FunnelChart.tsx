"use client";

import { useState } from "react";
import { fmtAxis } from "@/components/reports/types";

interface FunnelStage {
  label: string;
  value: number;
  color?: string;
}

interface Props {
  stages: FunnelStage[];
  onStageClick?: (stage: FunnelStage) => void;
}

const GRADIENT = [
  "#ea580c", // orange-600
  "#f97316", // orange-500
  "#fb923c", // orange-400
  "#fdba74", // orange-300
  "#22d399", // emerald (for "won")
  "#f87171", // red (for "lost")
];

export function FunnelChart({ stages, onStageClick }: Props) {
  const [hov, setHov] = useState<number | null>(null);

  if (!stages.length)
    return <p className="text-xs text-slate-500 text-center py-6">No data</p>;

  const maxVal = Math.max(...stages.map((s) => s.value), 1);

  return (
    <div className="flex flex-col gap-1 w-full">
      {stages.map((stage, i) => {
        const pct = Math.max(12, (stage.value / maxVal) * 100);
        const color =
          stage.label.toLowerCase() === "won"
            ? "#22d399"
            : stage.label.toLowerCase() === "lost"
            ? "#f87171"
            : stage.color ?? GRADIENT[i % GRADIENT.length];
        const isHov = hov === i;
        const conversion =
          i > 0 && stages[i - 1].value > 0
            ? `${Math.round((stage.value / stages[i - 1].value) * 100)}%`
            : null;

        return (
          <div key={i} className="w-full flex flex-col items-center gap-0.5">
            {conversion && (
              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <div className="w-px h-3 bg-slate-700" />
                {conversion} conversion
              </div>
            )}
            <div
              className="flex items-center justify-between px-3 py-2 rounded-lg transition-all cursor-pointer select-none"
              style={{
                width: `${pct}%`,
                background: color,
                opacity: isHov ? 1 : 0.85,
                minWidth: "min-content",
                boxShadow: isHov ? `0 0 12px ${color}40` : "none",
              }}
              onMouseEnter={() => setHov(i)}
              onMouseLeave={() => setHov(null)}
              onClick={() => onStageClick?.(stage)}
            >
              <span className="text-white text-xs font-semibold truncate mr-2">
                {stage.label}
              </span>
              <span className="text-white text-xs font-bold whitespace-nowrap">
                {fmtAxis(stage.value)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
