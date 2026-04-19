"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Calendar,
  Target,
  Brain,
  TrendingUp,
  DollarSign,
  Globe,
  ExternalLink,
  Zap,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  FileText,
  Activity,
  BarChart3,
  Sparkles,
  Building,
  Loader2,
  Plus,
  PhoneCall,
  Users,
  StickyNote,
} from "lucide-react";
import API from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { getPipelineStage } from "@/lib/pipeline";

interface EvidenceCard {
  points: number;
  reason: string;
  strength: "low" | "medium" | "high";
  source_url: string;
  signal_type: string;
  source_excerpt: string;
}

interface Communication {
  id: number;
  lead_id: number;
  type: "email" | "call" | "note" | "meeting";
  content?: string;
  timestamp: string;
  created_by?: string;
}

const COMM_TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  email: { icon: Mail, label: "Email", color: "text-indigo-600", bg: "bg-indigo-50" },
  call: { icon: PhoneCall, label: "Call", color: "text-emerald-600", bg: "bg-emerald-50" },
  note: { icon: StickyNote, label: "Note", color: "text-amber-600", bg: "bg-amber-50" },
  meeting: { icon: Users, label: "Meeting", color: "text-violet-600", bg: "bg-violet-50" },
};

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
  ai_reason?: string;
  score_comment?: string;
  sales_strategy?: string;
  recommended_offerings?: string[];
  next_action?: string;
  status: string;
  created_at: string;
  contact_id?: number;
  company_id_assoc?: number;
  lead_type?: string;
}

