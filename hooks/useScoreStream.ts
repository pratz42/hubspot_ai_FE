"use client";

import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "@/lib/config";

export type ScoringStatus = "pending" | "scoring" | "scored" | "failed";

interface UseScoreStreamOptions {
  entityType: "contact" | "lead";
  entityId: number | null;
  initialStatus: ScoringStatus | string;
  onComplete: () => void;
}

interface UseScoreStreamResult {
  liveStatus: ScoringStatus | null;
  isStreaming: boolean;
}

const TERMINAL: ScoringStatus[] = ["scored", "failed"];

export function useScoreStream({
  entityType,
  entityId,
  initialStatus,
  onComplete,
}: UseScoreStreamOptions): UseScoreStreamResult {
  const [liveStatus, setLiveStatus] = useState<ScoringStatus | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!entityId) return;

    const status = initialStatus as ScoringStatus;
    if (TERMINAL.includes(status)) return;

    completedRef.current = false;

    async function connect() {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        setIsStreaming(true);
        const res = await fetch(
          `${API_BASE_URL}/events/${entityType}s/${entityId}`,
          {
            headers: {
              Accept: "text/event-stream",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            signal: ctrl.signal,
          }
        );

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
            try {
              parsed = JSON.parse(raw);
            } catch {
              continue;
            }
            const eventName = parsed.event as string;
            if (eventName === "entity.ai_queued") {
              setLiveStatus("pending");
            } else if (eventName === "entity.ai_scoring") {
              setLiveStatus("scoring");
            } else if (eventName === "entity.ai_scored") {
              setLiveStatus("scored");
              if (!completedRef.current) {
                completedRef.current = true;
                ctrl.abort();
                setIsStreaming(false);
                onComplete();
              }
            } else if (eventName === "entity.ai_failed") {
              setLiveStatus("failed");
              if (!completedRef.current) {
                completedRef.current = true;
                ctrl.abort();
                setIsStreaming(false);
                onComplete();
              }
            } else if (eventName === "stream_end") {
              ctrl.abort();
              setIsStreaming(false);
            }
          }
        }
      } catch {
        // AbortError is expected on cleanup — ignore silently
      } finally {
        setIsStreaming(false);
      }
    }

    connect();

    return () => {
      abortRef.current?.abort();
    };
  }, [entityType, entityId, initialStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  return { liveStatus, isStreaming };
}
