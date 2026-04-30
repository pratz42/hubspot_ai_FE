"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, Plus, X, AlertCircle, LayoutDashboard,
  TrendingUp, BarChart2, Users, Megaphone,
} from "lucide-react";
import type {
  CustomDashboardItem,
  DashboardWidgetConfig,
  OverviewReport,
  SalesReport,
  LeadsContactsReport,
  CampaignsReport,
  RevenueForecastReport,
} from "@/components/reports/types";
import { fmtKPI, chartColor } from "@/components/reports/types";
import { WidgetCard, WidgetSkeleton, WidgetEmpty, KPICard } from "@/components/reports/WidgetCard";
import { LineChart }       from "@/components/reports/charts/LineChart";
import { BarChart }        from "@/components/reports/charts/BarChart";
import { DonutChart }      from "@/components/reports/charts/DonutChart";
import { FunnelChart }     from "@/components/reports/charts/FunnelChart";
import { HorizontalBars }  from "@/components/reports/charts/HorizontalBars";
import API from "@/lib/api";

// ── Widget registry ────────────────────────────────────────────────────────

/** Maps a base widget_id to the API endpoint that provides its data. */
const WIDGET_ENDPOINT: Record<string, string> = {
  overview_kpis:          "/reports/overview",
  pipeline_funnel:        "/reports/overview",
  revenue_trend:          "/reports/overview",
  sales_kpis:             "/reports/sales",
  stage_funnel:           "/reports/sales",
  win_loss:               "/reports/sales",
  deal_velocity:          "/reports/sales",
  leads_kpis:             "/reports/leads-contacts",
  score_distribution:     "/reports/leads-contacts",
  source_breakdown:       "/reports/leads-contacts",
  lifecycle_distribution: "/reports/leads-contacts",
  campaign_kpis:          "/reports/campaigns",
  send_funnel:            "/reports/campaigns",
  email_engagement:       "/reports/campaigns",
  channel_breakdown:      "/reports/campaigns",
  // Revenue Forecast — all five widgets share one cached response
  forecast_kpis:          "/reports/sales/revenue-forecast",
  forecast_chart:         "/reports/sales/revenue-forecast",
  forecast_deals:         "/reports/sales/revenue-forecast",
  forecast_risks:         "/reports/sales/revenue-forecast",
  forecast_owners:        "/reports/sales/revenue-forecast",
};

type Renderer = (data: unknown) => React.ReactNode;

