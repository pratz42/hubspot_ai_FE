"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "@/lib/config";

const API_BASE = API_BASE_URL;

export type PptStatus =
  | "not_generated"
  | "queued"
  | "generating"
  | "ready"
  | "failed"
  | "stale";   // derived: backend ready + is_stale=true

export interface PptState {
  status: PptStatus;
  version: number;
  jobId: string | null;
  error: string | null;
  pptxReady: boolean;
  isLoading: boolean;
  updatedAt: string | null;    // finished_at ?? updated_at from the job
  progressPct: number;         // 0-100 from ai_jobs.progress_pct
  currentStep: string | null;  // human-readable stage label
}

const INITIAL: PptState = {
  status: "not_generated",
  version: 0,
  jobId: null,
  error: null,
  pptxReady: false,
  isLoading: false,
  updatedAt: null,
  progressPct: 0,
  currentStep: null,
};

// Polling continues while any of these statuses is active.
// "stale", "ready", "failed" are all terminal — SSE stream stops.
const ACTIVE_STATUSES: PptStatus[] = ["queued", "generating"];

// SSE event names that indicate the job has reached a terminal state.
const TERMINAL_SSE_EVENTS = ["ppt.ready", "ppt.failed"];

// All deck-specific SSE event names the frontend handles.
const DECK_SSE_EVENTS = ["ppt.queued", "ppt.generating", "ppt.progress", "ppt.ready", "ppt.failed"];

function token() {
  return typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
}

