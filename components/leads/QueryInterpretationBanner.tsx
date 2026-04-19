"use client";

import { Sparkles, X, ArrowUpDown } from "lucide-react";
import type { NLQueryResponse, NLResultMode } from "./nl-query-types";

const FILTER_LABELS: Record<string, { label: string; prefix?: string; suffix?: string }> = {
  status:        { label: "Status" },
  industry:      { label: "Industry" },
  source:        { label: "Source" },
  company:       { label: "Company" },
  min_deal_size: { label: "Min Deal", prefix: "₹" },
  max_deal_size: { label: "Max Deal", prefix: "₹" },
  min_ai_score:  { label: "Min Score", suffix: "/100" },
  max_ai_score:  { label: "Max Score", suffix: "/100" },
};

const MODE_CONFIG: Record<NLResultMode, { label: string; cls: string }> = {
  filter:   { label: "Filter mode",       cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  sort:     { label: "Sorted results",    cls: "bg-blue-100 text-blue-700 border-blue-200" },
  semantic: { label: "Semantic ranking",  cls: "bg-violet-100 text-violet-700 border-violet-200" },
};

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: NLQueryResponse<any>;
  query: string;
  onClear: () => void;
}

export function QueryInterpretationBanner({ result, query, onClear }: Props) {
  const mode = MODE_CONFIG[result.result_mode] ?? { label: result.result_mode, cls: "bg-slate-100 text-slate-600 border-slate-200" };
  const { hard_filters, semantic_intent, sort_intent, limit } = result.query_plan;

  const activeFilters = Object.entries(hard_filters).filter(
    ([, v]) => v !== null && v !== undefined
  );
  const hasSort     = !!sort_intent.field;
  const hasSemantic = !!semantic_intent.query;
  const hasAnything = activeFilters.length > 0 || hasSort || hasSemantic;

  return (
    <div className="px-4 py-3 bg-gradient-to-r from-violet-50 to-indigo-50/40 border-b border-violet-100">
      <div className="flex items-start gap-3 justify-between">
        <div className="flex-1 min-w-0 space-y-2">

          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <span className="text-xs font-bold text-violet-800">AI understood</span>
            </div>
            <span className="text-slate-300 select-none">·</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${mode.cls}`}>
              {mode.label}
            </span>
          </div>

          {/* Interpreted chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 italic shrink-0">&ldquo;{query}&rdquo;</span>
            <span className="text-slate-200 select-none">→</span>

            {activeFilters.map(([key, val]) => {
              const meta = FILTER_LABELS[key] ?? { label: key };
              const display = `${meta.prefix ?? ""}${val}${meta.suffix ?? ""}`;
              return (
                <span
                  key={key}
                  className="inline-flex items-center text-[11px] bg-white border border-violet-200 text-violet-700 px-2 py-0.5 rounded-full font-semibold"
                >
                  {meta.label}: {display}
                </span>
              );
            })}

            {hasSemantic && (
              <span className="inline-flex items-center text-[11px] bg-white border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full font-semibold italic">
                &ldquo;{semantic_intent.query}&rdquo;
              </span>
            )}

            {hasSort && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-white border border-blue-200 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                <ArrowUpDown className="w-2.5 h-2.5" />
                {sort_intent.field!.replace(/_/g, " ")} {sort_intent.order === "asc" ? "↑" : "↓"}
              </span>
            )}

            {!hasAnything && (
              <span className="text-xs text-slate-400">Broad search — returning top results</span>
            )}
          </div>

          {/* Count summary */}
          <p className="text-xs text-slate-500">
            Found{" "}
            <span className="font-semibold text-slate-700">{result.count}</span>{" "}
            lead{result.count !== 1 ? "s" : ""} · showing{" "}
            <span className="font-semibold text-violet-700">{result.results.length}</span>
            {limit < result.count && (
              <span className="text-slate-400"> of {limit} requested</span>
            )}
            {result.result_mode === "semantic" && (
              <span className="ml-1.5 text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded-full">
                · ranked by relevance
              </span>
            )}
          </p>
        </div>

        {/* Reset */}
        <button
          onClick={onClear}
          className="shrink-0 flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-900 border border-violet-200 hover:border-violet-300 px-2.5 py-1 rounded-lg hover:bg-white transition-all duration-150"
        >
          <X className="w-3 h-3" />
          Reset
        </button>
      </div>
    </div>
  );
}