const STRENGTH_CONFIG = {
  high: { color: "text-emerald-700", bg: "bg-emerald-50", bar: "bg-emerald-500", width: "w-full", border: "border-emerald-200" },
  medium: { color: "text-amber-700", bg: "bg-amber-50", bar: "bg-amber-400", width: "w-2/3", border: "border-amber-200" },
  low: { color: "text-red-700", bg: "bg-red-50", bar: "bg-red-400", width: "w-1/3", border: "border-red-200" },
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
  if (!score) return { color: "text-slate-500", bg: "bg-slate-100", ring: "ring-slate-200", label: "Unscored", bar: "bg-slate-400" };
  if (score >= 80) return { color: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-300", label: "Hot Lead", bar: "bg-emerald-500" };
  if (score >= 60) return { color: "text-amber-700", bg: "bg-amber-50", ring: "ring-amber-300", label: "Warm Lead", bar: "bg-amber-400" };
  return { color: "text-red-600", bg: "bg-red-50", ring: "ring-red-300", label: "Cold Lead", bar: "bg-red-400" };
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

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

  const logCommunication = async () => {
    if (!leadId || !commContent.trim()) return;
    setAddingComm(true);
    setCommError("");
    try {
      const res = await API.post(`/contacts/${leadId}/communications`, {
        type: commType,
        content: commContent.trim(),
      });
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-40 bg-slate-200 rounded-xl animate-pulse" />
            <div className="h-64 bg-slate-200 rounded-xl animate-pulse" />
          </div>
          <div className="space-y-4">
            <div className="h-52 bg-slate-200 rounded-xl animate-pulse" />
            <div className="h-52 bg-slate-200 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!lead) {
    const loadError = error || (!leadId ? "Invalid lead ID." : "");
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-700 mb-1">{loadError ? "Unable to Load Lead" : "Lead not found"}</h3>
          <p className="text-slate-400 text-xs mb-5">{loadError || "The lead you're looking for doesn't exist."}</p>
          <Link href="/leads">
            <Button className="bg-orange-600 hover:bg-orange-700 h-8 text-xs font-semibold">
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />Back to Leads
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const scoreConfig = getScoreConfig(lead.ai_score);
  const statusConfig = getPipelineStage(lead.status);
  const grad = avatarGradient(lead.name);

  return (
    <div className="p-6 max-w-7xl">
      {/* Back nav */}
      <Link href="/leads">
        <button className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 font-medium mb-5 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Leads
        </button>
      </Link>

      {/* Lead header */}
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
                {lead.ai_score !== undefined && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${scoreConfig.bg} ${scoreConfig.color}`}>
                    <Brain className="w-3 h-3" />
                    {scoreConfig.label} · {lead.ai_score}/100
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                {lead.company_id_assoc ? (
                  <Link href={`/companies/${lead.company_id_assoc}`} className="hover:text-orange-600 transition-colors">{lead.company}</Link>
                ) : lead.contact_id ? (
                  <Link href={`/contacts/${lead.contact_id}`} className="hover:text-orange-600 transition-colors">{lead.company}</Link>
                ) : lead.company}
                {lead.industry && (
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 ml-1">
                    {lead.industry}
                  </span>
                )}
              </p>
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
            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 h-8 text-xs font-semibold">
              <Zap className="w-3.5 h-3.5 mr-1.5" />Convert to Deal
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column: tabbed content */}
        <div className="lg:col-span-2 space-y-5">
          <Tabs defaultValue="overview">
            <TabsList className="mb-4 bg-slate-100 p-1">
              <TabsTrigger value="overview" className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">Overview</TabsTrigger>
              <TabsTrigger value="ai" className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">AI Analysis</TabsTrigger>
              <TabsTrigger value="evidence" className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">Evidence</TabsTrigger>
              <TabsTrigger value="activity" className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">Activity</TabsTrigger>
            </TabsList>

            {/* OVERVIEW TAB */}
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

                {(lead.comments || lead.knowledge) && (
                  <>
                    <Separator className="my-4 bg-slate-100" />
                    {lead.comments && (
                      <div className="mb-3">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Notes</p>
                        <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-100">{lead.comments}</p>
                      </div>
                    )}
                    {lead.knowledge && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Background Knowledge</p>
                        <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-100">{lead.knowledge}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </TabsContent>

            {/* AI ANALYSIS TAB */}
            <TabsContent value="ai">
              <div className="space-y-4">
                {/* Score ring */}
                {lead.ai_score !== undefined && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center gap-5">
                      <div className={`w-20 h-20 rounded-full ring-4 ${scoreConfig.ring} ${scoreConfig.bg} flex flex-col items-center justify-center flex-shrink-0`}>
                        <span className={`text-2xl font-bold ${scoreConfig.color}`}>{lead.ai_score}</span>
                        <span className="text-xs text-slate-400">/ 100</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-slate-900 text-sm">AI Lead Score</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${scoreConfig.bg} ${scoreConfig.color}`}>{scoreConfig.label}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                          <div className={`h-full rounded-full ${scoreConfig.bar} transition-all`} style={{ width: `${lead.ai_score}%` }} />
                        </div>
                        {lead.score_comment && <p className="text-sm text-slate-600">{lead.score_comment}</p>}
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Reasoning */}
                {lead.ai_reason && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <h3 className="text-sm font-bold text-violet-700 flex items-center gap-1.5 mb-3">
                      <Brain className="w-4 h-4" /> AI Analysis
                    </h3>
                    <div className="bg-violet-50 rounded-lg p-4 border border-violet-100">
                      <p className="text-sm text-violet-900 leading-relaxed">{lead.ai_reason}</p>
                    </div>
                  </div>
                )}

                {/* Sales Strategy */}
                {lead.sales_strategy && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <h3 className="text-sm font-bold text-indigo-700 flex items-center gap-1.5 mb-3">
                      <TrendingUp className="w-4 h-4" /> Sales Strategy
                    </h3>
                    <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                      <p className="text-sm text-indigo-900 leading-relaxed">{lead.sales_strategy}</p>
                    </div>
                  </div>
                )}

                {/* Recommended Offerings */}
                {lead.recommended_offerings && lead.recommended_offerings.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <h3 className="text-sm font-bold text-orange-700 flex items-center gap-1.5 mb-3">
                      <Sparkles className="w-4 h-4" /> Recommended Offerings
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {lead.recommended_offerings.map((offering, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 text-orange-800 text-xs rounded-full font-semibold">
                          <Zap className="w-3 h-3 text-orange-500" />
                          {offering}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Next Action */}
                {lead.next_action && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <h3 className="text-sm font-bold text-emerald-700 flex items-center gap-1.5 mb-3">
                      <CheckCircle2 className="w-4 h-4" /> Recommended Next Action
                    </h3>
                    <div className="flex items-start gap-3 bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                      <Target className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-emerald-900 font-medium">{lead.next_action}</p>
                    </div>
                  </div>
                )}

                {!lead.ai_score && !lead.ai_reason && !lead.sales_strategy && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-14">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-3">
                      <Brain className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-500">No AI analysis available for this lead yet.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ACTIVITY TAB */}
            <TabsContent value="activity">
              <div className="space-y-4">
                {/* Log new activity */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-4">
                    <Plus className="w-4 h-4 text-orange-500" /> Log Activity
                  </h3>
                  <div className="flex gap-2 mb-3">
                    {(["note", "call", "email", "meeting"] as const).map((t) => {
                      const cfg = COMM_TYPE_CONFIG[t];
                      return (
                        <button
                          key={t}
                          onClick={() => setCommType(t)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                            commType === t
                              ? `${cfg.bg} ${cfg.color} border-transparent`
                              : "border-slate-200 text-slate-600 hover:border-slate-300 bg-white"
                          }`}
                        >
                          <cfg.icon className="w-3.5 h-3.5" />
                          {cfg.label}
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

                {/* Communication history */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
                    <Activity className="w-4 h-4 text-indigo-500" />
                    Communication History
                    {comms.length > 0 && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-semibold">{comms.length}</span>
                    )}
                  </h3>
                  {comms.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">No activity logged yet.</p>
                      <p className="text-xs text-slate-400 mt-1">Log a call, email, or note above.</p>
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

            {/* EVIDENCE TAB */}
            <TabsContent value="evidence">
              {!lead.evidence_cards || lead.evidence_cards.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-14">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-3">
                    <FileText className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500">No evidence cards available.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lead.used_web_evidence && (
                    <div className="flex items-center gap-2 text-xs text-teal-700 bg-teal-50 px-3 py-2 rounded-lg border border-teal-100 font-medium">
                      <Globe className="w-3.5 h-3.5" />
                      Web evidence was used in scoring this lead
                    </div>
                  )}
                  {lead.evidence_cards.map((card, i) => {
                    const cfg = STRENGTH_CONFIG[card.strength] ?? STRENGTH_CONFIG.medium;
                    return (
                      <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                              {card.strength.toUpperCase()}
                            </span>
                            <span className="text-xs text-slate-500">{card.signal_type}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
                            <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                            +{card.points} pts
                          </div>
                        </div>
                        <p className="text-sm text-slate-900 mb-2">{card.reason}</p>
                        {card.source_excerpt && (
                          <p className="text-xs text-slate-500 italic bg-slate-50 rounded-lg p-2.5 mb-2 line-clamp-2 border border-slate-100">&ldquo;{card.source_excerpt}&rdquo;</p>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex-1 mr-4">
                            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div className={`h-full ${cfg.bar} ${cfg.width}`} />
                            </div>
                          </div>
                          {card.source_url && (
                            <a href={card.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-medium">
                              Source <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {lead.knowledge_sources && lead.knowledge_sources.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                      <h3 className="text-sm font-bold text-slate-700 mb-3">Knowledge Sources</h3>
                      <div className="space-y-1.5">
                        {lead.knowledge_sources.map((src, i) => (
                          <a key={i} href={src} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-indigo-600 hover:underline">
                            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{src}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Quick actions */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Quick Actions</h3>
            <div className="space-y-1.5">
              {lead.email && (
                <a href={`mailto:${lead.email}`}>
                  <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors font-medium border border-transparent hover:border-slate-200">
                    <Mail className="w-4 h-4 text-slate-400" />
                    Send Email
                  </button>
                </a>
              )}
              {lead.phone && (
                <a href={`tel:${lead.phone}`}>
                  <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors font-medium border border-transparent hover:border-slate-200">
                    <Phone className="w-4 h-4 text-slate-400" />
                    Call
                  </button>
                </a>
              )}
              <a href="/campaigns">
                <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors font-medium border border-transparent hover:border-slate-200">
                  <Target className="w-4 h-4 text-slate-400" />
                  Add to Campaign
                </button>
              </a>
              <a href="/deals">
                <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors font-medium border border-transparent hover:border-slate-200">
                  <Activity className="w-4 h-4 text-slate-400" />
                  View Deals
                </button>
              </a>
            </div>
            {!lead.email && !lead.phone && (
              <p className="text-xs text-slate-400 mt-3 text-center leading-relaxed">
                No contact details available for this company lead.
              </p>
            )}
          </div>

          {/* Activity Timeline */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <Activity className="w-3.5 h-3.5 text-indigo-500" />
              Activity Timeline
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

          {/* Score breakdown */}
          {lead.ai_score !== undefined && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-4">
                <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                Score Breakdown
              </h3>
              <div className="flex items-center gap-4 mb-3">
                <div className={`text-3xl font-black ${scoreConfig.color}`}>{lead.ai_score}</div>
                <div className="flex-1">
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-1">
                    <div className={`h-full rounded-full ${scoreConfig.bar}`} style={{ width: `${lead.ai_score}%` }} />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">{scoreConfig.label}</p>
                </div>
              </div>
              {lead.evidence_cards && lead.evidence_cards.length > 0 && (
                <div className="space-y-1.5 mt-3 pt-3 border-t border-slate-100">
                  {lead.evidence_cards.slice(0, 3).map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 truncate flex-1">{c.signal_type}</span>
                      <span className="text-slate-800 font-bold ml-2">+{c.points}</span>
                    </div>
                  ))}
                  {lead.evidence_cards.length > 3 && (
                    <p className="text-xs text-slate-400 text-center pt-1">+{lead.evidence_cards.length - 3} more signals</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
