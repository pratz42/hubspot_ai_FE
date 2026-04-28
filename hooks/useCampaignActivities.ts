"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CampaignSendStatus } from "./useCampaignSendStream";

const API_BASE = "http://localhost:8000";
const ACTIVE_STATUSES = new Set<CampaignSendStatus>(["queued", "sending", "paused"]);
const POLL_INTERVAL_MS = 5_000;

export interface CampaignActivity {
  id: string;
  campaign_id: number;
  contact_id: number | null;
  dispatch_job_id: string | null;
  send_attempt_id: string | null;
  actor_type: string;
  actor_id: string | null;
  actor_email: string | null;
  event_type: string;
  channel: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
}

interface UseCampaignActivitiesResult {
  activities: CampaignActivity[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useCampaignActivities(
  campaignId: number | null,
  sendStatus?: CampaignSendStatus | string
): UseCampaignActivitiesResult {
  const [activities, setActivities] = useState<CampaignActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);
  // Always reflects the current sendStatus so the recursive poll callback doesn't
  // capture a stale closure value and schedule an extra tick after terminal state.
  const sendStatusRef = useRef(sendStatus);
  useEffect(() => { sendStatusRef.current = sendStatus; });

  const fetch_ = useCallback(async () => {
    if (!campaignId) return;
    if (activities.length === 0) setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/campaigns/${campaignId}/send/logs?limit=200`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as CampaignActivity[];
      if (!unmountedRef.current) setActivities(data);
    } catch (err) {
      if (!unmountedRef.current) setError(err instanceof Error ? err.message : "Failed to load activity");
    } finally {
      if (!unmountedRef.current) setIsLoading(false);
    }
  }, [campaignId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll while send is active
  useEffect(() => {
    if (!campaignId) return;

    const isActive = sendStatus ? ACTIVE_STATUSES.has(sendStatus as CampaignSendStatus) : false;

    if (isActive) {
      const schedule = () => {
        pollTimerRef.current = setTimeout(async () => {
          if (unmountedRef.current) return;
          await fetch_();
          if (!unmountedRef.current && ACTIVE_STATUSES.has(sendStatusRef.current as CampaignSendStatus)) {
            schedule();
          }
        }, POLL_INTERVAL_MS);
      };
      schedule();
    }

    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [campaignId, sendStatus, fetch_]);

  // Initial load and on campaignId change
  useEffect(() => {
    unmountedRef.current = false;
    void fetch_();
    return () => { unmountedRef.current = true; };
  }, [fetch_]);

  return { activities, isLoading, error, refetch: fetch_ };
}
