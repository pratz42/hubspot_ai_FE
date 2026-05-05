"use client";

import { Brain, CheckCircle2, XCircle, Clock, Zap, AlertTriangle } from "lucide-react";
import type {
  AIEffectivenessReport,
  ScoreBandConversionRow,
  TopAIScoredLead,
  AIJobStats,
} from "@/components/reports/types";
import { chartColor } from "@/components/reports/types";
import { WidgetCard, WidgetEmpty, LegendDot, KPICard } from "@/components/reports/WidgetCard";
import { BarChart } from "@/components/reports/charts/BarChart";
import { DonutChart } from "@/components/reports/charts/DonutChart";
import { exportCSV } from "@/components/reports/exportCSV";
import type { ReportFilters } from "@/hooks/useReportFilters";

// ── Helpers ────────────────────────────────────────────────────────────────

function relativeTime(iso?: string): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** Inject score-band gradient colours into the score_distribution ChartData.
 *  Matches both the leads-contacts band labels AND the AI effectiveness labels. */
function colouriseScoreChart(data: AIEffectivenessReport["score_distribution"]) {
  const BAND_COLORS: Record<string, string> = {
    // AI effectiveness endpoint labels
    "Unscored":        "#94a3b8",
    "0-40":            "#ef4444",
    "41-60":           "#fbbf24",
    "61-79":           "#34d399",
    "80+":             "#22d3ee",
    // leads-contacts endpoint labels (fallback)
    "Low (0-40)":      "#ef4444",
    "Medium (41-60)":  "#fbbf24",
    "High (61-79)":    "#34d399",
    "Very High (80+)": "#22d3ee",
  };
  return {
    ...data,
    series: data.series.map((s) => ({
      ...s,
      color: BAND_COLORS[s.label] ?? s.color,
    })),
  };
}

// ── Score Band Conversion Table ────────────────────────────────────────────

