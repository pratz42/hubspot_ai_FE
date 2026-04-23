"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Mail, Phone, Building2, Calendar, Target, Brain,
  DollarSign, Globe, ExternalLink, Zap, CheckCircle2, AlertCircle,
  MessageSquare, FileText, Activity, BarChart3, Sparkles, Building,
  Loader2, Plus, PhoneCall, Users, StickyNote, XCircle, TrendingUp,
  TrendingDown, Minus, BookOpen, Lightbulb, Package, Star, ChevronDown,
  ChevronUp, Clock, RotateCcw,
} from "lucide-react";
import API from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { getPipelineStage } from "@/lib/pipeline";
import { useScoreStream } from "@/hooks/useScoreStream";
import { useStrategyBrief } from "@/hooks/useStrategyBrief";
import { ScoreStatusBadge } from "@/components/ui/ScoreStatusBadge";
import { StrategyBriefCard, StrategyBriefActionButton } from "@/components/leads/StrategyBriefCard";

/* ── Types ─────────────────────────────────────────────────────────── */

interface EvidenceCard {
  points?: number;
  reason: string;
  strength: "low" | "medium" | "high";
  source_url?: string;
  signal_type: string;
  source_excerpt?: string;
  exact_extract?: string;
}

interface ScoreComponent {
  label: string;
  value: number;
  reason: string;
}

interface FinalBreakdownComponent {
  component: string;
  category: "Intent" | "Evidence";
  points: number;
  reason: string;
  running_total: number;
  formula: string;
}

interface FinalScoreBreakdown {
  summary?: string;
  components?: FinalBreakdownComponent[];
  totals?: {
    intent_score: number;
    evidence_score: number;
    raw_score: number;
    final_score: number;
  };
  final_policy_reason?: string;
}

interface BaseComponent {
  component: string;
  raw_score: number;
  weight: number;
  weighted_points: number;
  reason: string;
}

interface ICPFit {
  score: number;
  reason: string;
  matched_industry: boolean;
  matched_market: boolean;
  matched_persona: boolean;
  company_profile_fit?: boolean;
  notes?: string[];
  details?: {
    industry?: { score: number; matched: boolean; matched_value: string | null; notes: string[] };
    market?: { score: number; matched: boolean; matched_value: string | null; notes: string[] };
    company_profile?: { score: number; matched: boolean; matched_value: string | null; notes: string[] };
    persona?: { score: number; matched: boolean; matched_value: string | null; notes: string[] };
  };
}

interface LeadScoreBreakdown {
  components?: ScoreComponent[];
  intent_score?: number;
  evidence_score?: number;
  final_score?: number;
  summary?: string;
  final_policy_reason?: string;
  score_breakdown?: {
    components?: ScoreComponent[];
    intent_score?: number;
    evidence_score?: number;
    final_score?: number;
    summary?: string;
    final_policy_reason?: string;
  };
  icp_fit?: ICPFit;
  base_scoring_context?: {
    components?: BaseComponent[];
    icp_fit?: ICPFit;
    final_score?: number;
    summary?: string;
  };
  source_quality?: { score: number; reason: string };
  vertex_score?: { score: number; reason: string };
  offering_alignment?: { alignment_score: number; reason: string };
  deep_score_checks?: {
    sales_comment_signal?: {
      score: number;
      present: boolean;
      positive_signals: string[];
      negative_signals: string[];
      summary: string;
    };
    similar_won_match?: null | { name: string; score: number; reason: string };
  };
}

interface Communication {
  id: number;
  lead_id: number;
  type: "email" | "call" | "note" | "meeting";
  content?: string;
  timestamp: string;
  created_by?: string;
}

interface Lead {
  id: number;
  name: string;
  company: string;
  email?: string;
  phone?: string;
  industry?: string;
  deal_size?: number;
  source?: string;
  comments?: string;
  knowledge?: string;
  knowledge_sources?: string[];
  evidence_cards?: EvidenceCard[];
  used_web_evidence?: boolean;
  ai_score?: number;
  score_comment?: string;
  score_breakdown?: LeadScoreBreakdown;
  final_score_breakdown?: FinalScoreBreakdown;
  sales_strategy?: string;
  recommended_offerings?: string[];
  next_action?: string;
  status: string;
  created_at: string;
  contact_id?: number;
  company_id_assoc?: number;
  scoring_status?: string;
  scoring_version?: number;
  strategy_brief_status?: string;
  strategy_brief_version?: number;
  strategy_brief_job_id?: string | null;
  strategy_brief_updated_at?: string | null;
}

/* ── Knowledge parser ───────────────────────────────────────────────── */

interface ParsedProduct {
  name: string;
  whatItIs: string;
  bestFor: string;
  expectedValue: string;
}

interface ParsedKnowledge {
  leadContext: string;
  sellerSections: { title: string; content: string }[];
  campaignContext: string;
  products: ParsedProduct[];
}

const SELLER_SECTION_NAMES: Record<string, string> = {
  "1": "Lead Situation & Signals",
  "2": "Company Activity",
  "3": "Why It Matters for Pitching",
  "4": "Competitive Context",
};

