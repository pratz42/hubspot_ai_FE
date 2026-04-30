"use client";

import { Users } from "lucide-react";
import type {
  LeadsContactsReport,
  TopScoredLead,
  ScoreBandRow,
} from "@/components/reports/types";
import { chartColor } from "@/components/reports/types";
import {
  WidgetCard,
  WidgetEmpty,
  LegendDot,
  KPICard,
} from "@/components/reports/WidgetCard";
import { BarChart } from "@/components/reports/charts/BarChart";
import { DonutChart } from "@/components/reports/charts/DonutChart";
import { HorizontalBars } from "@/components/reports/charts/HorizontalBars";
import type { HBarRow } from "@/components/reports/charts/HorizontalBars";
import type { ReportFilters } from "@/hooks/useReportFilters";

// ── Status colour map ──────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  new:          "#f97316",
  contacted:    "#60a5fa",
  qualified:    "#34d399",
  unqualified:  "#f87171",
  converted:    "#22d399",
  nurturing:    "#a78bfa",
  proposal:     "#fbbf24",
  won:          "#22d399",
  lost:         "#ef4444",
  churned:      "#94a3b8",
};

// ── Score Band Summary Table ───────────────────────────────────────────────

function ScoreBandTable({ rows, onBandClick }: {
  rows: ScoreBandRow[];
  onBandClick?: (band: string) => void;
}) {
  if (!rows.length) return <WidgetEmpty message="No score band data" />;

  const maxCount = Math.max(...rows.map((r) => r.count), 1);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-700/40">
            <th className="text-left text-slate-500 font-medium pb-2 pr-3">Band</th>
            <th className="text-right text-slate-500 font-medium pb-2 pr-3">Leads</th>
            <th className="text-slate-500 font-medium pb-2 pr-3">Share</th>
            <th className="text-right text-slate-500 font-medium pb-2">% of Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/20">
          {rows.map((row, i) => {
            const pct = row.pct ?? 0;
            const barPct = (row.count / maxCount) * 100;
            const barColor = chartColor(i);

            return (
              <tr
                key={i}
                className="hover:bg-slate-700/20 transition-colors cursor-pointer"
                onClick={() => onBandClick?.(row.band)}
              >
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: barColor }} />
                    <span className="text-slate-200 font-medium">{row.label ?? row.band}</span>
                  </div>
                </td>
                <td className="py-2 pr-3 text-right text-slate-300 font-semibold">
                  {row.count.toLocaleString()}
                </td>
                <td className="py-2 pr-3">
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden min-w-[60px]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${barPct}%`, background: barColor, opacity: 0.75 }}
                    />
                  </div>
                </td>
                <td className="py-2 text-right text-slate-400">
                  {pct > 0 ? `${pct.toFixed(1)}%` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Top Scored Leads Table ─────────────────────────────────────────────────

function TopScoredLeadsTable({ leads, onLeadClick }: {
  leads: TopScoredLead[];
  onLeadClick?: (id: number) => void;
}) {
  if (!leads.length) return <WidgetEmpty message="No top-scored leads" />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-700/40">
            <th className="text-left text-slate-500 font-medium pb-2 pr-3">Name</th>
            <th className="text-left text-slate-500 font-medium pb-2 pr-3">Source</th>
            <th className="text-left text-slate-500 font-medium pb-2 pr-3">Lifecycle</th>
            <th className="text-right text-slate-500 font-medium pb-2 pr-3">AI Score</th>
            <th className="text-left text-slate-500 font-medium pb-2">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/20">
          {leads.map((lead) => {
            const score = lead.ai_score ?? 0;
            const scoreColor =
              score >= 80 ? "text-emerald-400" :
              score >= 50 ? "text-amber-400"   :
                            "text-red-400";

            return (
              <tr
                key={lead.id}
                className="hover:bg-slate-700/20 transition-colors cursor-pointer"
                onClick={() => onLeadClick?.(lead.id)}
              >
                <td className="py-2 pr-3">
                  <div className="text-slate-200 font-medium truncate max-w-[130px]">
                    {lead.name}
                  </div>
                  {lead.company && (
                    <div className="text-slate-500 text-[10px] truncate max-w-[130px]">
                      {lead.company}
                    </div>
                  )}
                </td>
                <td className="py-2 pr-3 text-slate-400">{lead.source ?? "—"}</td>
                <td className="py-2 pr-3 text-slate-400">
                  {lead.lifecycle_stage ?? "—"}
                </td>
                <td className={`py-2 pr-3 text-right font-bold ${scoreColor}`}>
                  {lead.ai_score != null ? lead.ai_score : "—"}
                </td>
                <td className="py-2">
                  {lead.status ? (
                    <span
                      className="inline-block px-1.5 py-0.5 rounded text-[10px]"
                      style={{
                        background: `${STATUS_COLORS[lead.status.toLowerCase()] ?? "#475569"}22`,
                        color: STATUS_COLORS[lead.status.toLowerCase()] ?? "#94a3b8",
                      }}
                    >
                      {lead.status}
                    </span>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
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
  data: LeadsContactsReport;
  onFilterDrill?: (key: keyof ReportFilters, value: string) => void;
  onLeadClick?: (id: number) => void;
}

export function LeadsContactsDashboard({ data, onFilterDrill, onLeadClick }: Props) {
  // Build per-row colored bars for status (HorizontalBars supports per-row colors)
  const statusRows: HBarRow[] = (data.lead_status_breakdown.labels ?? []).map(
    (label, i) => ({
      label,
      value: data.lead_status_breakdown.series[0]?.data[i] ?? 0,
      color: STATUS_COLORS[label.toLowerCase()] ?? chartColor(i),
    }),
  );

  const industryRows: HBarRow[] = (data.industry_breakdown.labels ?? []).map(
    (label, i) => ({
      label,
      value: data.industry_breakdown.series[0]?.data[i] ?? 0,
    }),
  );

  return (
    <div className="flex flex-col gap-5">
      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {data.kpis.map((tile, i) => (
          <KPICard key={i} tile={tile} icon={<Users className="w-4 h-4" />} />
        ))}
      </div>

      {/* Row 2: Status | Source | Lifecycle (3 equal cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <WidgetCard
          title="Lead Status Distribution"
          description="Leads grouped by current status"
          action={
            onFilterDrill
              ? { label: "Filter by status", onClick: () => {} }
              : undefined
          }
        >
          {statusRows.length ? (
            <HorizontalBars
              rows={statusRows}
              onRowClick={(row) => onFilterDrill?.("lead_status", row.label)}
            />
          ) : (
            <WidgetEmpty />
          )}
        </WidgetCard>

        <WidgetCard
          title="Source Breakdown"
          description="Where leads and contacts originated"
          headerRight={
            <div className="flex flex-wrap gap-2">
              {data.source_breakdown.labels.slice(0, 3).map((l, i) => (
                <LegendDot key={i} color={chartColor(i)} label={l} />
              ))}
            </div>
          }
        >
          <DonutChart
            data={data.source_breakdown}
            height={160}
            showLegend
          />
        </WidgetCard>

        <WidgetCard
          title="Lifecycle Stage"
          description="Contacts by lifecycle stage"
          headerRight={
            <div className="flex flex-wrap gap-2">
              {data.lifecycle_distribution.labels.slice(0, 3).map((l, i) => (
                <LegendDot key={i} color={chartColor(i)} label={l} />
              ))}
            </div>
          }
        >
          <DonutChart
            data={data.lifecycle_distribution}
            height={160}
            showLegend
          />
        </WidgetCard>
      </div>

      {/* Row 3: AI Score Histogram + Score vs Conversion table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <WidgetCard
          title="AI Score Distribution"
          description="Lead count per score band"
          headerRight={
            <div className="flex items-center gap-3">
              {data.score_distribution.series.map((s, i) => (
                <LegendDot key={i} color={s.color ?? chartColor(i)} label={s.label} />
              ))}
            </div>
          }
        >
          <BarChart data={data.score_distribution} height={180} />
        </WidgetCard>

        <WidgetCard
          title="Score vs Conversion"
          description="Conversion rate and deal size per AI score band"
        >
          <ScoreBandTable
            rows={data.score_band_summary}
            onBandClick={(band) => onFilterDrill?.("ai_score_band", band)}
          />
        </WidgetCard>
      </div>

      {/* Row 4: Industry H-bars + Top Scored Leads table */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <WidgetCard
          title="Industry Breakdown"
          description="Lead volume by industry"
          className="lg:col-span-2"
          action={
            onFilterDrill
              ? { label: "Filter", onClick: () => {} }
              : undefined
          }
        >
          {industryRows.length ? (
            <HorizontalBars rows={industryRows} showRank />
          ) : (
            <WidgetEmpty />
          )}
        </WidgetCard>

        <WidgetCard
          title="Top Scored Leads"
          description="Highest AI-scored open leads"
          className="lg:col-span-3"
          action={{ label: "View all", onClick: () => {} }}
        >
          <TopScoredLeadsTable
            leads={data.top_scored_leads}
            onLeadClick={onLeadClick}
          />
        </WidgetCard>
      </div>
    </div>
  );
}
