"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const API_BASE = "http://localhost:8000";

export type CampaignSendStatus =
  | "not_started"
  | "queued"
  | "sending"
  | "paused"
  | "sent"
  | "partial_failed"
  | "cancelled"
  | "failed";

export interface StepStatus {
  step: number;
  recipientCount: number;
  subjectPreview: string | null;
  dispatchJobId: string | null;
  dispatchStatus: string;
  sentCount: number;
  draftedCount: number;
  failedCount: number;
  eligibleCount: number;
}

export interface SendProgress {
  status: CampaignSendStatus;
  sentCount: number;
  failedCount: number;
  draftCount: number;
  skippedCount: number;
  totalRecipients: number;
  eligibleRecipients: number;
  dispatchJobId: string | null;
  activeSequenceStep: number;
  lastError: string | null;
}

const TERMINAL_STATUSES = new Set([
  "succeeded",
  "failed",
  "cancelled",
  "dead_lettered",
  "partial",
]);

const ACTIVE_SEND_STATUSES = new Set<CampaignSendStatus>([
  "queued",
  "sending",
  "paused",
]);

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function mapEventToProgress(
  parsed: Record<string, unknown>,
  prev: SendProgress
): SendProgress {
  return {
    status: (parsed.status as CampaignSendStatus) ?? prev.status,
    sentCount: parsed.sent_count != null ? Number(parsed.sent_count) : prev.sentCount,
    failedCount: parsed.failed_count != null ? Number(parsed.failed_count) : prev.failedCount,
    draftCount: parsed.draft_count != null ? Number(parsed.draft_count) : prev.draftCount,
    skippedCount: parsed.skipped_count != null ? Number(parsed.skipped_count) : prev.skippedCount,
    totalRecipients: parsed.total_recipients != null ? Number(parsed.total_recipients) : prev.totalRecipients,
    eligibleRecipients: parsed.eligible_recipients != null ? Number(parsed.eligible_recipients) : prev.eligibleRecipients,
    dispatchJobId: parsed.dispatch_job_id ? String(parsed.dispatch_job_id) : prev.dispatchJobId,
    activeSequenceStep: parsed.sequence_step != null ? Number(parsed.sequence_step) : prev.activeSequenceStep,
    lastError: parsed.error ? String(parsed.error) : prev.lastError,
  };
}

function makeInitialProgress(): SendProgress {
  return {
    status: "not_started",
    sentCount: 0,
    failedCount: 0,
    draftCount: 0,
    skippedCount: 0,
    totalRecipients: 0,
    eligibleRecipients: 0,
    dispatchJobId: null,
    activeSequenceStep: 1,
    lastError: null,
  };
}

