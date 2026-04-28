"use client";

import {
  LayoutDashboard,
  TrendingUp,
  Users,
  Target,
  Sparkles,
  ShieldCheck,
  Activity,
  PlusSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReportSection } from "@/hooks/useReportFilters";

export interface SectionMeta {
  id: ReportSection;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  description: string;
  endpoint: string;
}

export const SECTION_META: Record<ReportSection, SectionMeta> = {
  overview: {
    id: "overview",
    label: "Executive Overview",
    shortLabel: "Overview",
    icon: LayoutDashboard,
    description: "High-level KPIs, pipeline health, revenue trend, and top leads.",
    endpoint: "/reports/overview",
  },
  sales: {
    id: "sales",
    label: "Sales Pipeline",
    shortLabel: "Sales",
    icon: TrendingUp,
    description: "Stage funnel, deal velocity, win/loss ratio, and rep performance.",
    endpoint: "/reports/sales",
  },
  leads: {
    id: "leads",
    label: "Leads & Contacts",
    shortLabel: "Leads",
    icon: Users,
    description: "Score distribution, lifecycle stages, sources, and industry breakdown.",
    endpoint: "/reports/leads-contacts",
  },
  campaigns: {
    id: "campaigns",
    label: "Campaigns",
    shortLabel: "Campaigns",
    icon: Target,
    description: "Send funnel, channel performance, engagement, and suppression stats.",
    endpoint: "/reports/campaigns",
  },
  ai: {
    id: "ai",
    label: "AI Effectiveness",
    shortLabel: "AI",
    icon: Sparkles,
    description: "Scoring coverage, score-to-outcome correlation, and brief generation stats.",
    endpoint: "/reports/ai-effectiveness",
  },
  quality: {
    id: "quality",
    label: "Data Quality",
    shortLabel: "Quality",
    icon: ShieldCheck,
    description: "Field completeness, missing data heatmap, and suppression health.",
    endpoint: "/reports/data-quality",
  },
  activity: {
    id: "activity",
    label: "Activity",
    shortLabel: "Activity",
    icon: Activity,
    description: "Activity types, 30-day timeline, top actors, and campaign events.",
    endpoint: "/reports/activity",
  },
  custom: {
    id: "custom",
    label: "Custom Dashboards",
    shortLabel: "Custom",
    icon: PlusSquare,
    description: "Your saved custom dashboards with pinned widgets and filters.",
    endpoint: "/reports/dashboards",
  },
};

export const SECTION_ORDER: ReportSection[] = [
  "overview", "sales", "leads", "campaigns", "ai", "quality", "activity", "custom",
];

interface Props {
  active: ReportSection;
  onSelect: (s: ReportSection) => void;
  dashboardCount?: number;
}

export function ReportNav({ active, onSelect, dashboardCount = 0 }: Props) {
  return (
    <div className="border-b border-slate-800/50 bg-slate-900/60 backdrop-blur-sm">
      <div
        className="flex items-center gap-0.5 overflow-x-auto px-6 scrollbar-none"
        style={{ scrollbarWidth: "none" }}
      >
        {SECTION_ORDER.map((id) => {
          const meta = SECTION_META[id];
          const Icon = meta.icon;
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-150 relative",
                isActive
                  ? "border-orange-500 text-orange-400"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600",
              )}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{meta.shortLabel}</span>
              {id === "custom" && dashboardCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0 text-xs bg-orange-500/20 text-orange-400 rounded-full leading-5">
                  {dashboardCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
