"use client";

import { useCallback, useState } from "react";
import API from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

export interface SummaryCard {
  label: string;
  text: string;
}

export interface SummaryData {
  title: string;
  cards: SummaryCard[];
  lines: string[];
  summary: string;
}

type SummaryPhase =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "done"; data: SummaryData }
  | { phase: "error"; message: string };

interface Options {
  lead_id?: number | null;
  contact_id?: number | null;
  deal_id?: number | null;
  campaign_id?: number | null;
}

export function useAISummary(options: Options) {
  const [state, setState] = useState<SummaryPhase>({ phase: "idle" });

  const summarize = useCallback(async () => {
    setState({ phase: "loading" });
    try {
      const payload: Record<string, number> = {};
      if (options.lead_id) payload.lead_id = options.lead_id;
      if (options.contact_id) payload.contact_id = options.contact_id;
      if (options.deal_id) payload.deal_id = options.deal_id;
      if (options.campaign_id) payload.campaign_id = options.campaign_id;

      const { data } = await API.post<SummaryData>("/ai/summarize", payload);
      setState({ phase: "done", data });
    } catch (err) {
      setState({ phase: "error", message: getErrorMessage(err, "Could not generate summary.") });
    }
  }, [options.lead_id, options.contact_id, options.deal_id, options.campaign_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = useCallback(() => setState({ phase: "idle" }), []);

  return { state, summarize, reset };
}