function authHeaders(): Record<string, string> {
  const t = token();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/**
 * Derives the display status from the backend strategy_deck_status +
 * is_stale flag.  The backend never emits "stale" directly — it stays
 * "ready" and sets is_stale=true once stale detection fires on the
 * status endpoint.
 */
function deriveStatus(deckStatus: string, isStale: boolean): PptStatus {
  if (deckStatus === "ready" && isStale) return "stale";
  const known: PptStatus[] = ["not_generated", "queued", "generating", "ready", "failed"];
  return known.includes(deckStatus as PptStatus)
    ? (deckStatus as PptStatus)
    : "not_generated";
}

/** Pick the most informative timestamp from a status or SSE payload. */
function pickTimestamp(data: Record<string, unknown>, prev: string | null): string | null {
  return data.finished_at
    ? String(data.finished_at)
    : data.updated_at
    ? String(data.updated_at)
    : prev;
}

/**
 * Map a raw status-endpoint OR SSE event payload to the relevant slice of
 * PptState.  Both sources carry the same field names so this function is the
 * single canonical translation layer for all four data paths:
 *   initial fetch / SSE events / generate response / regenerate response
 */
function mapStatusPayload(
  data: Record<string, unknown>,
  prev: PptState,
): Pick<PptState, "status" | "version" | "jobId" | "error" | "pptxReady" | "updatedAt" | "progressPct" | "currentStep"> {
  const rawDeckStatus = (data.strategy_deck_status as string) ?? "not_generated";
  const isStale = Boolean(data.is_stale);
  const s = deriveStatus(rawDeckStatus, isStale);
  return {
    status: s,
    version: Number(data.strategy_deck_version ?? prev.version),
    jobId: data.job_id ? String(data.job_id) : prev.jobId,
    error: data.last_error ? String(data.last_error) : null,
    // pptxReady stays true for stale — the existing file is still downloadable
    pptxReady: rawDeckStatus === "ready" || s === "stale",
    updatedAt: pickTimestamp(data, prev.updatedAt),
    progressPct: Number(data.progress_pct ?? prev.progressPct),
    currentStep: data.current_step ? String(data.current_step) : prev.currentStep,
  };
}

export function useLeadPpt(leadId: number | null) {
  const [state, setState] = useState<PptState>(INITIAL);
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
  }, []);

  // SSE stream (fetch-based to support auth headers — native EventSource cannot
  // send Authorization).  Mirrors useStrategyBrief.ts startStream exactly.
  const startStream = useCallback(() => {
    if (!leadId || unmountedRef.current) return;
    stopStream();

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    async function connect() {
      try {
        const res = await fetch(`${API_BASE}/events/leads/${leadId}/ppt-generator`, {
          headers: { Accept: "text/event-stream", ...authHeaders() },
          signal: ctrl.signal,
        });

        if (!res.ok || !res.body) return;

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

            const eventName = parsed.event as string | undefined;
            if (!eventName || eventName === "connected" || eventName === "stream_end") continue;
            if (!DECK_SSE_EVENTS.includes(eventName)) continue;

            // All deck SSE events carry the same payload shape as the REST status
            // endpoint, so mapStatusPayload handles every event uniformly.
            setState((prev) => {
              const mapped = mapStatusPayload(parsed, prev);
              return { ...prev, ...mapped };
            });

            if (TERMINAL_SSE_EVENTS.includes(eventName)) {
              ctrl.abort();
              return;
            }
          }
        }

        // Stream closed cleanly (backend timeout / stream_end).
        // Re-check the authoritative status from the DB and reconnect if the
        // job is still active — generation can outlast the SSE timeout.
        if (!unmountedRef.current) {
          void rehydrateAndMaybeReconnect();
        }
      } catch {
        // AbortError is expected on cleanup — ignore silently.
        // Any other network error: re-hydrate and reconnect if still active.
        if (!unmountedRef.current) {
          void rehydrateAndMaybeReconnect();
        }
      }
    }

    async function rehydrateAndMaybeReconnect() {
      try {
        const r = await fetch(`${API_BASE}/leads/${leadId}/ppt-generator/status`, {
          headers: authHeaders(),
        });
        if (!r.ok || unmountedRef.current) return;
        const data = (await r.json()) as Record<string, unknown>;
        if (unmountedRef.current) return;

        let nextStatus: PptStatus = "not_generated";
        setState((prev) => {
          const mapped = mapStatusPayload(data, prev);
          nextStatus = mapped.status;
          return { ...prev, ...mapped };
        });

        // If the job is still running, reconnect after a short pause so we keep
        // watching for completion without hammering the server.
        if (ACTIVE_STATUSES.includes(nextStatus)) {
          reconnectTimerRef.current = setTimeout(startStream, 5_000);
        }
      } catch {
        // Non-fatal — the user can manually refresh if needed.
      }
    }

    connect();
  }, [leadId, stopStream]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Initial status fetch on mount ────────────────────────────────────────

  useEffect(() => {
    if (!leadId) return;
    unmountedRef.current = false;

    fetch(`${API_BASE}/leads/${leadId}/ppt-generator/status`, {
      headers: authHeaders(),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Record<string, unknown> | null) => {
        if (!data || unmountedRef.current) return;
        const mapped = mapStatusPayload(data, INITIAL);
        setState({ ...INITIAL, ...mapped, isLoading: false });
        if (ACTIVE_STATUSES.includes(mapped.status)) startStream();
      })
      .catch(() => {});

    return () => {
      unmountedRef.current = true;
      stopStream();
    };
  }, [leadId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ───────────────────────────────────────────────────────────────

  /**
   * Start generation for the first time (or after failure).
   * If the deck is already ready, the backend returns 200 and we
   * rehydrate state — no new job is created, no stream starts.
   */
  const generate = useCallback(async () => {
    if (!leadId) return;
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const res = await fetch(`${API_BASE}/leads/${leadId}/ppt-generator`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (unmountedRef.current) return;
      let nextStatus: PptStatus = "not_generated";
      setState((prev) => {
        const mapped = mapStatusPayload(data, prev);
        nextStatus = mapped.status;
        return { ...prev, ...mapped, isLoading: false };
      });
      if (ACTIVE_STATUSES.includes(nextStatus)) startStream();
    } catch {
      if (!unmountedRef.current) setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [leadId, startStream]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Force a new deck version even if one already exists (regenerate=true).
   * This is the correct action for a stale deck or an intentional rebuild.
   * It is deliberately NOT the same as generate() — it always dispatches a
   * new Celery job regardless of current status.
   */
  const regenerate = useCallback(async () => {
    if (!leadId) return;
    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      progressPct: 0,
      currentStep: null,
    }));
    try {
      const res = await fetch(
        `${API_BASE}/leads/${leadId}/ppt-generator?regenerate=true`,
        { method: "POST", headers: authHeaders() },
      );
      const data = (await res.json()) as Record<string, unknown>;
      if (unmountedRef.current) return;
      let nextStatus: PptStatus = "not_generated";
      setState((prev) => {
        const mapped = mapStatusPayload(data, prev);
        nextStatus = mapped.status;
        return { ...prev, ...mapped, isLoading: false };
      });
      if (ACTIVE_STATUSES.includes(nextStatus)) startStream();
    } catch {
      if (!unmountedRef.current) setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [leadId, startStream]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Fetch the PPTX with the auth header and trigger a programmatic download.
   * A plain <a href> would hit the endpoint without Authorization and get 401.
   * Works for both "ready" and "stale" — the file exists in both cases.
   */
  const download = useCallback(async () => {
    if (!leadId) return;
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const res = await fetch(`${API_BASE}/leads/${leadId}/ppt-generator.pptx`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        throw new Error(String(body.detail ?? `Download failed (${res.status})`));
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("content-disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      a.download = match?.[1] ?? `pitch-deck-${leadId}.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      if (!unmountedRef.current)
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : String(err),
        }));
    } finally {
      if (!unmountedRef.current) setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [leadId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    ...state,
    generate,
    regenerate,   // separate function — calls ?regenerate=true
    download,
    isActive: ACTIVE_STATUSES.includes(state.status),
  };
}

export type UseLeadPptReturn = ReturnType<typeof useLeadPpt>;
