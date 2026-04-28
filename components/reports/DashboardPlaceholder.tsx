"use client";

import { AlertCircle, BarChart2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SECTION_META } from "./ReportNav";
import type { ReportSection } from "@/hooks/useReportFilters";

// ── Skeleton primitives ────────────────────────────────────────────────────

function SkeletonBlock({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-slate-800/60 ${className ?? ""}`}
      style={style}
    />
  );
}

function KPICardSkeleton() {
  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 flex flex-col gap-2 min-w-0">
      <SkeletonBlock className="h-3 w-24" />
      <SkeletonBlock className="h-7 w-16 mt-1" />
      <SkeletonBlock className="h-2.5 w-20" />
    </div>
  );
}

function ChartAreaSkeleton({ label, tall = false }: { label: string; tall?: boolean }) {
  return (
    <div
      className={`bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 flex flex-col gap-3 ${tall ? "row-span-2" : ""}`}
    >
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-3 w-28" />
        <SkeletonBlock className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex-1 flex items-end gap-1 pt-2" style={{ minHeight: tall ? 160 : 100 }}>
        {Array.from({ length: tall ? 12 : 7 }).map((_, i) => (
          <SkeletonBlock
            key={i}
            className="flex-1 rounded-md"
            style={{ height: `${Math.round(Math.max(12, 30 + Math.sin(i * 0.9) * 28 + Math.sin(i * 2.1 + 1) * 18))}%` }}
          />
        ))}
      </div>
      <p className="text-xs text-slate-600 text-center">{label}</p>
    </div>
  );
}

function TableSkeleton({ label, rows = 5 }: { label: string; rows?: number }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-3 w-32" />
        <SkeletonBlock className="h-6 w-20 rounded-lg" />
      </div>
      <div className="flex flex-col gap-2">
        {/* Header row */}
        <div className="flex items-center gap-4 pb-2 border-b border-slate-700/40">
          {[40, 20, 20, 20].map((w, i) => (
            <SkeletonBlock key={i} className="h-2.5 rounded" style={{ width: `${w}%` }} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-1">
            {[40, 20, 20, 20].map((w, j) => (
              <SkeletonBlock
                key={j}
                className="h-2.5 rounded"
                style={{ width: `${w - (j === 0 ? 5 * (i % 3) : 0)}%`, opacity: 1 - i * 0.08 }}
              />
            ))}
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-600 text-center">{label}</p>
    </div>
  );
}

// ── Section-specific skeleton grids ───────────────────────────────────────

const SECTION_SKELETON_CONFIG: Record<
  ReportSection,
  { kpis: number; charts: { label: string; tall?: boolean }[]; tables: string[] }
> = {
  overview:  { kpis: 8, charts: [{ label: "Pipeline Funnel" }, { label: "Revenue Trend (6 mo)", tall: true }], tables: ["Top Leads by AI Score", "Recent Campaigns"] },
  sales:     { kpis: 6, charts: [{ label: "Stage Funnel" }, { label: "Deal Velocity" }, { label: "Win / Loss" }], tables: ["Top Deals", "Rep Performance"] },
  leads:     { kpis: 6, charts: [{ label: "Score Distribution" }, { label: "Lifecycle Stages" }, { label: "Source Breakdown" }], tables: ["Top Scored Leads", "Score Band Summary"] },
  campaigns: { kpis: 6, charts: [{ label: "Send Funnel" }, { label: "Channel Breakdown" }], tables: ["Campaign Performance", "Suppression Stats"] },
  ai:        { kpis: 6, charts: [{ label: "Score Distribution" }, { label: "Scoring Coverage" }, { label: "Brief Coverage" }], tables: ["Top AI-Scored Leads", "Score Band Conversion"] },
  quality:   { kpis: 6, charts: [{ label: "Data Completeness" }], tables: ["Completeness by Field", "Entity Health"] },
  activity:  { kpis: 2, charts: [{ label: "Activity by Type" }, { label: "30-Day Timeline", tall: true }], tables: ["Top Actors", "Campaign Activity"] },
  custom:    { kpis: 0, charts: [], tables: [] },
};

function DashboardSkeleton({ section }: { section: ReportSection }) {
  const config = SECTION_SKELETON_CONFIG[section];
  return (
    <div className="space-y-4">
      {/* KPI row */}
      {config.kpis > 0 && (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${Math.min(config.kpis, 4)}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: config.kpis }).map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>
      )}
      {/* Charts row */}
      {config.charts.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {config.charts.map((c, i) => (
            <ChartAreaSkeleton key={i} label={c.label} tall={c.tall} />
          ))}
        </div>
      )}
      {/* Tables */}
      {config.tables.map((t, i) => (
        <TableSkeleton key={i} label={t} />
      ))}
    </div>
  );
}

// ── Custom dashboards empty state ─────────────────────────────────────────

function CustomDashboardsEmpty({ onCreate }: { onCreate?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-16 h-16 bg-slate-800/60 rounded-2xl flex items-center justify-center">
        <BarChart2 className="w-8 h-8 text-slate-600" />
      </div>
      <div className="text-center max-w-sm">
        <h3 className="text-sm font-semibold text-slate-300 mb-1">No custom dashboards yet</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Build a custom dashboard by choosing widgets from any report section. Pin the metrics that matter most to your team.
        </p>
      </div>
      <Button
        size="sm"
        onClick={onCreate}
        className="mt-2 bg-orange-500 hover:bg-orange-600 text-white text-xs gap-1.5"
      >
        Create your first dashboard
      </Button>
    </div>
  );
}

// ── Error state ───────────────────────────────────────────────────────────

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-red-400" />
      </div>
      <div className="text-center max-w-sm">
        <h3 className="text-sm font-semibold text-slate-300 mb-1">Failed to load report</h3>
        <p className="text-xs text-slate-500">{message}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRetry}
        className="gap-1.5 text-slate-400 hover:text-slate-100"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Try again
      </Button>
    </div>
  );
}

// ── "Coming soon" shell ready state ───────────────────────────────────────

function ShellReadyState({ section }: { section: ReportSection }) {
  const meta = SECTION_META[section];
  const Icon = meta.icon;
  return (
    <div className="space-y-4">
      {/* Section banner */}
      <div className="flex items-center gap-3 p-4 bg-slate-800/30 border border-slate-700/40 rounded-xl">
        <div className="w-9 h-9 bg-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon className="w-4.5 h-4.5 text-orange-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-200">{meta.label}</p>
          <p className="text-xs text-slate-500 mt-0.5">{meta.description}</p>
        </div>
        <div className="ml-auto flex-shrink-0">
          <span className="px-2.5 py-1 text-xs bg-orange-500/10 text-orange-400 rounded-full border border-orange-500/20 font-medium">
            Shell ready · widgets coming
          </span>
        </div>
      </div>

      {/* Placeholder grid */}
      <DashboardSkeleton section={section} />
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────

interface Props {
  section: ReportSection;
  loading: boolean;
  error: string | null;
  hasData: boolean;
  onRetry: () => void;
  onCreateDashboard?: () => void;
}

export function DashboardPlaceholder({
  section,
  loading,
  error,
  hasData,
  onRetry,
  onCreateDashboard,
}: Props) {
  if (section === "custom" && !hasData && !loading && !error) {
    return <CustomDashboardsEmpty onCreate={onCreateDashboard} />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  if (loading) {
    return <DashboardSkeleton section={section} />;
  }

  // Shell ready — no widgets built yet (Phase 1)
  return <ShellReadyState section={section} />;
}
