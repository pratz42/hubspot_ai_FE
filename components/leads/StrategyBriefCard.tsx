"use client";

import { FileText, Download, RotateCcw, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type UseStrategyBriefReturn } from "@/hooks/useStrategyBrief";

interface Props {
  brief: UseStrategyBriefReturn;
  /** Pass lead.scoring_status / effectiveStatus from the parent.
   *  Brief generation is blocked until scoring is "scored". */
  scoringStatus?: string;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  not_generated: { label: "Not Generated", cls: "bg-slate-100 text-slate-500" },
  queued:        { label: "Queued",         cls: "bg-yellow-100 text-yellow-700" },
  generating:    { label: "Generating",     cls: "bg-blue-100 text-blue-700" },
  ready:         { label: "Ready",          cls: "bg-emerald-100 text-emerald-700" },
  failed:        { label: "Failed",         cls: "bg-red-100 text-red-700" },
};

/* ── Sidebar card ─────────────────────────────────────────────────────────── */

export function StrategyBriefCard({ brief, scoringStatus }: Props) {
  const { status, version, error, isLoading, isActive, generate, retry, download } = brief;
  const scoringComplete = scoringStatus === "scored";
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.not_generated;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-3">
        <FileText className="w-3.5 h-3.5 text-slate-400" />Strategy Brief
        <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
          {badge.label}
        </span>
      </h3>

      {/* Scoring not done yet */}
      {!scoringComplete && status === "not_generated" && (
        <p className="text-xs text-slate-400 mb-3 flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 mt-0.5" />
          Available once AI scoring is complete.
        </p>
      )}

      {scoringComplete && status === "not_generated" && (
        <p className="text-xs text-slate-400 mb-3">
          Generate a full research &amp; strategy brief as a downloadable PDF.
        </p>
      )}

      {status === "ready" && version > 0 && (
        <p className="text-[10px] text-slate-400 mb-3">Version {version}</p>
      )}

      {status === "failed" && error && (
        <p className="text-xs text-red-500 break-words mb-3 flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          {error}
        </p>
      )}

      {/* Active — spinner */}
      {isActive && (
        <div className="flex items-center gap-2 text-xs text-blue-600 py-1.5 mb-1">
          <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
          {status === "queued" ? "Queued — waiting for worker…" : "Generating PDF…"}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2">
        {status === "not_generated" && (
          <Button
            size="sm"
            className="h-8 text-xs bg-orange-600 hover:bg-orange-700 w-full disabled:opacity-50"
            onClick={generate}
            disabled={isLoading || !scoringComplete}
            title={!scoringComplete ? "AI scoring must complete first" : undefined}
          >
            {isLoading
              ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              : <FileText className="w-3.5 h-3.5 mr-1.5" />}
            Generate Brief
          </Button>
        )}

        {/* Ready: Download only. Regenerate is intentionally absent — the brief
            reflects the current scored data. A future "stale brief" signal can
            re-expose generation once rescoring has updated the scoring pipeline. */}
        {status === "ready" && (
          <Button
            size="sm"
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 w-full"
            onClick={download}
            disabled={isLoading}
          >
            {isLoading
              ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              : <Download className="w-3.5 h-3.5 mr-1.5" />}
            Download PDF
          </Button>
        )}

        {status === "failed" && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 w-full"
            onClick={retry}
            disabled={isLoading || !scoringComplete}
            title={!scoringComplete ? "AI scoring must complete first" : undefined}
          >
            {isLoading
              ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              : <RotateCcw className="w-3.5 h-3.5 mr-1.5" />}
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}

/* ── Top action-bar button ────────────────────────────────────────────────── */

export function StrategyBriefActionButton({ brief, scoringStatus }: Props) {
  const { status, isLoading, isActive, generate, retry, download } = brief;
  const scoringComplete = scoringStatus === "scored";

  if (status === "ready") {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400"
        onClick={download}
        disabled={isLoading}
      >
        {isLoading
          ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          : <Download className="w-3.5 h-3.5 mr-1.5" />}
        Strategy Brief
      </Button>
    );
  }

  if (isActive) {
    return (
      <Button variant="outline" size="sm"
        className="h-8 text-xs border-blue-200 text-blue-600 cursor-default" disabled>
        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Generating Brief…
      </Button>
    );
  }

  if (status === "failed") {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
        onClick={retry}
        disabled={isLoading || !scoringComplete}
        title={!scoringComplete ? "AI scoring must complete first" : undefined}
      >
        {isLoading
          ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          : <RotateCcw className="w-3.5 h-3.5 mr-1.5" />}
        Retry Brief
      </Button>
    );
  }

  // not_generated — only show when scoring is done, otherwise render nothing
  // in the action bar to avoid a permanently disabled button cluttering the header.
  if (!scoringComplete) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 text-xs border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
      onClick={generate}
      disabled={isLoading}
    >
      {isLoading
        ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
        : <FileText className="w-3.5 h-3.5 mr-1.5" />}
      Strategy Brief
    </Button>
  );
}
