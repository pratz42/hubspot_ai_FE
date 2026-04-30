"use client";

import { Megaphone } from "lucide-react";
import type {
  CampaignsReport,
  CampaignPerformanceRow,
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
import { FunnelChart } from "@/components/reports/charts/FunnelChart";
import type { ReportFilters } from "@/hooks/useReportFilters";

// ── Helpers ────────────────────────────────────────────────────────────────

function pct(num?: number, denom?: number): string {
  if (!num || !denom) return "—";
  return `${((num / denom) * 100).toFixed(1)}%`;
}

function rateColor(rate: number): string {
  return rate >= 30 ? "text-emerald-400" :
         rate >= 15 ? "text-amber-400"   :
         rate >  0  ? "text-red-400"     :
                      "text-slate-600";
}

// ── Suppression Stats Strip ────────────────────────────────────────────────

function SuppressionStrip({ stats }: { stats: CampaignsReport["suppression_stats"] }) {
  if (!stats.length) return null;

  return (
    <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl px-4 py-3">
      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-2">
        Suppression &amp; Deliverability
      </p>
      <div className="flex flex-wrap gap-6">
        {stats.map((tile, i) => (
          <div key={i} className="flex flex-col gap-0.5 min-w-[80px]">
            <span className="text-[10px] text-slate-500 truncate">{tile.label}</span>
            <span className="text-sm font-bold text-slate-200">
              {tile.format === "percent"
                ? `${Number(tile.value).toFixed(1)}%`
                : Number(tile.value).toLocaleString()}
            </span>
            {tile.change != null && (
              <span
                className={`text-[10px] font-medium ${
                  tile.trend === "up" ? "text-emerald-400" :
                  tile.trend === "down" ? "text-red-400" : "text-slate-500"
                }`}
              >
                {tile.change > 0 ? "+" : ""}
                {tile.change.toFixed(1)}
                {tile.change_label ? ` ${tile.change_label}` : ""}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Campaign Performance Table ─────────────────────────────────────────────

const CHANNEL_COLORS: Record<string, string> = {
  email:     "#60a5fa",
  linkedin:  "#818cf8",
  sms:       "#34d399",
  whatsapp:  "#22d399",
  push:      "#fbbf24",
};

const STATUS_PILLS: Record<string, { bg: string; text: string }> = {
  active:    { bg: "bg-emerald-500/20", text: "text-emerald-400" },
  completed: { bg: "bg-slate-700/60",   text: "text-slate-400"   },
  draft:     { bg: "bg-amber-500/20",   text: "text-amber-400"   },
  paused:    { bg: "bg-blue-500/20",    text: "text-blue-400"    },
  cancelled: { bg: "bg-red-500/20",     text: "text-red-400"     },
};

function CampaignPerfTable({ rows, onCampaignClick }: {
  rows: CampaignPerformanceRow[];
  onCampaignClick?: (id: number) => void;
}) {
  if (!rows.length) return <WidgetEmpty message="No campaign data available" />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-700/40">
            <th className="text-left text-slate-500 font-medium pb-2 pr-3 min-w-[140px]">Campaign</th>
            <th className="text-left text-slate-500 font-medium pb-2 pr-3">Channel</th>
            <th className="text-right text-slate-500 font-medium pb-2 pr-3">Recipients</th>
            <th className="text-right text-slate-500 font-medium pb-2 pr-3">Sent</th>
            <th className="text-right text-slate-500 font-medium pb-2 pr-3">Delivered</th>
            <th className="text-right text-slate-500 font-medium pb-2 pr-3">Open %</th>
            <th className="text-right text-slate-500 font-medium pb-2 pr-3">Click %</th>
            <th className="text-left text-slate-500 font-medium pb-2">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/20">
          {rows.map((row) => {
            const deliveryRate = row.delivered_count && row.sent_count
              ? (row.delivered_count / row.sent_count) * 100
              : null;
            const openRate = row.open_count && row.delivered_count
              ? (row.open_count / row.delivered_count) * 100
              : null;
            const clickRate = row.click_count && row.open_count
              ? (row.click_count / row.open_count) * 100
              : null;

            const pill = STATUS_PILLS[row.status?.toLowerCase() ?? ""] ?? STATUS_PILLS.draft;
            const chColor = CHANNEL_COLORS[row.channel?.toLowerCase() ?? ""] ?? "#94a3b8";

            return (
              <tr
                key={row.id}
                className="hover:bg-slate-700/20 transition-colors cursor-pointer"
                onClick={() => onCampaignClick?.(row.id)}
              >
                <td className="py-2 pr-3">
                  <div className="text-slate-200 font-medium truncate max-w-[160px]">{row.name}</div>
                  {row.type && (
                    <div className="text-slate-500 text-[10px]">{row.type}</div>
                  )}
                </td>
                <td className="py-2 pr-3">
                  {row.channel ? (
                    <span className="font-medium" style={{ color: chColor }}>
                      {row.channel}
                    </span>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
                <td className="py-2 pr-3 text-right text-slate-400">
                  {row.total_recipients?.toLocaleString() ?? "—"}
                </td>
                <td className="py-2 pr-3 text-right text-slate-300">
                  {row.sent_count?.toLocaleString() ?? "—"}
                </td>
                <td className="py-2 pr-3 text-right">
                  {deliveryRate !== null ? (
                    <span className={rateColor(deliveryRate)}>
                      {pct(row.delivered_count, row.sent_count)}
                    </span>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
                <td className="py-2 pr-3 text-right">
                  {openRate !== null ? (
                    <span className={rateColor(openRate)}>
                      {pct(row.open_count, row.delivered_count)}
                    </span>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
                <td className="py-2 pr-3 text-right">
                  {clickRate !== null ? (
                    <span className={rateColor(clickRate)}>
                      {pct(row.click_count, row.open_count)}
                    </span>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
                <td className="py-2">
                  {row.status ? (
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${pill.bg} ${pill.text}`}
                    >
                      {row.status}
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
  data: CampaignsReport;
  onFilterDrill?: (key: keyof ReportFilters, value: string) => void;
  onCampaignClick?: (id: number) => void;
}

export function CampaignsDashboard({ data, onFilterDrill, onCampaignClick }: Props) {
  const funnelStages = data.send_funnel.labels.map((label, i) => ({
    label,
    value: data.send_funnel.series[0]?.data[i] ?? 0,
  }));

  return (
    <div className="flex flex-col gap-5">
      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {data.kpis.map((tile, i) => (
          <KPICard key={i} tile={tile} icon={<Megaphone className="w-4 h-4" />} />
        ))}
      </div>

      {/* Suppression / deliverability strip */}
      <SuppressionStrip stats={data.suppression_stats} />

      {/* Row 3: Send Funnel + Channel Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <WidgetCard
          title="Send Pipeline"
          description="From eligibility to delivery"
        >
          {funnelStages.length ? (
            <FunnelChart stages={funnelStages} />
          ) : (
            <WidgetEmpty />
          )}
        </WidgetCard>

        <WidgetCard
          title="Channel Breakdown"
          description="Campaigns and sends by channel"
          headerRight={
            <div className="flex flex-wrap gap-2">
              {data.channel_breakdown.labels.slice(0, 4).map((l, i) => (
                <LegendDot key={i} color={chartColor(i)} label={l} />
              ))}
            </div>
          }
        >
          <DonutChart
            data={data.channel_breakdown}
            height={160}
            showLegend
          />
        </WidgetCard>
      </div>

      {/* Row 4: Email Engagement */}
      <WidgetCard
        title="Email Engagement"
        description="Open, click, and bounce rates over time"
        headerRight={
          <div className="flex items-center gap-3">
            {data.email_engagement.series.map((s, i) => (
              <LegendDot key={i} color={s.color ?? chartColor(i)} label={s.label} />
            ))}
          </div>
        }
      >
        {data.email_engagement.labels.length ? (
          <BarChart data={data.email_engagement} height={200} grouped />
        ) : (
          <WidgetEmpty />
        )}
      </WidgetCard>

      {/* Row 5: Campaign Performance Table */}
      <WidgetCard
        title="Campaign Performance"
        description="Per-campaign delivery, open, and click metrics"
        action={{ label: "Export", onClick: () => {} }}
        noPad={false}
      >
        <CampaignPerfTable
          rows={data.campaign_performance}
          onCampaignClick={onCampaignClick}
        />
      </WidgetCard>
    </div>
  );
}
