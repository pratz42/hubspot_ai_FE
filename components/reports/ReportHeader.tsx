"use client";

import { BarChart2, Clock, Download, Plus, RefreshCw, Share2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChat } from "@/lib/chat/context";
import { SECTION_META } from "./ReportNav";
import type { ReportSection } from "@/hooks/useReportFilters";

interface Props {
  section: ReportSection;
  lastUpdated: Date | null;
  loading: boolean;
  onRefresh: () => void;
  onCreateDashboard?: () => void;
}

function formatAge(d: Date): string {
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 10)  return "Just now";
  if (secs < 60)  return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ReportHeader({
  section,
  lastUpdated,
  loading,
  onRefresh,
  onCreateDashboard,
}: Props) {
  const meta = SECTION_META[section];
  const { openPanel, setPageContext } = useChat();

  const handleAskAI = () => {
    setPageContext({
      page: "reports",
      entity_type: "report",
      suggested_prompts: [
        "Explain this forecast",
        "Summarize key trends",
        "Find anomalies in data",
        "What needs attention?",
      ],
    });
    openPanel();
  };
  const Icon = meta.icon;

  return (
    <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800/50">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left: breadcrumb + title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <BarChart2 className="w-4 h-4 text-orange-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Reports</span>
              <span className="text-slate-700">/</span>
              <div className="flex items-center gap-1">
                <Icon className="w-3 h-3 text-orange-400" />
                <span className="text-xs text-orange-400 font-medium">{meta.shortLabel}</span>
              </div>
            </div>
            <h1 className="text-base font-semibold text-slate-100 leading-tight truncate">
              {meta.label}
            </h1>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Last updated */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-2">
            <Clock className="w-3 h-3" />
            {loading ? (
              <span className="animate-pulse">Loading…</span>
            ) : lastUpdated ? (
              <span>Updated {formatAge(lastUpdated)}</span>
            ) : (
              <span>Not loaded</span>
            )}
          </div>

          <button
            onClick={handleAskAI}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-300 text-xs font-medium transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Ask AI
          </button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="h-8 px-3 text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-800 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-800 gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-800 gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </Button>

          <Button
            size="sm"
            onClick={onCreateDashboard}
            className="h-8 px-3 text-xs bg-orange-500 hover:bg-orange-600 text-white gap-1.5 shadow-sm shadow-orange-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            New Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
