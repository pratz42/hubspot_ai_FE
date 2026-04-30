"use client";

import { ExternalLink, Info, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KPITile } from "@/components/reports/types";
import { fmtKPI } from "@/components/reports/types";

interface WidgetCardProps {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
  headerRight?: React.ReactNode;
  noPad?: boolean;
  children: React.ReactNode;
}

export function WidgetCard({
  title,
  description,
  action,
  className,
  headerRight,
  noPad = false,
  children,
}: WidgetCardProps) {
  return (
    <div
      className={cn(
        "bg-slate-800/40 border border-slate-700/40 rounded-xl overflow-hidden flex flex-col",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-3.5 pb-3 border-b border-slate-700/30 flex-shrink-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-slate-200 leading-snug">{title}</h3>
          </div>
          {description && (
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          {headerRight}
          {action && (
            <button
              onClick={action.onClick}
              className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 transition-colors font-medium"
            >
              {action.label}
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className={cn("flex-1", !noPad && "p-4")}>{children}</div>
    </div>
  );
}

// ── Inline skeleton / empty helpers used across widget files ───────────────

export function WidgetSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded animate-pulse bg-slate-700/60"
          style={{ width: `${90 - i * 12}%`, opacity: 1 - i * 0.15 }}
        />
      ))}
    </div>
  );
}

export function WidgetEmpty({ message = "No data for this period" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2">
      <Info className="w-5 h-5 text-slate-600" />
      <p className="text-xs text-slate-500">{message}</p>
    </div>
  );
}

/** Shared KPI tile card used across all dashboards. */
export function KPICard({ tile, icon }: { tile: KPITile; icon?: React.ReactNode }) {
  const up   = tile.trend === "up";
  const down = tile.trend === "down";
  const TrendIcon = up ? TrendingUp : down ? TrendingDown : Minus;
  const trendColor = up ? "text-emerald-400" : down ? "text-red-400" : "text-slate-500";

  return (
    <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4 flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 font-medium truncate">{tile.label}</span>
        {icon && <span className="text-slate-500">{icon}</span>}
      </div>
      <div className="text-2xl font-bold text-slate-100 leading-none">
        {fmtKPI(tile.value, tile.format)}
      </div>
      {tile.change != null && (
        <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
          <TrendIcon className="w-3 h-3" />
          <span>
            {tile.change > 0 ? "+" : ""}
            {tile.format === "percent"
              ? tile.change.toFixed(1) + "%"
              : fmtKPI(tile.change, tile.format)}
          </span>
          {tile.change_label && (
            <span className="text-slate-500 ml-0.5">{tile.change_label}</span>
          )}
        </div>
      )}
    </div>
  );
}

/** Thin coloured pill used as a legend swatch. */
export function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}
