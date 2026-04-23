"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const API_BASE = "http://localhost:8000";

export type BriefStatus =
  | "not_generated"
  | "queued"
  | "generating"
  | "ready"
  | "failed";

export interface BriefState {
  status: BriefStatus;
  version: number;
  jobId: string | null;
  jobStatus: string | null;
  error: string | null;
  pdfReady: boolean;
  isLoading: boolean;
}

const INITIAL: BriefState = {
  status: "not_generated",
  version: 0,
  jobId: null,
  jobStatus: null,
  error: null,
  pdfReady: false,
  isLoading: false,
};

const ACTIVE_STATUSES: BriefStatus[] = ["queued", "generating"];
const TERMINAL_STATUSES: BriefStatus[] = ["ready", "failed"];

function token() {
  return typeof window !== "undefined" ? (localStorage.getItem("token") ?? "") : "";
}

function authHeaders() {
  const t = token();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export function useStrategyBrief(leadId: number | null) {
  const [state, setState] = useState<BriefState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  // ── SSE stream (fetch-based to support auth headers) ───────────────────────

  const stopStream = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const startStream = useCallback(() => {
    if (!leadId || unmountedRef.current) return;
    stopStream();

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    async function connect() {
      try {
        const res = await fetch(`${API_BASE}/events/strategy-brief/${leadId}`, {
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

            const event = parsed.event as string | undefined;
            if (!event || event === "connected" || event === "stream_end") continue;

            // strategy_brief_status is the authoritative field from the leads row.
            const authStatus = parsed.strategy_brief_status as BriefStatus | undefined;

            if (event === "lead.brief_queued") {
              setState((prev) => ({
                ...prev,
                status: authStatus ?? "queued",
                version: Number(parsed.strategy_brief_version ?? prev.version),
                jobId: parsed.job_id ? String(parsed.job_id) : prev.jobId,
                jobStatus: parsed.job_status ? String(parsed.job_status) : prev.jobStatus,
                error: null,
              }));
            } else if (event === "lead.brief_generating") {
              setState((prev) => ({
                ...prev,
                status: authStatus ?? "generating",
                version: Number(parsed.strategy_brief_version ?? prev.version),
                jobId: parsed.job_id ? String(parsed.job_id) : prev.jobId,
                jobStatus: parsed.job_status ? String(parsed.job_status) : prev.jobStatus,
              }));
            } else if (event === "lead.brief_ready") {
              setState((prev) => ({
                ...prev,
                status: authStatus ?? "ready",
                version: Number(parsed.strategy_brief_version ?? prev.version),
                jobId: parsed.job_id ? String(parsed.job_id) : prev.jobId,
                jobStatus: parsed.job_status ? String(parsed.job_status) : "succeeded",
                error: null,
                pdfReady: true,
              }));
              ctrl.abort();
              return;
            } else if (event === "lead.brief_failed") {
              setState((prev) => ({
                ...prev,
                status: authStatus ?? "failed",
                version: Number(parsed.strategy_brief_version ?? prev.version),
                jobId: parsed.job_id ? String(parsed.job_id) : prev.jobId,
                jobStatus: parsed.job_status ? String(parsed.job_status) : "failed",
                error: parsed.error ? String(parsed.error) : "Generation failed",
              }));
              ctrl.abort();
              return;
            }
          }
        }

        // ── Stream closed cleanly (backend timeout / stream_end) ──────────────
        // The reader reached done=true without a terminal event, meaning the
        // backend SSE timed out while the task was still running (generation
        // can take 15-20+ minutes).  Re-check the authoritative status from
        // the DB and reconnect if the job is still active.
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

    // Re-fetch the authoritative status from the DB, update local state, and
    // reconnect the SSE stream if the job is still active.  Called from both
    // the clean-close path (backend timeout) and the error path so both share
    // identical recovery behaviour.
    async function rehydrateAndMaybeReconnect() {
      try {
        const r = await fetch(`${API_BASE}/leads/${leadId}/strategy-brief/status`, {
          headers: authHeaders(),
        });
        if (!r.ok || unmountedRef.current) return;
        const data = await r.json() as Record<string, unknown>;
        if (unmountedRef.current) return;

        const s = (data.strategy_brief_status as BriefStatus) ?? "not_generated";
        setState((prev) => ({
          ...prev,
          status: s,
          version: Number(data.strategy_brief_version ?? prev.version),
          jobId: data.job_id ? String(data.job_id) : prev.jobId,
          jobStatus: data.job_status ? String(data.job_status) : prev.jobStatus,
          error: data.last_error ? String(data.last_error) : prev.error,
          pdfReady: s === "ready",
        }));

        // If the task is still running, reconnect after a short pause so we
        // keep watching for completion without hammering the server.
        if (ACTIVE_STATUSES.includes(s)) {
          reconnectTimerRef.current = setTimeout(startStream, 5_000);
        }
      } catch {
        // Non-fatal — the user can manually refresh if needed.
      }
    }

    connect();
  }, [leadId, stopStream]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Initial status fetch ───────────────────────────────────────────────────

  useEffect(() => {
    if (!leadId) return;
    unmountedRef.current = false;

    fetch(`${API_BASE}/leads/${leadId}/strategy-brief/status`, {
      headers: authHeaders(),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Record<string, unknown> | null) => {
        if (!data || unmountedRef.current) return;
        const s = (data.strategy_brief_status as BriefStatus) ?? "not_generated";
        setState({
          status: s,
          version: Number(data.strategy_brief_version ?? 0),
          jobId: data.job_id ? String(data.job_id) : null,
          jobStatus: data.job_status ? String(data.job_status) : null,
          error: data.last_error ? String(data.last_error) : null,
          pdfReady: s === "ready",
          isLoading: false,
        });
        if (ACTIVE_STATUSES.includes(s)) startStream();
      })
      .catch(() => {});

    return () => {
      unmountedRef.current = true;
      stopStream();
    };
  }, [leadId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ────────────────────────────────────────────────────────────────

  const generate = useCallback(async () => {
    if (!leadId) return;
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const res = await fetch(`${API_BASE}/leads/${leadId}/strategy-brief`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json() as Record<string, unknown>;
      if (unmountedRef.current) return;
      setState((prev) => ({
        ...prev,
        status: (data.strategy_brief_status as BriefStatus) ?? "queued",
        version: Number(data.strategy_brief_version ?? prev.version),
        jobId: data.job_id ? String(data.job_id) : prev.jobId,
        error: null,
        isLoading: false,
      }));
      startStream();
    } catch {
      if (!unmountedRef.current) setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [leadId, startStream]);

  const retry = useCallback(async () => {
    if (!leadId) return;
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const res = await fetch(`${API_BASE}/leads/${leadId}/strategy-brief/retry`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json() as Record<string, unknown>;
      if (unmountedRef.current) return;
      setState((prev) => ({
        ...prev,
        status: (data.strategy_brief_status as BriefStatus) ?? "queued",
        version: Number(data.strategy_brief_version ?? prev.version),
        jobId: data.job_id ? String(data.job_id) : prev.jobId,
        error: null,
        isLoading: false,
      }));
      startStream();
    } catch {
      if (!unmountedRef.current) setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [leadId, startStream]);

  // Fetch the PDF with the auth header and trigger a programmatic download.
  // A plain <a href> would be a browser navigation with no Authorization header
  // and would always get 401 from the backend.
  const download = useCallback(async () => {
    if (!leadId || state.status !== "ready") return;
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const res = await fetch(`${API_BASE}/leads/${leadId}/strategy-brief.pdf`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as Record<string, unknown>;
        throw new Error(String(body.detail ?? `Download failed (${res.status})`));
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Use the Content-Disposition filename from the server when present.
      const disposition = res.headers.get("content-disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      a.download = match?.[1] ?? `strategy-brief-${leadId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      if (!unmountedRef.current)
        setState((prev) => ({ ...prev, error: err instanceof Error ? err.message : String(err) }));
    } finally {
      if (!unmountedRef.current) setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [leadId, state.status]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    ...state,
    generate,
    retry,
    download,
    isActive: ACTIVE_STATUSES.includes(state.status),
  };
}

export type UseStrategyBriefReturn = ReturnType<typeof useStrategyBrief>;
