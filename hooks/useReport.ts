"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  dataSection: ReportSection | null;   // which section this data was fetched for
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refetch: () => void;
}

export function useReport<T = unknown>(
  section: ReportSection,
  filters: ReportFilters,
): ReportState<T> {
  const [data, setData]                       = useState<T | null>(null);
  const [dataSection, setDataSection]         = useState<ReportSection | null>(null);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [lastUpdated, setLastUpdated]         = useState<Date | null>(null);
  const abortRef                              = useRef<AbortController | null>(null);
  const lastFetchKey                          = useRef<string>("");

  const fetchData = useCallback(async () => {
    const endpoint = SECTION_ENDPOINTS[section];

    const params: Record<string, string> = {};
    (Object.entries(filters) as [keyof ReportFilters, string][]).forEach(
      ([k, v]) => { if (v) params[k] = v; },
    );

    const fetchKey = `${endpoint}:${JSON.stringify(params)}`;
    if (fetchKey === lastFetchKey.current) return;
    lastFetchKey.current = fetchKey;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const res = await API.get(endpoint, { params, signal: controller.signal });
      setData(res.data as T);
      setDataSection(section);       // record which section this data belongs to
      setLastUpdated(new Date());
    } catch (err: unknown) {
      const e = err as { name?: string; response?: { data?: { detail?: string } }; message?: string };
      if (e.name === "CanceledError" || e.name === "AbortError") {
        lastFetchKey.current = "";   // allow retry after cancellation
        return;
      }
      setError(e.response?.data?.detail ?? e.message ?? "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [section, filters]);

  useEffect(() => {
    fetchData();
    return () => { abortRef.current?.abort(); };
  }, [fetchData]);

  const refetch = useCallback(() => {
    lastFetchKey.current = "";
    fetchData();
  }, [fetchData]);

  return { data, dataSection, loading, error, lastUpdated, refetch };
}
