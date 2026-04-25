"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Mail, Phone, Building2, Calendar, Globe, MapPin,
  Briefcase, Star, User, Tag, AlertCircle, Loader2, ExternalLink,
  Activity, TrendingUp, Clock, DollarSign, ChevronDown, ChevronUp,
  Zap, CheckCircle2, XCircle, AlertTriangle, ArrowUpRight, Brain,
  RefreshCw, RotateCcw,
} from "lucide-react";
import API from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { getPipelineStage } from "@/lib/pipeline";
import { useScoreStream } from "@/hooks/useScoreStream";
import { ScoreStatusBadge } from "@/components/ui/ScoreStatusBadge";
import { AISummaryCard } from "@/components/shared/AISummaryCard";

interface ScoreComponent {
  component: string;
  raw_score: number;
  weight: number;
  weighted_points: number;
  reason: string;
}

interface PreAIBreakdown {
  score_breakdown?: {
    components: ScoreComponent[];
    final_score: number;
    summary: string;
  };
  icp_fit?: {
    score: number;
    reason: string;
    matched_industry: boolean;
    matched_market: boolean;
    matched_persona: boolean;
    notes: string[];
  };
  source_quality?: { score: number; reason: string };
  vertex_score?: { score: number; reason: string };
  offering_alignment?: { alignment_score: number; reason: string };
}

interface Contact {
  id: number;
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  title?: string;
  company_id?: number;
  industry?: string;
  city?: string;
  country?: string;
  lifecycle_stage?: string;
  lead_status?: string;
  source?: string;
  owner?: string;
  notes?: string;
  created_at: string;
  pre_ai_score?: number | null;
  pre_ai_reason?: string | null;
  pre_ai_suggested_offerings?: string[] | null;
  pre_ai_breakdown?: PreAIBreakdown | null;
  pre_ai_scored_at?: string | null;
  scoring_status?: string;
  scoring_version?: number;
}

interface Company {
  id: number;
  name: string;
  industry?: string;
  website?: string;
  domain?: string;
  location?: string;
  linkedin_url?: string;
}

interface Lead {
  id: number;
  name: string;
  company: string;
  deal_size?: number;
  ai_score?: number;
  status: string;
  created_at: string;
}

interface Deal {
  id: number;
  name: string;
  amount?: number;
  stage_name?: string;
  probability?: number;
  owner?: string;
  created_at: string;
}

const LIFECYCLE_COLORS: Record<string, string> = {
  subscriber: "bg-sky-100 text-sky-700",
  lead: "bg-blue-100 text-blue-700",
  marketing_qualified_lead: "bg-purple-100 text-purple-700",
  sales_qualified_lead: "bg-violet-100 text-violet-700",
  opportunity: "bg-amber-100 text-amber-700",
  customer: "bg-emerald-100 text-emerald-700",
  evangelist: "bg-teal-100 text-teal-700",
  other: "bg-slate-100 text-slate-600",
};

const LIFECYCLE_LABELS: Record<string, string> = {
  subscriber: "Subscriber",
  lead: "Lead",
  marketing_qualified_lead: "Marketing Qualified Lead",
  sales_qualified_lead: "Sales Qualified Lead",
  opportunity: "Opportunity",
  customer: "Customer",
  evangelist: "Evangelist",
  other: "Other",
};

const AVATAR_GRADIENTS = [
  "from-indigo-500 to-indigo-600",
  "from-violet-500 to-violet-600",
  "from-emerald-500 to-emerald-600",
  "from-orange-500 to-orange-600",
  "from-pink-500 to-pink-600",
  "from-teal-500 to-teal-600",
  "from-blue-500 to-blue-600",
];

const OFFERING_COLORS = [
  "bg-indigo-50 text-indigo-700 border border-indigo-200",
  "bg-violet-50 text-violet-700 border border-violet-200",
  "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "bg-orange-50 text-orange-700 border border-orange-200",
  "bg-teal-50 text-teal-700 border border-teal-200",
];

