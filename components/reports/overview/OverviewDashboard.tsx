"use client";

import { TrendingUp, TrendingDown, Minus, Users, Building2, Handshake, DollarSign, Megaphone, Brain } from "lucide-react";
import type { OverviewReport, KPITile, Insight, TopLead, CampaignSummaryItem } from "@/components/reports/types";
import { fmtKPI } from "@/components/reports/types";
import { WidgetCard, WidgetEmpty, LegendDot } from "@/components/reports/WidgetCard";
import { LineChart } from "@/components/reports/charts/LineChart";
import { FunnelChart } from "@/components/reports/charts/FunnelChart";

// ── KPI Row ────────────────────────────────────────────────────────────────

const KPI_ICONS: Record<string, React.ReactNode> = {
  leads:      <Users className="w-4 h-4" />,
  contacts:   <Users className="w-4 h-4" />,
  companies:  <Building2 className="w-4 h-4" />,
  deals:      <Handshake className="w-4 h-4" />,
  pipeline:   <DollarSign className="w-4 h-4" />,
  forecast:   <DollarSign className="w-4 h-4" />,
  campaigns:  <Megaphone className="w-4 h-4" />,
  ai:         <Brain className="w-4 h-4" />,
};

function iconForKPI(label: string) {
  const l = label.toLowerCase();
  for (const [k, v] of Object.entries(KPI_ICONS)) {
    if (l.includes(k)) return v;
  }
  return <TrendingUp className="w-4 h-4" />;
}

