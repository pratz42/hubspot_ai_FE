"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ReportFilters } from "@/hooks/useReportFilters";

interface Props {
  filters: ReportFilters;
  activeCount: number;
  onUpdate: (key: keyof ReportFilters, value: string) => void;
  onClearAll: () => void;
}

// Shared input class that matches the dark CRM design
const inputCls =
  "h-8 px-3 text-xs bg-slate-800 border border-slate-700/70 text-slate-200 rounded-lg placeholder:text-slate-500 focus:outline-none focus:border-orange-500/60 focus:ring-0 transition-colors [color-scheme:dark] w-full";

const labelCls = "block text-xs text-slate-500 mb-1 font-medium";

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-w-0">
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function TextInput({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    />
  );
}

function SelectFilter({
  value,
  placeholder,
  options,
  onChange,
}: {
  value: string;
  placeholder: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value || "__all__"} onValueChange={(v) => onChange(v === "__all__" ? "" : v)}>
      <SelectTrigger
        className={cn(
          "h-8 text-xs bg-slate-800 border-slate-700/70 text-slate-200",
          "focus:border-orange-500/60 focus:ring-0 rounded-lg",
          !value && "text-slate-500",
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
        <SelectItem value="__all__" className="text-xs text-slate-400">
          {placeholder}
        </SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-xs">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DateInput({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="date"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cn(inputCls, "cursor-pointer")}
    />
  );
}

const LEAD_STATUS_OPTIONS = [
  { value: "new",       label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal",  label: "Proposal" },
  { value: "won",       label: "Won" },
  { value: "lost",      label: "Lost" },
];

const AI_SCORE_BAND_OPTIONS = [
  { value: "very_high", label: "Very High (80+)" },
  { value: "high",      label: "High (61-79)" },
  { value: "medium",    label: "Medium (41-60)" },
  { value: "low",       label: "Low (0-40)" },
  { value: "unscored",  label: "Unscored" },
];

const CAMPAIGN_TYPE_OPTIONS = [
  { value: "email",            label: "Email" },
  { value: "linkedin",         label: "LinkedIn" },
  { value: "linkedin_social",  label: "LinkedIn Social" },
];

const CHANNEL_OPTIONS = [
  { value: "email",    label: "Email" },
  { value: "linkedin", label: "LinkedIn" },
];

const LIFECYCLE_OPTIONS = [
  { value: "subscriber",   label: "Subscriber" },
  { value: "lead",         label: "Lead" },
  { value: "marketing",    label: "Marketing Qualified" },
  { value: "sales",        label: "Sales Qualified" },
  { value: "opportunity",  label: "Opportunity" },
  { value: "customer",     label: "Customer" },
  { value: "evangelist",   label: "Evangelist" },
];

export function ReportFilterBar({ filters, activeCount, onUpdate, onClearAll }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-slate-900/40 border-b border-slate-800/50 px-6 py-3">
      {/* ── Row 1: primary filters ─────────────────────────────── */}
      <div className="flex items-end gap-3 flex-wrap">
        {/* Date range */}
        <FilterGroup label="Date From">
          <DateInput
            value={filters.date_from}
            placeholder="Start date"
            onChange={(v) => onUpdate("date_from", v)}
          />
        </FilterGroup>

        <FilterGroup label="Date To">
          <DateInput
            value={filters.date_to}
            placeholder="End date"
            onChange={(v) => onUpdate("date_to", v)}
          />
        </FilterGroup>

        <div className="w-px h-8 bg-slate-700/50 self-end" />

        <FilterGroup label="Owner">
          <TextInput
            value={filters.owner}
            placeholder="rep@company.com"
            onChange={(v) => onUpdate("owner", v)}
          />
        </FilterGroup>

        <FilterGroup label="Lead Status">
          <SelectFilter
            value={filters.lead_status}
            placeholder="All statuses"
            options={LEAD_STATUS_OPTIONS}
            onChange={(v) => onUpdate("lead_status", v)}
          />
        </FilterGroup>

        <FilterGroup label="AI Score Band">
          <SelectFilter
            value={filters.ai_score_band}
            placeholder="All bands"
            options={AI_SCORE_BAND_OPTIONS}
            onChange={(v) => onUpdate("ai_score_band", v)}
          />
        </FilterGroup>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Controls */}
        <div className="flex items-end gap-2">
          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="h-8 px-3 text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 gap-1.5"
            >
              <X className="w-3 h-3" />
              Clear all
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className={cn(
              "h-8 px-3 text-xs gap-1.5 transition-colors",
              expanded
                ? "text-orange-400 bg-orange-500/10 hover:bg-orange-500/15"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800",
            )}
          >
            <SlidersHorizontal className="w-3 h-3" />
            More filters
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {activeCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* ── Row 2: secondary filters (expandable) ──────────────── */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-800/50 flex items-end gap-3 flex-wrap">
          <FilterGroup label="Team">
            <TextInput
              value={filters.team}
              placeholder="Team name"
              onChange={(v) => onUpdate("team", v)}
            />
          </FilterGroup>

          <FilterGroup label="Campaign Type">
            <SelectFilter
              value={filters.campaign_type}
              placeholder="All types"
              options={CAMPAIGN_TYPE_OPTIONS}
              onChange={(v) => onUpdate("campaign_type", v)}
            />
          </FilterGroup>

          <FilterGroup label="Channel">
            <SelectFilter
              value={filters.channel}
              placeholder="All channels"
              options={CHANNEL_OPTIONS}
              onChange={(v) => onUpdate("channel", v)}
            />
          </FilterGroup>

          <FilterGroup label="Lifecycle Stage">
            <SelectFilter
              value={filters.lifecycle_stage}
              placeholder="All stages"
              options={LIFECYCLE_OPTIONS}
              onChange={(v) => onUpdate("lifecycle_stage", v)}
            />
          </FilterGroup>

          <FilterGroup label="Industry">
            <TextInput
              value={filters.industry}
              placeholder="e.g. SaaS, Manufacturing"
              onChange={(v) => onUpdate("industry", v)}
            />
          </FilterGroup>

          <FilterGroup label="Source">
            <TextInput
              value={filters.source}
              placeholder="e.g. LinkedIn, Web"
              onChange={(v) => onUpdate("source", v)}
            />
          </FilterGroup>

          <FilterGroup label="Pipeline ID">
            <TextInput
              value={filters.pipeline_id}
              placeholder="Pipeline ID"
              onChange={(v) => onUpdate("pipeline_id", v)}
            />
          </FilterGroup>

          <FilterGroup label="Deal Stage ID">
            <TextInput
              value={filters.deal_stage_id}
              placeholder="Stage ID"
              onChange={(v) => onUpdate("deal_stage_id", v)}
            />
          </FilterGroup>
        </div>
      )}
    </div>
  );
}
