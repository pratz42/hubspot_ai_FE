"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "@/lib/config";
import type { AudienceSnapshot } from "./useEligibilitySummary";

const API_BASE = API_BASE_URL;

// Statuses that, once set optimistically, should not be overwritten by stale server data.
const TERMINAL_ATTEMPT_STATUSES = new Set([
  "marked_sent", "sent", "failed", "skipped", "suppressed",
]);

export interface SendAttempt {
  id: string;
  dispatch_job_id: string;
  campaign_id: number;
  contact_id: number | null;
  channel: string;
  status: string;
  esp_message_id: string | null;
  attempt_count: number;
  last_error: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  failed_at: string | null;
  manually_sent_at: string | null;
  skipped_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LinkedInAttemptRow {
  contactId: number;
  displayName: string;
  linkedinProfileUrl: string | null;
  titleSnapshot: string | null;
  companySnapshot: string | null;
  eligibilityStatus: string;
  attempt: SendAttempt | null;
}

interface UseLinkedInAttemptsResult {
  rows: LinkedInAttemptRow[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  patchOptimistic: (contactId: number, status: string) => void;
}

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useLinkedInAttempts(campaignId: number | null): UseLinkedInAttemptsResult {
  const [rows, setRows] = useState<LinkedInAttemptRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // contactId → optimistic status, persisted across server refetches until the
  // server itself reaches a terminal state for that contact.
  const optimisticRef = useRef(new Map<number, string>());

  // Apply a status update instantly in local state.  The server will eventually
  // agree (or we detect a divergence on the next refetch and clear the override).
  const patchOptimistic = useCallback((contactId: number, status: string) => {
    optimisticRef.current.set(contactId, status);
    setRows((prev) =>
      prev.map((row) =>
        row.contactId === contactId
          ? { ...row, attempt: row.attempt ? { ...row.attempt, status } : row.attempt }
          : row,
      ),
    );
  }, []);

  const fetch_ = useCallback(async () => {
    if (!campaignId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [snapshotRes, attemptRes] = await Promise.all([
        fetch(`${API_BASE}/campaigns/${campaignId}/send/audience`, { headers: authHeaders() }),
        fetch(`${API_BASE}/campaigns/${campaignId}/send/attempts`, { headers: authHeaders() }),
      ]);

      if (!snapshotRes.ok) throw new Error(`Audience fetch failed: HTTP ${snapshotRes.status}`);
      if (!attemptRes.ok) throw new Error(`Attempts fetch failed: HTTP ${attemptRes.status}`);

      const snapshots = await snapshotRes.json() as AudienceSnapshot[];
      const attempts = await attemptRes.json() as SendAttempt[];

      const linkedInSnapshots = snapshots.filter((s) => s.channel === "linkedin");

      // Build contactId → latest attempt map
      const attemptMap = new Map<number, SendAttempt>();
      for (const a of attempts) {
        if (a.channel !== "linkedin" || a.contact_id == null) continue;
        const existing = attemptMap.get(a.contact_id);
        if (!existing || a.created_at > existing.created_at) {
          attemptMap.set(a.contact_id, a);
        }
      }

      const joined: LinkedInAttemptRow[] = linkedInSnapshots.map((snap) => {
        const serverAttempt = snap.contact_id != null ? (attemptMap.get(snap.contact_id) ?? null) : null;
        const optimistic = snap.contact_id != null ? optimisticRef.current.get(snap.contact_id) : undefined;

        let attempt = serverAttempt;

        if (optimistic && TERMINAL_ATTEMPT_STATUSES.has(optimistic)) {
          if (serverAttempt && TERMINAL_ATTEMPT_STATUSES.has(serverAttempt.status)) {
            // Server has caught up to a terminal state — our override is no longer needed.
            if (snap.contact_id != null) optimisticRef.current.delete(snap.contact_id);
          } else {
            // Server hasn't caught up yet; keep showing our optimistic status to
            // prevent the row from flickering back to a non-terminal state.
            attempt = serverAttempt ? { ...serverAttempt, status: optimistic } : serverAttempt;
          }
        }

        return {
          contactId: snap.contact_id!,
          displayName: snap.display_name_snapshot,
          linkedinProfileUrl: snap.linkedin_profile_url_snapshot,
          titleSnapshot: snap.title_snapshot,
          companySnapshot: snap.company_snapshot,
          eligibilityStatus: snap.eligibility_status,
          attempt,
        };
      });

      setRows(joined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load LinkedIn attempts");
    } finally {
      setIsLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { void fetch_(); }, [fetch_]);

  return { rows, isLoading, error, refetch: fetch_, patchOptimistic };
}
