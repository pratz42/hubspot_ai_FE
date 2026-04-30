"use client";

/**
 * AISummaryCard
 *
 * On-demand AI snapshot for any Lead or Contact. Calls POST /ai/summarize
 * and renders the four labelled cards the API returns:
 *   Current Status · Opportunity · Campaign Relevance · Recommended Next Step
 *
 * Usage:
 *   <AISummaryCard leadId={lead.id} />
 *   <AISummaryCard contactId={contact.id} />
 */

import {
  Activity, AlertCircle, Lightbulb, Loader2,
  RefreshCw, Sparkles, Target, TrendingUp,
  Clock, Brain, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAISummary, type SummaryCard } from "@/hooks/useAISummary";

interface Props {
  leadId?: number | null;
  contactId?: number | null;
  /** Pass the live scoring status so the button is gated until scoring is done. */
  scoringStatus?: string;
}

// Visual config for each of the 4 cards the API always returns in order.
const CARD_CONFIG = [
  {
    icon: Activity,
    accent: "border-l-violet-400",
    labelColor: "text-violet-600",
    iconColor: "text-violet-400",
    bg: "bg-violet-50/40",
  },
  {
    icon: TrendingUp,
    accent: "border-l-emerald-400",
    labelColor: "text-emerald-600",
    iconColor: "text-emerald-400",
    bg: "bg-emerald-50/40",
  },
  {
    icon: Target,
    accent: "border-l-orange-400",
    labelColor: "text-orange-600",
    iconColor: "text-orange-400",
    bg: "bg-orange-50/40",
  },
  {
    icon: Lightbulb,
    accent: "border-l-blue-400",
    labelColor: "text-blue-600",
    iconColor: "text-blue-400",
    bg: "bg-blue-50/40",
  },
] as const;

/* ── Skeleton shown while loading ─────────────────────────────────────────── */

function Summaryskeleton() {
  return (
    <div className="space-y-2.5 animate-pulse">
      {CARD_CONFIG.map((cfg, i) => (
        <div
          key={i}
          className={`border-l-2 ${cfg.accent} pl-3 py-2 rounded-r-lg space-y-1.5`}
        >
          <div className="h-2 bg-slate-200 rounded w-24" />
          <div className="h-3 bg-slate-100 rounded w-full" />
          <div className="h-3 bg-slate-100 rounded w-4/5" />
        </div>
      ))}
    </div>
  );
}

/* ── Single result card ───────────────────────────────────────────────────── */

function ResultCard({ card, index }: { card: SummaryCard; index: number }) {
  const cfg = CARD_CONFIG[index % CARD_CONFIG.length];
  const Icon = cfg.icon;

  return (
    <div
      className={`border-l-2 ${cfg.accent} ${cfg.bg} pl-3 pr-2 py-2.5 rounded-r-lg`}
    >
      <div className={`flex items-center gap-1.5 mb-1 ${cfg.labelColor}`}>
        <Icon className={`w-3 h-3 flex-shrink-0 ${cfg.iconColor}`} />
        <span className="text-[10px] font-bold uppercase tracking-widest">
          {card.label}
        </span>
      </div>
      <p className="text-xs text-slate-700 leading-relaxed">{card.text}</p>
    </div>
  );
}

/* ── Scoring-gated idle state ─────────────────────────────────────────────── */

function ScoringBlockedState({ status }: { status: string }) {
  if (status === "pending") {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3 py-1">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 animate-pulse">
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600">Scoring queued</p>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              AI snapshot will be available once the scoring pipeline completes.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          disabled
          className="w-full h-8 text-xs bg-slate-100 text-slate-400 border-0 cursor-not-allowed"
        >
          <Clock className="w-3.5 h-3.5 mr-1.5" />
          Waiting for score…
        </Button>
      </div>
    );
  }

  if (status === "scoring") {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3 py-1">
          <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0">
            <Brain className="w-4 h-4 text-blue-500 animate-pulse" />
          </div>
          <div>
            <p className="text-xs font-semibold text-blue-700">AI scoring in progress</p>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              Snapshot will be available automatically once the analysis is done.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          disabled
          className="w-full h-8 text-xs bg-blue-50 text-blue-400 border border-blue-100 cursor-not-allowed"
        >
          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          Scoring in progress…
        </Button>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3 py-1">
          <div className="w-8 h-8 rounded-full bg-red-50 border border-red-200 flex items-center justify-center flex-shrink-0">
            <XCircle className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-red-600">Scoring failed</p>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              Retry AI scoring above — the snapshot requires score data to generate insights.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          disabled
          className="w-full h-8 text-xs bg-red-50 text-red-300 border border-red-100 cursor-not-allowed"
        >
          <XCircle className="w-3.5 h-3.5 mr-1.5" />
          Score required
        </Button>
      </div>
    );
  }

  return null;
}

/* ── Main component ───────────────────────────────────────────────────────── */

export function AISummaryCard({ leadId, contactId, scoringStatus }: Props) {
  const { state, summarize, reset } = useAISummary({
    lead_id: leadId,
    contact_id: contactId,
  });

  const isDone = state.phase === "done";
  const isLoading = state.phase === "loading";
  const scoringIncomplete =
    scoringStatus !== undefined &&
    scoringStatus !== "scored";

  return (
    <div className="rounded-xl border border-violet-100 bg-white shadow-sm overflow-hidden">
      {/* ── Header band ── */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-50 to-indigo-50 border-b border-violet-100">
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-3 h-3 text-white" />
        </div>
        <span className="text-xs font-bold text-violet-700 uppercase tracking-wider flex-1">
          AI Snapshot
        </span>

        {/* Refresh icon once data is loaded */}
        {isDone && (
          <button
            onClick={summarize}
            disabled={isLoading}
            title="Regenerate snapshot"
            className="p-1 rounded-md text-violet-300 hover:text-violet-600 hover:bg-violet-100 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="p-4">
        {/* ── Idle: scoring not done yet ── */}
        {state.phase === "idle" && scoringIncomplete && (
          <ScoringBlockedState status={scoringStatus!} />
        )}

        {/* ── Idle: ready to generate ── */}
        {state.phase === "idle" && !scoringIncomplete && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400 leading-relaxed">
              Get a 4-point AI snapshot covering current status, opportunity,
              campaign fit, and the recommended next step.
            </p>
            <Button
              size="sm"
              onClick={summarize}
              className="w-full h-8 text-xs bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-0"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Generate Snapshot
            </Button>
          </div>
        )}

        {/* ── Loading ── */}
        {isLoading && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-violet-500 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
              Analyzing context…
            </div>
            <Summaryskeleton />
          </div>
        )}

        {/* ── Result ── */}
        {isDone && (
          <div className="space-y-2.5">
            {state.data.title && (
              <p className="text-[10px] font-semibold text-slate-400 truncate mb-1">
                {state.data.title}
              </p>
            )}
            {state.data.cards.map((card, i) => (
              <ResultCard key={i} card={card} index={i} />
            ))}
          </div>
        )}

        {/* ── Error ── */}
        {state.phase === "error" && (
          <div className="space-y-3">
            <p className="text-xs text-red-500 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              {state.message}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={summarize}
                className="h-7 text-xs flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
              >
                Try again
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={reset}
                className="h-7 text-xs text-slate-400 hover:text-slate-600"
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
