"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle, AlertCircle, Info, TrendingUp, Calendar,
  DollarSign, Target, Users, ArrowUpDown, ExternalLink,
} from "lucide-react";
import API from "@/lib/api";
import type { ReportFilters } from "@/hooks/useReportFilters";
import type {
  RevenueForecastReport, DealContributionRow,
  RiskIndicator, StageForecastRow,
} from "@/components/reports/types";
import { fmtKPI, fmtAxis, chartColor } from "@/components/reports/types";
import { WidgetCard, WidgetEmpty, WidgetSkeleton, LegendDot } from "@/components/reports/WidgetCard";
import { LineChart } from "@/components/reports/charts/LineChart";
import { HorizontalBars } from "@/components/reports/charts/HorizontalBars";
import type { HBarRow } from "@/components/reports/charts/HorizontalBars";
import { useRouter } from "next/navigation";

// ── Horizon selector ───────────────────────────────────────────────────────

const HORIZONS: { label: string; value: number }[] = [
  { label: "3M",  value: 3  },
  { label: "6M",  value: 6  },
  { label: "12M", value: 12 },
];

// ── KPI Card ───────────────────────────────────────────────────────────────

function ForecastKPI({
  label, value, format, icon, accent = false,
}: {
  label: string;
  value: number;
  format: "currency" | "number" | "percent";
  icon?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 flex flex-col gap-2 min-w-0 border ${
        accent
          ? "bg-indigo-500/10 border-indigo-500/30"
          : "bg-slate-800/50 border-slate-700/40"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 font-medium truncate">{label}</span>
        {icon && <span className={accent ? "text-indigo-400" : "text-slate-500"}>{icon}</span>}
      </div>
      <div className={`text-2xl font-bold leading-none ${accent ? "text-indigo-300" : "text-slate-100"}`}>
        {fmtKPI(value, format)}
      </div>
    </div>
  );
}

// ── Risk badge ─────────────────────────────────────────────────────────────

const RISK_META: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  critical: { icon: AlertCircle,   color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/30"    },
  warning:  { icon: AlertTriangle, color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/30"  },
  info:     { icon: Info,          color: "text-slate-400",  bg: "bg-slate-800/60",  border: "border-slate-700/40"  },
};

function RiskCard({ risk }: { risk: RiskIndicator }) {
  const meta = RISK_META[risk.severity] ?? RISK_META.info;
  const Icon = meta.icon;
  return (
    <div className={`flex items-start gap-3 rounded-lg p-3 border ${meta.bg} ${meta.border}`}>
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${meta.color}`} />
      <div className="min-w-0">
        <p className="text-xs text-slate-200 font-medium leading-snug">{risk.label}</p>
        <p className={`text-lg font-bold leading-none mt-1 ${meta.color}`}>{risk.count}</p>
      </div>
    </div>
  );
}

// ── Deal contributions table ───────────────────────────────────────────────

type SortKey = "weighted_value" | "amount" | "probability" | "close_date";

function DealTable({
  rows,
  onDealClick,
}: {
  rows: DealContributionRow[];
  onDealClick?: (id: number) => void;
}) {
  const [sort, setSort] = useState<SortKey>("weighted_value");
  const [asc, setAsc] = useState(false);

  const toggle = (key: SortKey) => {
    if (sort === key) setAsc((a) => !a);
    else { setSort(key); setAsc(false); }
  };

  const sorted = [...rows].sort((a, b) => {
    let av: number | string = a[sort] ?? 0;
    let bv: number | string = b[sort] ?? 0;
    if (sort === "close_date") {
      av = a.close_date ?? "";
      bv = b.close_date ?? "";
    }
    if (av < bv) return asc ? -1 : 1;
    if (av > bv) return asc ? 1 : -1;
    return 0;
  });

  if (!rows.length) return <WidgetEmpty message="No forecast deals for this period" />;

  const Th = ({ col, label }: { col: SortKey; label: string }) => (
    <th
      className="text-right text-slate-500 font-medium pb-2 pr-3 cursor-pointer select-none hover:text-slate-300 transition-colors whitespace-nowrap"
      onClick={() => toggle(col)}
    >
      <span className="flex items-center justify-end gap-1">
        {label}
        {sort === col && <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />}
      </span>
    </th>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-700/40">
            <th className="text-left text-slate-500 font-medium pb-2 pr-3">Deal</th>
            <Th col="amount"        label="Amount"    />
            <Th col="probability"   label="Prob"      />
            <Th col="weighted_value" label="Weighted" />
            <Th col="close_date"    label="Close"     />
            <th className="text-left text-slate-500 font-medium pb-2 pr-3">Stage</th>
            <th className="text-left text-slate-500 font-medium pb-2">Owner</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/20">
          {sorted.map((d) => (
            <tr
              key={d.deal_id}
              className="hover:bg-slate-700/20 transition-colors group"
            >
              <td className="py-2 pr-3">
                <button
                  className="text-slate-200 font-medium text-left truncate max-w-[160px] block group-hover:text-orange-300 transition-colors"
                  onClick={() => onDealClick?.(d.deal_id)}
                  title={d.name}
                >
                  {d.name}
                </button>
              </td>
              <td className="py-2 pr-3 text-right text-slate-300 font-medium">
                {d.amount != null ? fmtKPI(d.amount, "currency") : "—"}
              </td>
              <td className="py-2 pr-3 text-right">
                <span
                  className={`font-medium ${
                    d.probability >= 0.7
                      ? "text-emerald-400"
                      : d.probability >= 0.4
                      ? "text-amber-400"
                      : "text-red-400"
                  }`}
                >
                  {(d.probability * 100).toFixed(0)}%
                </span>
              </td>
              <td className="py-2 pr-3 text-right text-indigo-300 font-semibold">
                {fmtKPI(d.weighted_value, "currency")}
              </td>
              <td className="py-2 pr-3 text-right text-slate-500 whitespace-nowrap">
                {d.close_date
                  ? new Date(d.close_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })
                  : "—"}
              </td>
              <td className="py-2 pr-3 text-slate-400 truncate max-w-[100px]">
                {d.stage_name ?? "—"}
              </td>
              <td className="py-2 text-slate-500 truncate max-w-[100px]">
                {d.owner_name ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Stage breakdown ────────────────────────────────────────────────────────

function StageBreakdown({ rows }: { rows: StageForecastRow[] }) {
  if (!rows.length) return <WidgetEmpty />;
  const hBarRows: HBarRow[] = rows.map((r, i) => ({
    label: r.stage_name,
    value: r.weighted_value,
    subValue: r.deal_count,
    subLabel: "deals:",
    color: r.color ?? chartColor(i),
  }));
  const max = Math.max(...rows.map((r) => r.weighted_value), 1);
  return <HorizontalBars rows={hBarRows} maxValue={max} />;
}

// ── Skeleton placeholder ───────────────────────────────────────────────────

function ForecastSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      {/* KPI row skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4 h-20 animate-pulse" />
        ))}
      </div>
      {/* Chart skeleton */}
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl h-52 animate-pulse" />
      {/* Table + risk skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl lg:col-span-2 h-52 animate-pulse" />
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl h-52 animate-pulse" />
      </div>
    </div>
  );
}

// ── Main section ───────────────────────────────────────────────────────────

interface Props {
  filters: ReportFilters;
  onDealClick?: (id: number) => void;
}

export function RevenueForecastSection({ filters, onDealClick }: Props) {
  const router = useRouter();

  const [horizon, setHorizon] = useState(6);
  const [data, setData]       = useState<RevenueForecastReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [tick, setTick]       = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const params: Record<string, string> = { horizon_months: String(horizon) };
    (Object.entries(filters) as [string, string][]).forEach(([k, v]) => {
      if (v) params[k] = v;
    });

    API.get<RevenueForecastReport>("/reports/sales/revenue-forecast", {
      params,
      signal: controller.signal,
    })
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const e = err as { response?: { data?: { detail?: string } }; message?: string };
        setError(e.response?.data?.detail ?? e.message ?? "Failed to load forecast");
        setLoading(false);
      });

    return () => controller.abort();
  }, [horizon, filters, tick]);

  const handleDealClick = (id: number) => {
    if (onDealClick) { onDealClick(id); }
    else { router.push(`/deals/${id}`); }
  };

  // ── Render states ────────────────────────────────────────────────────────

  const headerRight = (
    <div className="flex items-center gap-2">
      {/* Horizon buttons */}
      <div className="flex items-center rounded-lg border border-slate-700/60 overflow-hidden">
        {HORIZONS.map((h) => (
          <button
            key={h.value}
            onClick={() => setHorizon(h.value)}
            className={`px-2.5 py-1 text-xs font-medium transition-colors ${
              horizon === h.value
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/60"
            }`}
          >
            {h.label}
          </button>
        ))}
      </div>
      {data && (
        <span className="text-[10px] text-slate-600 whitespace-nowrap hidden sm:block">
          {new Date(data.last_updated_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </span>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            Revenue Forecast
          </h2>
          {headerRight}
        </div>
        <ForecastSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
        <div>
          <p className="text-sm text-red-300 font-medium">Failed to load Revenue Forecast</p>
          <p className="text-xs text-slate-500 mt-0.5">{error}</p>
        </div>
        <button
          onClick={refetch}
          className="ml-auto text-xs text-red-400 hover:text-red-300 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const ownerBarRows: HBarRow[] = data.owner_breakdown.map((o, i) => ({
    label: o.owner_name,
    value: o.weighted_value,
    subValue: o.open_deals_count,
    subLabel: "deals:",
    color: chartColor(i),
  }));
  const ownerMax = Math.max(...data.owner_breakdown.map((o) => o.weighted_value), 1);

  return (
    <div className="flex flex-col gap-5">
      {/* ── Section heading ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-400" />
          Revenue Forecast
          <span className="text-slate-600 font-normal text-xs ml-1">
            · {data.open_deals_count} open deal{data.open_deals_count !== 1 ? "s" : ""} in forecast
          </span>
        </h2>
        {headerRight}
      </div>

      {/* ── KPI row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <ForecastKPI
          label="Weighted Pipeline"
          value={data.weighted_pipeline}
          format="currency"
          icon={<DollarSign className="w-3.5 h-3.5" />}
          accent
        />
        <ForecastKPI
          label="This Month"
          value={data.forecast_this_month}
          format="currency"
          icon={<Calendar className="w-3.5 h-3.5" />}
        />
        <ForecastKPI
          label="Next 3 Months"
          value={data.forecast_next_3_months}
          format="currency"
          icon={<TrendingUp className="w-3.5 h-3.5" />}
        />
        <ForecastKPI
          label="Next 6 Months"
          value={data.forecast_next_6_months}
          format="currency"
          icon={<TrendingUp className="w-3.5 h-3.5" />}
        />
        <ForecastKPI
          label="Open Deals"
          value={data.open_deals_count}
          format="number"
          icon={<Target className="w-3.5 h-3.5" />}
        />
        <ForecastKPI
          label="Avg Probability"
          value={data.avg_probability * 100}
          format="percent"
          icon={<Users className="w-3.5 h-3.5" />}
        />
      </div>

      {/* ── Hero chart ──────────────────────────────────────────────────── */}
      <WidgetCard
        title="Forecast by Month"
        description="Weighted revenue forecast vs. open pipeline — grouped by deal close month"
        headerRight={
          <div className="flex items-center gap-4">
            {data.monthly_chart.series.map((s, i) => (
              <LegendDot key={i} color={s.color ?? chartColor(i)} label={s.label} />
            ))}
          </div>
        }
      >
        {data.forecast.every((v) => v === 0) ? (
          <WidgetEmpty message="No deals with close dates in this forecast period" />
        ) : (
          <LineChart data={data.monthly_chart} height={220} showArea />
        )}
      </WidgetCard>

      {/* ── Deal table + Risk panel ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <WidgetCard
          title="Deal Contributions"
          description="Open deals driving the forecast — click a deal to open it"
          className="lg:col-span-2"
        >
          <DealTable rows={data.deal_contributions} onDealClick={handleDealClick} />
        </WidgetCard>

        <WidgetCard title="Risk Insights" description="Deals that may miss the forecast">
          {data.risk_indicators.length === 0 ? (
            <WidgetEmpty message="No risk indicators detected" />
          ) : (
            <div className="flex flex-col gap-2.5">
              {data.risk_indicators.map((r, i) => (
                <RiskCard key={i} risk={r} />
              ))}
            </div>
          )}
        </WidgetCard>
      </div>

      {/* ── Owner leaderboard + Stage distribution ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <WidgetCard
          title="Forecast by Owner"
          description="Weighted pipeline value per sales rep"
        >
          {ownerBarRows.length ? (
            <HorizontalBars rows={ownerBarRows} maxValue={ownerMax} showRank />
          ) : (
            <WidgetEmpty message="No owner data available" />
          )}
        </WidgetCard>

        <WidgetCard
          title="Forecast by Stage"
          description="Weighted pipeline value per deal stage"
        >
          <StageBreakdown rows={data.stage_breakdown} />
        </WidgetCard>
      </div>

      {/* ── Divider before the rest of Sales ────────────────────────────── */}
      <div className="border-t border-slate-700/30 my-1" />
    </div>
  );
}
