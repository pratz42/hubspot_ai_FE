// Shared TypeScript types for all report API response shapes.
// These mirror the Pydantic schemas in backend/schemas/reports.py.

export type KPIFormat = "number" | "currency" | "percent" | "text";
export type TrendDir  = "up" | "down" | "neutral";
export type InsightSeverity = "info" | "warning" | "good" | "critical";

export interface KPITile {
  label: string;
  value: number | string;
  change?: number | null;   // null when backend sends Python None
  change_label?: string;
  trend?: TrendDir;
  format: KPIFormat;
  icon?: string;
}

export interface ChartSeries {
  label: string;
  data: number[];
  color?: string;
}

export interface ChartData {
  labels: string[];
  series: ChartSeries[];
  type: string;
}

export interface Insight {
  text: string;
  severity: InsightSeverity;
  metric?: string;
}

// ── Overview ───────────────────────────────────────────────────────────────

export interface TopLead {
  id: number;
  name: string;
  ai_score?: number;
  status?: string;
  deal_size?: number;
  assigned_to?: string;
}

export interface CampaignSummaryItem {
  id: number;
  name: string;
  type?: string;
  status?: string;
  sent_count?: number;
  total_recipients?: number;
  created_at?: string;
}

export interface OverviewReport {
  kpis: KPITile[];
  pipeline_funnel: ChartData;
  revenue_trend: ChartData;
  top_leads: TopLead[];
  campaign_summary: CampaignSummaryItem[];
  insights: Insight[];
  last_updated: string;
}

// ── Sales ──────────────────────────────────────────────────────────────────

export interface StageBreakdownRow {
  stage: string;
  display_order?: number;
  probability?: number;
  color?: string;
  deal_count: number;
  total_value: number;
  weighted_value: number;
}

export interface TopDeal {
  id: number;
  name: string;
  amount?: number;
  stage?: string;
  probability?: number;
  owner?: string;
  close_date?: string;
}

export interface RepPerformanceRow {
  rep: string;
  total_deals: number;
  pipeline_value: number;
  won_deals: number;
}

export interface SalesReport {
  kpis: KPITile[];
  funnel: ChartData;
  stage_breakdown: StageBreakdownRow[];
  deal_velocity: ChartData;
  win_loss_ratio: ChartData;
  top_deals: TopDeal[];
  rep_performance: RepPerformanceRow[];
  last_updated: string;
}

// ── Leads & Contacts ───────────────────────────────────────────────────────

export interface TopScoredLead {
  id: number;
  name: string;
  ai_score?: number;
  status?: string;
  source?: string;
  lifecycle_stage?: string;
  company?: string;
  assigned_to?: string;
}

export interface ScoreBandRow {
  band: string;
  label?: string;
  count: number;
  pct?: number;
  conversion_rate?: number;
  avg_deal_size?: number;
}

export interface LeadsContactsReport {
  kpis: KPITile[];
  lifecycle_distribution: ChartData;
  lead_status_breakdown: ChartData;
  score_distribution: ChartData;
  source_breakdown: ChartData;
  industry_breakdown: ChartData;
  top_scored_leads: TopScoredLead[];
  score_band_summary: ScoreBandRow[];
  last_updated: string;
}

// ── Campaigns ──────────────────────────────────────────────────────────────

export interface CampaignPerformanceRow {
  id: number;
  name: string;
  type?: string;
  channel?: string;
  status?: string;
  total_recipients?: number;
  sent_count?: number;
  delivered_count?: number;
  open_count?: number;
  click_count?: number;
  bounce_count?: number;
  created_at?: string;
}

export interface CampaignsReport {
  kpis: KPITile[];
  send_funnel: ChartData;
  channel_breakdown: ChartData;
  campaign_performance: CampaignPerformanceRow[];
  email_engagement: ChartData;
  suppression_stats: KPITile[];
  last_updated: string;
}

// ── AI Effectiveness ───────────────────────────────────────────────────────