function avatarGradient(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length];
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatDeal(v?: number) {
  if (!v) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

function formatAmount(v?: number) {
  if (!v) return null;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
}

function getReadiness(contact: Contact): { label: string; color: string; bg: string; icon: React.ElementType } {
  const status = contact.scoring_status;
  if (status === "pending") return { label: "Queued", color: "text-slate-500", bg: "bg-slate-100", icon: Clock };
  if (status === "scoring") return { label: "Scoring…", color: "text-blue-600", bg: "bg-blue-50", icon: Brain };
  if (status === "failed") return { label: "Score Failed", color: "text-red-600", bg: "bg-red-100", icon: XCircle };
  const score = contact.pre_ai_score;
  if (score == null) return { label: "Not Scored", color: "text-slate-500", bg: "bg-slate-100", icon: AlertCircle };
  if (!contact.company_id) return { label: "Missing Company", color: "text-slate-600", bg: "bg-slate-100", icon: AlertTriangle };
  if (!contact.title && score >= 55) return { label: "Missing Persona", color: "text-amber-700", bg: "bg-amber-100", icon: AlertTriangle };
  if (score >= 75) return { label: "Lead Ready", color: "text-emerald-700", bg: "bg-emerald-100", icon: CheckCircle2 };
  if (score >= 60) return { label: "Strong ICP Fit", color: "text-teal-700", bg: "bg-teal-100", icon: CheckCircle2 };
  if (score >= 45) return { label: "Needs Review", color: "text-amber-700", bg: "bg-amber-100", icon: AlertTriangle };
  return { label: "Low Confidence", color: "text-red-600", bg: "bg-red-100", icon: XCircle };
}

function ScoreRing({ score }: { score: number }) {
  const isHigh = score >= 75;
  const isMid = score >= 50;
  const ringColor = isHigh ? "border-emerald-400" : isMid ? "border-amber-400" : "border-red-400";
  const bgColor = isHigh ? "bg-emerald-50" : isMid ? "bg-amber-50" : "bg-red-50";
  const textColor = isHigh ? "text-emerald-700" : isMid ? "text-amber-700" : "text-red-600";
  const subColor = isHigh ? "text-emerald-500" : isMid ? "text-amber-500" : "text-red-400";
  const label = isHigh ? "Strong" : isMid ? "Moderate" : "Low";

  return (
    <div className="flex items-center gap-4">
      <div className={`w-20 h-20 rounded-full border-[4px] ${ringColor} ${bgColor} flex flex-col items-center justify-center shadow-md flex-shrink-0`}>
        <span className={`text-2xl font-bold leading-none ${textColor}`}>{Math.round(score)}</span>
        <span className={`text-[10px] font-semibold uppercase tracking-wide mt-0.5 ${subColor}`}>/ 100</span>
      </div>
      <div>
        <p className={`text-lg font-bold ${textColor}`}>{label}</p>
        <p className="text-xs text-slate-400 mt-0.5">Preliminary AI Score</p>
        <p className="text-[10px] text-slate-300 mt-1">AI qualification index</p>
      </div>
    </div>
  );
}

function ComponentBar({ component, raw_score, weight, weighted_points, reason }: ScoreComponent) {
  const pct = Math.min(100, Math.max(0, raw_score));
  const barColor = raw_score >= 75 ? "bg-emerald-400" : raw_score >= 50 ? "bg-amber-400" : "bg-red-400";
  const label = component.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700">{label}</span>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-slate-500">{raw_score.toFixed(0)}/100</span>
          <span className="text-slate-300">×</span>
          <span className="text-slate-400">wt {weight}</span>
          <span className="text-slate-300">=</span>
          <span className="font-bold text-slate-700">{weighted_points.toFixed(1)} pts</span>
        </div>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">{reason}</p>
    </div>
  );
}

