"use client";

import Link from "next/link";
import { useState, useMemo, useRef } from "react";
import {
  Brain, Building2, ChevronDown, ChevronUp, Eye,
  Pencil, Briefcase, DollarSign, Mail, Phone,
  Sparkles, Target, Zap, TrendingUp, TrendingDown, Minus,
  ExternalLink, FileText, MessageSquare, Globe, Clock, XCircle,
} from "lucide-react";
import {
  getPipelineStage,
  normalizePipelineStage,
  PIPELINE_STAGE_ORDER,
  type PipelineStageId,
} from "@/lib/pipeline";

/* ── Types ─────────────────────────────────────────────────────────── */

interface EvidenceCard {
  points?: number;
  reason: string;
  strength: "low" | "medium" | "high";
  source_url: string;
  signal_type: string;
  source_excerpt: string;
}

export interface StageLead {
  id: number;
  name: string;
  company: string;
  email?: string;
  phone?: string;
  industry?: string;
  deal_size?: number;
  source?: string;
  comments?: string;
  ai_score?: number;
  ai_reason?: string;
  score_comment?: string;
  score_breakdown?: {
    components?: { label: string; value: number; reason: string }[];
    intent_score?: number;
    evidence_score?: number;
    final_score?: number;
    score_breakdown?: {
      components?: { label: string; value: number; reason: string }[];
      intent_score?: number;
      evidence_score?: number;
    };
  };
  final_score_breakdown?: {
    summary?: string;
    components?: { component: string; category: string; points: number; reason: string; running_total: number; formula: string }[];
    totals?: { intent_score: number; evidence_score: number; raw_score: number; final_score: number };
    final_policy_reason?: string;
  };
  sales_strategy?: string;
  recommended_offerings?: string[];
  tags?: string[];
  used_web_evidence?: boolean;
  contact_id?: number;
  company_id_assoc?: number;
  evidence_cards?: EvidenceCard[];
  knowledge?: string;
  knowledge_sources?: string[];
  assigned_to?: string;
  status: string;
  created_at: string;
  hybrid_score?: number;
  scoring_status?: string;
}

export interface StageViewProps {
  leads: StageLead[];
  onEdit: (lead: StageLead, e: React.MouseEvent) => void;
  onConvertToDeal: (id: number) => void;
}

/* ── Helpers ───────────────────────────────────────────────────────── */

const AVATAR_GRADIENTS = [
  "from-indigo-500 to-indigo-600",
  "from-violet-500 to-violet-600",
  "from-emerald-500 to-emerald-600",
  "from-orange-500 to-orange-600",
  "from-pink-500 to-pink-600",
  "from-teal-500 to-teal-600",
  "from-blue-500 to-blue-600",
];

function avatarGradient(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length];
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

const formatDeal = (value?: number) => {
  if (!value) return null;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
};

