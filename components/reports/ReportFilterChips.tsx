"use client";

import { X } from "lucide-react";
import { FILTER_LABELS } from "@/hooks/useReportFilters";
import type { ReportFilters } from "@/hooks/useReportFilters";
import { Button } from "@/components/ui/button";

const VALUE_LABELS: Partial<Record<keyof ReportFilters, Record<string, string>>> = {
  lead_status: {
    new: "New", contacted: "Contacted", qualified: "Qualified",
    proposal: "Proposal", won: "Won", lost: "Lost",
  },
  ai_score_band: {
    very_high: "Very High (80+)", high: "High (61–79)",
    medium: "Medium (41–60)", low: "Low (0–40)", unscored: "Unscored",
  },
  campaign_type: {
    email: "Email", linkedin: "LinkedIn", linkedin_social: "LinkedIn Social",
  },
  channel: { email: "Email", linkedin: "LinkedIn" },
  lifecycle_stage: {
    subscriber: "Subscriber", lead: "Lead", marketing: "MQL",
    sales: "SQL", opportunity: "Opportunity", customer: "Customer", evangelist: "Evangelist",
  },
};

function friendlyValue(key: keyof ReportFilters, value: string): string {
  const map = VALUE_LABELS[key];
  return map?.[value] ?? value;
}

interface Props {
  activeFilters: [keyof ReportFilters, string][];
  onClear: (key: keyof ReportFilters) => void;
  onClearAll: () => void;
}

export function ReportFilterChips({ activeFilters, onClear, onClearAll }: Props) {
  if (activeFilters.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap px-6 py-2 bg-slate-900/20 border-b border-slate-800/30">
      <span className="text-xs text-slate-500 font-medium flex-shrink-0">Filters:</span>

      {activeFilters.map(([key, value]) => (
        <span
          key={key}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-500/10 border border-orange-500/20 text-orange-300 rounded-full text-xs font-medium"
        >
          <span className="text-orange-500/70">{FILTER_LABELS[key]}:</span>
          {friendlyValue(key, value)}
          <button
            onClick={() => onClear(key)}
            className="w-3.5 h-3.5 rounded-full flex items-center justify-center hover:bg-orange-500/30 transition-colors"
            aria-label={`Clear ${FILTER_LABELS[key]} filter`}
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}

      {activeFilters.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-6 px-2 text-xs text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-full"
        >
          Clear all
        </Button>
      )}
    </div>
  );
}
