"use client";

import { useCallback, useEffect, useState } from "react";
import API from "@/lib/api";
import type { ReportSection, ReportFilters } from "./useReportFilters";

const SECTION_ENDPOINTS: Record<ReportSection, string> = {
  overview:  "/reports/overview",
  sales:     "/reports/sales",
  leads:     "/reports/leads-contacts",
  campaigns: "/reports/campaigns",
  ai:        "/reports/ai-effectiveness",
  quality:   "/reports/data-quality",
  activity:  "/reports/activity",
  custom:    "/reports/dashboards",
};

export interface ReportState<T> {
  data: T | null;
  dataSection: ReportSection | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refetch: () => void;
}

export function useReport<T = unknown>(
  section: ReportSection,
  filters: ReportFilters,
): ReportState<T> {
  const [data, setData]               = useState<T | null>(null);
  const [dataSection, setDataSection] = useState<ReportSection | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  // tick is incremented by refetch() to force a re-fetch with the same deps
  const [tick, setTick]               = useState(0);

  useEffect(() => {
    const endpoint = SECTION_ENDPOINTS[section];
    const params: Record<string, string> = {};
    (Object.entries(filters) as [keyof ReportFilters, string][]).forEach(
      ([k, v]) => { if (v) params[k] = v; },
    );

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    API.get(endpoint, { params, signal: controller.signal })
      .then((res) => {
        setData(res.data as T);
        setDataSection(section);
        setLastUpdated(new Date());
        setLoading(false);
      })
      .catch((err: unknown) => {
        // Ignore cancellations from effect cleanup or section/filter changes
        if (controller.signal.aborted) return;
        const e = err as { response?: { data?: { detail?: string } }; message?: string };
        setError(e.response?.data?.detail ?? e.message ?? "Failed to load report");
        setLoading(false);
      });

    return () => { controller.abort(); };
  }, [section, filters, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { data, dataSection, loading, error, lastUpdated, refetch };
}