function ScoreBandConversionTable({ rows, onBandClick }: {
  rows: ScoreBandConversionRow[];
  onBandClick?: (band: string) => void;
}) {
  if (!rows.length) return <WidgetEmpty message="No score band data available" />;

  const maxRate = Math.max(...rows.map((r) => r.conversion_rate ?? 0), 1);

  const handleExport = () => {
    exportCSV(
      ["Band", "Lead Count", "Conversion %", "Avg Deal Size"],
      rows.map((r) => [
        r.band,
        r.count,
        r.conversion_rate?.toFixed(1) ?? "",
        r.avg_deal_size ?? "",
      ]),
      "ai-score-band-conversion.csv",
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">
          Conversion lift by score band
        </p>
        <button
          onClick={handleExport}
          className="text-[10px] text-orange-400 hover:text-orange-300 font-medium transition-colors"
        >
          Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700/40">
              <th className="text-left text-slate-500 font-medium pb-2 pr-3">Band</th>
              <th className="text-right text-slate-500 font-medium pb-2 pr-3">Leads</th>
              <th className="text-slate-500 font-medium pb-2 pr-3">Conv. Rate</th>
              <th className="text-right text-slate-500 font-medium pb-2">Avg Deal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/20">
            {rows.map((row, i) => {
              const cr = row.conversion_rate ?? 0;
              const barPct = Math.max(2, (cr / maxRate) * 100);
              const crColor =
                cr >= 30 ? "#34d399" :
                cr >= 15 ? "#fbbf24" :
                cr > 0   ? "#f97316" :
                           "#475569";

              return (
                <tr
                  key={i}
                  className="hover:bg-slate-700/20 transition-colors cursor-pointer"
                  onClick={() => onBandClick?.(row.band)}
                >
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: chartColor(i) }}
                      />
                      <span className="text-slate-200 font-medium">{row.band}</span>
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-right text-slate-300">
                    {row.count.toLocaleString()}
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${barPct}%`, background: crColor }}
                        />
                      </div>
                      <span className="font-semibold w-10 text-right" style={{ color: crColor }}>
                        {cr > 0 ? `${cr.toFixed(1)}%` : "—"}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 text-right text-slate-400">
                    {row.avg_deal_size != null
                      ? row.avg_deal_size >= 1000
                        ? `$${(row.avg_deal_size / 1000).toFixed(0)}K`
                        : `$${row.avg_deal_size.toFixed(0)}`
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── AI Job Stats Panel ─────────────────────────────────────────────────────

function AIJobStatsPanel({ stats }: { stats: AIJobStats }) {
  const successPct = stats.success_rate ?? null;
  const byStatus   = stats.by_status as Record<string, number> | undefined;
  const totalFromStatus = byStatus ? Object.values(byStatus).reduce((a, b) => a + b, 0) : null;

  const isHealthy =
    successPct !== null ? successPct >= 95 :
    byStatus    ? (byStatus["failed"] ?? 0) === 0 :
    null;

  const statusLabel =
    isHealthy === true  ? "Healthy" :
    isHealthy === false ? "Degraded" :
                         "Unknown";
  const statusColor =
    isHealthy === true  ? "text-emerald-400" :
    isHealthy === false ? "text-red-400"      :
                          "text-slate-500";
  const statusBg =
    isHealthy === true  ? "bg-emerald-500/10 border-emerald-500/20" :
    isHealthy === false ? "bg-red-500/10 border-red-500/20"         :
                          "bg-slate-700/30 border-slate-600/30";
  const dotColor =
    isHealthy === true  ? "bg-emerald-400" :
    isHealthy === false ? "bg-red-400"      :
                          "bg-slate-500";

  const totalRuns = stats.total_runs ?? totalFromStatus;

  const statRows: [React.ReactNode, string, string][] = [
    [<Clock key="lr" className="w-3 h-3" />,         "Last run",        relativeTime(stats.last_run)],
    [<Zap key="tr" className="w-3 h-3" />,           "Total runs",      totalRuns?.toLocaleString() ?? "—"],
    [<CheckCircle2 key="sr" className="w-3 h-3" />,  "Success rate",    successPct !== null ? `${successPct.toFixed(1)}%` : "—"],
    [<Brain key="sc" className="w-3 h-3" />,         "Scored (last)",   stats.scored_last_run?.toLocaleString() ?? "—"],
    [<AlertTriangle key="err" className="w-3 h-3" />,"Errors (last)",   stats.errors_last_run !== undefined ? String(stats.errors_last_run) : byStatus ? String(byStatus["failed"] ?? 0) : "—"],
  ];

  // Show by_status breakdown when available
  const statusEntries = byStatus ? Object.entries(byStatus) : [];

  return (
    <div className="flex flex-col gap-1">
      <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-lg border ${statusBg}`}>
        <div className={`w-2 h-2 rounded-full ${dotColor} animate-pulse`} />
        <span className={`text-xs font-semibold ${statusColor}`}>
          AI Scoring Engine — {statusLabel}
        </span>
      </div>

      {statRows.map(([icon, label, value], i) => (
        <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-700/20 last:border-0">
          <div className="flex items-center gap-2 text-slate-500">
            {icon}
            <span className="text-xs text-slate-400">{label}</span>
          </div>
          <span className="text-xs font-semibold text-slate-200">{value}</span>
        </div>
      ))}

      {statusEntries.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-700/30">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-2">
            By job status
          </p>
          {statusEntries.map(([s, n]) => (
            <div key={s} className="flex items-center justify-between py-1">
              <span className="text-[10px] text-slate-400 capitalize">{s}</span>
              <span className={`text-[10px] font-bold ${
                s === "completed" ? "text-emerald-400" :
                s === "failed"    ? "text-red-400"     :
                                    "text-slate-400"
              }`}>{n}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Top AI Scored Leads Table ──────────────────────────────────────────────

function TopAIScoredLeadsTable({ leads, onLeadClick }: {
  leads: TopAIScoredLead[];
  onLeadClick?: (id: number) => void;
}) {
  if (!leads.length) return <WidgetEmpty message="No AI-scored leads to display" />;

  const handleExport = () => {
    exportCSV(
      ["Name", "Company", "AI Score", "Source", "Status", "Lifecycle", "Scored At"],
      leads.map((l) => [
        l.name, l.company ?? "", l.ai_score, l.source ?? "",
        l.status ?? "", l.lifecycle_stage ?? "", l.scored_at ?? "",
      ]),
      "top-ai-scored-leads.csv",
    );
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">
          {leads.length} leads shown
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
            <th className="text-left text-slate-500 font-medium pb-2 pr-3">Lead</th>
            <th className="text-left text-slate-500 font-medium pb-2 pr-3">Source</th>
            <th className="text-left text-slate-500 font-medium pb-2 pr-3">Lifecycle</th>
            <th className="text-right text-slate-500 font-medium pb-2 pr-3">AI Score</th>
            <th className="text-left text-slate-500 font-medium pb-2 pr-3">Status</th>
            <th className="text-right text-slate-500 font-medium pb-2">Scored</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/20">
          {leads.map((lead) => {
            const score = lead.ai_score;
            const scoreColor =
              score >= 80 ? "text-emerald-400" :
              score >= 60 ? "text-cyan-400"    :
              score >= 40 ? "text-amber-400"   :
                            "text-red-400";
            const scoreBg =
              score >= 80 ? "bg-emerald-500/10" :
              score >= 60 ? "bg-cyan-500/10"    :
              score >= 40 ? "bg-amber-500/10"   :
                            "bg-red-500/10";

            return (
              <tr
                key={lead.id}
                className="hover:bg-slate-700/20 transition-colors cursor-pointer"
                onClick={() => onLeadClick?.(lead.id)}
              >
                <td className="py-2 pr-3">
                  <div className="text-slate-200 font-medium truncate max-w-[140px]">{lead.name}</div>
                  {lead.company && (
                    <div className="text-slate-500 text-[10px] truncate max-w-[140px]">{lead.company}</div>
                  )}
                </td>
                <td className="py-2 pr-3 text-slate-400">{lead.source ?? "—"}</td>
                <td className="py-2 pr-3 text-slate-400">{lead.lifecycle_stage ?? "—"}</td>
                <td className="py-2 pr-3 text-right">
                  <span className={`inline-flex items-center justify-center w-9 h-5 rounded text-[11px] font-bold ${scoreBg} ${scoreColor}`}>
                    {score}
                  </span>
                </td>
                <td className="py-2 pr-3 text-slate-400">{lead.status ?? "—"}</td>
                <td className="py-2 text-right text-slate-500 text-[10px]">
                  {relativeTime(lead.scored_at)}
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
  data: AIEffectivenessReport;
  onFilterDrill?: (key: keyof ReportFilters, value: string) => void;
  onLeadClick?: (id: number) => void;
}

export function AIEffectivenessDashboard({ data, onFilterDrill, onLeadClick }: Props) {
  const scoreDist = colouriseScoreChart(data.score_distribution);

  return (
    <div className="flex flex-col gap-5">
      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {data.kpis.map((tile, i) => (
          <KPICard key={i} tile={tile} icon={<Brain className="w-4 h-4" />} />
        ))}
      </div>

      {/* Row 2: Score Distribution | Scoring Coverage | Brief Coverage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <WidgetCard
          title="AI Score Distribution"
          description="Lead count per score band (0 – 100)"
          action={
            onFilterDrill
              ? { label: "Filter by band", onClick: () => {} }
              : undefined
          }
        >
          <BarChart data={scoreDist} height={180} />
        </WidgetCard>

        <WidgetCard
          title="Scoring Coverage"
          description="Scored vs unscored leads and contacts"
          headerRight={
            <div className="flex flex-wrap gap-2">
              {data.scoring_coverage.labels.slice(0, 3).map((l, i) => (
                <LegendDot key={i} color={chartColor(i)} label={l} />
              ))}
            </div>
          }
        >
          <DonutChart data={data.scoring_coverage} height={160} showLegend />
        </WidgetCard>

        <WidgetCard
          title="Strategy Brief Coverage"
          description="Leads with vs without AI-generated briefs"
          headerRight={
            <div className="flex flex-wrap gap-2">
              {data.brief_coverage.labels.slice(0, 3).map((l, i) => (
                <LegendDot key={i} color={chartColor(i)} label={l} />
              ))}
            </div>
          }
        >
          <DonutChart data={data.brief_coverage} height={160} showLegend />
        </WidgetCard>
      </div>

      {/* Row 3: Score Band Conversion (3/5) + AI Job Stats (2/5) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <WidgetCard
          title="Score Band Conversion"
          description="How well each AI score band predicts deals"
          className="lg:col-span-3"
        >
          <ScoreBandConversionTable
            rows={data.score_band_conversion}
            onBandClick={(band) => onFilterDrill?.("ai_score_band", band)}
          />
        </WidgetCard>

        <WidgetCard
          title="AI Engine Status"
          description="Scoring job health and throughput"
          className="lg:col-span-2"
        >
          <AIJobStatsPanel stats={data.ai_job_stats} />
        </WidgetCard>
      </div>

      {/* Row 4: Top AI Scored Leads (full width) */}
      <WidgetCard
        title="Top AI-Scored Leads"
        description="Leads with the highest AI confidence scores"
        action={{ label: "View all leads", onClick: () => {} }}
      >
        <TopAIScoredLeadsTable
          leads={data.top_ai_scored_leads}
          onLeadClick={onLeadClick}
        />
      </WidgetCard>
    </div>
  );
}
