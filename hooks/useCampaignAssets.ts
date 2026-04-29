"use client";

import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/config";

const API_BASE = API_BASE_URL;

export interface CampaignAsset {
  id: number;
  campaign_id: number;
  target_id: number | null;
  recipient_email: string | null;
  recipient_name: string | null;
  asset_type: string;
  sequence_step: number;
  subject: string;
  body: string;
  cta: string | null;
  qa_score: number | null;
  qa_notes: string | null;
  approval_status: string;
  last_edited_by: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface AssetPatch {
  subject?: string;
  body?: string;
  cta?: string;
}

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useCampaignAssets(
  campaignId: number | null,
  sequenceStep: number | null,
) {
  const [assets, setAssets] = useState<CampaignAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!campaignId || sequenceStep == null) return;
    setIsLoading(true);
    setError(null);
    try {
      const url = `${API_BASE}/campaigns/${campaignId}/assets?sequence_step=${sequenceStep}&asset_type=email`;
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAssets(await res.json() as CampaignAsset[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load drafts");
    } finally {
      setIsLoading(false);
    }
  }, [campaignId, sequenceStep]);

  useEffect(() => { void fetch_(); }, [fetch_]);

  const patchAsset = useCallback(async (
    assetId: number,
    patch: AssetPatch,
  ): Promise<CampaignAsset> => {
    const res = await fetch(`${API_BASE}/campaigns/${campaignId}/assets/${assetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { detail?: string };
      throw new Error(body.detail ?? `HTTP ${res.status}`);
    }
    const updated = await res.json() as CampaignAsset;
    setAssets((prev) => prev.map((a) => (a.id === assetId ? updated : a)));
    return updated;
  }, [campaignId]);

  return { assets, isLoading, error, refetch: fetch_, patchAsset };
}