export function useCampaignSendStream(
  campaignId: number | null,
  initialSendStatus?: CampaignSendStatus | string
) {
  const [progress, setProgress] = useState<SendProgress>(makeInitialProgress);
  const [steps, setSteps] = useState<StepStatus[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  const stopStream = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const rehydrate = useCallback(async () => {
    if (!campaignId || unmountedRef.current) return;
    try {
      const res = await fetch(`${API_BASE}/campaigns/${campaignId}/send/status`, {
        headers: authHeaders(),
      });
      if (!res.ok || unmountedRef.current) return;
      const data = await res.json() as Record<string, unknown>;
      if (unmountedRef.current) return;

      const activeJob = data.active_dispatch_job as Record<string, unknown> | null;
      setProgress((prev) => ({
        status: (data.send_status as CampaignSendStatus) ?? prev.status,
        sentCount: Number(data.sent_count ?? prev.sentCount),
        failedCount: Number(data.failed_count ?? prev.failedCount),
        draftCount: Number(data.draft_count ?? prev.draftCount),
        skippedCount: Number(data.skipped_count ?? prev.skippedCount),
        totalRecipients: Number(data.total_recipients ?? prev.totalRecipients),
        eligibleRecipients: Number(data.eligible_count ?? prev.eligibleRecipients),
        dispatchJobId: activeJob?.id ? String(activeJob.id) : prev.dispatchJobId,
        activeSequenceStep: activeJob?.sequence_step ? Number(activeJob.sequence_step) : prev.activeSequenceStep,
        lastError: (data.last_send_error as string | null) ?? prev.lastError,
      }));

      const rawSteps = data.steps as Array<Record<string, unknown>> | undefined;
      if (rawSteps) {
        setSteps(rawSteps.map((s) => ({
          step: Number(s.step),
          recipientCount: Number(s.recipient_count ?? 0),
          subjectPreview: s.subject_preview ? String(s.subject_preview) : null,
          dispatchJobId: s.dispatch_job_id ? String(s.dispatch_job_id) : null,
          dispatchStatus: String(s.dispatch_status ?? "not_started"),
          sentCount: Number(s.sent_count ?? 0),
          draftedCount: Number(s.drafted_count ?? 0),
          failedCount: Number(s.failed_count ?? 0),
          eligibleCount: Number(s.eligible_count ?? 0),
        })));
      }

      const s = data.send_status as CampaignSendStatus;
      if (ACTIVE_SEND_STATUSES.has(s) && !unmountedRef.current) {
        reconnectTimerRef.current = setTimeout(startStream, 5_000);
      }
    } catch {
      // Non-fatal
    }
  }, [campaignId]); // eslint-disable-line react-hooks/exhaustive-deps

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const startStream = useCallback(() => {
    if (!campaignId || unmountedRef.current) return;
    stopStream();

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    async function connect() {
      try {
        setIsStreaming(true);
        const res = await fetch(`${API_BASE}/events/campaigns/${campaignId}/send`, {
          headers: { Accept: "text/event-stream", ...authHeaders() },
          signal: ctrl.signal,
        });

        if (!res.ok || !res.body) {
          setIsStreaming(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const raw = line.slice(5).trim();
            let parsed: Record<string, unknown>;
            try { parsed = JSON.parse(raw); } catch { continue; }

            const event = parsed.event as string | undefined;
            if (!event || event === "connected" || event === "stream_end") continue;

            if (event === "campaign.send_started") {
              setProgress((prev) => mapEventToProgress({ ...parsed, status: "sending" }, prev));
            } else if (event === "campaign.send_progress") {
              setProgress((prev) => mapEventToProgress(parsed, prev));
            } else if (event === "campaign.send_completed") {
              setProgress((prev) => mapEventToProgress({ ...parsed, status: "sent" }, prev));
              setIsStreaming(false);
              ctrl.abort();
              // Rehydrate from DB — tasks completing after the stream closed
              // will have been reconciled by _maybe_close_dispatch_job.
              if (!unmountedRef.current) void rehydrate();
              return;
            } else if (event === "campaign.send_partial") {
              setProgress((prev) => mapEventToProgress({ ...parsed, status: "partial_failed" }, prev));
              setIsStreaming(false);
              ctrl.abort();
              if (!unmountedRef.current) void rehydrate();
              return;
            } else if (event === "campaign.send_failed") {
              setProgress((prev) => mapEventToProgress({ ...parsed, status: "failed" }, prev));
              setIsStreaming(false);
              ctrl.abort();
              if (!unmountedRef.current) void rehydrate();
              return;
            } else if (event === "campaign.paused") {
              setProgress((prev) => mapEventToProgress({ ...parsed, status: "paused" }, prev));
            } else if (event === "campaign.needs_reconnect") {
              if (!unmountedRef.current) {
                reconnectTimerRef.current = setTimeout(startStream, 2_000);
              }
              ctrl.abort();
              return;
            } else if (TERMINAL_STATUSES.has(String(parsed.status))) {
              setProgress((prev) => mapEventToProgress(parsed, prev));
              setIsStreaming(false);
              ctrl.abort();
              if (!unmountedRef.current) void rehydrate();
              return;
            }
          }
        }

        // Stream closed cleanly without a terminal event — rehydrate from DB
        setIsStreaming(false);
        if (!unmountedRef.current) void rehydrate();
      } catch {
        setIsStreaming(false);
        if (!unmountedRef.current) void rehydrate();
      }
    }

    connect();
  }, [campaignId, stopStream, rehydrate]);

  // Initial status fetch + stream connect if active
  useEffect(() => {
    if (!campaignId) return;
    unmountedRef.current = false;

    // If caller already knows the status, seed progress immediately
    if (initialSendStatus) {
      setProgress((prev) => ({
        ...prev,
        status: initialSendStatus as CampaignSendStatus,
      }));
    }

    // Always fetch authoritative state from DB on mount
    void rehydrate().then(() => {
      if (unmountedRef.current) return;
      // rehydrate may have updated status — check if we should stream
      setProgress((current) => {
        if (ACTIVE_SEND_STATUSES.has(current.status)) {
          startStream();
        }
        return current;
      });
    });

    return () => {
      unmountedRef.current = true;
      stopStream();
    };
  }, [campaignId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Also connect stream when send status transitions to active externally
  useEffect(() => {
    if (!initialSendStatus) return;
    const s = initialSendStatus as CampaignSendStatus;
    if (ACTIVE_SEND_STATUSES.has(s) && !isStreaming) {
      startStream();
    }
  }, [initialSendStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    progress,
    steps,
    isStreaming,
    startStream,
    stopStream,
    refetch: rehydrate,
  };
}
