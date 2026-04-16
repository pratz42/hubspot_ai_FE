"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Star,
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
}

const STRENGTH_CONFIG = {
  high: { color: "text-green-700", bg: "bg-green-100", bar: "bg-green-500", width: "w-full" },
  medium: { color: "text-yellow-700", bg: "bg-yellow-100", bar: "bg-yellow-500", width: "w-2/3" },
  low: { color: "text-red-700", bg: "bg-red-100", bar: "bg-red-400", width: "w-1/3" },
};

function formatDeal(value?: number) {
  if (!value) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function getScoreConfig(score?: number) {
  if (!score) return { color: "text-gray-500", bg: "bg-gray-100", ring: "ring-gray-200", label: "Unscored" };
  if (score >= 80) return { color: "text-green-700", bg: "bg-green-50", ring: "ring-green-300", label: "Hot Lead" };
  if (score >= 60) return { color: "text-yellow-700", bg: "bg-yellow-50", ring: "ring-yellow-300", label: "Warm Lead" };
  return { color: "text-red-600", bg: "bg-red-50", ring: "ring-red-300", label: "Cold Lead" };
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

  useEffect(() => {
    if (!leadId) return;
    API.get(`/leads/${leadId}`)
      .then((res) => setLead(res.data))
      .catch((err) => setError(getErrorMessage(err, "Unable to load this lead.")))
      .finally(() => setLoading(false));
  }, [leadId]);

  if (loading) {
    return (
      <div className="p-6">
        <Skeleton className="h-6 w-28 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-52 rounded-xl" />
            <Skeleton className="h-52 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!lead) {
    const loadError = error || (!leadId ? "Invalid lead ID." : "");
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="w-12 h-12 text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">{loadError ? "Unable to Load Lead" : "Lead not found"}</h3>
            <p className="text-gray-500 mb-4 text-sm">{loadError || "The lead you're looking for doesn't exist."}</p>
            <Link href="/leads"><Button className="bg-orange-600 hover:bg-orange-700"><ArrowLeft className="w-4 h-4 mr-2" />Back to Leads</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const scoreConfig = getScoreConfig(lead.ai_score);
  const statusConfig = getPipelineStage(lead.status);

  return (
    <div className="p-6 max-w-7xl">
      {/* Back nav */}
      <Link href="/leads">
        <Button variant="ghost" size="sm" className="mb-5 -ml-2 text-gray-500 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Leads
        </Button>
      </Link>

      {/* Lead header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Avatar className="w-14 h-14">
            <AvatarFallback className="text-lg font-bold">{getInitials(lead.name)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{lead.name}</h1>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
              {lead.ai_score !== undefined && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${scoreConfig.bg} ${scoreConfig.color}`}>
                  <Star className="w-3.5 h-3.5" />
                  {scoreConfig.label} · {lead.ai_score}/100
                </span>
              )}
            </div>
            <p className="text-gray-500 mt-0.5 text-sm flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              {lead.company}
              {lead.industry && <> · <Badge variant="secondary" className="text-xs py-0">{lead.industry}</Badge></>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {lead.email && (
            <a href={`mailto:${lead.email}`}>
              <Button variant="outline" size="sm"><Mail className="w-4 h-4 mr-1.5" />Email</Button>
            </a>
          )}
          {lead.phone && (
            <a href={`tel:${lead.phone}`}>
              <Button variant="outline" size="sm"><Phone className="w-4 h-4 mr-1.5" />Call</Button>
            </a>
          )}
          <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
            <Zap className="w-4 h-4 mr-1.5" />Convert to Deal
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column: tabbed content */}
        <div className="lg:col-span-2 space-y-5">
          <Tabs defaultValue="overview">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="ai">AI Analysis</TabsTrigger>
              <TabsTrigger value="evidence">Evidence</TabsTrigger>
            </TabsList>

            {/* OVERVIEW TAB */}
            <TabsContent value="overview">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Contact Information</CardTitle>
                </CardHeader>
                <CardContent>
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
                        <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                          <field.icon className="w-4 h-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">{field.label}</p>
                          <p className="text-sm font-medium text-gray-900 mt-0.5">{field.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {(lead.comments || lead.knowledge) && (
                    <>
                      <Separator className="my-4" />
                      {lead.comments && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Notes</p>
                          <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{lead.comments}</p>
                        </div>
                      )}
                      {lead.knowledge && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Background Knowledge</p>
                          <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{lead.knowledge}</p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* AI ANALYSIS TAB */}
            <TabsContent value="ai">
              <div className="space-y-4">
                {/* Score ring */}
                {lead.ai_score !== undefined && (
                  <Card>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-5">
                        <div className={`w-20 h-20 rounded-full ring-4 ${scoreConfig.ring} ${scoreConfig.bg} flex flex-col items-center justify-center flex-shrink-0`}>
                          <span className={`text-2xl font-bold ${scoreConfig.color}`}>{lead.ai_score}</span>
                          <span className="text-xs text-gray-500">/ 100</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900">AI Lead Score</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${scoreConfig.bg} ${scoreConfig.color} font-medium`}>{scoreConfig.label}</span>
                          </div>
                          <Progress value={lead.ai_score} className="h-2 mb-2" />
                          {lead.score_comment && <p className="text-sm text-gray-600">{lead.score_comment}</p>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* AI Reasoning */}
                {lead.ai_reason && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-1.5 text-purple-700">
                        <Brain className="w-4 h-4" /> AI Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                        <p className="text-sm text-purple-900 leading-relaxed">{lead.ai_reason}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Sales Strategy */}
                {lead.sales_strategy && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-1.5 text-blue-700">
                        <TrendingUp className="w-4 h-4" /> Sales Strategy
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                        <p className="text-sm text-blue-900 leading-relaxed">{lead.sales_strategy}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recommended Offerings */}
                {lead.recommended_offerings && lead.recommended_offerings.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-1.5 text-orange-700">
                        <Sparkles className="w-4 h-4" /> Recommended Offerings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {lead.recommended_offerings.map((offering, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 text-orange-800 text-sm rounded-lg font-medium">
                            <Zap className="w-3.5 h-3.5 text-orange-500" />
                            {offering}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Next Action */}
                {lead.next_action && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-1.5 text-green-700">
                        <CheckCircle2 className="w-4 h-4" /> Recommended Next Action
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-start gap-3 bg-green-50 rounded-lg p-4 border border-green-200">
                        <Target className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-green-900 font-medium">{lead.next_action}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* No AI data */}
                {!lead.ai_score && !lead.ai_reason && !lead.sales_strategy && (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Brain className="w-10 h-10 text-gray-300 mb-3" />
                      <p className="text-sm text-gray-500">No AI analysis available for this lead yet.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* EVIDENCE TAB */}
            <TabsContent value="evidence">
              {!lead.evidence_cards || lead.evidence_cards.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="w-10 h-10 text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500">No evidence cards available.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {lead.used_web_evidence && (
                    <div className="flex items-center gap-2 text-xs text-purple-700 bg-purple-50 px-3 py-2 rounded-lg border border-purple-100">
                      <Globe className="w-3.5 h-3.5" />
                      Web evidence was used in scoring this lead
                    </div>
                  )}
                  {lead.evidence_cards.map((card, i) => {
                    const cfg = STRENGTH_CONFIG[card.strength] ?? STRENGTH_CONFIG.medium;
                    return (
                      <Card key={i}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{card.strength.toUpperCase()}</span>
                              <span className="text-xs text-gray-500">{card.signal_type}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs font-bold text-gray-700">
                              <BarChart3 className="w-3.5 h-3.5 text-gray-400" />
                              +{card.points} pts
                            </div>
                          </div>
                          <p className="text-sm text-gray-900 mb-2">{card.reason}</p>
                          {card.source_excerpt && (
                            <p className="text-xs text-gray-500 italic bg-gray-50 rounded p-2 mb-2 line-clamp-2">&ldquo;{card.source_excerpt}&rdquo;</p>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex-1 mr-4">
                              <div className={`h-1.5 rounded-full bg-gray-100 overflow-hidden`}>
                                <div className={`h-full ${cfg.bar} ${cfg.width}`} />
                              </div>
                            </div>
                            {card.source_url && (
                              <a href={card.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                Source <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {lead.knowledge_sources && lead.knowledge_sources.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Knowledge Sources</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1.5">
                          {lead.knowledge_sources.map((src, i) => (
                            <a key={i} href={src} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="truncate">{src}</span>
                            </a>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Quick actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Send Message", icon: MessageSquare, action: "#" },
                { label: "Schedule Meeting", icon: Calendar, action: "#" },
                { label: "Send Email", icon: Mail, action: lead.email ? `mailto:${lead.email}` : "#" },
                { label: "Add to Campaign", icon: Target, action: "/campaign" },
                { label: "View Pipeline", icon: Activity, action: "/pipeline" },
              ].map((item) => (
                <a key={item.label} href={item.action}>
                  <Button className="w-full justify-start" variant="outline" size="sm">
                    <item.icon className="w-4 h-4 mr-2 text-gray-500" />
                    {item.label}
                  </Button>
                </a>
              ))}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-blue-500" />
                Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-200" />
                <div className="space-y-4">
                  {[
                    { icon: CheckCircle2, color: "bg-green-500", title: "Lead created", desc: new Date(lead.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), time: "Created" },
                    ...(lead.ai_score !== undefined ? [{ icon: Brain, color: "bg-purple-500", title: "AI analysis completed", desc: `Score: ${lead.ai_score}/100 · ${scoreConfig.label}`, time: "Auto" }] : []),
                    ...(lead.recommended_offerings && lead.recommended_offerings.length > 0 ? [{ icon: Sparkles, color: "bg-orange-500", title: "Offerings identified", desc: lead.recommended_offerings.slice(0, 2).join(", "), time: "Auto" }] : []),
                    ...(lead.next_action ? [{ icon: Target, color: "bg-blue-500", title: "Action recommended", desc: lead.next_action.slice(0, 60) + (lead.next_action.length > 60 ? "…" : ""), time: "Auto" }] : []),
                  ].map((event, i) => (
                    <div key={i} className="flex items-start gap-3 pl-0">
                      <div className={`w-7 h-7 rounded-full ${event.color} flex items-center justify-center flex-shrink-0 z-10 relative`}>
                        <event.icon className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <p className="text-sm font-medium text-gray-900">{event.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{event.desc}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{event.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lead score breakdown mini */}
          {lead.ai_score !== undefined && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-gray-500" />
                  Score Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-3">
                  <div className={`text-3xl font-black ${scoreConfig.color}`}>{lead.ai_score}</div>
                  <div className="flex-1">
                    <Progress value={lead.ai_score} className="h-3 mb-1" />
                    <p className="text-xs text-gray-500">{scoreConfig.label}</p>
                  </div>
                </div>
                {lead.evidence_cards && lead.evidence_cards.length > 0 && (
                  <div className="space-y-1.5 mt-3">
                    {lead.evidence_cards.slice(0, 3).map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 truncate flex-1">{c.signal_type}</span>
                        <span className="text-gray-900 font-semibold ml-2">+{c.points}</span>
                      </div>
                    ))}
                    {lead.evidence_cards.length > 3 && (
                      <p className="text-xs text-gray-400 text-center">+{lead.evidence_cards.length - 3} more signals</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
