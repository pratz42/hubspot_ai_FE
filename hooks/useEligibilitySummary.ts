"use client";

import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/config";
import type { EmailProviderConnection } from "./useEmailProviderStatus";

const API_BASE = API_BASE_URL;

export interface AudienceSnapshot {
  id: string;
  campaign_id: number;
  contact_id: number | null;
  channel: string;
  email_snapshot: string | null;
  linkedin_profile_url_snapshot: string | null;
  display_name_snapshot: string;
  title_snapshot: string | null;
  company_snapshot: string | null;
  eligibility_status: string;
  exclusion_reason: string | null;
  is_primary_contact: boolean;
  created_at: string;
}

export interface EligibilitySummary {
  total: number;
  eligible: number;
  excluded: number;
  suppressed: number;
  snapshots: AudienceSnapshot[];
  // Provider readiness — always true for linkedin; reflects active connections for email
  providerReady: boolean;
  activeProviders: EmailProviderConnection[];
}

interface UseEligibilitySummaryResult {
  summary: EligibilitySummary | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useEligibilitySummary(
  campaignId: number | null,
  channel?: "email" | "linkedin",
): UseEligibilitySummaryResult {
  const [summary, setSummary] = useState<EligibilitySummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!campaignId) return;
    setIsLoading(true);
    setError(null);
    try {
      // Always fetch audience. Co-fetch providers for email so the panel can show
      // "3 eligible · Gmail connected" as a single combined readiness view.
      const fetches: Promise<Response>[] = [
        fetch(`${API_BASE}/campaigns/${campaignId}/send/audience`, { headers: authHeaders() }),
      ];
      if (channel === "email") {
        fetches.push(fetch(`${API_BASE}/integrations/email/status`, { headers: authHeaders() }));
      }

      const [audienceRes, providerRes] = await Promise.all(fetches);
      if (!audienceRes.ok) throw new Error(`HTTP ${audienceRes.status}`);

      const data = await audienceRes.json() as AudienceSnapshot[];

      let activeProviders: EmailProviderConnection[] = [];
      if (channel === "email" && providerRes?.ok) {
        const all = await providerRes.json() as EmailProviderConnection[];
        activeProviders = all.filter((p) => p.status === "active");
      }

      const eligible = data.filter((s) => s.eligibility_status === "eligible").length;
      const suppressed = data.filter((s) => s.eligibility_status === "suppressed").length;
      const excluded = data.filter(
        (s) => s.eligibility_status !== "eligible" && s.eligibility_status !== "suppressed",
      ).length;

      setSummary({
        total: data.length,
        eligible,
        excluded,
        suppressed,
        snapshots: data,
        // LinkedIn never needs an external provider
        providerReady: channel === "linkedin" ? true : activeProviders.length > 0,
        activeProviders,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audience");
    } finally {
      setIsLoading(false);
    }
  }, [campaignId, channel]);

  useEffect(() => { void fetch_(); }, [fetch_]);

  return { summary, isLoading, error, refetch: fetch_ };
}