function parseKnowledge(text?: string): ParsedKnowledge {
  const empty: ParsedKnowledge = { leadContext: "", sellerSections: [], campaignContext: "", products: [] };
  if (!text) return empty;

  const leadCtxMatch = text.match(/Lead Context:\s*([\s\S]*?)(?=\n\nSeller-Relevant Knowledge:|Seller-Relevant Knowledge:|$)/i);
  const leadContext = leadCtxMatch?.[1]?.trim() ?? "";

  const skMatch = text.match(/Seller-Relevant Knowledge:\s*([\s\S]*?)(?=\n\nWhy This Matters|Why This Matters|Best-Fit Products:|$)/i);
  const sellerSections: { title: string; content: string }[] = [];
  if (skMatch) {
    const parts = skMatch[1].split(/(?=\d+\.\s)/).filter(Boolean);
    parts.forEach((part) => {
      const m = part.match(/^(\d+)\.\s+([\s\S]+)/);
      if (m) {
        sellerSections.push({
          title: SELLER_SECTION_NAMES[m[1]] ?? `Insight ${m[1]}`,
          content: m[2].trim(),
        });
      }
    });
  }

  const ccMatch = text.match(/Why This Matters For Campaigns And Pitching:\s*([\s\S]*?)(?=\n\nBest-Fit Products:|Best-Fit Products:|$)/i);
  const campaignContext = ccMatch?.[1]?.trim() ?? "";

  const bfpMatch = text.match(/Best-Fit Products:\s*([\s\S]*?)$/i);
  const products: ParsedProduct[] = [];
  if (bfpMatch) {
    const lines = bfpMatch[1].split("\n").filter((l) => l.trim() && l.includes(";"));
    for (const line of lines) {
      const parts = line.split(";").map((p) => p.trim());
      if (parts.length < 2) continue;
      const name = parts[0];
      const whatItIs = parts.find((p) => /^what it is:/i.test(p))?.replace(/^what it is:\s*/i, "") ?? "";
      const bestFor = parts.find((p) => /^best for:/i.test(p))?.replace(/^best for:\s*/i, "") ?? "";
      const expectedValue = parts.find((p) => /^expected value:/i.test(p))?.replace(/^expected value:\s*/i, "") ?? "";
      if (name) products.push({ name, whatItIs, bestFor, expectedValue });
    }
  }

  return { leadContext, sellerSections, campaignContext, products };
}

/* ── Small helpers ──────────────────────────────────────────────────── */

const COMM_TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  email: { icon: Mail, label: "Email", color: "text-indigo-600", bg: "bg-indigo-50" },
  call: { icon: PhoneCall, label: "Call", color: "text-emerald-600", bg: "bg-emerald-50" },
  note: { icon: StickyNote, label: "Note", color: "text-amber-600", bg: "bg-amber-50" },
  meeting: { icon: Users, label: "Meeting", color: "text-violet-600", bg: "bg-violet-50" },
};

const STRENGTH_CONFIG = {
  high: { color: "text-emerald-700", bg: "bg-emerald-50", bar: "bg-emerald-500", border: "border-emerald-200", Icon: TrendingUp },
  medium: { color: "text-amber-700", bg: "bg-amber-50", bar: "bg-amber-400", border: "border-amber-200", Icon: Minus },
  low: { color: "text-red-700", bg: "bg-red-50", bar: "bg-red-400", border: "border-red-200", Icon: TrendingDown },
};

const AVATAR_GRADIENTS = [
  "from-indigo-500 to-indigo-600", "from-violet-500 to-violet-600",
  "from-emerald-500 to-emerald-600", "from-orange-500 to-orange-600",
  "from-pink-500 to-pink-600", "from-teal-500 to-teal-600", "from-blue-500 to-blue-600",
];

const OFFERING_COLORS = [
  "bg-indigo-50 text-indigo-700 border-indigo-200",
  "bg-violet-50 text-violet-700 border-violet-200",
  "bg-emerald-50 text-emerald-700 border-emerald-200",
  "bg-orange-50 text-orange-700 border-orange-200",
  "bg-pink-50 text-pink-700 border-pink-200",
];

function avatarGradient(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length];
}

