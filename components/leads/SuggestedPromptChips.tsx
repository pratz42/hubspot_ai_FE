"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const PROMPTS = [
  "Contacted leads",
  "High score FMCG leads",
  "Top leads from LinkedIn",
  "Qualified leads in IT above $10K",
  "New manufacturing leads",
  "Leads with large deals",
  "High value leads sorted by AI score",
];

interface Props {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
  maxVisible?: number;
}

export function SuggestedPromptChips({ onSelect, disabled, maxVisible = 4 }: Props) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? PROMPTS : PROMPTS.slice(0, maxVisible);
  const hasMore = PROMPTS.length > maxVisible;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest shrink-0">
        Try:
      </span>
      {visible.map((p) => (
        <button
          key={p}
          disabled={disabled}
          onClick={() => onSelect(p)}
          className="text-xs font-medium px-2.5 py-1 rounded-full border border-slate-200 text-slate-500 bg-white hover:border-orange-300 hover:text-orange-700 hover:bg-orange-50/60 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {p}
        </button>
      ))}
      {hasMore && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-xs font-medium px-2 py-1 text-slate-400 hover:text-orange-600 transition-colors flex items-center gap-0.5 whitespace-nowrap"
        >
          {expanded ? <><ChevronUp className="w-3 h-3" />Less</> : <><ChevronDown className="w-3 h-3" />+{PROMPTS.length - maxVisible} more</>}
        </button>
      )}
    </div>
  );
}
