"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { SalesReport, KPITile, StageBreakdownRow, TopDeal, RepPerformanceRow } from "@/components/reports/types";
import { fmtKPI, chartColor } from "@/components/reports/types";
import { WidgetCard, WidgetEmpty, LegendDot } from "@/components/reports/WidgetCard";
import { LineChart } from "@/components/reports/charts/LineChart";
import { FunnelChart } from "@/components/reports/charts/FunnelChart";
import { DonutChart } from "@/components/reports/charts/DonutChart";
import { HorizontalBars } from "@/components/reports/charts/HorizontalBars";
import type { HBarRow } from "@/components/reports/charts/HorizontalBars";
import { RevenueForecastSection } from "@/components/reports/sales/RevenueForecastSection";
import type { ReportFilters } from "@/hooks/useReportFilters";

// ── KPI Row ────────────────────────────────────────────────────────────────

function KPICard({ tile }: { tile: KPITile }) {
  const up   = tile.trend === "up";
  const down = tile.trend === "down";
  const TrendIcon = up ? TrendingUp : down ? TrendingDown : Minus;
  const trendColor = up ? "text-emerald-400" : down ? "text-red-400" : "text-slate-500";

  return (
    <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4 flex flex-col gap-2 min-w-0">
      <span className="text-xs text-slate-400 font-medium truncate">{tile.label}</span>
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

// ── Stage Breakdown Table ──────────────────────────────────────────────────

function StageBreakdownTable({ rows }: { rows: StageBreakdownRow[] }) {
  if (!rows.length) return <WidgetEmpty />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-700/40">
            <th className="text-left text-slate-500 font-medium pb-2 pr-3">Stage</th>
            <th className="text-right text-slate-500 font-medium pb-2 pr-3">Deals</th>
            <th className="text-right text-slate-500 font-medium pb-2 pr-3">Value</th>
            <th className="text-right text-slate-500 font-medium pb-2">Weighted</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/20">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-700/20 transition-colors">
              <td className="py-2 pr-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: row.color ?? chartColor(i) }}
                  />
                  <span className="text-slate-200">{row.stage}</span>
                  {row.probability !== undefined && (
                    <span className="text-slate-600 text-[10px]">{row.probability}%</span>
                  )}
                </div>
              </td>
              <td className="py-2 pr-3 text-right text-slate-300">{row.deal_count}</td>
              <td className="py-2 pr-3 text-right text-slate-300">
                {row.total_value != null
                  ? row.total_value >= 1000
                    ? `$${(row.total_value / 1000).toFixed(0)}K`
                    : `$${row.total_value.toFixed(0)}`
                  : "—"}
              </td>
              <td className="py-2 text-right text-slate-400">
                {row.weighted_value != null
                  ? row.weighted_value >= 1000
                    ? `$${(row.weighted_value / 1000).toFixed(0)}K`
                    : `$${row.weighted_value.toFixed(0)}`
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Top Deals Table ────────────────────────────────────────────────────────

function TopDealsTable({ deals }: { deals: TopDeal[] }) {
  if (!deals.length) return <WidgetEmpty message="No deals to display" />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-700/40">
            <th className="text-left text-slate-500 font-medium pb-2 pr-3">Deal</th>
            <th className="text-right text-slate-500 font-medium pb-2 pr-3">Amount</th>
            <th className="text-left text-slate-500 font-medium pb-2 pr-3">Stage</th>
            <th className="text-right text-slate-500 font-medium pb-2">Close</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/20">
          {deals.map((deal) => (
            <tr key={deal.id} className="hover:bg-slate-700/20 transition-colors">
              <td className="py-2 pr-3">
                <span className="text-slate-200 font-medium truncate block max-w-[140px]">{deal.name}</span>
                {deal.owner && <span className="text-slate-500 text-[10px]">{deal.owner}</span>}
              </td>
              <td className="py-2 pr-3 text-right">
                {deal.amount != null ? (
                  <span className="text-slate-200 font-semibold">
                    {deal.amount >= 1000
                      ? `$${(deal.amount / 1000).toFixed(0)}K`
                      : `$${deal.amount.toFixed(0)}`}
                  </span>
                ) : (
                  <span className="text-slate-600">—</span>
                )}
              </td>
              <td className="py-2 pr-3 text-slate-400">{deal.stage ?? "—"}</td>
              <td className="py-2 text-right text-slate-500">
                {deal.close_date
                  ? new Date(deal.close_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Rep Leaderboard ────────────────────────────────────────────────────────

function RepLeaderboard({ reps }: { reps: RepPerformanceRow[] }) {
  if (!reps.length) return <WidgetEmpty message="No rep data available" />;

  const maxPipeline = Math.max(...reps.map((r) => r.pipeline_value), 1);
  const rows: HBarRow[] = reps.map((r) => ({
    label: r.rep,
    value: r.pipeline_value,
    subValue: r.won_deals,
    subLabel: "won:",
  }));

  return <HorizontalBars rows={rows} maxValue={maxPipeline} showRank />;
}

// ── Main Dashboard ─────────────────────────────────────────────────────────

interface Props {
  data: SalesReport;
  filters: ReportFilters;
  onStageClick?: (stage: string) => void;
}

export function SalesDashboard({ data, filters, onStageClick }: Props) {
  const funnelStages = data.funnel.labels.map((label, i) => ({
    label,
    value: data.funnel.series[0]?.data[i] ?? 0,
  }));

  const stageBarRows: HBarRow[] = data.stage_breakdown.map((row, i) => ({
    label: row.stage,
    value: row.total_value,
    subValue: row.deal_count,
    subLabel: "deals:",
    color: row.color ?? chartColor(i),
  }));

  return (
    <div className="flex flex-col gap-5">
      {/* Revenue Forecast — prominent first section */}
      <RevenueForecastSection filters={filters} />

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {data.kpis.map((tile, i) => (
          <KPICard key={i} tile={tile} />
        ))}
      </div>

      {/* Row 2: Stage Funnel + Win/Loss Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <WidgetCard
          title="Stage Funnel"
          description="Deals moving through pipeline"
        >
          {funnelStages.length ? (
            <FunnelChart
              stages={funnelStages}
              onStageClick={(s) => onStageClick?.(s.label)}
            />
          ) : (
            <WidgetEmpty />
          )}
        </WidgetCard>

        <WidgetCard title="Win / Loss Ratio" description="Closed deal outcomes">
          <DonutChart data={data.win_loss_ratio} height={160} showLegend />
        </WidgetCard>
      </div>

      {/* Row 3: Deals by Stage (H-bars) + Deal Velocity (line) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <WidgetCard title="Deals by Stage" description="Pipeline value per stage">
          {stageBarRows.length ? (
            <HorizontalBars rows={stageBarRows} />
          ) : (
            <WidgetEmpty />
          )}
        </WidgetCard>

        <WidgetCard
          title="Deal Velocity"
          description="Average days to close over time"
          headerRight={
            <div className="flex items-center gap-3">
              {data.deal_velocity.series.map((s, i) => (
                <LegendDot key={i} color={s.color ?? "#f97316"} label={s.label} />
              ))}
            </div>
          }
        >
          <LineChart data={data.deal_velocity} height={180} showArea={false} />
        </WidgetCard>
      </div>

      {/* Row 4: Owner Leaderboard + Top Deals */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <WidgetCard
          title="Owner Leaderboard"
          description="Pipeline value by rep"
          className="lg:col-span-2"
        >
          <RepLeaderboard reps={data.rep_performance} />
        </WidgetCard>

        <WidgetCard
          title="Top Deals"
          description="Highest-value open opportunities"
          className="lg:col-span-3"
          action={{ label: "View all", onClick: () => {} }}
        >
          <TopDealsTable deals={data.top_deals} />
        </WidgetCard>
      </div>

      {/* Row 5: Stage Breakdown Table */}
      <WidgetCard title="Stage Breakdown" description="Detailed metrics per pipeline stage">
        <StageBreakdownTable rows={data.stage_breakdown} />
      </WidgetCard>
    </div>
  );
}
