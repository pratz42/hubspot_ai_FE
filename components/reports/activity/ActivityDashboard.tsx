"use client";

import { Activity } from "lucide-react";
import type {
  ActivityReport,
  TopActorRow,
  CampaignActivityRow,
} from "@/components/reports/types";
import { chartColor } from "@/components/reports/types";
import { WidgetCard, WidgetEmpty, LegendDot, KPICard } from "@/components/reports/WidgetCard";
import { LineChart } from "@/components/reports/charts/LineChart";
import { DonutChart } from "@/components/reports/charts/DonutChart";
import { HorizontalBars } from "@/components/reports/charts/HorizontalBars";
import type { HBarRow } from "@/components/reports/charts/HorizontalBars";
import { exportCSV } from "@/components/reports/exportCSV";

// ── Activity type colour map ────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  call:      "#60a5fa",
  email:     "#f97316",
  meeting:   "#34d399",
  note:      "#a78bfa",
  task:      "#fbbf24",
  linkedin:  "#818cf8",
  sms:       "#22d3ee",
};

function typeColor(type: string): string {
  return TYPE_COLORS[type.toLowerCase()] ?? "#94a3b8";
}

function relativeTime(iso?: string): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Top Actors Leaderboard ─────────────────────────────────────────────────

function TopActorsPanel({ actors }: { actors: TopActorRow[] }) {
  if (!actors.length) return <WidgetEmpty message="No actor data available" />;

  const max = Math.max(...actors.map((a) => a.total_activities), 1);
  const rows: HBarRow[] = actors.map((a) => ({
    label: a.user,
    value: a.total_activities,
  }));

  return (
    <div className="flex flex-col gap-4">
      <HorizontalBars rows={rows} maxValue={max} showRank />

      {/* Type breakdown mini-badges for top actor */}
      {actors[0]?.by_type && Object.keys(actors[0].by_type).length > 0 && (
        <div className="pt-1 border-t border-slate-700/30">
          <p className="text-[10px] text-slate-500 mb-2 uppercase tracking-wide font-semibold">
            {actors[0].user} — activity mix
          </p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(actors[0].by_type)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => (
                <span
                  key={type}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={{
                    background: `${typeColor(type)}18`,
                    color: typeColor(type),
                  }}
                >
                  {type} · {count}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Campaign Activity Table ────────────────────────────────────────────────

function CampaignActivityTable({ rows }: { rows: CampaignActivityRow[] }) {
  if (!rows.length) return <WidgetEmpty message="No campaign activity data" />;

  const handleExport = () => {
    exportCSV(
      ["Campaign", "Activity Count", "Types", "Last Activity"],
      rows.map((r) => [
        r.campaign_name,
        r.activity_count,
        (r.activity_types ?? []).join(", "),
        r.last_activity ?? "",
      ]),
      "campaign-activity.csv",
    );
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">
          {rows.length} campaigns
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
            <th className="text-left text-slate-500 font-medium pb-2 pr-3">Campaign</th>
            <th className="text-right text-slate-500 font-medium pb-2 pr-3">Activities</th>
            <th className="text-left text-slate-500 font-medium pb-2 pr-3">Types</th>
            <th className="text-right text-slate-500 font-medium pb-2">Last Activity</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/20">
          {rows.map((row) => (
            <tr key={row.campaign_id} className="hover:bg-slate-700/20 transition-colors">
              <td className="py-2 pr-3">
                <span className="text-slate-200 font-medium truncate block max-w-[180px]">
                  {row.campaign_name}
                </span>
              </td>
              <td className="py-2 pr-3 text-right font-semibold text-slate-200">
                {row.activity_count.toLocaleString()}
              </td>
              <td className="py-2 pr-3">
                <div className="flex flex-wrap gap-1">
                  {(row.activity_types ?? []).slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium"
                      style={{
                        background: `${typeColor(t)}18`,
                        color: typeColor(t),
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </td>
              <td className="py-2 text-right text-slate-500 text-[10px]">
                {relativeTime(row.last_activity)}
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
  data: ActivityReport;
}

export function ActivityDashboard({ data }: Props) {
  return (
    <div className="flex flex-col gap-5">
      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {data.kpis.map((tile, i) => (
          <KPICard key={i} tile={tile} icon={<Activity className="w-4 h-4" />} />
        ))}
      </div>

      {/* Row 2: Timeline (2/3) + Activity by Type (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <WidgetCard
          title="Activity Timeline"
          description="Daily activity volume over the selected period"
          className="lg:col-span-2"
          headerRight={
            <div className="flex items-center gap-3">
              {data.activity_timeline.series.map((s, i) => (
                <LegendDot key={i} color={s.color ?? chartColor(i)} label={s.label} />
              ))}
            </div>
          }
        >
          {data.activity_timeline.labels.length ? (
            <LineChart data={data.activity_timeline} height={200} showArea />
          ) : (
            <WidgetEmpty />
          )}
        </WidgetCard>

        <WidgetCard
          title="Activity by Type"
          description="Proportion of each activity type"
          headerRight={
            <div className="flex flex-col gap-1">
              {data.activity_by_type.labels.slice(0, 4).map((l, i) => (
                <LegendDot key={i} color={chartColor(i)} label={l} />
              ))}
            </div>
          }
        >
          <DonutChart data={data.activity_by_type} height={160} showLegend={false} />
        </WidgetCard>
      </div>

      {/* Row 3: Top Actors (2/5) + Campaign Activity (3/5) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <WidgetCard
          title="Top Actors"
          description="Most active users this period"
          className="lg:col-span-2"
        >
          <TopActorsPanel actors={data.top_actors} />
        </WidgetCard>

        <WidgetCard
          title="Campaign Activity"
          description="Activity volume broken down by campaign"
          className="lg:col-span-3"
          action={{ label: "View all", onClick: () => {} }}
        >
          <CampaignActivityTable rows={data.campaign_activity_breakdown} />
        </WidgetCard>
      </div>
    </div>
  );
}