function formatDeal(value?: number) {
  if (!value) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function getScoreConfig(score?: number) {
  if (!score) return { color: "text-slate-500", bg: "bg-slate-100", ring: "border-slate-300", label: "Unscored", bar: "bg-slate-300", textRing: "text-slate-400" };
  if (score >= 80) return { color: "text-emerald-700", bg: "bg-emerald-50", ring: "border-emerald-400", label: "Hot Lead", bar: "bg-emerald-500", textRing: "text-emerald-600" };
  if (score >= 60) return { color: "text-amber-700", bg: "bg-amber-50", ring: "border-amber-400", label: "Warm Lead", bar: "bg-amber-400", textRing: "text-amber-600" };
  return { color: "text-red-600", bg: "bg-red-50", ring: "border-red-400", label: "Cold Lead", bar: "bg-red-400", textRing: "text-red-500" };
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function getSignalInfo(signalType: string) {
  const map: Record<string, { label: string; cls: string }> = {
    technology_adoption: { label: "Tech Adoption", cls: "bg-blue-100 text-blue-700" },
    industry_match: { label: "Industry Match", cls: "bg-green-100 text-green-700" },
    company_research: { label: "Company Research", cls: "bg-teal-100 text-teal-700" },
    negative_signal: { label: "Negative Signal", cls: "bg-red-100 text-red-600" },
    positive_signal: { label: "Positive Signal", cls: "bg-green-100 text-green-700" },
    web_research: { label: "Web Research", cls: "bg-cyan-100 text-cyan-700" },
    no_evidence: { label: "No Evidence", cls: "bg-slate-100 text-slate-500" },
  };
  return map[signalType] ?? { label: signalType.replace(/_/g, " "), cls: "bg-slate-100 text-slate-500" };
}

/* ── Sub-components ─────────────────────────────────────────────────── */

function ScoreRingLarge({ score, label }: { score: number; label: string }) {
  const cfg = getScoreConfig(score);
  return (
    <div className="flex items-center gap-4">
      <div className={`w-20 h-20 rounded-full border-4 ${cfg.ring} ${cfg.bg} flex flex-col items-center justify-center flex-shrink-0 shadow-md`}>
        <span className={`text-2xl font-black leading-none ${cfg.color}`}>{Math.round(score)}</span>
        <span className="text-[10px] font-semibold text-slate-400 mt-0.5">/ 100</span>
      </div>
      <div>
        <p className={`text-base font-bold ${cfg.color}`}>{label}</p>
        <p className="text-xs text-slate-400 mt-0.5">Final AI Score</p>
        <div className="mt-2 h-1.5 w-28 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full ${cfg.bar} rounded-full transition-all duration-700`} style={{ width: `${score}%` }} />
        </div>
      </div>
    </div>
  );
}

function MiniScoreRing({ score, max, label, color }: { score: number; max: number; label: string; color: string }) {
  const pct = Math.min(100, (score / max) * 100);
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`relative w-14 h-14 rounded-full flex items-center justify-center border-[3px] ${color}`}>
        <div className="text-center">
          <p className="text-sm font-bold text-slate-800 leading-none">{score}</p>
          <p className="text-[9px] text-slate-400 leading-none">/{max}</p>
        </div>
      </div>
      <p className="text-[10px] font-semibold text-slate-500 text-center leading-tight">{label}</p>
      <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color.includes("orange") ? "bg-orange-400" : "bg-teal-400"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ICPTile({ label, matched, value }: { label: string; matched: boolean; value?: string | null }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium ${matched ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
      {matched
        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
        : <XCircle className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />}
      <div className="min-w-0">
        <p className="leading-none">{label}</p>
        {value && matched && <p className="text-[10px] font-normal mt-0.5 text-emerald-600 truncate">{value}</p>}
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────── */

export default function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const leadId = resolvedParams?.id;
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(() => Boolean(leadId));
  const [error, setError] = useState("");

  const [comms, setComms] = useState<Communication[]>([]);
  const [commType, setCommType] = useState<"email" | "call" | "note" | "meeting">("note");
  const [commContent, setCommContent] = useState("");
  const [addingComm, setAddingComm] = useState(false);
  const [commError, setCommError] = useState("");
  const [bdOpen, setBdOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const reloadLead = useCallback(async () => {
    if (!leadId) return;
    try {
      const res = await API.get(`/leads/${leadId}`);
      setLead(res.data);
    } catch { /* ignore silent refresh */ }
  }, [leadId]);

  useEffect(() => {
    if (!leadId) return;
    API.get(`/leads/${leadId}`)
      .then((res) => setLead(res.data))
      .catch((err) => setError(getErrorMessage(err, "Unable to load this lead.")))
      .finally(() => setLoading(false));
    API.get(`/contacts/${leadId}/communications`)
      .then((res) => setComms(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, [leadId]);

  const { liveStatus, isStreaming } = useScoreStream({
    entityType: "lead",
    entityId: lead?.id ?? null,
    initialStatus: lead?.scoring_status ?? "scored",
    onComplete: reloadLead,
  });

  const effectiveStatus = liveStatus ?? lead?.scoring_status ?? "scored";

  const brief = useStrategyBrief(lead?.id ?? null);

  async function handleRetry() {
    if (!leadId || retrying) return;
    setRetrying(true);
    try {
      await API.post(`/ai-jobs/leads/${leadId}/retry`);
      await reloadLead();
    } catch { /* ignore */ } finally {
      setRetrying(false);
    }
  }

  const logCommunication = async () => {
    if (!leadId || !commContent.trim()) return;
    setAddingComm(true);
    setCommError("");
    try {
      const res = await API.post(`/contacts/${leadId}/communications`, { type: commType, content: commContent.trim() });
      setComms((prev) => [res.data, ...prev]);
      setCommContent("");
    } catch (err) {
      setCommError(getErrorMessage(err, "Failed to log activity."));
    } finally {
      setAddingComm(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-5">
        <div className="h-5 bg-slate-200 rounded w-24 animate-pulse" />
        <div className="h-28 bg-slate-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-10 bg-slate-200 rounded-lg animate-pulse" />
            <div className="h-64 bg-slate-200 rounded-xl animate-pulse" />
          </div>
          <div className="space-y-4">
            <div className="h-52 bg-slate-200 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16">
          <AlertCircle className="w-8 h-8 text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-700">{error || (!leadId ? "Invalid lead ID." : "Lead not found")}</p>
          <Link href="/leads" className="mt-4">
            <Button className="bg-orange-600 hover:bg-orange-700 h-8 text-xs font-semibold">
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />Back to Leads
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  /* ── Derived values ── */
  const scoreConfig = getScoreConfig(lead.ai_score);
  const statusConfig = getPipelineStage(lead.status);
  const grad = avatarGradient(lead.name);

  const fsb = lead.final_score_breakdown;
  const sb = lead.score_breakdown;

  const fsbComps: FinalBreakdownComponent[] = fsb?.components ?? [];
  const hasFsb = fsbComps.length > 0;

  const intentScore = fsb?.totals?.intent_score ?? null;
  const evidenceScore = fsb?.totals?.evidence_score ?? null;
  const breakdownSummary = fsb?.summary ?? null;
  const policyReason = fsb?.final_policy_reason ?? null;
  const hasBreakdown = hasFsb;

  const intentItems: FinalBreakdownComponent[] = fsbComps.filter((c) => c.category === "Intent");
  const evidenceItems: FinalBreakdownComponent[] = fsbComps.filter((c) => c.category === "Evidence");

  const icpFit = sb?.icp_fit ?? sb?.base_scoring_context?.icp_fit;
  const baseComps: BaseComponent[] = sb?.base_scoring_context?.components ?? [];
  const salesCommentSignal = sb?.deep_score_checks?.sales_comment_signal;
  const similarWonMatch = sb?.deep_score_checks?.similar_won_match;

  const parsedKnowledge = parseKnowledge(lead.knowledge);

  return (
    <div className="p-6 max-w-7xl">
      {/* Back */}
      <Link href="/leads">
        <button className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 font-medium mb-5 transition-colors">
          <ArrowLeft className="w-4 h-4" />Back to Leads
        </button>
      </Link>

      {/* ── Lead header ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-5">
        <div className={`h-1.5 bg-gradient-to-r ${grad}`} />
        <div className="p-5 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-xl font-bold text-white shadow-sm flex-shrink-0`}>
              {getInitials(lead.name)}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap mb-1">
                <h1 className="text-xl font-bold text-slate-900">{lead.name}</h1>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusConfig.badge}`}>
                  {statusConfig.label}
                </span>
                <ScoreStatusBadge status={effectiveStatus} size="md" />
                {effectiveStatus === "scored" && lead.ai_score !== undefined && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${scoreConfig.bg} ${scoreConfig.color}`}>
                    <Brain className="w-3 h-3" />{scoreConfig.label} · {lead.ai_score}/100
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 flex items-center gap-1.5 mb-2">
                <Building2 className="w-3.5 h-3.5" />
                {lead.company_id_assoc ? (
                  <Link href={`/companies/${lead.company_id_assoc}`} className="hover:text-orange-600 transition-colors">{lead.company}</Link>
                ) : lead.contact_id ? (
                  <Link href={`/contacts/${lead.contact_id}`} className="hover:text-orange-600 transition-colors">{lead.company}</Link>
                ) : lead.company}
                {lead.industry && (
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 ml-1">{lead.industry}</span>
                )}
              </p>
              {lead.evidence_cards && lead.evidence_cards.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                    <Globe className="w-2.5 h-2.5" />{lead.evidence_cards.length} web source{lead.evidence_cards.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {lead.email && (
              <a href={`mailto:${lead.email}`}>
                <Button variant="outline" size="sm" className="h-8 text-xs border-slate-200 hover:border-indigo-300 hover:text-indigo-600">
                  <Mail className="w-3.5 h-3.5 mr-1.5" />Email
                </Button>
              </a>
            )}
            {lead.phone && (
              <a href={`tel:${lead.phone}`}>
                <Button variant="outline" size="sm" className="h-8 text-xs border-slate-200 hover:border-emerald-300 hover:text-emerald-600">
                  <Phone className="w-3.5 h-3.5 mr-1.5" />Call
                </Button>
              </a>
            )}
            <StrategyBriefActionButton brief={brief} scoringStatus={effectiveStatus} />
            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 h-8 text-xs font-semibold">
              <Zap className="w-3.5 h-3.5 mr-1.5" />Convert to Deal
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Left: Tabs ── */}
        <div className="lg:col-span-2 space-y-5">
          <Tabs defaultValue="overview">
            <TabsList className="mb-4 bg-slate-100 p-1">
              <TabsTrigger value="overview" className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">Overview</TabsTrigger>
              <TabsTrigger value="ai" className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Brain className="w-3 h-3 mr-1" />AI Analysis
              </TabsTrigger>
              <TabsTrigger value="intelligence" className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Lightbulb className="w-3 h-3 mr-1" />Intelligence
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">Activity</TabsTrigger>
            </TabsList>

            {/* ─── OVERVIEW TAB ─── */}
            <TabsContent value="overview">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Lead Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: "Company", value: lead.company, icon: Building, show: true },
                    { label: "Email", value: lead.email, icon: Mail, show: !!lead.email },
                    { label: "Phone", value: lead.phone, icon: Phone, show: !!lead.phone },
                    { label: "Deal Size", value: formatDeal(lead.deal_size), icon: DollarSign, show: !!lead.deal_size },
                    { label: "Source", value: lead.source, icon: Globe, show: !!lead.source },
                    { label: "Industry", value: lead.industry, icon: Building2, show: !!lead.industry },
                    { label: "Added", value: new Date(lead.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), icon: Calendar, show: true },
                  ].filter((f) => f.show).map((field) => (
                    <div key={field.label} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                        <field.icon className="w-4 h-4 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{field.label}</p>
                        <p className="text-sm font-medium text-slate-900 mt-0.5">{field.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {lead.comments && (
                  <>
                    <Separator className="my-4 bg-slate-100" />
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Sales Notes</p>
                      <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-100">{lead.comments}</p>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            {/* ─── AI ANALYSIS TAB ─── */}
            <TabsContent value="ai">
              <div className="space-y-4">

                {/* Section 1: Score Summary */}
                {lead.ai_score !== undefined && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center">
                        <Brain className="w-3.5 h-3.5 text-white" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">Score Summary</h3>
                      <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-semibold ${scoreConfig.bg} ${scoreConfig.color}`}>{scoreConfig.label}</span>
                    </div>
                    <div className="flex items-start gap-5 flex-wrap">
                      <ScoreRingLarge score={lead.ai_score} label={scoreConfig.label} />
                    </div>
                    {lead.score_comment && (
                      <div className="mt-4 bg-slate-50 rounded-lg px-4 py-3 border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">AI Assessment</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{lead.score_comment}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Section 2: Score Breakdown */}
                {hasBreakdown && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <button
                      onClick={() => setBdOpen((o) => !o)}
                      className="w-full flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center flex-shrink-0">
                        <BarChart3 className="w-3.5 h-3.5 text-white" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 text-left">Score Breakdown</h3>
                      <span className="ml-auto text-[10px] text-slate-400 font-medium">{bdOpen ? "collapse" : "expand"}</span>
                      {bdOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>

                    {bdOpen && (
                      <div className="p-5 space-y-5">
                        {/* Intent group — final_score_breakdown */}
                        {intentItems.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-orange-400" />
                                <span className="text-xs font-bold text-orange-600 uppercase tracking-wide">Intent</span>
                              </div>
                              <span className="text-xs font-bold text-slate-700 tabular-nums">{intentScore ?? "—"} / 70</span>
                            </div>
                            <div className="h-2 bg-orange-100 rounded-full overflow-hidden mb-3">
                              <div className="h-full bg-orange-400 rounded-full transition-all duration-700" style={{ width: `${Math.min(100, ((intentScore ?? 0) / 70) * 100)}%` }} />
                            </div>
                            <div className="space-y-3">
                              {intentItems.map((comp, i) => (
                                <div key={i} className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-semibold text-slate-700">{comp.component}</span>
                                    <div className="flex items-center gap-1.5">
                                      <span className={`text-xs font-bold tabular-nums ${comp.points > 0 ? "text-emerald-600" : "text-slate-400"}`}>+{comp.points}</span>
                                      <span className="text-[10px] text-slate-300 tabular-nums">{comp.formula}</span>
                                    </div>
                                  </div>
                                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
                                    <div className="h-full bg-orange-300 rounded-full" style={{ width: `${Math.min(100, (comp.points / 20) * 100)}%` }} />
                                  </div>
                                  <p className="text-[11px] text-slate-400 leading-snug">{comp.reason}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Evidence group — final_score_breakdown */}
                        {evidenceItems.length > 0 && (
                          <div className={intentItems.length > 0 ? "pt-4 border-t border-slate-100" : ""}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-teal-400" />
                                <span className="text-xs font-bold text-teal-600 uppercase tracking-wide">Evidence</span>
                              </div>
                              <span className="text-xs font-bold text-slate-700 tabular-nums">{evidenceScore ?? "—"} / 30</span>
                            </div>
                            <div className="h-2 bg-teal-100 rounded-full overflow-hidden mb-3">
                              <div className="h-full bg-teal-400 rounded-full transition-all duration-700" style={{ width: `${Math.min(100, ((evidenceScore ?? 0) / 30) * 100)}%` }} />
                            </div>
                            <div className="space-y-3">
                              {evidenceItems.map((comp, i) => (
                                <div key={i}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-semibold text-slate-700">{comp.component}</span>
                                    <div className="flex items-center gap-1.5">
                                      <span className={`text-xs font-bold tabular-nums ${comp.points > 0 ? "text-emerald-600" : "text-slate-400"}`}>+{comp.points}</span>
                                      <span className="text-[10px] text-slate-300 tabular-nums">{comp.formula}</span>
                                    </div>
                                  </div>
                                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
                                    <div className="h-full bg-teal-300 rounded-full" style={{ width: `${Math.min(100, (comp.points / 15) * 100)}%` }} />
                                  </div>
                                  <p className="text-[11px] text-slate-400 leading-snug">{comp.reason}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {(breakdownSummary || policyReason) && (
                          <div className="pt-4 border-t border-slate-100 space-y-1">
                            {breakdownSummary && <p className="text-[11px] text-slate-500">{breakdownSummary}</p>}
                            {policyReason && policyReason !== "No final cap adjustment was needed." && (
                              <p className="text-[11px] text-amber-600 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />{policyReason}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Section 3: ICP Intelligence */}
                {icpFit && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <Target className="w-3.5 h-3.5 text-white" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">ICP Intelligence</h3>
                      <span className="ml-auto text-xs font-bold text-slate-600">{icpFit.score.toFixed(0)}/100</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <ICPTile label="Industry Match" matched={icpFit.matched_industry} value={icpFit.details?.industry?.matched_value} />
                      <ICPTile label="Market Match" matched={icpFit.matched_market} value={icpFit.details?.market?.matched_value} />
                      <ICPTile label="Persona Match" matched={icpFit.matched_persona} value={icpFit.details?.persona?.matched_value} />
                      <ICPTile label="Company Profile" matched={icpFit.company_profile_fit ?? false} value={icpFit.details?.company_profile?.matched_value} />
                    </div>
                    <div className="bg-blue-50 rounded-lg px-3 py-2.5 border border-blue-100">
                      <p className="text-xs text-blue-800 leading-relaxed">{icpFit.reason}</p>
                    </div>
                    {icpFit.notes && icpFit.notes.length > 0 && (
                      <ul className="mt-3 space-y-1.5">
                        {icpFit.notes.map((note, i) => (
                          <li key={i} className="flex items-start gap-2 text-[11px] text-slate-500">
                            <span className="w-1 h-1 rounded-full bg-slate-300 mt-1.5 flex-shrink-0" />
                            {note}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Section 4: Sales Direction */}
                {(lead.sales_strategy || (lead.recommended_offerings && lead.recommended_offerings.length > 0)) && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                        <Target className="w-3.5 h-3.5 text-white" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">Sales Direction</h3>
                    </div>
                    {lead.recommended_offerings && lead.recommended_offerings.length > 0 && (
                      <div className="mb-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Recommended Offerings</p>
                        <div className="flex flex-wrap gap-2">
                          {lead.recommended_offerings.map((o, i) => (
                            <span key={i} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${OFFERING_COLORS[i % OFFERING_COLORS.length]}`}>
                              <Package className="w-3 h-3" />{o}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {lead.sales_strategy && (
                      <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                        <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-2">Strategy</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{lead.sales_strategy}</p>
                      </div>
                    )}
                  </div>
                )}

                {effectiveStatus === "pending" && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 flex items-center gap-5">
                    <div className="w-16 h-16 rounded-full border-[3px] border-slate-200 bg-slate-50 flex items-center justify-center flex-shrink-0 animate-pulse">
                      <Clock className="w-6 h-6 text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-600">AI scoring queued</p>
                      <p className="text-xs text-slate-400 mt-1">Your lead is waiting in the AI scoring queue. Results arrive in seconds.</p>
                      {isStreaming && <p className="text-[10px] text-blue-500 font-medium mt-2 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping inline-block" />Connected — waiting for worker</p>}
                    </div>
                  </div>
                )}
                {effectiveStatus === "scoring" && (
                  <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-8">
                    <div className="flex items-center gap-5 mb-6">
                      <div className="w-16 h-16 rounded-full border-[3px] border-blue-300 bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Brain className="w-6 h-6 text-blue-500 animate-pulse" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-blue-700">Deep AI analysis in progress…</p>
                        <p className="text-xs text-slate-400 mt-1">Running Gemini + Pinecone pipeline on {lead.name}. This takes 10–30 seconds.</p>
                        <p className="text-[10px] text-blue-500 font-medium mt-2 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping inline-block" />Live update when complete</p>
                      </div>
                    </div>
                    <div className="space-y-4 animate-pulse">
                      {["Intent Signals", "Evidence Score", "ICP Alignment", "Sales Strategy"].map((label) => (
                        <div key={label} className="space-y-2">
                          <div className="flex justify-between">
                            <div className="h-3 bg-slate-200 rounded w-32" />
                            <div className="h-3 bg-slate-200 rounded w-12" />
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-200 rounded-full w-3/4" />
                          </div>
                          <div className="h-2.5 bg-slate-100 rounded w-5/6" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {effectiveStatus === "failed" && (
                  <div className="bg-white rounded-xl border border-red-100 shadow-sm p-8 flex items-start gap-5">
                    <div className="w-14 h-14 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center flex-shrink-0">
                      <XCircle className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-red-700">AI scoring failed</p>
                      <p className="text-xs text-slate-400 mt-1">The AI engine encountered an error. You can retry the analysis below.</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-4 h-8 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                        onClick={handleRetry}
                        disabled={retrying}
                      >
                        {retrying
                          ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Retrying…</>
                          : <><RotateCcw className="w-3.5 h-3.5 mr-1.5" />Retry AI analysis</>
                        }
                      </Button>
                    </div>
                  </div>
                )}
                {effectiveStatus === "scored" && !lead.ai_score && !lead.score_comment && !lead.sales_strategy && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-14">
                    <Brain className="w-10 h-10 text-slate-200 mb-3" />
                    <p className="text-sm text-slate-500">No AI analysis available for this lead yet.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ─── INTELLIGENCE TAB ─── */}
            <TabsContent value="intelligence">
              <div className="space-y-4">

                {/* Lead Briefing */}
                {(parsedKnowledge.leadContext || parsedKnowledge.sellerSections.length > 0) && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                        <BookOpen className="w-3.5 h-3.5 text-white" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">Lead Briefing</h3>
                    </div>

                    {parsedKnowledge.leadContext && (
                      <div className="mb-4 bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Lead Context</p>
                        <p className="text-xs text-slate-600">{parsedKnowledge.leadContext}</p>
                      </div>
                    )}

                    {parsedKnowledge.sellerSections.length > 0 && (
                      <div className="space-y-3">
                        {parsedKnowledge.sellerSections.map((section, i) => {
                          const icons = [Activity, Building2, Lightbulb, TrendingUp];
                          const colors = ["text-orange-500", "text-blue-500", "text-violet-500", "text-emerald-500"];
                          const bgColors = ["bg-orange-50 border-orange-100", "bg-blue-50 border-blue-100", "bg-violet-50 border-violet-100", "bg-emerald-50 border-emerald-100"];
                          const Icon = icons[i % icons.length];
                          return (
                            <div key={i} className={`rounded-lg p-3.5 border ${bgColors[i % bgColors.length]}`}>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${colors[i % colors.length]}`} />
                                <p className={`text-[10px] font-bold uppercase tracking-wider ${colors[i % colors.length]}`}>{section.title}</p>
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed">{section.content}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Campaign Context */}
                {parsedKnowledge.campaignContext && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                        <Target className="w-3.5 h-3.5 text-white" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">Why It Matters for Campaigns</h3>
                    </div>
                    <div className="bg-emerald-50 rounded-lg px-4 py-3 border border-emerald-100">
                      <p className="text-sm text-slate-700 leading-relaxed">{parsedKnowledge.campaignContext}</p>
                    </div>
                  </div>
                )}

                {/* Best-Fit Products */}
                {parsedKnowledge.products.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                        <Package className="w-3.5 h-3.5 text-white" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">Best-Fit Products</h3>
                    </div>
                    <div className="space-y-3">
                      {parsedKnowledge.products.map((product, i) => (
                        <div key={i} className="rounded-xl border border-slate-200 overflow-hidden">
                          <div className={`px-4 py-2.5 flex items-center gap-2 ${OFFERING_COLORS[i % OFFERING_COLORS.length].replace("border-", "border-b-").split(" ").filter(c => c.startsWith("bg-") || c.startsWith("text-")).join(" ")}`} style={{ borderBottom: "1px solid", borderColor: "rgba(0,0,0,0.06)" }}>
                            <Package className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="text-sm font-bold">{product.name}</span>
                          </div>
                          <div className="p-4 space-y-2.5">
                            {product.whatItIs && (
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">What It Is</p>
                                <p className="text-xs text-slate-700 leading-relaxed">{product.whatItIs}</p>
                              </div>
                            )}
                            {product.bestFor && (
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Best For</p>
                                <p className="text-xs text-slate-600 leading-relaxed">{product.bestFor}</p>
                              </div>
                            )}
                            {product.expectedValue && (
                              <div className="bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-100">
                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Expected Value</p>
                                <p className="text-xs text-emerald-800 leading-relaxed">{product.expectedValue}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Web Evidence */}
                {lead.evidence_cards && lead.evidence_cards.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                        <Globe className="w-3.5 h-3.5 text-white" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">Web Evidence</h3>
                      <span className="ml-2 text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full font-bold">{lead.evidence_cards.length}</span>
                    </div>
                    <div className="space-y-3">
                      {lead.evidence_cards.map((card, i) => {
                        const sig = getSignalInfo(card.signal_type);
                        const strengthCfg = STRENGTH_CONFIG[card.strength] ?? STRENGTH_CONFIG.medium;
                        const StrIcon = strengthCfg.Icon;
                        return (
                          <div key={i} className="rounded-xl border border-slate-200 p-4">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${sig.cls}`}>{sig.label}</span>
                                <span className={`text-[11px] px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5 ${strengthCfg.bg} ${strengthCfg.color} border ${strengthCfg.border}`}>
                                  <StrIcon className="w-3 h-3" />{card.strength}
                                </span>
                              </div>
                              {card.points != null && (
                                <span className={`text-xs font-bold tabular-nums ${card.points >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                  {card.points >= 0 ? "+" : ""}{card.points} pts
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-800 mb-2">{card.reason}</p>
                            {(card.source_excerpt || card.exact_extract) && (
                              <p className="text-[11px] text-slate-500 italic border-l-2 border-slate-200 pl-2.5 mb-2 line-clamp-3">
                                &ldquo;{card.exact_extract ?? card.source_excerpt}&rdquo;
                              </p>
                            )}
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                              <div className={`h-full ${strengthCfg.bar} rounded-full ${card.strength === "high" ? "w-full" : card.strength === "medium" ? "w-2/3" : "w-1/3"}`} />
                            </div>
                            {card.source_url && (
                              <a href={card.source_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1 font-medium">
                                <ExternalLink className="w-3 h-3" />View source
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {lead.knowledge_sources && lead.knowledge_sources.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Knowledge Sources</p>
                        <div className="space-y-1.5">
                          {lead.knowledge_sources.map((src, i) => (
                            <a key={i} href={src} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-indigo-600 hover:underline">
                              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="truncate">{src}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!lead.knowledge && (!lead.evidence_cards || lead.evidence_cards.length === 0) && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-14">
                    <Lightbulb className="w-10 h-10 text-slate-200 mb-3" />
                    <p className="text-sm text-slate-500">No intelligence data available yet.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ─── ACTIVITY TAB ─── */}
            <TabsContent value="activity">
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-4">
                    <Plus className="w-4 h-4 text-orange-500" />Log Activity
                  </h3>
                  <div className="flex gap-2 mb-3">
                    {(["note", "call", "email", "meeting"] as const).map((t) => {
                      const cfg = COMM_TYPE_CONFIG[t];
                      return (
                        <button
                          key={t}
                          onClick={() => setCommType(t)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${commType === t ? `${cfg.bg} ${cfg.color} border-transparent` : "border-slate-200 text-slate-600 hover:border-slate-300 bg-white"}`}
                        >
                          <cfg.icon className="w-3.5 h-3.5" />{cfg.label}
                        </button>
                      );
                    })}
                  </div>
                  <textarea
                    rows={3}
                    placeholder={`Add ${commType} notes…`}
                    value={commContent}
                    onChange={(e) => setCommContent(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none mb-3"
                  />
                  {commError && <p className="text-xs text-red-600 mb-2">{commError}</p>}
                  <Button
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-700 h-8 text-xs font-semibold"
                    onClick={logCommunication}
                    disabled={addingComm || !commContent.trim()}
                  >
                    {addingComm ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
                    Log {COMM_TYPE_CONFIG[commType].label}
                  </Button>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
                    <Activity className="w-4 h-4 text-indigo-500" />Communication History
                    {comms.length > 0 && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-semibold">{comms.length}</span>
                    )}
                  </h3>
                  {comms.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">No activity logged yet.</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-3.5 top-0 bottom-0 w-px bg-slate-100" />
                      <div className="space-y-4">
                        {comms.map((comm) => {
                          const cfg = COMM_TYPE_CONFIG[comm.type] ?? COMM_TYPE_CONFIG.note;
                          return (
                            <div key={comm.id} className="flex items-start gap-3">
                              <div className={`w-7 h-7 rounded-full ${cfg.bg} border border-slate-100 flex items-center justify-center flex-shrink-0 z-10 relative`}>
                                <cfg.icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                              </div>
                              <div className="flex-1 min-w-0 pt-0.5">
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                                  <span className="text-xs text-slate-400">
                                    {new Date(comm.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                  {comm.created_by && <span className="text-xs text-slate-400">· {comm.created_by}</span>}
                                </div>
                                {comm.content && <p className="text-sm text-slate-700 mt-0.5 leading-relaxed">{comm.content}</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* ── Right Sidebar ── */}
        <div className="space-y-4">

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Quick Actions</h3>
            <div className="space-y-1.5">
              {lead.email && (
                <a href={`mailto:${lead.email}`}>
                  <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors font-medium border border-transparent hover:border-slate-200">
                    <Mail className="w-4 h-4 text-slate-400" />Send Email
                  </button>
                </a>
              )}
              {lead.phone && (
                <a href={`tel:${lead.phone}`}>
                  <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors font-medium border border-transparent hover:border-slate-200">
                    <Phone className="w-4 h-4 text-slate-400" />Call
                  </button>
                </a>
              )}
              <a href="/campaigns">
                <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors font-medium border border-transparent hover:border-slate-200">
                  <Target className="w-4 h-4 text-slate-400" />Add to Campaign
                </button>
              </a>
              <a href="/deals">
                <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors font-medium border border-transparent hover:border-slate-200">
                  <Activity className="w-4 h-4 text-slate-400" />View Deals
                </button>
              </a>
            </div>
          </div>

          {/* Strategy Brief */}
          <StrategyBriefCard brief={brief} scoringStatus={effectiveStatus} />

          {/* Scoring state sidebar panel */}
          {(effectiveStatus === "pending" || effectiveStatus === "scoring" || effectiveStatus === "failed") && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-4">
                <Brain className="w-3.5 h-3.5 text-slate-400" />AI Status
              </h3>
              {effectiveStatus === "pending" && (
                <div className="text-center py-4">
                  <Clock className="w-8 h-8 text-slate-200 mx-auto mb-2 animate-pulse" />
                  <p className="text-xs font-semibold text-slate-500">In queue</p>
                  <p className="text-[10px] text-slate-400 mt-1">Waiting for worker</p>
                </div>
              )}
              {effectiveStatus === "scoring" && (
                <div className="text-center py-4">
                  <Brain className="w-8 h-8 text-blue-300 mx-auto mb-2 animate-pulse" />
                  <p className="text-xs font-semibold text-blue-600">Analyzing…</p>
                  <p className="text-[10px] text-slate-400 mt-1">Running full AI pipeline</p>
                  <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-300 rounded-full animate-pulse w-2/3" />
                  </div>
                </div>
              )}
              {effectiveStatus === "failed" && (
                <div className="text-center py-2">
                  <XCircle className="w-8 h-8 text-red-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-red-600">Scoring failed</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 h-7 text-[10px] border-red-200 text-red-600 hover:bg-red-50"
                    onClick={handleRetry}
                    disabled={retrying}
                  >
                    {retrying ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RotateCcw className="w-3 h-3 mr-1" />}
                    Retry
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Score Intelligence Sidebar */}
          {lead.ai_score !== undefined && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-4">
                <BarChart3 className="w-3.5 h-3.5 text-slate-400" />Score Intelligence
              </h3>

              {/* Dual mini rings */}
              {(intentScore !== null || evidenceScore !== null) ? (
                <div className="flex justify-around mb-5">
                  {intentScore !== null && <MiniScoreRing score={intentScore} max={70} label="Intent" color="border-orange-400" />}
                  {evidenceScore !== null && <MiniScoreRing score={evidenceScore} max={30} label="Evidence" color="border-teal-400" />}
                </div>
              ) : (
                <div className="flex items-center gap-4 mb-4">
                  <div className={`text-3xl font-black ${scoreConfig.color}`}>{lead.ai_score}</div>
                  <div className="flex-1">
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-1">
                      <div className={`h-full rounded-full ${scoreConfig.bar}`} style={{ width: `${lead.ai_score}%` }} />
                    </div>
                    <p className="text-xs text-slate-500 font-medium">{scoreConfig.label}</p>
                  </div>
                </div>
              )}

              {/* All components mini bars */}
              {fsbComps.length > 0 && (
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  {fsbComps.map((comp, i) => {
                    const isIntent = comp.category === "Intent";
                    const barColor = isIntent ? "bg-orange-300" : "bg-teal-300";
                    const maxVal = isIntent ? 20 : 15;
                    const pct = Math.min(100, (comp.points / maxVal) * 100);
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] text-slate-500 truncate max-w-[130px]">{comp.component}</span>
                          <span className={`text-[10px] font-bold tabular-nums ${comp.points > 0 ? "text-slate-700" : "text-slate-300"}`}>
                            +{comp.points}
                          </span>
                        </div>
                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${barColor} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Sales comment signal */}
              {salesCommentSignal && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Sales Comment Signal</p>
                  <div className={`rounded-lg px-3 py-2 border text-xs ${salesCommentSignal.present ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      {salesCommentSignal.present
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        : <Minus className="w-3.5 h-3.5 text-slate-400" />}
                      <span className="font-semibold">{salesCommentSignal.present ? "Comment detected" : "No comment"}</span>
                    </div>
                    <p className="text-[11px] leading-snug">{salesCommentSignal.summary}</p>
                  </div>
                </div>
              )}

              {/* Similar won match */}
              {similarWonMatch && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Similar Won Lead</p>
                  <div className="bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-200">
                    <p className="text-xs font-semibold text-emerald-800">{similarWonMatch.name}</p>
                    <p className="text-[11px] text-emerald-600 mt-0.5">Score: {similarWonMatch.score} · {similarWonMatch.reason}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Activity Timeline */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <Activity className="w-3.5 h-3.5 text-indigo-500" />Timeline
            </h3>
            <div className="relative">
              <div className="absolute left-3.5 top-0 bottom-0 w-px bg-slate-100" />
              <div className="space-y-4">
                {[
                  { icon: CheckCircle2, gradient: "from-emerald-500 to-emerald-600", title: "Lead created", desc: new Date(lead.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), time: "Created" },
                  ...(lead.ai_score !== undefined ? [{ icon: Brain, gradient: "from-violet-500 to-violet-600", title: "AI analysis completed", desc: `Score: ${lead.ai_score}/100 · ${scoreConfig.label}`, time: "Auto" }] : []),
                  ...(lead.recommended_offerings && lead.recommended_offerings.length > 0 ? [{ icon: Sparkles, gradient: "from-orange-500 to-orange-600", title: "Offerings identified", desc: lead.recommended_offerings.slice(0, 2).join(", "), time: "Auto" }] : []),
                  ...(lead.next_action ? [{ icon: Target, gradient: "from-indigo-500 to-indigo-600", title: "Action recommended", desc: lead.next_action.slice(0, 60) + (lead.next_action.length > 60 ? "…" : ""), time: "Auto" }] : []),
                ].map((event, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${event.gradient} flex items-center justify-center flex-shrink-0 z-10 relative shadow-sm`}>
                      <event.icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-sm font-semibold text-slate-800">{event.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{event.desc}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{event.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
