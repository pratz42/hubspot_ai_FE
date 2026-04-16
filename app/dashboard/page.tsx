"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function formatDeal(value?: number) {
  if (!value) return "$0";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

function getScoreColor(score?: number) {
  if (!score) return "text-gray-400";
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-500";
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
        if (leadsResult.status === "fulfilled") setLeads(extractArray(leadsResult.value.data));
        if (campaignsResult.status === "fulfilled") setCampaigns(extractArray(campaignsResult.value.data));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Derived stats
  const totalLeads = leads.length;
  const activeCampaigns = campaigns.length;
  const wonLeads = leads.filter((l) => normalizePipelineStage(l.status) === "won");
  const conversionRate = totalLeads ? Math.round((wonLeads.length / totalLeads) * 100) : 0;
  const totalPipeline = leads.reduce((s, l) => s + (l.deal_size ?? 0), 0);
  const wonRevenue = wonLeads.reduce((s, l) => s + (l.deal_size ?? 0), 0);
  const avgScore = leads.filter((l) => l.ai_score !== undefined).length
    ? Math.round(leads.filter((l) => l.ai_score !== undefined).reduce((s, l) => s + (l.ai_score ?? 0), 0) / leads.filter((l) => l.ai_score !== undefined).length)
    : 0;

  // Pipeline by stage
  const pipelineStages = PIPELINE_STAGE_ORDER.map((stage) => {
    const stageLeads = leads.filter((l) => normalizePipelineStage(l.status) === stage);
    return {
      stage,
      label: getPipelineStage(stage).label,
      bar: getPipelineStage(stage).bar,
      count: stageLeads.length,
      value: stageLeads.reduce((s, l) => s + (l.deal_size ?? 0), 0),
    };
  });

  // Top leads by AI score
  const topLeads = [...leads]
    .filter((l) => l.ai_score !== undefined)
    .sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0))
    .slice(0, 5);

  // Recent leads (newest first)
  const recentLeads = [...leads].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 4);

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-64 rounded-xl lg:col-span-2" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your sales overview for today</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/leads">
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1.5" />
              Add Lead
            </Button>
          </Link>
          <Link href="/pipeline">
            <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
              <Kanban className="w-4 h-4 mr-1.5" />
              Pipeline
            </Button>
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { title: "Total Leads", value: totalLeads.toString(), sub: `${topLeads.length} AI-scored`, icon: Users, color: "text-blue-600", bg: "bg-blue-50", trend: "+12% this month" },
          { title: "Active Campaigns", value: activeCampaigns.toString(), sub: "Running now", icon: Target, color: "text-green-600", bg: "bg-green-50", trend: "" },
          { title: "Conversion Rate", value: `${conversionRate}%`, sub: `${wonLeads.length} deals won`, icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50", trend: "" },
          { title: "Total Pipeline", value: formatDeal(totalPipeline), sub: `${formatDeal(wonRevenue)} won`, icon: DollarSign, color: "text-orange-600", bg: "bg-orange-50", trend: "" },
        ].map((card) => (
          <Card key={card.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wider">{card.title}</CardTitle>
              <div className={`p-1.5 rounded-lg ${card.bg}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold text-gray-900">{card.value}</div>
              <p className="text-xs text-gray-500 mt-0.5">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Insights banner */}
      {avgScore > 0 && (
        <div className="mb-6 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex items-center gap-4 text-white">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Brain className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">AI Copilot Insight</p>
            <p className="text-xs text-purple-100 mt-0.5">
              Your top {topLeads.length} leads have an average AI score of <span className="font-bold text-white">{avgScore}/100</span>.
              {topLeads[0] && ` ${topLeads[0].name} at ${topLeads[0].company} is your hottest lead.`}
            </p>
          </div>
          <Link href="/leads">
            <Button size="sm" className="bg-white text-purple-700 hover:bg-purple-50 flex-shrink-0">
              <Zap className="w-3.5 h-3.5 mr-1" />
              Act Now
            </Button>
          </Link>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Pipeline overview */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Pipeline Overview</CardTitle>
                <CardDescription>Deal stages and values</CardDescription>
              </div>
              <Link href="/pipeline">
                <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 h-7 text-xs">
                  Full board <ArrowUpRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {leads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Kanban className="w-10 h-10 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No pipeline data yet. Add leads to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pipelineStages.map(({ stage, label, bar, count, value }) => (
                  <div key={stage} className="flex items-center gap-3">
                    <div className="w-20 text-xs font-medium text-gray-600">{label}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">{count} leads</span>
                        <span className="text-xs font-medium text-gray-700">{formatDeal(value)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${bar}`}
                          style={{ width: totalLeads > 0 ? `${(count / totalLeads) * 100}%` : "0%" }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top AI-scored leads */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-1.5">
                  <Brain className="w-4 h-4 text-purple-500" />
                  Top AI Leads
                </CardTitle>
                <CardDescription>Highest scored by AI</CardDescription>
              </div>
              <Link href="/leads">
                <Button variant="ghost" size="sm" className="text-orange-600 hover:bg-orange-50 h-7 text-xs">
                  All <ArrowUpRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {topLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Star className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-xs text-gray-500">No scored leads yet.</p>
              </div>
            ) : (
              topLeads.map((lead) => (
                <Link href={`/leads/${lead.id}`} key={lead.id}>
                  <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                    <Avatar className="w-7 h-7">
                      <AvatarFallback className="text-xs">{getInitials(lead.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{lead.name}</p>
                      <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> {lead.company}
                      </p>
                    </div>
                    <div className={`text-sm font-bold ${getScoreColor(lead.ai_score)}`}>
                      {lead.ai_score}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent activity */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-blue-500" />
                  Recent Leads
                </CardTitle>
                <CardDescription>Newly added contacts</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentLeads.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-500">No leads added yet.</p>
              </div>
            ) : (
              recentLeads.map((lead) => (
                <Link href={`/leads/${lead.id}`} key={lead.id}>
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                    <Avatar className="w-7 h-7">
                      <AvatarFallback className="text-xs">{getInitials(lead.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{lead.name}</p>
                      <p className="text-xs text-gray-500 truncate">{lead.company}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getPipelineStage(lead.status).badge}`}>
                        {getPipelineStage(lead.status).label}
                      </span>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(lead.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-orange-500" />
              Quick Actions
            </CardTitle>
            <CardDescription>Jump to common tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Add Lead", sub: "Import prospects", icon: Users, href: "/leads", color: "text-blue-600", bg: "bg-blue-50 hover:bg-blue-100" },
                { label: "Pipeline Board", sub: "Manage stages", icon: Kanban, href: "/pipeline", color: "text-purple-600", bg: "bg-purple-50 hover:bg-purple-100" },
                { label: "Campaign Planner", sub: "AI-powered campaigns", icon: Target, href: "/campaign", color: "text-green-600", bg: "bg-green-50 hover:bg-green-100" },
                { label: "Companies", sub: "Org accounts", icon: Building2, href: "/companies", color: "text-orange-600", bg: "bg-orange-50 hover:bg-orange-100" },
                { label: "Contacts", sub: "All contacts", icon: Users, href: "/contacts", color: "text-teal-600", bg: "bg-teal-50 hover:bg-teal-100" },
                { label: "Analytics", sub: "View reports", icon: BarChart3, href: "/dashboard", color: "text-gray-600", bg: "bg-gray-50 hover:bg-gray-100" },
              ].map((action) => (
                <Link href={action.href} key={action.label}>
                  <div className={`p-3 rounded-xl border border-transparent ${action.bg} transition-colors cursor-pointer`}>
                    <action.icon className={`h-5 w-5 ${action.color} mb-1.5`} />
                    <div className="text-sm font-medium text-gray-900">{action.label}</div>
                    <div className="text-xs text-gray-500">{action.sub}</div>
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
