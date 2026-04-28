"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ReportSection =
  | "overview"
  | "sales"
  | "leads"
  | "campaigns"
  | "ai"
  | "quality"
  | "activity"
  | "custom";

export interface ReportFilters {
  date_from: string;
  date_to: string;
  owner: string;
  team: string;
  pipeline_id: string;
  campaign_type: string;
  channel: string;
  industry: string;
  source: string;
  lifecycle_stage: string;
  lead_status: string;
  ai_score_band: string;
  deal_stage_id: string;
}

export const FILTER_LABELS: Record<keyof ReportFilters, string> = {
  date_from:       "From",
  date_to:         "To",
  owner:           "Owner",
  team:            "Team",
  pipeline_id:     "Pipeline",
  campaign_type:   "Campaign Type",
  channel:         "Channel",
  industry:        "Industry",
  source:          "Source",
  lifecycle_stage: "Lifecycle Stage",
  lead_status:     "Lead Status",
  ai_score_band:   "AI Score Band",
  deal_stage_id:   "Deal Stage",
};

const DEFAULT_FILTERS: ReportFilters = {
  date_from: "", date_to: "", owner: "", team: "",
  pipeline_id: "", campaign_type: "", channel: "",
  industry: "", source: "", lifecycle_stage: "",
  lead_status: "", ai_score_band: "", deal_stage_id: "",
};

function readFromURL(): { section: ReportSection; filters: ReportFilters } {
  if (typeof window === "undefined") {
    return { section: "overview", filters: { ...DEFAULT_FILTERS } };
  }
  const p = new URLSearchParams(window.location.search);
  return {
    section: (p.get("section") as ReportSection) || "overview",
    filters: {
      date_from:       p.get("date_from")       || "",
      date_to:         p.get("date_to")         || "",
      owner:           p.get("owner")           || "",
      team:            p.get("team")            || "",
      pipeline_id:     p.get("pipeline_id")     || "",
      campaign_type:   p.get("campaign_type")   || "",
      channel:         p.get("channel")         || "",
      industry:        p.get("industry")        || "",
      source:          p.get("source")          || "",
      lifecycle_stage: p.get("lifecycle_stage") || "",
      lead_status:     p.get("lead_status")     || "",
      ai_score_band:   p.get("ai_score_band")   || "",
      deal_stage_id:   p.get("deal_stage_id")   || "",
    },
  };
}

function writeToURL(section: ReportSection, filters: ReportFilters) {
  const p = new URLSearchParams();
  p.set("section", section);
  (Object.entries(filters) as [keyof ReportFilters, string][]).forEach(([k, v]) => {
    if (v) p.set(k, v);
  });
  window.history.replaceState(null, "", `/reports?${p.toString()}`);
}

export function useReportFilters() {
  const [section, setSection] = useState<ReportSection>("overview");
  const [filters, setFilters] = useState<ReportFilters>({ ...DEFAULT_FILTERS });

  // urlSyncBlocked starts true — we enable it after initial URL hydration has settled
  // so we never write over the URL before reading from it.
  const urlSyncBlocked = useRef(true);

  // Hydrate from URL exactly once on client mount, then unblock URL sync.
  useEffect(() => {
    const { section: s, filters: f } = readFromURL();
    setSection(s);
    // Only update filters if values actually changed — returning the previous
    // reference when nothing changed lets React bail out, which prevents a
    // spurious re-render that would cancel and dedup-block the in-flight fetch.
    setFilters((prev) => {
      const changed = (Object.keys(f) as (keyof ReportFilters)[]).some(
        (k) => f[k] !== prev[k],
      );
      return changed ? f : prev;
    });
    // Defer unblocking to after the state updates above have been applied
    // (i.e. after the next render). setTimeout(0) runs after the current
    // flush, so the sync effect won't fire prematurely with stale defaults.
    setTimeout(() => { urlSyncBlocked.current = false; }, 0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Write URL after every user-triggered section/filter change.
  // Runs in useEffect (after paint), never during render — avoids the
  // "Cannot update Router while rendering" error from Next.js App Router.
  useEffect(() => {
    if (urlSyncBlocked.current) return;
    writeToURL(section, filters);
  }, [section, filters]);

  const setActiveSection = useCallback((s: ReportSection) => {
    setSection(s);
  }, []);

  const updateFilter = useCallback((key: keyof ReportFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilter = useCallback(
    (key: keyof ReportFilters) => updateFilter(key, ""),
    [updateFilter],
  );

  const clearAll = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS });
  }, []);

  const activeFilters = (
    Object.entries(filters) as [keyof ReportFilters, string][]
  ).filter(([, v]) => v !== "");

  return {
    section,
    setSection: setActiveSection,
    filters,
    updateFilter,
    clearFilter,
    clearAll,
    activeFilters,
    activeCount: activeFilters.length,
  };
}