const WIDGET_RENDERERS: Record<string, Renderer> = {
  // ── Overview ───────────────────────────────────────────────────────────
  overview_kpis: (d) => {
    const r = d as OverviewReport;
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(r.kpis ?? []).map((tile, i) => <KPICard key={i} tile={tile} />)}
      </div>
    );
  },
  pipeline_funnel: (d) => {
    const r = d as OverviewReport;
    const stages = (r.pipeline_funnel?.labels ?? []).map((l, i) => ({
      label: l, value: r.pipeline_funnel?.series[0]?.data[i] ?? 0,
    }));
    return stages.length ? <FunnelChart stages={stages} /> : <WidgetEmpty />;
  },
  revenue_trend: (d) => {
    const r = d as OverviewReport;
    return r.revenue_trend?.labels?.length
      ? <LineChart data={r.revenue_trend} height={180} showArea />
      : <WidgetEmpty />;
  },

  // ── Sales ───────────────────────────────────────────────────────────────
  sales_kpis: (d) => {
    const r = d as SalesReport;
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {(r.kpis ?? []).map((tile, i) => <KPICard key={i} tile={tile} />)}
      </div>
    );
  },
  stage_funnel: (d) => {
    const r = d as SalesReport;
    const stages = (r.funnel?.labels ?? []).map((l, i) => ({
      label: l, value: r.funnel?.series[0]?.data[i] ?? 0,
    }));
    return stages.length ? <FunnelChart stages={stages} /> : <WidgetEmpty />;
  },
  win_loss: (d) => {
    const r = d as SalesReport;
    return r.win_loss_ratio?.labels?.length
      ? <DonutChart data={r.win_loss_ratio} height={160} showLegend />
      : <WidgetEmpty />;
  },
  deal_velocity: (d) => {
    const r = d as SalesReport;
    return r.deal_velocity?.labels?.length
      ? <LineChart data={r.deal_velocity} height={180} showArea={false} />
      : <WidgetEmpty />;
  },

  // ── Leads ───────────────────────────────────────────────────────────────
  leads_kpis: (d) => {
    const r = d as LeadsContactsReport;
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {(r.kpis ?? []).map((tile, i) => <KPICard key={i} tile={tile} />)}
      </div>
    );
  },
  score_distribution: (d) => {
    const r = d as LeadsContactsReport;
    return r.score_distribution?.labels?.length
      ? <BarChart data={r.score_distribution} height={180} />
      : <WidgetEmpty />;
  },
  source_breakdown: (d) => {
    const r = d as LeadsContactsReport;
    return r.source_breakdown?.labels?.length
      ? <DonutChart data={r.source_breakdown} height={160} showLegend />
      : <WidgetEmpty />;
  },
  lifecycle_distribution: (d) => {
    const r = d as LeadsContactsReport;
    return r.lifecycle_distribution?.labels?.length
      ? <DonutChart data={r.lifecycle_distribution} height={160} showLegend />
      : <WidgetEmpty />;
  },

  // ── Campaigns ──────────────────────────────────────────────────────────
  campaign_kpis: (d) => {
    const r = d as CampaignsReport;
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {(r.kpis ?? []).map((tile, i) => <KPICard key={i} tile={tile} />)}
      </div>
    );
  },
  send_funnel: (d) => {
    const r = d as CampaignsReport;
    const stages = (r.send_funnel?.labels ?? []).map((l, i) => ({
      label: l, value: r.send_funnel?.series[0]?.data[i] ?? 0,
    }));
    return stages.length ? <FunnelChart stages={stages} /> : <WidgetEmpty />;
  },
  email_engagement: (d) => {
    const r = d as CampaignsReport;
    return r.email_engagement?.labels?.length
      ? <BarChart data={r.email_engagement} height={180} grouped />
      : <WidgetEmpty />;
  },
  channel_breakdown: (d) => {
    const r = d as CampaignsReport;
    return r.channel_breakdown?.labels?.length
      ? <DonutChart data={r.channel_breakdown} height={160} showLegend />
      : <WidgetEmpty />;
  },

  // ── Revenue Forecast ────────────────────────────────────────────────────
  forecast_kpis: (d) => {
    const r = d as RevenueForecastReport;
    const tiles = [
      { label: "Weighted Pipeline", value: r.weighted_pipeline,      format: "currency" as const },
      { label: "This Month",        value: r.forecast_this_month,    format: "currency" as const },
      { label: "Next 3 Months",     value: r.forecast_next_3_months, format: "currency" as const },
      { label: "Next 6 Months",     value: r.forecast_next_6_months, format: "currency" as const },
      { label: "Open Deals",        value: r.open_deals_count,       format: "number"   as const },
      { label: "Avg Probability",   value: +(r.avg_probability * 100).toFixed(1), format: "percent" as const },
    ];
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {tiles.map((tile, i) => <KPICard key={i} tile={tile} />)}
      </div>
    );
  },

  forecast_chart: (d) => {
    const r = d as RevenueForecastReport;
    return r.monthly_chart?.labels?.length
      ? <LineChart data={r.monthly_chart} height={200} showArea />
      : <WidgetEmpty message="No forecast data for this period" />;
  },

  forecast_deals: (d) => {
    const r = d as RevenueForecastReport;
    const deals = (r.deal_contributions ?? []).slice(0, 8);
    if (!deals.length) return <WidgetEmpty message="No forecast deals" />;
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700/40">
              <th className="text-left text-slate-500 font-medium pb-2 pr-3">Deal</th>
              <th className="text-right text-slate-500 font-medium pb-2 pr-3">Weighted</th>
              <th className="text-right text-slate-500 font-medium pb-2 pr-3">Prob</th>
              <th className="text-right text-slate-500 font-medium pb-2">Close</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/20">
            {deals.map((deal) => (
              <tr key={deal.deal_id} className="hover:bg-slate-700/20 transition-colors">
                <td className="py-2 pr-3">
                  <span className="text-slate-200 font-medium truncate block max-w-[140px]">
                    {deal.name}
                  </span>
                  {deal.stage_name && (
                    <span className="text-slate-500 text-[10px]">{deal.stage_name}</span>
                  )}
                </td>
                <td className="py-2 pr-3 text-right text-indigo-300 font-semibold">
                  {fmtKPI(deal.weighted_value, "currency")}
                </td>
                <td className="py-2 pr-3 text-right">
                  <span className={
                    deal.probability >= 0.7 ? "text-emerald-400" :
                    deal.probability >= 0.4 ? "text-amber-400"   : "text-red-400"
                  }>
                    {(deal.probability * 100).toFixed(0)}%
                  </span>
                </td>
                <td className="py-2 text-right text-slate-500 whitespace-nowrap">
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
  },

  forecast_risks: (d) => {
    const r = d as RevenueForecastReport;
    const risks = r.risk_indicators ?? [];
    if (!risks.length) return <WidgetEmpty message="No risk indicators detected" />;
    const style: Record<string, { wrap: string; count: string }> = {
      critical: { wrap: "bg-red-500/10 border-red-500/30",   count: "text-red-400"   },
      warning:  { wrap: "bg-amber-500/10 border-amber-500/30", count: "text-amber-400" },
      info:     { wrap: "bg-slate-800/60 border-slate-700/40", count: "text-slate-400" },
    };
    return (
      <div className="flex flex-col gap-2">
        {risks.map((risk, i) => {
          const s = style[risk.severity] ?? style.info;
          return (
            <div key={i} className={`flex items-center justify-between rounded-lg px-3 py-2.5 border ${s.wrap}`}>
              <p className="text-xs text-slate-200 font-medium leading-snug">{risk.label}</p>
              <span className={`text-lg font-bold ml-3 flex-shrink-0 ${s.count}`}>{risk.count}</span>
            </div>
          );
        })}
      </div>
    );
  },

  forecast_owners: (d) => {
    const r = d as RevenueForecastReport;
    const rows = (r.owner_breakdown ?? []).map((o, i) => ({
      label:    o.owner_name,
      value:    o.weighted_value,
      subValue: o.open_deals_count,
      subLabel: "deals:",
      color:    chartColor(i),
    }));
    if (!rows.length) return <WidgetEmpty message="No owner data" />;
    const max = Math.max(...rows.map((row) => row.value), 1);
    return <HorizontalBars rows={rows} maxValue={max} showRank />;
  },
};

// ── Widget catalog ─────────────────────────────────────────────────────────

const CATALOG = [
  {
    group: "Overview",
    color: "#f97316",
    icon: TrendingUp,
    widgets: [
      { widget_id: "overview_kpis",   type: "kpi",    title: "Key Metrics",     report_source: "overview" },
      { widget_id: "pipeline_funnel", type: "funnel",  title: "Pipeline Health", report_source: "overview" },
      { widget_id: "revenue_trend",   type: "line",    title: "Revenue Trend",   report_source: "overview" },
    ],
  },
  {
    group: "Sales",
    color: "#60a5fa",
    icon: BarChart2,
    widgets: [
      { widget_id: "sales_kpis",    type: "kpi",    title: "Sales KPIs",     report_source: "sales" },
      { widget_id: "stage_funnel",  type: "funnel", title: "Stage Funnel",   report_source: "sales" },
      { widget_id: "win_loss",      type: "donut",  title: "Win/Loss Ratio", report_source: "sales" },
      { widget_id: "deal_velocity", type: "line",   title: "Deal Velocity",  report_source: "sales" },
    ],
  },
  {
    group: "Leads",
    color: "#34d399",
    icon: Users,
    widgets: [
      { widget_id: "leads_kpis",             type: "kpi",   title: "Lead KPIs",          report_source: "leads" },
      { widget_id: "score_distribution",     type: "bar",   title: "Score Distribution",  report_source: "leads" },
      { widget_id: "source_breakdown",       type: "donut", title: "Source Breakdown",    report_source: "leads" },
      { widget_id: "lifecycle_distribution", type: "donut", title: "Lifecycle Stages",    report_source: "leads" },
    ],
  },
  {
    group: "Campaigns",
    color: "#a78bfa",
    icon: Megaphone,
    widgets: [
      { widget_id: "campaign_kpis",     type: "kpi",    title: "Campaign KPIs",    report_source: "campaigns" },
      { widget_id: "send_funnel",       type: "funnel", title: "Send Pipeline",    report_source: "campaigns" },
      { widget_id: "email_engagement",  type: "bar",    title: "Email Engagement", report_source: "campaigns" },
      { widget_id: "channel_breakdown", type: "donut",  title: "Channel Breakdown",report_source: "campaigns" },
    ],
  },
  {
    group: "Revenue Forecast",
    color: "#6366f1",
    icon: TrendingUp,
    widgets: [
      { widget_id: "forecast_kpis",   type: "kpi",      title: "Forecast KPIs",      report_source: "revenue_forecast" },
      { widget_id: "forecast_chart",  type: "line",     title: "Forecast by Month",  report_source: "revenue_forecast" },
      { widget_id: "forecast_deals",  type: "table",    title: "Top Forecast Deals", report_source: "revenue_forecast" },
      { widget_id: "forecast_risks",  type: "insights", title: "Risk Insights",      report_source: "revenue_forecast" },
      { widget_id: "forecast_owners", type: "hbar",     title: "Forecast by Owner",  report_source: "revenue_forecast" },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

/** Strip the timestamp suffix added when instantiating a widget for dedup. */
function baseId(widgetId: string): string {
  return widgetId.replace(/_\d{10,}$/, "");
}

// ── Add Widget Panel ────────────────────────────────────────────────────────

function AddWidgetPanel({ onAdd, onClose }: {
  onAdd: (def: Omit<DashboardWidgetConfig, "position">) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-72 bg-slate-900 border-l border-slate-700/50 shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-700/40 flex-shrink-0">
          <h3 className="text-sm font-semibold text-slate-200">Add Widget</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {CATALOG.map((group) => {
            const Icon = group.icon;
            return (
              <div key={group.group} className="mb-4">
                <div className="flex items-center gap-2 px-4 py-2">
                  <Icon className="w-3.5 h-3.5" style={{ color: group.color }} />
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wide"
                    style={{ color: group.color }}
                  >
                    {group.group}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 px-2">
                  {group.widgets.map((w) => (
                    <button
                      key={w.widget_id}
                      onClick={() => onAdd(w as DashboardWidgetConfig)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-slate-800/70 transition-colors w-full group"
                    >
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                        style={{ background: `${group.color}20` }}
                      >
                        <LayoutDashboard className="w-3 h-3" style={{ color: group.color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">
                          {w.title}
                        </p>
                        <p className="text-[10px] text-slate-600 capitalize">{w.type}</p>
                      </div>
                      <Plus className="w-3 h-3 text-slate-600 group-hover:text-slate-300 transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ── Main View ─────────────────────────────────────────────────────────────

interface Props {
  dashboard: CustomDashboardItem;
  onBack: () => void;
  onLayoutSaved: (id: string, layout: DashboardWidgetConfig[]) => void;
}

export function CustomDashboardView({ dashboard, onBack, onLayoutSaved }: Props) {
  const [widgets, setWidgets] = useState<DashboardWidgetConfig[]>(dashboard.layout ?? []);
  const [endpointData, setEndpointData]   = useState<Record<string, unknown>>({});
  const [endpointStatus, setEndpointStatus] = useState<Record<string, "loading" | "ok" | "error">>({});
  const [showCatalog, setShowCatalog] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset when navigating to a different dashboard
  useEffect(() => {
    setWidgets(dashboard.layout ?? []);
    setEndpointData({});
    setEndpointStatus({});
  }, [dashboard.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch any endpoints we don't have data for yet
  useEffect(() => {
    const needed = [
      ...new Set(
        widgets
          .map((w) => WIDGET_ENDPOINT[baseId(w.widget_id)])
          .filter(Boolean) as string[],
      ),
    ];
    const missing = needed.filter(
      (ep) => endpointData[ep] === undefined && endpointStatus[ep] !== "loading",
    );
    if (!missing.length) return;

    setEndpointStatus((prev) => {
      const next = { ...prev };
      missing.forEach((ep) => { next[ep] = "loading"; });
      return next;
    });
    missing.forEach(async (ep) => {
      try {
        const res = await API.get(ep);
        setEndpointData((prev) => ({ ...prev, [ep]: res.data }));
        setEndpointStatus((prev) => ({ ...prev, [ep]: "ok" }));
      } catch {
        setEndpointStatus((prev) => ({ ...prev, [ep]: "error" }));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgets.length]);

  const persistLayout = useCallback(async (next: DashboardWidgetConfig[]) => {
    setSaving(true);
    try {
      await API.patch(`/reports/dashboards/${dashboard.id}`, { layout: next });
      onLayoutSaved(dashboard.id, next);
    } catch { /* optimistic — UI already updated */ }
    finally { setSaving(false); }
  }, [dashboard.id, onLayoutSaved]);

  const addWidget = useCallback((def: Omit<DashboardWidgetConfig, "position">) => {
    const instance: DashboardWidgetConfig = {
      ...def,
      // Append timestamp so the same widget type can be added more than once
      widget_id: `${def.widget_id}_${Date.now()}`,
    };
    const next = [...widgets, instance];
    setWidgets(next);
    setShowCatalog(false);
    persistLayout(next);
  }, [widgets, persistLayout]);

  const removeWidget = useCallback((idx: number) => {
    const next = widgets.filter((_, i) => i !== idx);
    setWidgets(next);
    persistLayout(next);
  }, [widgets, persistLayout]);

  function renderWidgetBody(widget: DashboardWidgetConfig): React.ReactNode {
    const id  = baseId(widget.widget_id);
    const ep  = WIDGET_ENDPOINT[id];
    const fn  = WIDGET_RENDERERS[id];

    if (!ep || !fn) {
      return (
        <div className="flex items-center justify-center py-8 text-xs text-slate-600">
          Unknown widget type "{id}"
        </div>
      );
    }
    const status = endpointStatus[ep];
    if (status === "loading" || endpointData[ep] === undefined) {
      return <WidgetSkeleton rows={4} />;
    }
    if (status === "error") {
      return (
        <div className="flex items-center gap-2 py-8 text-xs text-red-400 justify-center">
          <AlertCircle className="w-4 h-4" />
          Failed to load data
        </div>
      );
    }
    return fn(endpointData[ep]);
  }

  const isKpi = (w: DashboardWidgetConfig) => {
    const id = baseId(w.widget_id);
    // KPI rows and the forecast hero chart both benefit from full grid width
    return id.endsWith("_kpis") || id === "forecast_chart";
  };

  return (
    <>
      <div className="flex flex-col gap-5">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              All Dashboards
            </button>
            <div className="w-px h-4 bg-slate-700 flex-shrink-0" />
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-200 truncate">{dashboard.name}</h2>
              {dashboard.description && (
                <p className="text-xs text-slate-500 truncate">{dashboard.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {saving && <span className="text-[10px] text-slate-500 animate-pulse">Saving…</span>}
            <button
              onClick={() => setShowCatalog(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Widget
            </button>
          </div>
        </div>

        {/* ── Empty state ─────────────────────────────────────────────── */}
        {widgets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 bg-slate-800/60 rounded-2xl flex items-center justify-center">
              <LayoutDashboard className="w-8 h-8 text-slate-600" />
            </div>
            <div className="text-center max-w-xs">
              <h3 className="text-sm font-semibold text-slate-300 mb-1">No widgets yet</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Add widgets from Overview, Sales, Leads, or Campaigns to build your custom view.
              </p>
            </div>
            <button
              onClick={() => setShowCatalog(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add your first widget
            </button>
          </div>
        )}

        {/* ── Widget grid ─────────────────────────────────────────────── */}
        {widgets.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {widgets.map((widget, idx) => (
              <WidgetCard
                key={`${widget.widget_id}_${idx}`}
                title={widget.title}
                className={isKpi(widget) ? "lg:col-span-2" : undefined}
                headerRight={
                  <button
                    onClick={() => removeWidget(idx)}
                    className="p-1 rounded text-slate-600 hover:text-red-400 transition-colors"
                    title="Remove widget"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                }
              >
                {renderWidgetBody(widget)}
              </WidgetCard>
            ))}
          </div>
        )}
      </div>

      {/* ── Add Widget catalog ──────────────────────────────────────── */}
      {showCatalog && (
        <AddWidgetPanel
          onAdd={addWidget}
          onClose={() => setShowCatalog(false)}
        />
      )}
    </>
  );
}
