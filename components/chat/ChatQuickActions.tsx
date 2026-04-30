"use client";

import { Zap } from "lucide-react";
import type { PageContext } from "@/lib/chat/types";

const PAGE_DEFAULTS: Record<string, string[]> = {
  leads: ["Summarize this lead", "Explain AI score", "Draft a follow-up email"],
  contacts: ["Summarize contact", "Suggest best next action", "Identify cross-sell opportunities"],
  deals: ["Explain deal risk", "Summarize next steps", "What's blocking this deal?"],
  campaign: ["Improve campaign copy", "Explain performance metrics", "Suggest audience improvements"],
  reports: ["Explain this forecast", "Summarize key trends", "Find anomalies in data"],
  dashboard: ["What needs attention today?", "Summarize pipeline health", "Top priority actions"],
};

interface Props {
  pageContext: PageContext | null;
  onAction: (prompt: string) => void;
}

export function ChatQuickActions({ pageContext, onAction }: Props) {
  const prompts =
    pageContext?.suggested_prompts ??
    (pageContext?.page ? PAGE_DEFAULTS[pageContext.page] : null) ??
    PAGE_DEFAULTS.dashboard;

  if (!prompts?.length) return null;

  return (
    <div className="px-4 py-2 border-t border-slate-100">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Zap className="w-3 h-3 text-violet-500" />
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
          Quick actions
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onAction(prompt)}
            className="px-2.5 py-1 rounded-full border border-violet-200 bg-violet-50 text-xs text-violet-700 hover:bg-violet-100 hover:border-violet-300 transition-colors leading-tight"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