function KPICard({ tile }: { tile: KPITile }) {
  const up   = tile.trend === "up";
  const down = tile.trend === "down";
  const TrendIcon = up ? TrendingUp : down ? TrendingDown : Minus;
  const trendColor = up ? "text-emerald-400" : down ? "text-red-400" : "text-slate-500";

  return (
    <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4 flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 font-medium truncate">{tile.label}</span>
        <span className="text-slate-500">{iconForKPI(tile.label)}</span>
      </div>
      <div className="text-2xl font-bold text-slate-100 leading-none">
        {fmtKPI(tile.value, tile.format)}
      </div>
      {tile.change != null && (
        <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
          <TrendIcon className="w-3 h-3" />
          <span>
            {tile.change > 0 ? "+" : ""}
            {tile.format === "percent" ? tile.change.toFixed(1) + "%" : fmtKPI(tile.change, tile.format)}
          </span>
          {tile.change_label && (
            <span className="text-slate-500 ml-0.5">{tile.change_label}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Insight Cards ──────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<string, { border: string; dot: string; text: string }> = {
  good:     { border: "border-emerald-500/30", dot: "bg-emerald-400", text: "text-emerald-300" },
  warning:  { border: "border-amber-500/30",   dot: "bg-amber-400",   text: "text-amber-300"   },
  critical: { border: "border-red-500/30",      dot: "bg-red-400",     text: "text-red-300"     },
  info:     { border: "border-slate-600/40",    dot: "bg-blue-400",    text: "text-slate-300"   },
};

function InsightCard({ insight }: { insight: Insight }) {
  const s = SEVERITY_STYLES[insight.severity] ?? SEVERITY_STYLES.info;
  return (
    <div className={`flex items-start gap-2.5 bg-slate-800/30 border ${s.border} rounded-lg p-3`}>
      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${s.dot}`} />
      <div className="min-w-0">
        {insight.metric && (
          <span className={`text-[10px] font-semibold uppercase tracking-wide ${s.text} block mb-0.5`}>
            {insight.metric}
          </span>
        )}
        <p className="text-xs text-slate-300 leading-relaxed">{insight.text}</p>
      </div>
    </div>
  );
}

// ── Top Leads Table ────────────────────────────────────────────────────────

function TopLeadsTable({ leads, onLeadClick }: { leads: TopLead[]; onLeadClick?: (id: number) => void }) {
  if (!leads.length) return <WidgetEmpty message="No top leads to display" />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-700/40">
            <th className="text-left text-slate-500 font-medium pb-2 pr-3">Lead</th>
            <th className="text-right text-slate-500 font-medium pb-2 pr-3">AI Score</th>
            <th className="text-right text-slate-500 font-medium pb-2 pr-3">Deal Size</th>
            <th className="text-left text-slate-500 font-medium pb-2">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/20">
          {leads.map((lead) => (
            <tr
              key={lead.id}
              className="hover:bg-slate-700/20 transition-colors cursor-pointer"
              onClick={() => onLeadClick?.(lead.id)}
            >
              <td className="py-2 pr-3">
                <span className="text-slate-200 font-medium truncate block max-w-[140px]">{lead.name}</span>
                {lead.assigned_to && (
                  <span className="text-slate-500 text-[10px]">{lead.assigned_to}</span>
                )}
              </td>
              <td className="py-2 pr-3 text-right">
                {lead.ai_score != null ? (
                  <span
                    className={`font-semibold ${
                      lead.ai_score >= 80
                        ? "text-emerald-400"
                        : lead.ai_score >= 50
                        ? "text-amber-400"
                        : "text-red-400"
                    }`}
                  >
                    {lead.ai_score}
                  </span>
                ) : (
                  <span className="text-slate-600">—</span>
                )}
              </td>
              <td className="py-2 pr-3 text-right text-slate-300">
                {lead.deal_size ? `$${(lead.deal_size / 1000).toFixed(0)}K` : "—"}
              </td>
              <td className="py-2">
                {lead.status ? (
                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-slate-700/60 text-slate-400">
                    {lead.status}
                  </span>
                ) : (
                  <span className="text-slate-600">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Campaign Summary Table ────────────────────────────────────────────────

function CampaignSummaryTable({ campaigns }: { campaigns: CampaignSummaryItem[] }) {
  if (!campaigns.length) return <WidgetEmpty message="No campaigns to display" />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-700/40">
            <th className="text-left text-slate-500 font-medium pb-2 pr-3">Campaign</th>
            <th className="text-left text-slate-500 font-medium pb-2 pr-3">Type</th>
            <th className="text-right text-slate-500 font-medium pb-2 pr-3">Sent</th>
            <th className="text-left text-slate-500 font-medium pb-2">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/20">
          {campaigns.map((c) => (
            <tr key={c.id} className="hover:bg-slate-700/20 transition-colors">
              <td className="py-2 pr-3">
                <span className="text-slate-200 font-medium truncate block max-w-[140px]">{c.name}</span>
              </td>
              <td className="py-2 pr-3 text-slate-400">{c.type ?? "—"}</td>
              <td className="py-2 pr-3 text-right text-slate-300">
                {c.sent_count != null ? c.sent_count.toLocaleString() : "—"}
                {c.total_recipients ? (
                  <span className="text-slate-600"> / {c.total_recipients.toLocaleString()}</span>
                ) : null}
              </td>
              <td className="py-2">
                {c.status ? (
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      c.status === "active"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : c.status === "completed"
                        ? "bg-slate-700/60 text-slate-400"
                        : "bg-amber-500/20 text-amber-400"
                    }`}
                  >
                    {c.status}
                  </span>
                ) : (
                  <span className="text-slate-600">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────

interface Props {
  data: OverviewReport;
  onDealStageClick?: (stage: string) => void;
  onLeadClick?: (id: number) => void;
}

export function OverviewDashboard({ data, onDealStageClick, onLeadClick }: Props) {
  const funnelStages = data.pipeline_funnel.labels.map((label, i) => ({
    label,
    value: data.pipeline_funnel.series[0]?.data[i] ?? 0,
  }));

  return (
    <div className="flex flex-col gap-5">
      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {data.kpis.map((tile, i) => (
          <KPICard key={i} tile={tile} />
        ))}
      </div>

      {/* Row 2: Pipeline Funnel + Revenue Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <WidgetCard
          title="Pipeline Health"
          description="Deals by stage"
          action={onDealStageClick ? { label: "View Sales", onClick: () => onDealStageClick("") } : undefined}
        >
          {funnelStages.length ? (
            <FunnelChart
              stages={funnelStages}
              onStageClick={(s) => onDealStageClick?.(s.label)}
            />
          ) : (
            <WidgetEmpty />
          )}
        </WidgetCard>

        <WidgetCard
          title="Revenue Trend"
          description="Closed revenue over time"
          headerRight={
            <div className="flex items-center gap-3">
              {data.revenue_trend.series.map((s, i) => (
                <LegendDot key={i} color={s.color ?? "#f97316"} label={s.label} />
              ))}
            </div>
          }
        >
          <LineChart data={data.revenue_trend} height={180} showArea />
        </WidgetCard>
      </div>

      {/* Row 3: Insights + Top Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <WidgetCard title="AI Insights" description="Automated observations" className="lg:col-span-2">
          {data.insights.length ? (
            <div className="flex flex-col gap-2">
              {data.insights.slice(0, 6).map((ins, i) => (
                <InsightCard key={i} insight={ins} />
              ))}
            </div>
          ) : (
            <WidgetEmpty message="No insights available" />
          )}
        </WidgetCard>

        <WidgetCard
          title="Top Leads"
          description="Highest-scoring opportunities"
          className="lg:col-span-3"
          action={{ label: "View all", onClick: () => {} }}
        >
          <TopLeadsTable leads={data.top_leads} onLeadClick={onLeadClick} />
        </WidgetCard>
      </div>

      {/* Row 4: Campaign Summary */}
      <WidgetCard
        title="Campaign Summary"
        description="Recent campaign performance"
        action={{ label: "View all", onClick: () => {} }}
      >
        <CampaignSummaryTable campaigns={data.campaign_summary} />
      </WidgetCard>
    </div>
  );
}
