"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Target,
  TrendingUp,
  DollarSign,
  Brain,
  Zap,
  Star,
  ArrowUpRight,
  Building2,
  Kanban,
  Plus,
  Activity,
  BarChart3,
  Sparkles,
} from "lucide-react";
import API, { extractArray } from "@/lib/api";
import {
  getPipelineStage,
  normalizePipelineStage,
  PIPELINE_STAGE_ORDER,
} from "@/lib/pipeline";

interface Lead {
  id: number;
  name: string;
  company: string;
  email?: string;
  ai_score?: number;
  ai_reason?: string;
  deal_size?: number;
  status: string;
  industry?: string;
  created_at: string;
}

interface Campaign {
  id?: number;
  name?: string;
  status?: string;
  created_at?: string;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDeal(value?: number) {
  if (!value) return "$0";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

function getScoreBadge(score?: number) {
  if (!score) return { label: "—", cls: "text-slate-400 bg-slate-100" };
  if (score >= 80) return { label: score.toString(), cls: "text-emerald-700 bg-emerald-50" };
  if (score >= 60) return { label: score.toString(), cls: "text-amber-700 bg-amber-50" };
  return { label: score.toString(), cls: "text-red-600 bg-red-50" };
}

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [leadsResult, campaignsResult] = await Promise.allSettled([
          API.get("/leads"),
          API.get("/campaigns"),
        ]);
        if (leadsResult.status === "fulfilled")
          setLeads(extractArray(leadsResult.value.data));
        if (campaignsResult.status === "fulfilled")
          setCampaigns(extractArray(campaignsResult.value.data));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalLeads = leads.length;
  const activeCampaigns = campaigns.length;
  const wonLeads = leads.filter(
    (l) => normalizePipelineStage(l.status) === "won"
  );
  const conversionRate = totalLeads
    ? Math.round((wonLeads.length / totalLeads) * 100)
    : 0;
  const totalPipeline = leads.reduce((s, l) => s + (l.deal_size ?? 0), 0);
  const wonRevenue = wonLeads.reduce((s, l) => s + (l.deal_size ?? 0), 0);
  const scoredLeads = leads.filter((l) => l.ai_score !== undefined);
  const avgScore = scoredLeads.length
    ? Math.round(
        scoredLeads.reduce((s, l) => s + (l.ai_score ?? 0), 0) /
          scoredLeads.length
      )
    : 0;

  const pipelineStages = PIPELINE_STAGE_ORDER.map((stage) => {
    const stageLeads = leads.filter(
      (l) => normalizePipelineStage(l.status) === stage
    );
    return {
      stage,
      label: getPipelineStage(stage).label,
      bar: getPipelineStage(stage).bar,
      count: stageLeads.length,
      value: stageLeads.reduce((s, l) => s + (l.deal_size ?? 0), 0),
    };
  });

  const topLeads = [...leads]
    .filter((l) => l.ai_score !== undefined)
    .sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0))
    .slice(0, 5);

  const recentLeads = [...leads]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 4);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Skeleton className="h-72 rounded-xl lg:col-span-2" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Leads",
      value: totalLeads.toString(),
      sub: `${topLeads.length} AI-scored`,
      icon: Users,
      cardBg: "bg-indigo-600",
      cardGlow: "from-indigo-600 to-indigo-700",
      iconBg: "bg-indigo-500",
    },
    {
      title: "Active Campaigns",
      value: activeCampaigns.toString(),
      sub: "Running now",
      icon: Target,
      cardBg: "bg-emerald-600",
      cardGlow: "from-emerald-600 to-emerald-700",
      iconBg: "bg-emerald-500",
    },
    {
      title: "Conversion Rate",
      value: `${conversionRate}%`,
      sub: `${wonLeads.length} deals won`,
      icon: TrendingUp,
      cardBg: "bg-violet-600",
      cardGlow: "from-violet-600 to-violet-700",
      iconBg: "bg-violet-500",
    },
    {
      title: "Total Pipeline",
      value: formatDeal(totalPipeline),
      sub: `${formatDeal(wonRevenue)} closed`,
      icon: DollarSign,
      cardBg: "bg-orange-500",
      cardGlow: "from-orange-500 to-orange-600",
      iconBg: "bg-orange-400",
    },
  ];

  return (
    <div className="p-6 max-w-7xl space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Your AI-powered sales overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/leads">
            <Button
              size="sm"
              variant="outline"
              className="border-slate-200 text-slate-700 hover:bg-slate-50 h-9"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Lead
            </Button>
          </Link>
          <Link href="/pipeline">
            <Button
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 h-9 shadow-sm shadow-orange-200"
            >
              <Kanban className="w-3.5 h-3.5 mr-1.5" />
              Pipeline
            </Button>
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.title}
            className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${card.cardGlow} p-5 shadow-md hover:shadow-lg transition-all duration-200`}
          >
            {/* Decorative circle */}
            <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
            <div className="absolute -bottom-6 -right-2 w-16 h-16 rounded-full bg-white/5" />
            <div className="relative">
              <div className={`inline-flex p-2 rounded-lg ${card.iconBg} mb-3`}>
                <card.icon className="h-4 w-4 text-white" />
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">{card.value}</div>
              <p className="text-xs font-semibold text-white/70 uppercase tracking-wider mt-1">{card.title}</p>
              <p className="text-xs text-white/50 mt-0.5">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* AI Copilot banner */}
      {avgScore > 0 && (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-5 shadow-lg shadow-violet-200/40">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,rgba(255,255,255,0.08)_0%,transparent_60%)]" />
          <div className="relative flex items-center gap-4 text-white">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0 border border-white/20">
              <Brain className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-sm">Hubspot AI Insight</p>
                <span className="px-1.5 py-0.5 rounded-full bg-white/15 text-xs font-medium border border-white/20">
                  Live
                </span>
              </div>
              <p className="text-xs text-purple-200 leading-relaxed">
                Your top {topLeads.length} leads average{" "}
                <span className="font-bold text-white">{avgScore}/100</span> AI score.
                {topLeads[0] &&
                  ` ${topLeads[0].name} at ${topLeads[0].company} is your hottest opportunity right now.`}
              </p>
            </div>
            <Link href="/leads">
              <Button
                size="sm"
                className="bg-white text-violet-700 hover:bg-purple-50 flex-shrink-0 font-semibold shadow-sm h-8"
              >
                <Zap className="w-3.5 h-3.5 mr-1.5" />
                Act Now
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Pipeline overview */}
        <Card className="lg:col-span-2 border-slate-200 shadow-sm">
          <CardHeader className="pb-4 pt-5 px-5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Pipeline Overview
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">Deal stages and values</p>
              </div>
              <Link href="/pipeline">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 h-7 text-xs gap-1"
                >
                  Full board
                  <ArrowUpRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {leads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                  <Kanban className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-700">No pipeline data yet</p>
                <p className="text-xs text-slate-400 mt-1">Add leads to see your pipeline</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {pipelineStages.map(({ stage, label, bar, count, value }) => (
                  <div key={stage} className="flex items-center gap-3">
                    <div className="w-[88px] text-xs font-medium text-slate-600 flex-shrink-0">
                      {label}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-slate-400">{count} leads</span>
                        <span className="text-xs font-semibold text-slate-700">
                          {formatDeal(value)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${bar}`}
                          style={{
                            width:
                              totalLeads > 0
                                ? `${(count / totalLeads) * 100}%`
                                : "0%",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top AI leads */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4 pt-5 px-5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-violet-500" />
                  Top AI Leads
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">Highest AI scores</p>
              </div>
              <Link href="/leads">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-orange-600 hover:bg-orange-50 h-7 text-xs gap-1"
                >
                  All
                  <ArrowUpRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-1">
            {topLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                  <Star className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-xs text-slate-500">No scored leads yet.</p>
              </div>
            ) : (
              topLeads.map((lead) => {
                const badge = getScoreBadge(lead.ai_score);
                return (
                  <Link href={`/leads/${lead.id}`} key={lead.id}>
                    <div className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group">
                      <Avatar className="w-7 h-7 flex-shrink-0">
                        <AvatarFallback className="text-xs bg-orange-100 text-orange-700 font-semibold">
                          {getInitials(lead.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {lead.name}
                        </p>
                        <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                          <Building2 className="w-2.5 h-2.5" />
                          {lead.company}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0 ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent leads */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4 pt-5 px-5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-500" />
                  Recent Leads
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">Newly added contacts</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-1">
            {recentLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                  <Users className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-xs text-slate-500">No leads added yet.</p>
              </div>
            ) : (
              recentLeads.map((lead) => (
                <Link href={`/leads/${lead.id}`} key={lead.id}>
                  <div className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                    <Avatar className="w-7 h-7 flex-shrink-0">
                      <AvatarFallback className="text-xs bg-slate-100 text-slate-600 font-semibold">
                        {getInitials(lead.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {lead.name}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{lead.company}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                          getPipelineStage(lead.status).badge
                        }`}
                      >
                        {getPipelineStage(lead.status).label}
                      </span>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4 pt-5 px-5">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-orange-500" />
              Quick Actions
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">Jump to common tasks</p>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-2 gap-2.5">
              {[
                {
                  label: "Add Lead",
                  sub: "Import prospects",
                  icon: Users,
                  href: "/leads",
                  iconColor: "text-blue-600",
                  iconBg: "bg-blue-50",
                  hoverBg: "hover:bg-blue-50",
                },
                {
                  label: "Pipeline Board",
                  sub: "Manage stages",
                  icon: Kanban,
                  href: "/pipeline",
                  iconColor: "text-violet-600",
                  iconBg: "bg-violet-50",
                  hoverBg: "hover:bg-violet-50",
                },
                {
                  label: "Campaign Planner",
                  sub: "AI-powered campaigns",
                  icon: Sparkles,
                  href: "/campaign",
                  iconColor: "text-orange-600",
                  iconBg: "bg-orange-50",
                  hoverBg: "hover:bg-orange-50",
                },
                {
                  label: "Companies",
                  sub: "Org accounts",
                  icon: Building2,
                  href: "/companies",
                  iconColor: "text-slate-600",
                  iconBg: "bg-slate-100",
                  hoverBg: "hover:bg-slate-100",
                },
                {
                  label: "Contacts",
                  sub: "All contacts",
                  icon: Users,
                  href: "/contacts",
                  iconColor: "text-teal-600",
                  iconBg: "bg-teal-50",
                  hoverBg: "hover:bg-teal-50",
                },
                {
                  label: "Analytics",
                  sub: "View reports",
                  icon: BarChart3,
                  href: "/dashboard",
                  iconColor: "text-emerald-600",
                  iconBg: "bg-emerald-50",
                  hoverBg: "hover:bg-emerald-50",
                },
              ].map((action) => (
                <Link href={action.href} key={action.label}>
                  <div
                    className={`p-3.5 rounded-xl border border-slate-100 bg-white ${action.hoverBg} transition-colors cursor-pointer group`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 ${action.iconBg}`}
                    >
                      <action.icon className={`h-4 w-4 ${action.iconColor}`} />
                    </div>
                    <div className="text-xs font-semibold text-slate-800">{action.label}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{action.sub}</div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