export default function ContactDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [contact, setContact] = useState<Contact | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const loadContact = useCallback(async () => {
    if (!id) return;
    try {
      const c: Contact = (await API.get(`/contacts/${id}`)).data;
      setContact(c);
      if (c.company_id) {
        try {
          const coRes = await API.get(`/companies/${c.company_id}`);
          setCompany(coRes.data);
        } catch { /* no company */ }
      }
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load contact."));
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      API.get(`/contacts/${id}`),
      API.get("/leads", { params: { contact_id: id, per_page: 50 } }),
      API.get("/deals", { params: { contact_id: id, per_page: 50 } }),
    ])
      .then(async ([contactRes, leadsRes, dealsRes]) => {
        const c: Contact = contactRes.data;
        setContact(c);
        const leadsData = leadsRes.data?.data ?? leadsRes.data ?? [];
        setLeads(Array.isArray(leadsData) ? leadsData : []);
        const dealsData = dealsRes.data?.data ?? dealsRes.data ?? [];
        setDeals(Array.isArray(dealsData) ? dealsData : []);
        if (c.company_id) {
          try {
            const coRes = await API.get(`/companies/${c.company_id}`);
            setCompany(coRes.data);
          } catch { /* no company */ }
        }
      })
      .catch((err) => setError(getErrorMessage(err, "Unable to load contact.")))
      .finally(() => setLoading(false));
  }, [id]);

  const { liveStatus, isStreaming } = useScoreStream({
    entityType: "contact",
    entityId: contact?.id ?? null,
    initialStatus: contact?.scoring_status ?? "scored",
    onComplete: loadContact,
  });

  const effectiveStatus = liveStatus ?? contact?.scoring_status ?? "scored";

  async function handleRetry() {
    if (!id || retrying) return;
    setRetrying(true);
    try {
      await API.post(`/ai-jobs/contacts/${id}/retry`);
      await loadContact();
    } catch { /* ignore */ } finally {
      setRetrying(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center py-16">
          <AlertCircle className="w-8 h-8 text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-700">{error || "Contact not found"}</p>
          <Link href="/contacts" className="mt-4">
            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 h-8 text-xs">
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />Back to Contacts
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const fullName = `${contact.first_name} ${contact.last_name ?? ""}`.trim();
  const grad = avatarGradient(fullName);
  const lcColor = LIFECYCLE_COLORS[contact.lifecycle_stage ?? "other"] ?? "bg-slate-100 text-slate-600";
  const lcLabel = LIFECYCLE_LABELS[contact.lifecycle_stage ?? "other"] ?? contact.lifecycle_stage ?? "—";
  const readiness = getReadiness(contact);
  const ReadinessIcon = readiness.icon;
  const breakdown = contact.pre_ai_breakdown;
  const components = breakdown?.score_breakdown?.components ?? [];
  const icpFit = breakdown?.icp_fit;

  return (
    <div className="p-6 max-w-7xl space-y-5">
      <Link href="/contacts">
        <button className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors mb-1">
          <ArrowLeft className="w-4 h-4" />Back to Contacts
        </button>
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className={`h-1.5 bg-gradient-to-r ${grad}`} />
        <div className="p-5 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-xl font-bold text-white shadow-sm flex-shrink-0`}>
              {(contact.first_name[0] ?? "") + (contact.last_name?.[0] ?? "")}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap mb-1">
                <h1 className="text-xl font-bold text-slate-900">{fullName}</h1>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${lcColor}`}>{lcLabel}</span>
                <ScoreStatusBadge status={effectiveStatus} size="md" />
                {effectiveStatus === "scored" && contact.pre_ai_score != null && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${readiness.bg} ${readiness.color}`}>
                    <ReadinessIcon className="w-3 h-3" />
                    {readiness.label}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500">
                {contact.title && <span className="font-medium text-slate-700">{contact.title}</span>}
                {contact.title && company && <span className="mx-1.5 text-slate-300">·</span>}
                {company && (
                  <Link href={`/companies/${company.id}`} className="hover:text-orange-600 transition-colors font-medium">
                    {company.name}
                  </Link>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {contact.email && (
              <a href={`mailto:${contact.email}`}>
                <Button variant="outline" size="sm" className="h-8 text-xs border-slate-200 hover:border-indigo-300 hover:text-indigo-600">
                  <Mail className="w-3.5 h-3.5 mr-1.5" />Email
                </Button>
              </a>
            )}
            {contact.phone && (
              <a href={`tel:${contact.phone}`}>
                <Button variant="outline" size="sm" className="h-8 text-xs border-slate-200 hover:border-emerald-300 hover:text-emerald-600">
                  <Phone className="w-3.5 h-3.5 mr-1.5" />Call
                </Button>
              </a>
            )}
            <Link href={`/leads?contact_id=${contact.id}`}>
              <Button size="sm" className="h-8 text-xs bg-orange-600 hover:bg-orange-700 font-semibold">
                <Zap className="w-3.5 h-3.5 mr-1.5" />Convert to Lead
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT: Identity */}
        <div className="space-y-4">
          {/* About */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">About</h2>
            <div className="space-y-3">
              {[
                { icon: Mail, label: "Email", value: contact.email, href: `mailto:${contact.email}` },
                { icon: Phone, label: "Phone", value: contact.phone, href: `tel:${contact.phone}` },
                { icon: Briefcase, label: "Job Title", value: contact.title },
                { icon: Globe, label: "Source", value: contact.source },
                { icon: Tag, label: "Industry", value: contact.industry },
                { icon: MapPin, label: "Location", value: [contact.city, contact.country].filter(Boolean).join(", ") || null },
                { icon: User, label: "Owner", value: contact.owner },
                { icon: Calendar, label: "Created", value: formatDate(contact.created_at) },
                { icon: Brain, label: "AI Scored", value: contact.pre_ai_scored_at ? formatDate(contact.pre_ai_scored_at) : null },
              ].filter((f) => f.value).map((field) => (
                <div key={field.label} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <field.icon className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{field.label}</p>
                    {field.href ? (
                      <a href={field.href} className="text-sm font-medium text-indigo-600 hover:underline break-all">{field.value}</a>
                    ) : (
                      <p className="text-sm font-medium text-slate-900 mt-0.5">{field.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {contact.notes && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Notes</p>
                <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-100 leading-relaxed">{contact.notes}</p>
              </div>
            )}
          </div>

          {/* Company card */}
          {company && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Company</h2>
              <Link href={`/companies/${company.id}`} className="group flex items-center gap-3 hover:bg-slate-50 rounded-lg p-2 -mx-2 transition-colors">
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${avatarGradient(company.name)} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
                  {company.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 group-hover:text-orange-600 transition-colors">{company.name}</p>
                  {company.industry && <p className="text-xs text-slate-400">{company.industry}</p>}
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-orange-500 flex-shrink-0" />
              </Link>
              {(company.website || company.domain) && (
                <a
                  href={company.website ?? `https://${company.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-1.5 text-xs text-indigo-600 hover:underline px-2"
                >
                  <Globe className="w-3 h-3" />
                  {company.website ?? company.domain}
                </a>
              )}
            </div>
          )}
          {/* AI Snapshot */}
          <AISummaryCard contactId={contact.id} scoringStatus={effectiveStatus} />
        </div>

        {/* RIGHT: AI Intelligence + Records */}
        <div className="lg:col-span-2 space-y-4">

          {/* AI Intelligence Panel */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Panel header band */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <Zap className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">AI Intelligence</span>
            </div>

            <div className="p-5">
              {effectiveStatus === "pending" ? (
                <div className="flex items-center gap-4 py-6">
                  <div className="w-14 h-14 rounded-full border-[3px] border-slate-200 bg-slate-50 flex items-center justify-center flex-shrink-0 animate-pulse">
                    <Clock className="w-5 h-5 text-slate-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-600">AI scoring queued</p>
                    <p className="text-xs text-slate-400 mt-0.5">Your contact is in the queue — results arrive in seconds.</p>
                    {isStreaming && <p className="text-[10px] text-blue-500 font-medium mt-1.5 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping inline-block" />Waiting for worker…</p>}
                  </div>
                </div>
              ) : effectiveStatus === "scoring" ? (
                <div>
                  <div className="flex items-center gap-4 py-2 mb-5">
                    <div className="w-14 h-14 rounded-full border-[3px] border-blue-300 bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Brain className="w-5 h-5 text-blue-500 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-700">Analyzing contact…</p>
                      <p className="text-xs text-slate-400 mt-0.5">AI is evaluating ICP fit, persona signals, and intent.</p>
                      <p className="text-[10px] text-blue-500 font-medium mt-1.5 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping inline-block" />Live — updating when ready</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {[80, 60, 45].map((w, i) => (
                      <div key={i} className="space-y-1.5 animate-pulse">
                        <div className="flex justify-between">
                          <div className={`h-2.5 bg-slate-200 rounded w-${["32", "24", "36"][i]}`} />
                          <div className="h-2.5 bg-slate-200 rounded w-12" />
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full">
                          <div className="h-full bg-blue-200 rounded-full animate-pulse" style={{ width: `${w}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : effectiveStatus === "failed" ? (
                <div className="flex items-start gap-4 py-4">
                  <div className="w-12 h-12 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center flex-shrink-0">
                    <XCircle className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-red-700">Scoring failed</p>
                    <p className="text-xs text-slate-400 mt-0.5">The AI engine encountered an error. You can retry below.</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 h-8 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                      onClick={handleRetry}
                      disabled={retrying}
                    >
                      {retrying
                        ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Retrying…</>
                        : <><RotateCcw className="w-3.5 h-3.5 mr-1.5" />Retry scoring</>
                      }
                    </Button>
                  </div>
                </div>
              ) : contact.pre_ai_score == null ? (
                <div className="flex items-center gap-3 py-4">
                  <AlertCircle className="w-8 h-8 text-slate-200" />
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Not yet scored</p>
                    <p className="text-xs text-slate-400">This contact hasn't been evaluated by the AI scoring engine.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Score + readiness row */}
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <ScoreRing score={contact.pre_ai_score} />
                    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl ${readiness.bg}`}>
                      <ReadinessIcon className={`w-4 h-4 ${readiness.color}`} />
                      <div>
                        <p className={`text-xs font-bold ${readiness.color}`}>{readiness.label}</p>
                        <p className="text-[10px] text-slate-400">Readiness status</p>
                      </div>
                    </div>
                  </div>

                  {/* AI Reason */}
                  {contact.pre_ai_reason && (
                    <div className="bg-slate-50 rounded-lg px-4 py-3 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">AI Assessment</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{contact.pre_ai_reason}</p>
                    </div>
                  )}

                  {/* Recommended Offerings */}
                  {contact.pre_ai_suggested_offerings && contact.pre_ai_suggested_offerings.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                        Recommended Offerings
                      </p>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {contact.pre_ai_suggested_offerings.map((o, i) => (
                          <span
                            key={i}
                            className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${OFFERING_COLORS[i % OFFERING_COLORS.length]}`}
                          >
                            {o}
                          </span>
                        ))}
                      </div>
                      {breakdown?.offering_alignment?.reason && (
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {breakdown.offering_alignment.reason}
                        </p>
                      )}
                    </div>
                  )}

                  {/* ICP signals */}
                  {icpFit && (
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "Industry Match", ok: icpFit.matched_industry },
                        { label: "Market Match", ok: icpFit.matched_market },
                        { label: "Persona Match", ok: icpFit.matched_persona },
                        { label: "Company Profile", ok: false },
                      ].map(({ label, ok }) => (
                        <div key={label} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${ok ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                          {ok ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />}
                          {label}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Breakdown toggle */}
                  {components.length > 0 && (
                    <div>
                      <button
                        onClick={() => setBreakdownOpen((o) => !o)}
                        className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors group"
                      >
                        {breakdownOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        {breakdownOpen ? "Hide" : "View"} score breakdown
                      </button>

                      {breakdownOpen && (
                        <div className="mt-4 space-y-4 pt-4 border-t border-slate-100">
                          {components.map((comp) => (
                            <ComponentBar key={comp.component} {...comp} />
                          ))}
                          {breakdown?.score_breakdown?.summary && (
                            <div className="bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Formula</p>
                              <p className="text-xs text-slate-500">{breakdown.score_breakdown.summary}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Conversion actions footer */}
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/60">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Actions</p>
              <div className="flex flex-wrap gap-2">
                <Link href={`/leads?contact_id=${contact.id}`}>
                  <Button size="sm" className="h-8 text-xs bg-orange-600 hover:bg-orange-700 font-semibold">
                    <Zap className="w-3.5 h-3.5 mr-1.5" />Convert to Lead
                  </Button>
                </Link>
                {effectiveStatus === "scored" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs border-slate-200 hover:border-violet-300 hover:text-violet-600"
                    onClick={handleRetry}
                    disabled={retrying}
                  >
                    {retrying
                      ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    }
                    Re-score
                  </Button>
                )}
                {contact.email && (
                  <a href={`mailto:${contact.email}`}>
                    <Button size="sm" variant="outline" className="h-8 text-xs border-slate-200 hover:border-indigo-300 hover:text-indigo-600">
                      <Mail className="w-3.5 h-3.5 mr-1.5" />Send Email
                    </Button>
                  </a>
                )}
                <Link href={`/leads?contact_id=${contact.id}`}>
                  <Button size="sm" variant="outline" className="h-8 text-xs border-slate-200">
                    <Activity className="w-3.5 h-3.5 mr-1.5" />View Leads
                    {leads.length > 0 && (
                      <span className="ml-1.5 bg-orange-100 text-orange-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{leads.length}</span>
                    )}
                  </Button>
                </Link>
                <Link href={`/deals?contact_id=${contact.id}`}>
                  <Button size="sm" variant="outline" className="h-8 text-xs border-slate-200">
                    <DollarSign className="w-3.5 h-3.5 mr-1.5" />View Deals
                    {deals.length > 0 && (
                      <span className="ml-1.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{deals.length}</span>
                    )}
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Associated Leads */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-orange-500" />
                Associated Leads
                {leads.length > 0 && (
                  <span className="ml-1 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-bold">{leads.length}</span>
                )}
              </h2>
              <Link href="/leads">
                <Button size="sm" variant="outline" className="h-7 text-xs border-slate-200">
                  + New Lead
                </Button>
              </Link>
            </div>

            {leads.length === 0 ? (
              <div className="text-center py-10">
                <TrendingUp className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No leads associated with this contact yet.</p>
                <Link href={`/leads?contact_id=${contact.id}`}>
                  <button className="mt-3 text-xs font-semibold text-orange-600 hover:text-orange-700">
                    Convert this contact to a lead →
                  </button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {leads.map((lead) => {
                  const stage = getPipelineStage(lead.status);
                  return (
                    <Link key={lead.id} href={`/leads/${lead.id}`}>
                      <div className="flex items-center gap-4 p-3 rounded-lg border border-slate-100 hover:border-orange-200 hover:bg-orange-50/30 transition-colors cursor-pointer">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{lead.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${stage.badge}`}>{stage.label}</span>
                            <span className="text-xs text-slate-400 flex items-center gap-0.5">
                              <Clock className="w-3 h-3" />{formatDate(lead.created_at)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {lead.deal_size != null && (
                            <span className="text-sm font-bold text-slate-700">{formatDeal(lead.deal_size)}</span>
                          )}
                          {lead.ai_score != null && (
                            <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${lead.ai_score >= 80 ? "bg-emerald-100 text-emerald-700" : lead.ai_score >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}>
                              <Star className="w-3 h-3" />{lead.ai_score.toFixed(0)}
                            </span>
                          )}
                          <ArrowUpRight className="w-3.5 h-3.5 text-slate-300" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Associated Deals */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                Associated Deals
                {deals.length > 0 && (
                  <span className="ml-1 text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">{deals.length}</span>
                )}
              </h2>
              <Link href="/deals">
                <Button size="sm" variant="outline" className="h-7 text-xs border-slate-200">
                  + New Deal
                </Button>
              </Link>
            </div>
            {deals.length === 0 ? (
              <div className="text-center py-8">
                <Briefcase className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No deals associated with this contact yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {deals.map((deal) => (
                  <Link key={deal.id} href={`/deals/${deal.id}`}>
                    <div className="flex items-center gap-4 p-3 rounded-lg border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{deal.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {deal.stage_name && (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">{deal.stage_name}</span>
                          )}
                          <span className="text-xs text-slate-400 flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />{formatDate(deal.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {deal.amount != null && (
                          <span className="text-sm font-bold text-emerald-700">{formatAmount(deal.amount)}</span>
                        )}
                        {deal.probability != null && (
                          <span className="text-xs font-semibold text-slate-500">{deal.probability}%</span>
                        )}
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-300" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