export interface ScoreBandConversionRow {
  band: string;
  count: number;
  conversion_rate?: number;
  avg_deal_size?: number;
  avg_score?: number;
}

export interface TopAIScoredLead {
  id: number;
  name: string;
  ai_score: number;
  source?: string;
  status?: string;
  lifecycle_stage?: string;
  company?: string;
  scored_at?: string;
}

export interface AIJobStats {
  last_run?: string;
  total_runs?: number;
  success_rate?: number;
  avg_duration_seconds?: number;
  scored_last_run?: number;
  errors_last_run?: number;
  [key: string]: unknown;
}

export interface AIEffectivenessReport {
  kpis: KPITile[];
  score_distribution: ChartData;
  scoring_coverage: ChartData;
  brief_coverage: ChartData;
  score_band_conversion: ScoreBandConversionRow[];
  top_ai_scored_leads: TopAIScoredLead[];
  ai_job_stats: AIJobStats;
  last_updated: string;
}

// ── Data Quality ───────────────────────────────────────────────────────────

export interface CompletenessRow {
  field: string;
  entity: string;
  completeness_pct: number;
  total_count: number;
  missing_count: number;
}

export interface EntityHealthRow {
  entity: string;
  total_count: number;
  health_score: number;
  issues_count: number;
  last_updated?: string;
}

export interface SuppressionSummary {
  total_suppressed: number;
  by_reason: Record<string, number>;
  suppression_rate?: number;
}

export interface DataQualityReport {
  kpis: KPITile[];
  completeness_by_field: CompletenessRow[];
  missing_data_breakdown: ChartData;
  suppression_summary: SuppressionSummary;
  entity_health: EntityHealthRow[];
  last_updated: string;
}

// ── Activity ───────────────────────────────────────────────────────────────

export interface TopActorRow {
  user: string;
  total_activities: number;
  by_type?: Record<string, number>;
  last_active?: string;
}

export interface CampaignActivityRow {
  campaign_id: number;
  campaign_name: string;
  activity_count: number;
  activity_types?: string[];
  last_activity?: string;
}

export interface ActivityReport {
  kpis: KPITile[];
  activity_by_type: ChartData;
  activity_timeline: ChartData;
  top_actors: TopActorRow[];
  campaign_activity_breakdown: CampaignActivityRow[];
  last_updated: string;
}

// ── Custom Dashboard ───────────────────────────────────────────────────────

export interface DashboardWidgetConfig {
  widget_id: string;   // e.g. "pipeline_funnel", "sales_kpis"
  type: string;        // e.g. "kpi", "funnel", "line", "bar", "donut"
  title: string;
  report_source: string; // e.g. "overview", "sales", "leads", "campaigns"
  config?: Record<string, unknown>;
  position?: Record<string, number>;
}

export interface CustomDashboardItem {
  id: string;
  name: string;
  description?: string;
  layout: DashboardWidgetConfig[];
  filters?: Record<string, unknown>;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// ── Utilities ──────────────────────────────────────────────────────────────

/** Format a KPI value for display (compact, human-readable). */
export function fmtKPI(value: number | string, format: KPIFormat): string {
  if (typeof value === "string") return value;
  const n = Number(value);
  if (isNaN(n)) return String(value);
  switch (format) {
    case "currency":
      if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
      if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
      return `$${n.toFixed(0)}`;
    case "percent":
      return `${n.toFixed(1)}%`;
    case "number":
      if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
      if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
      return n.toLocaleString();
    default:
      return String(value);
  }
}

/** Compact dollar/number for axis labels. */
export function fmtAxis(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

// Chart colour palette (consistent across all widgets)
export const CHART_COLORS = [
  "#f97316", // orange
  "#60a5fa", // blue
  "#34d399", // emerald
  "#a78bfa", // violet
  "#fbbf24", // amber
  "#22d3ee", // cyan
  "#fb7185", // rose
  "#818cf8", // indigo
];

export function chartColor(i: number): string {
  return CHART_COLORS[i % CHART_COLORS.length];
}