const getScoreConfig = (score?: number) => {
  if (!score) return { color: "text-slate-400", bg: "bg-slate-50", border: "border-slate-200", label: "—", bar: "bg-slate-300", ring: "ring-slate-200" };
  if (score >= 80) return { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", label: "Hot", bar: "bg-emerald-500", ring: "ring-emerald-300" };
  if (score >= 60) return { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", label: "Warm", bar: "bg-amber-400", ring: "ring-amber-300" };
  return { color: "text-red-600", bg: "bg-red-50", border: "border-red-200", label: "Cold", bar: "bg-red-400", ring: "ring-red-200" };
};

const OFFERING_COLORS = [
  "bg-indigo-50 text-indigo-700 border border-indigo-100",
  "bg-violet-50 text-violet-700 border border-violet-100",
  "bg-emerald-50 text-emerald-700 border border-emerald-100",
  "bg-orange-50 text-orange-700 border border-orange-100",
  "bg-pink-50 text-pink-700 border border-pink-100",
];

interface ScoreBreakdown {
  intentTotal: number | null;
  intentMax: number;
  evidenceTotal: number | null;
  evidenceMax: number;
  items: { category: string; label: string; delta: number; running: number }[];
}

const BREAKDOWN_RE = /(?:exact\s+)?score\s+breakdown:/i;

function parseScoreBreakdown(scoreComment?: string): ScoreBreakdown | null {
  if (!scoreComment) return null;
  const intentMatch = scoreComment.match(/intent\s+(?:subtotal\s+)?([\d.]+)\/([\d]+)/i);
  const evidenceMatch = scoreComment.match(/evidence\s+(?:subtotal\s+)?([\d.]+)\/([\d]+)/i);
  const items: ScoreBreakdown["items"] = [];
  const itemRegex = /(intent|evidence):\s*([^\n]+?):\s*([+-][\d.]+)\s*->\s*([\d.]+)/gi;
  let match;
  while ((match = itemRegex.exec(scoreComment)) !== null) {
    items.push({ category: match[1].toLowerCase(), label: match[2].trim(), delta: parseFloat(match[3]), running: parseFloat(match[4]) });
  }
  if (!intentMatch && !evidenceMatch && items.length === 0) return null;
  return {
    intentTotal: intentMatch ? parseFloat(intentMatch[1]) : null,
    intentMax: intentMatch ? parseInt(intentMatch[2]) : 70,
    evidenceTotal: evidenceMatch ? parseFloat(evidenceMatch[1]) : null,
    evidenceMax: evidenceMatch ? parseInt(evidenceMatch[2]) : 30,
    items,
  };
}

const getStrengthStyle = (strength: string) => {
  switch (strength) {
    case "high":   return { cls: "bg-emerald-100 text-emerald-700", Icon: TrendingUp };
    case "medium": return { cls: "bg-yellow-100 text-yellow-700",   Icon: Minus };
    case "low":    return { cls: "bg-red-100 text-red-600",          Icon: TrendingDown };
    default:       return { cls: "bg-slate-100 text-slate-600",      Icon: Minus };
  }
};

const getSignalInfo = (signalType: string) => {
  const map: Record<string, { label: string; cls: string }> = {
    no_evidence:      { label: "No Evidence",       cls: "bg-slate-100 text-slate-600" },
    industry_match:   { label: "Industry Match",    cls: "bg-emerald-100 text-emerald-700" },
    company_research: { label: "Company Research",  cls: "bg-blue-100 text-blue-700" },
    negative_signal:  { label: "Negative Signal",   cls: "bg-red-100 text-red-600" },
    positive_signal:  { label: "Positive Signal",   cls: "bg-emerald-100 text-emerald-700" },
    web_research:     { label: "Web Research",       cls: "bg-teal-100 text-teal-700" },
  };
  return map[signalType] ?? { label: signalType.replace(/_/g, " "), cls: "bg-slate-100 text-slate-600" };
};

const getSourceStyle = (source?: string) => {
  switch (source?.toLowerCase()) {
    case "linkedin": return "bg-blue-50 text-blue-700 border border-blue-100";
    case "website": case "web": return "bg-teal-50 text-teal-700 border border-teal-100";
    case "referral": return "bg-purple-50 text-purple-700 border border-purple-100";
    case "email": return "bg-yellow-50 text-yellow-700 border border-yellow-100";
    case "demo request": return "bg-orange-50 text-orange-700 border border-orange-100";
    default: return "bg-slate-100 text-slate-600 border border-slate-200";
  }
};

function stageInsight(stageId: string, leads: StageLead[]): string {
  const scored = leads.filter((l) => l.ai_score !== undefined);
  const avg = scored.length ? Math.round(scored.reduce((s, l) => s + (l.ai_score ?? 0), 0) / scored.length) : null;
  const hot = leads.filter((l) => (l.ai_score ?? 0) >= 80).length;
  switch (stageId) {
    case "new": return hot > 0 ? `${hot} hot lead${hot > 1 ? "s" : ""} ready for outreach` : "Start outreach on these leads";
    case "contacted": return avg && avg >= 70 ? `Strong pipeline · avg score ${avg}` : "Follow up to qualify interest";
    case "qualified": return `${leads.length} qualified · move to proposal`;
    case "proposal": return leads.length > 3 ? "Multiple proposals out · follow up actively" : "Proposal sent · await feedback";
    case "negotiation": return "Final stretch · close the deal";
    case "won": return `${leads.length} deal${leads.length > 1 ? "s" : ""} closed · ${formatDeal(leads.reduce((s, l) => s + (l.deal_size ?? 0), 0)) ?? "$0"} won`;
    case "lost": return "Review objections to improve future conversion";
    default: return "";
  }
}

/* ── StageSummaryStrip ─────────────────────────────────────────────── */

interface StageSummaryStripProps {
  leads: StageLead[];
  activeStage: string | null;
  onStageClick: (stageId: string) => void;
}

export function StageSummaryStrip({ leads, activeStage, onStageClick }: StageSummaryStripProps) {
  const grouped = useMemo(() => {
    return PIPELINE_STAGE_ORDER.map((stageId) => {
      const stageLeads = leads.filter((l) => normalizePipelineStage(l.status) === stageId);
      const totalValue = stageLeads.reduce((s, l) => s + (l.deal_size ?? 0), 0);
      const scored = stageLeads.filter((l) => l.ai_score !== undefined);
      const avgScore = scored.length ? Math.round(scored.reduce((s, l) => s + (l.ai_score ?? 0), 0) / scored.length) : null;
      return { stageId, stageLeads, totalValue, avgScore, meta: getPipelineStage(stageId) };
    }).filter((s) => s.stageLeads.length > 0);
  }, [leads]);

  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
      {grouped.map(({ stageId, stageLeads, totalValue, avgScore, meta }) => {
        const isActive = activeStage === stageId;
        return (
          <button
            key={stageId}
            onClick={() => onStageClick(stageId)}
            className={`flex-shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-150 text-left ${
              isActive
                ? `${meta.bg} ${meta.border} shadow-sm`
                : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${isActive ? meta.color : "text-slate-700"}`}>
                  {meta.label}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? meta.badge : "bg-slate-100 text-slate-500"}`}>
                  {stageLeads.length}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {totalValue > 0 && (
                  <span className="text-[10px] text-slate-500 font-medium tabular-nums">{formatDeal(totalValue)}</span>
                )}
                {avgScore !== null && (
                  <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${getScoreConfig(avgScore).color}`}>
                    <Brain className="w-2.5 h-2.5" />
                    {avgScore}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ── LeadRowCard ───────────────────────────────────────────────────── */

interface LeadRowCardProps {
  lead: StageLead;
  onEdit: (lead: StageLead, e: React.MouseEvent) => void;
  onConvertToDeal: (id: number) => void;
}

function LeadRowCard({ lead, onEdit, onConvertToDeal }: LeadRowCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const grad = avatarGradient(lead.name);
  const sc = getScoreConfig(lead.ai_score);
  const stage = getPipelineStage(lead.status);
  const fsb = lead.final_score_breakdown;
  const fsbComps = fsb?.components ?? [];
  const hasStructured = fsbComps.length > 0;
  const bd = !hasStructured ? parseScoreBreakdown(lead.score_comment) : null;
  const intentItems = fsbComps.filter((c) => c.category === "Intent");
  const evidenceItems = fsbComps.filter((c) => c.category === "Evidence");
  const intentScore = fsb?.totals?.intent_score ?? null;
  const evidenceScore = fsb?.totals?.evidence_score ?? null;

  return (
    <div
      onClick={() => setExpanded((p) => !p)}
      className={`bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-150 overflow-hidden cursor-pointer ${expanded ? "border-orange-200 shadow-orange-100/50" : ""}`}
    >
      {/* Top accent */}
      <div className={`h-0.5 bg-gradient-to-r ${grad}`} />

      <div className="p-4">
        <div className="flex items-start gap-4">

          {/* LEFT — Identity */}
          <div className="flex items-center gap-3 min-w-0 flex-[2]">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-sm`}>
              {getInitials(lead.name)}
            </div>
            <div className="min-w-0">
              <Link href={`/leads/${lead.id}`} onClick={(e) => e.stopPropagation()}>
                <p className="text-sm font-bold text-slate-900 hover:text-orange-600 transition-colors leading-tight truncate">{lead.name}</p>
              </Link>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                <Building2 className="w-3 h-3 flex-shrink-0" />
                {lead.company_id_assoc ? (
                  <Link href={`/companies/${lead.company_id_assoc}`} onClick={(e) => e.stopPropagation()} className="hover:text-orange-500 transition-colors truncate">{lead.company}</Link>
                ) : lead.contact_id ? (
                  <Link href={`/contacts/${lead.contact_id}`} onClick={(e) => e.stopPropagation()} className="hover:text-orange-500 transition-colors truncate">{lead.company}</Link>
                ) : <span className="truncate">{lead.company}</span>}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${stage.badge}`}>{stage.label}</span>
                {lead.tags?.slice(0, 1).map((tag) => (
                  <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">{tag}</span>
                ))}
              </div>
            </div>
          </div>

          {/* MIDDLE — Context */}
          <div className="flex-[2] min-w-0 hidden sm:block">
            <div className="space-y-1.5">
              {lead.industry && (
                <p className="text-xs font-semibold text-slate-700 truncate">{lead.industry}</p>
              )}
              <div className="flex items-center gap-1.5 flex-wrap">
                {lead.source && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${getSourceStyle(lead.source)}`}>
                    {lead.source}
                  </span>
                )}
                {lead.deal_size ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-50 text-slate-700 border border-slate-200 flex items-center gap-0.5">
                    <DollarSign className="w-2.5 h-2.5" />{formatDeal(lead.deal_size)}
                  </span>
                ) : null}
              </div>
              {(lead.email || lead.phone) && (
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  {lead.email && <span className="flex items-center gap-0.5"><Mail className="w-2.5 h-2.5" /><span className="truncate max-w-[100px]">{lead.email}</span></span>}
                  {lead.phone && <span className="flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{lead.phone}</span>}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — AI + Actions */}
          <div className="flex-[3] flex items-start gap-3 justify-end">

            {/* AI Score */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              {lead.scoring_status === "pending" ? (
                <div className="w-11 h-11 rounded-xl border-2 border-slate-200 bg-slate-50 flex items-center justify-center animate-pulse">
                  <Clock className="w-4 h-4 text-slate-300" />
                </div>
              ) : lead.scoring_status === "scoring" ? (
                <div className="w-11 h-11 rounded-xl border-2 border-blue-200 bg-blue-50 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-blue-400 animate-pulse" />
                </div>
              ) : lead.scoring_status === "failed" ? (
                <div className="w-11 h-11 rounded-xl border-2 border-red-200 bg-red-50 flex items-center justify-center">
                  <XCircle className="w-4 h-4 text-red-400" />
                </div>
              ) : (
                <div className={`w-11 h-11 rounded-xl border-2 ${sc.border} ${sc.bg} flex flex-col items-center justify-center flex-shrink-0`}>
                  <span className={`text-sm font-black ${sc.color} leading-none`}>
                    {lead.ai_score != null ? lead.ai_score.toFixed(0) : "—"}
                  </span>
                </div>
              )}
              {lead.scoring_status === "pending" && <span className="text-[8px] font-semibold text-slate-400 uppercase">Queued</span>}
              {lead.scoring_status === "scoring" && <span className="text-[8px] font-semibold text-blue-500 uppercase">Scoring</span>}
              {lead.scoring_status === "failed" && <span className="text-[8px] font-semibold text-red-400 uppercase">Failed</span>}
              {(!lead.scoring_status || lead.scoring_status === "scored") && lead.ai_score != null && (
                <span className={`text-[9px] font-bold uppercase tracking-wide ${sc.color}`}>{sc.label}</span>
              )}
              {lead.used_web_evidence && (
                <span className="text-[8px] px-1 py-0.5 rounded bg-teal-50 text-teal-600 border border-teal-100 font-semibold">Web</span>
              )}
            </div>

            {/* AI Suggestions */}
            <div className="flex-1 min-w-0 hidden lg:block">
              {lead.recommended_offerings && lead.recommended_offerings.length > 0 && (
                <div className="flex flex-wrap gap-1 overflow-hidden max-h-[3.25rem]">
                  {lead.recommended_offerings.map((o, idx) => (
                    <span key={idx} className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${OFFERING_COLORS[idx % OFFERING_COLORS.length]}`}>
                      {o}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <Link href={`/leads/${lead.id}`} onClick={(e) => e.stopPropagation()}>
                <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-orange-600 transition-colors" title="View">
                  <Eye className="w-3.5 h-3.5" />
                </button>
              </Link>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(lead, e); }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onConvertToDeal(lead.id); }}
                className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors"
                title="Convert to Deal"
              >
                <Briefcase className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setExpanded((p) => !p); }}
                className={`p-1.5 rounded-lg transition-colors ${expanded ? "bg-orange-50 text-orange-500" : "hover:bg-slate-100 text-slate-400 hover:text-slate-600"}`}
                title="AI Details"
              >
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Expanded AI panel */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Sales Strategy */}
              {(lead.sales_strategy || (lead.recommended_offerings && lead.recommended_offerings.length > 0)) && (
                <div className="rounded-xl bg-orange-50 border border-orange-100 p-3.5">
                  <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider flex items-center gap-1 mb-2">
                    <Target className="w-3 h-3" /> Sales Strategy
                  </p>
                  {lead.sales_strategy && (
                    <p className="text-xs text-slate-700 leading-relaxed mb-2">{lead.sales_strategy}</p>
                  )}
                  {lead.recommended_offerings && lead.recommended_offerings.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {lead.recommended_offerings.map((o, idx) => (
                        <span key={idx} className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${OFFERING_COLORS[idx % OFFERING_COLORS.length]}`}>{o}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {/* AI Analysis */}
              {lead.score_comment && (
                <div className="rounded-xl bg-violet-50 border border-violet-100 p-3.5">
                  <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wider flex items-center gap-1 mb-2">
                    <Brain className="w-3 h-3" /> AI Analysis
                  </p>
                  <p className="text-xs text-slate-700 leading-relaxed">{lead.score_comment}</p>
                </div>
              )}
            </div>

            {/* Show Evidence & details toggle */}
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 h-px bg-orange-100" />
              <button
                className="flex items-center gap-1.5 text-[11px] font-semibold text-orange-500 hover:text-orange-700 px-3 py-1 rounded-full border border-orange-200 bg-white hover:bg-orange-50 transition-colors"
                onClick={(e) => { e.stopPropagation(); setDetailsExpanded((p) => !p); }}
              >
                {detailsExpanded
                  ? <><ChevronUp className="w-3 h-3" /> Hide evidence &amp; details</>
                  : <><ChevronDown className="w-3 h-3" /> Show evidence &amp; details</>}
              </button>
              <div className="flex-1 h-px bg-orange-100" />
            </div>

            {/* Evidence & Details panel */}
            {detailsExpanded && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                {/* Left — Evidence & Score Breakdown */}
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-orange-400" /> Evidence &amp; Score Breakdown
                  </p>
                  {(hasStructured || bd) && (
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <div className="space-y-3">
                        {/* final_score_breakdown — Intent */}
                        {hasStructured && intentItems.length > 0 && (
                          <div>
                            <div className="flex justify-between items-center text-[11px] mb-1">
                              <span className="font-semibold text-orange-600 uppercase tracking-wide">Intent</span>
                              <span className="font-bold text-slate-700 tabular-nums">{intentScore ?? "—"} / 70</span>
                            </div>
                            <div className="h-2 bg-orange-100 rounded-full overflow-hidden">
                              <div className="h-full bg-orange-400 rounded-full" style={{ width: `${Math.min(100, ((intentScore ?? 0) / 70) * 100)}%` }} />
                            </div>
                            <div className="mt-2 space-y-1 pl-1">
                              {intentItems.map((comp, i) => (
                                <div key={i} className="flex justify-between items-center text-[11px]">
                                  <span className="text-slate-400 truncate max-w-[150px]">{comp.component}</span>
                                  <span className={`font-semibold tabular-nums ${comp.points > 0 ? "text-emerald-600" : "text-slate-300"}`}>
                                    +{comp.points % 1 === 0 ? comp.points.toFixed(0) : comp.points.toFixed(1)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* final_score_breakdown — Evidence */}
                        {hasStructured && evidenceItems.length > 0 && (
                          <div className={intentItems.length > 0 ? "pt-3 border-t border-slate-100" : ""}>
                            <div className="flex justify-between items-center text-[11px] mb-1">
                              <span className="font-semibold text-teal-600 uppercase tracking-wide">Evidence</span>
                              <span className="font-bold text-slate-700 tabular-nums">{evidenceScore ?? "—"} / 30</span>
                            </div>
                            <div className="h-2 bg-teal-100 rounded-full overflow-hidden">
                              <div className="h-full bg-teal-400 rounded-full" style={{ width: `${Math.min(100, ((evidenceScore ?? 0) / 30) * 100)}%` }} />
                            </div>
                            <div className="mt-2 space-y-1 pl-1">
                              {evidenceItems.map((comp, i) => (
                                <div key={i} className="flex justify-between items-center text-[11px]">
                                  <span className="text-slate-400 truncate max-w-[150px]">{comp.component}</span>
                                  <span className={`font-semibold tabular-nums ${comp.points > 0 ? "text-emerald-600" : "text-slate-300"}`}>
                                    +{comp.points % 1 === 0 ? comp.points.toFixed(0) : comp.points.toFixed(1)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Fallback: regex-parsed breakdown */}
                        {!hasStructured && bd && bd.intentTotal !== null && (
                          <div>
                            <div className="flex justify-between items-center text-[11px] mb-1">
                              <span className="font-semibold text-orange-600 uppercase tracking-wide">Intent</span>
                              <span className="font-bold text-slate-700 tabular-nums">{bd.intentTotal} / {bd.intentMax}</span>
                            </div>
                            <div className="h-2 bg-orange-100 rounded-full overflow-hidden">
                              <div className="h-full bg-orange-400 rounded-full" style={{ width: `${(bd.intentTotal / bd.intentMax) * 100}%` }} />
                            </div>
                          </div>
                        )}
                        {!hasStructured && bd && bd.evidenceTotal !== null && (
                          <div className="pt-3 border-t border-slate-100">
                            <div className="flex justify-between items-center text-[11px] mb-1">
                              <span className="font-semibold text-teal-600 uppercase tracking-wide">Evidence</span>
                              <span className="font-bold text-slate-700 tabular-nums">{bd.evidenceTotal} / {bd.evidenceMax}</span>
                            </div>
                            <div className="h-2 bg-teal-100 rounded-full overflow-hidden">
                              <div className="h-full bg-teal-400 rounded-full" style={{ width: `${(bd.evidenceTotal / bd.evidenceMax) * 100}%` }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {lead.evidence_cards && lead.evidence_cards.length > 0 ? (
                    lead.evidence_cards.map((card, i) => {
                      const sig = getSignalInfo(card.signal_type);
                      const { cls, Icon: StrIcon } = getStrengthStyle(card.strength);
                      return (
                        <div key={i} className="bg-white rounded-xl border border-slate-200 p-3">
                          <div className="flex items-start justify-between mb-2 gap-2">
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${sig.cls}`}>{sig.label}</span>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5 ${cls}`}>
                                <StrIcon className="w-3 h-3" />{card.strength}
                              </span>
                              {card.points != null && (
                                <span className={`text-xs font-bold tabular-nums ${card.points >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                  {card.points >= 0 ? "+" : ""}{card.points} pts
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed">{card.reason}</p>
                          {card.source_excerpt && (
                            <p className="mt-2 text-[11px] text-slate-400 italic border-l-2 border-slate-200 pl-2 line-clamp-2">
                              &ldquo;{card.source_excerpt}&rdquo;
                            </p>
                          )}
                          {card.source_url && (
                            <a
                              href={card.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1.5 text-[11px] text-blue-500 hover:underline flex items-center gap-0.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-3 h-3" /> View source
                            </a>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-400 px-1">No evidence cards available.</p>
                  )}
                </div>

                {/* Right — Lead Details */}
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <FileText className="w-3 h-3 text-orange-400" /> Lead Details
                  </p>
                  {lead.comments && (
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> Sales Notes
                      </p>
                      <p className="text-xs text-slate-700 leading-relaxed">{lead.comments}</p>
                    </div>
                  )}
                  {lead.knowledge && (
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <Globe className="w-3 h-3" /> Research
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-6">{lead.knowledge}</p>
                      {lead.knowledge_sources && lead.knowledge_sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                          {lead.knowledge_sources.map((src, i) => (
                            <a
                              key={i} href={src} target="_blank" rel="noopener noreferrer"
                              className="text-[11px] text-blue-500 hover:underline flex items-center gap-0.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span className="truncate">{src}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Metadata</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <span className="text-slate-400">Created</span>
                      <span className="text-slate-700 text-right">{new Date(lead.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      {lead.assigned_to && <>
                        <span className="text-slate-400">Assigned To</span>
                        <span className="text-slate-700 text-right">{lead.assigned_to}</span>
                      </>}
                      <span className="text-slate-400">Web Evidence</span>
                      <span className={`font-medium text-right ${lead.used_web_evidence ? "text-teal-600" : "text-amber-600"}`}>
                        {lead.used_web_evidence ? "Yes" : "Fallback"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── StageSection ──────────────────────────────────────────────────── */

interface StageSectionProps {
  stageId: PipelineStageId;
  leads: StageLead[];
  sectionRef?: React.RefObject<HTMLDivElement | null>;
  onEdit: (lead: StageLead, e: React.MouseEvent) => void;
  onConvertToDeal: (id: number) => void;
}

function StageSection({ stageId, leads, sectionRef, onEdit, onConvertToDeal }: StageSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const meta = getPipelineStage(stageId);
  const totalValue = leads.reduce((s, l) => s + (l.deal_size ?? 0), 0);
  const scored = leads.filter((l) => l.ai_score !== undefined);
  const avgScore = scored.length ? Math.round(scored.reduce((s, l) => s + (l.ai_score ?? 0), 0) / scored.length) : null;
  const insight = stageInsight(stageId, leads);
  const avgScoreConf = getScoreConfig(avgScore ?? undefined);

  return (
    <div ref={sectionRef} className="space-y-2">
      {/* Section header */}
      <button
        onClick={() => setCollapsed((p) => !p)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border ${meta.bg} ${meta.border} hover:shadow-sm transition-all duration-150 group`}
      >
        {/* Stage badge */}
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${meta.bar}`} />
        <span className={`text-sm font-bold ${meta.color}`}>{meta.label}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${meta.badge}`}>{leads.length}</span>

        {/* Stats */}
        <div className="flex items-center gap-3 ml-1 flex-wrap">
          {totalValue > 0 && (
            <span className="text-xs text-slate-600 font-semibold flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-slate-400" />{formatDeal(totalValue)}
            </span>
          )}
          {avgScore !== null && (
            <span className={`text-xs font-bold flex items-center gap-1 ${avgScoreConf.color}`}>
              <Brain className="w-3 h-3" />
              Avg {avgScore}
            </span>
          )}
        </div>

        {/* AI insight */}
        {insight && (
          <span className="hidden md:flex items-center gap-1 text-[11px] text-slate-500 font-medium ml-1">
            <Sparkles className="w-3 h-3 text-orange-400 flex-shrink-0" />
            {insight}
          </span>
        )}

        {/* Collapse toggle */}
        <div className="ml-auto flex-shrink-0">
          {collapsed
            ? <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
            : <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
          }
        </div>
      </button>

      {/* Lead cards */}
      {!collapsed && (
        <div className="space-y-2 pl-4 border-l-2 border-slate-100 ml-1.5">
          {/* Column headers */}
          <div className="flex items-center gap-4 px-4 pt-1 pb-0.5">
            <div className="flex-[2] flex items-center gap-3">
              <div className="w-10 flex-shrink-0" />
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Lead</span>
            </div>
            <div className="flex-[2] hidden sm:block">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Details</span>
            </div>
            <div className="flex-[3] flex items-center justify-end gap-3">
              <span className="w-11 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex-shrink-0">AI Score</span>
              <div className="flex-1 hidden lg:flex items-center">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">AI Suggestions</span>
              </div>
              <span className="w-[110px] text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex-shrink-0">Actions</span>
            </div>
          </div>
          {leads.map((lead) => (
            <LeadRowCard
              key={lead.id}
              lead={lead}
              onEdit={onEdit}
              onConvertToDeal={onConvertToDeal}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── StageView (root) ──────────────────────────────────────────────── */

export function StageView({ leads, onEdit, onConvertToDeal }: StageViewProps) {
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const grouped = useMemo(() => {
    return PIPELINE_STAGE_ORDER.map((stageId) => ({
      stageId,
      leads: leads.filter((l) => normalizePipelineStage(l.status) === stageId),
    })).filter((s) => s.leads.length > 0);
  }, [leads]);

  const handleStageClick = (stageId: string) => {
    setActiveStage(stageId);
    const el = sectionRefs.current[stageId];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (leads.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <StageSummaryStrip
        leads={leads}
        activeStage={activeStage}
        onStageClick={handleStageClick}
      />

      {/* Stage sections */}
      <div className="space-y-5">
        {grouped.map(({ stageId, leads: stageLeads }) => (
          <StageSection
            key={stageId}
            stageId={stageId as PipelineStageId}
            leads={stageLeads}
            sectionRef={{ current: sectionRefs.current[stageId] ?? null } as React.RefObject<HTMLDivElement | null>}
            onEdit={onEdit}
            onConvertToDeal={onConvertToDeal}
          />
        ))}
      </div>
    </div>
  );
}
