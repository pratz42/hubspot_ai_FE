"use client";

import { ShieldCheck } from "lucide-react";
import type {
  DataQualityReport,
  CompletenessRow,
  EntityHealthRow,
  SuppressionSummary,
} from "@/components/reports/types";
import { chartColor } from "@/components/reports/types";
import { WidgetCard, WidgetEmpty, KPICard } from "@/components/reports/WidgetCard";
import { BarChart } from "@/components/reports/charts/BarChart";
import { exportCSV } from "@/components/reports/exportCSV";

// ── Field Completeness Table ────────────────────────────────────────────────

function CompletenessBar({ pct }: { pct: number }) {
  const color =
    pct >= 90 ? "#34d399" :
    pct >= 70 ? "#fbbf24" :
                "#f87171";
  const label =
    pct >= 90 ? "Good" :
    pct >= 70 ? "Fair" :
                "Poor";
  const labelColor =
    pct >= 90 ? "text-emerald-400" :
    pct >= 70 ? "text-amber-400"   :
                "text-red-400";

  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.max(1, pct)}%`, background: color }}
        />
      </div>
      <span className={`text-[10px] font-semibold w-8 text-right ${labelColor}`}>
        {pct.toFixed(0)}%
      </span>
      <span className={`text-[10px] w-6 ${labelColor}`}>{label}</span>
    </div>
  );
}

function CompletenessTable({ rows }: { rows: CompletenessRow[] }) {
  if (!rows.length) return <WidgetEmpty message="No field completeness data" />;

  const sorted = [...rows].sort((a, b) => a.completeness_pct - b.completeness_pct);

  const handleExport = () => {
    exportCSV(
      ["Field", "Entity", "Completeness %", "Total", "Missing"],
      sorted.map((r) => [r.field, r.entity, r.completeness_pct, r.total_count, r.missing_count]),
      "field-completeness.csv",
    );
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">
          Sorted by completeness (worst first)
        </p>
        <button
          onClick={handleExport}
          className="text-[10px] text-orange-400 hover:text-orange-300 font-medium transition-colors"
        >
          Export CSV
        </button>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-700/40">
            <th className="text-left text-slate-500 font-medium pb-2 pr-3 w-36">Field</th>
            <th className="text-left text-slate-500 font-medium pb-2 pr-3 w-20">Entity</th>
            <th className="text-slate-500 font-medium pb-2 pr-3">Completeness</th>
            <th className="text-right text-slate-500 font-medium pb-2 pr-3">Total</th>
            <th className="text-right text-slate-500 font-medium pb-2">Missing</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/20">
          {sorted.map((row, i) => (
            <tr key={i} className="hover:bg-slate-700/20 transition-colors">
              <td className="py-2 pr-3">
                <span className="text-slate-200 font-medium">{row.field}</span>
              </td>
              <td className="py-2 pr-3 text-slate-500 capitalize">{row.entity}</td>
              <td className="py-2 pr-3">
                <CompletenessBar pct={row.completeness_pct} />
              </td>
              <td className="py-2 pr-3 text-right text-slate-400">
                {row.total_count.toLocaleString()}
              </td>
              <td className="py-2 text-right">
                <span
                  className={`font-semibold ${
                    row.missing_count === 0   ? "text-slate-600" :
                    row.completeness_pct < 70 ? "text-red-400"   :
                                               "text-amber-400"
                  }`}
                >
                  {row.missing_count.toLocaleString()}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Suppression Summary Card ───────────────────────────────────────────────

function SuppressionCard({ summary }: { summary: SuppressionSummary }) {
  const reasons = Object.entries(summary.by_reason ?? {}).sort(([, a], [, b]) => b - a);
  const maxReason = Math.max(...reasons.map(([, v]) => v), 1);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-slate-100">
            {summary.total_suppressed.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">total suppressed records</p>
        </div>
        {summary.suppression_rate != null && (
          <div className="text-right">
            <p
              className={`text-lg font-bold ${
                summary.suppression_rate > 10 ? "text-red-400" :
                summary.suppression_rate > 5  ? "text-amber-400" :
                                               "text-emerald-400"
              }`}
            >
              {summary.suppression_rate.toFixed(1)}%
            </p>
            <p className="text-[10px] text-slate-500">suppression rate</p>
          </div>
        )}
      </div>

      {reasons.length > 0 && (
        <div className="mt-1 flex flex-col gap-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">By reason</p>
          {reasons.map(([reason, count], i) => (
            <div key={reason} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-sm flex-shrink-0"
                style={{ background: chartColor(i) }}
              />
              <span className="text-xs text-slate-400 flex-1 truncate capitalize">
                {reason.replace(/_/g, " ")}
              </span>
              <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(count / maxReason) * 100}%`,
                    background: chartColor(i),
                    opacity: 0.8,
                  }}
                />
              </div>
              <span className="text-xs text-slate-300 font-semibold w-10 text-right">
                {count.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Entity Health Table ────────────────────────────────────────────────────

function EntityHealthTable({ rows }: { rows: EntityHealthRow[] }) {
  if (!rows.length) return <WidgetEmpty message="No entity health data" />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-700/40">
            <th className="text-left text-slate-500 font-medium pb-2 pr-3">Entity</th>
            <th className="text-right text-slate-500 font-medium pb-2 pr-3">Records</th>
            <th className="text-slate-500 font-medium pb-2 pr-3">Health</th>
            <th className="text-right text-slate-500 font-medium pb-2">Issues</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/20">
          {rows.map((row, i) => {
            const hs = row.health_score;
            const healthColor =
              hs >= 90 ? "#34d399" :
              hs >= 70 ? "#fbbf24" :
                         "#f87171";
            const issueColor =
              row.issues_count === 0   ? "text-slate-600" :
              hs < 70                  ? "text-red-400"   :
                                         "text-amber-400";

            return (
              <tr key={i} className="hover:bg-slate-700/20 transition-colors">
                <td className="py-2 pr-3">
                  <span className="text-slate-200 font-medium capitalize">{row.entity}</span>
                </td>
                <td className="py-2 pr-3 text-right text-slate-300">
                  {row.total_count.toLocaleString()}
                </td>
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.max(1, hs)}%`, background: healthColor }}
                      />
                    </div>
                    <span className="text-[10px] font-bold w-8 text-right" style={{ color: healthColor }}>
                      {hs}%
                    </span>
                  </div>
                </td>
                <td className={`py-2 text-right font-semibold ${issueColor}`}>
                  {row.issues_count.toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────

interface Props {
  data: DataQualityReport;
}

export function DataQualityDashboard({ data }: Props) {
  return (
    <div className="flex flex-col gap-5">
      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {data.kpis.map((tile, i) => (
          <KPICard key={i} tile={tile} icon={<ShieldCheck className="w-4 h-4" />} />
        ))}
      </div>

      {/* Row 2: Missing Data Breakdown (2/3) + Suppression Summary (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <WidgetCard
          title="Missing Data by Entity"
          description="Volume of missing critical fields per record type"
          className="lg:col-span-2"
          headerRight={
            <div className="flex items-center gap-3">
              {data.missing_data_breakdown.series.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color ?? chartColor(i) }} />
                  <span className="text-xs text-slate-400">{s.label}</span>
                </div>
              ))}
            </div>
          }
        >
          {data.missing_data_breakdown.labels.length ? (
            <BarChart data={data.missing_data_breakdown} height={200} grouped />
          ) : (
            <WidgetEmpty />
          )}
        </WidgetCard>

        <WidgetCard
          title="Suppression Summary"
          description="Records excluded from campaigns by reason"
        >
          {data.suppression_summary ? (
            <SuppressionCard summary={data.suppression_summary} />
          ) : (
            <WidgetEmpty message="No suppression data" />
          )}
        </WidgetCard>
      </div>

      {/* Row 3: Field Completeness (full width) */}
      <WidgetCard
        title="Field Completeness"
        description="Data fill rate per field — sorted worst first"
      >
        <CompletenessTable rows={data.completeness_by_field} />
      </WidgetCard>

      {/* Row 4: Entity Health (full width) */}
      <WidgetCard
        title="Entity Health"
        description="Overall data quality score per entity type"
      >
        <EntityHealthTable rows={data.entity_health} />
      </WidgetCard>
    </div>
  );
}
