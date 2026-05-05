"use client";

import {
  Presentation,
  Download,
  RotateCcw,
  RefreshCw,
  Loader2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { type UseLeadPptReturn } from "@/hooks/useLeadPpt";

interface Props {
  ppt: UseLeadPptReturn;
  /** Pass lead.scoring_status / effectiveStatus from the parent.
   *  Deck generation is blocked until scoring is "scored". */
  scoringStatus?: string;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  not_generated: { label: "Not Generated", cls: "bg-slate-100 text-slate-500" },
  queued:        { label: "Queued",         cls: "bg-blue-100 text-blue-700" },
  generating:    { label: "Generating",     cls: "bg-blue-100 text-blue-700" },
  ready:         { label: "Ready",          cls: "bg-emerald-100 text-emerald-700" },
  failed:        { label: "Failed",         cls: "bg-red-100 text-red-700" },
  stale:         { label: "Stale",          cls: "bg-amber-100 text-amber-700" },
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

/* ── Sidebar card ─────────────────────────────────────────────────────────── */

export function LeadPptCard({ ppt, scoringStatus }: Props) {
  const {
    status,
    version,
    error,
    isLoading,
    isActive,
    updatedAt,
    progressPct,
    currentStep,
    generate,
    regenerate,
    download,
  } = ppt;

  const scoringComplete = !scoringStatus || scoringStatus === "scored";
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.not_generated;
  const generatedDate = formatDate(updatedAt);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      {/* Header */}
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-3">
        <Presentation className="w-3.5 h-3.5 text-slate-400" />
        Pitch Deck
        <span
          className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}
        >
          {badge.label}
        </span>
      </h3>

      {/* Stale banner — full-width, prominent amber block */}
      {status === "stale" && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-3">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 leading-relaxed">
            Lead data has changed — this deck may be outdated. Regenerate for a
            fresh version.
          </p>
        </div>
      )}

      {/* not_generated — scoring gate */}
      {status === "not_generated" && !scoringComplete && (
        <p className="text-xs text-slate-400 mb-3 flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 mt-0.5" />
          Available once AI scoring is complete.
        </p>
      )}

      {/* not_generated — scoring done, explain the action */}
      {status === "not_generated" && scoringComplete && (
        <p className="text-xs text-slate-400 mb-3">
          Generate a presentation deck for this lead, ready to download as a
          PowerPoint file.
        </p>
      )}

      {/* ready — version + generated date (trust metadata) */}
      {status === "ready" && (
        <p className="text-[10px] text-slate-400 mb-3">
          {version > 0 ? `Version ${version}` : ""}
          {version > 0 && generatedDate ? " · " : ""}
          {generatedDate ? `Generated ${generatedDate}` : ""}
        </p>
      )}

      {/* stale — version + last-generated date (deck still downloadable) */}
      {status === "stale" && (
        <p className="text-[10px] text-slate-400 mb-3">
          {version > 0 ? `Version ${version}` : ""}
          {version > 0 && generatedDate ? " · " : ""}
          {generatedDate ? `Last generated ${generatedDate}` : ""}
        </p>
      )}

      {/* failed — error message */}
      {status === "failed" && error && (
        <p className="text-xs text-red-500 break-words mb-3 flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          {error}
        </p>
      )}

      {/* Active — progress indicator with real data from the worker */}
      {isActive && (
        <div className="mb-3">
          <div className="flex items-center gap-2 text-xs text-blue-600 py-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
            {status === "queued"
              ? "Queued — waiting for worker…"
              : "Building your presentation…"}
          </div>
          {status === "generating" && (
            <div className="space-y-1 mt-1.5">
              {/* Real progress bar — driven by ai_jobs.progress_pct */}
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(4, progressPct)}%` }}
                />
              </div>
              {/* Current stage label from ai_jobs.current_step */}
              {currentStep && (
                <p className="text-[10px] text-slate-400 leading-none">
                  {currentStep}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2">
        {/* not_generated → generate */}
        {status === "not_generated" && (
          <Button
            size="sm"
            className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 w-full disabled:opacity-50"
            onClick={generate}
            disabled={isLoading || !scoringComplete}
            title={!scoringComplete ? "AI scoring must complete first" : undefined}
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            )}
            Generate Deck
          </Button>
        )}

        {/* ready → download */}
        {status === "ready" && (
          <Button
            size="sm"
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 w-full"
            onClick={download}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 mr-1.5" />
            )}
            Download Deck
          </Button>
        )}

        {/* failed → retry (uses generate which POSTs without regenerate flag) */}
        {status === "failed" && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 w-full"
            onClick={generate}
            disabled={isLoading || !scoringComplete}
            title={!scoringComplete ? "AI scoring must complete first" : undefined}
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            )}
            Retry
          </Button>
        )}

        {/* stale → regenerate (forces a new version) + download current */}
        {status === "stale" && (
          <>
            <Button
              size="sm"
              className="h-8 text-xs bg-amber-500 hover:bg-amber-600 w-full"
              onClick={regenerate}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              )}
              Regenerate
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs border-slate-200 text-slate-600 hover:bg-slate-50 w-full"
              onClick={download}
              disabled={isLoading}
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Download Current
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Top action-bar button ────────────────────────────────────────────────── */

export function LeadPptActionButton({ ppt, scoringStatus }: Props) {
  const { status, isLoading, isActive, generate, regenerate, download } = ppt;
  const scoringComplete = !scoringStatus || scoringStatus === "scored";

  // Active (queued / generating) — calm disabled state
  if (isActive) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs border-blue-200 text-blue-600 cursor-default"
        disabled
      >
        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
        Building Deck…
      </Button>
    );
  }

  // Ready — download immediately
  if (status === "ready") {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400"
        onClick={download}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5 mr-1.5" />
        )}
        Pitch Deck
      </Button>
    );
  }

  // Stale — surface regenerate prominently in the action bar
  if (status === "stale") {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400"
        onClick={regenerate}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
        ) : (
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
        )}
        Update Deck
      </Button>
    );
  }

  // Failed — retry button
  if (status === "failed") {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
        onClick={generate}
        disabled={isLoading || !scoringComplete}
        title={!scoringComplete ? "AI scoring must complete first" : undefined}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
        ) : (
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
        )}
        Retry Deck
      </Button>
    );
  }

  // not_generated — only show when scoring is done, matching StrategyBriefActionButton
  if (!scoringComplete) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 text-xs border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
      onClick={generate}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
      ) : (
        <Presentation className="w-3.5 h-3.5 mr-1.5" />
      )}
      Pitch Deck
    </Button>
  );
}
