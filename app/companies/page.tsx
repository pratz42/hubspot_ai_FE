"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  Building2,
  Users,
  DollarSign,
  Star,
  ArrowUpRight,
  Brain,
  TrendingUp,
  SlidersHorizontal,
} from "lucide-react";
import API, { extractArray } from "@/lib/api";

interface Lead {
  id: number;
  name: string;
  company: string;
  email?: string;
  phone?: string;
  industry?: string;
  deal_size?: number;
  ai_score?: number;
  status: string;
  created_at: string;
}

interface CompanyGroup {
  name: string;
  industry?: string;
  leads: Lead[];
  totalDealSize: number;
  avgScore: number;
  topScore: number;
  statuses: Record<string, number>;
}

function formatDeal(value: number) {
  if (!value) return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function getCompanyInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

const COMPANY_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-green-100 text-green-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
  "bg-teal-100 text-teal-700",
  "bg-indigo-100 text-indigo-700",
  "bg-red-100 text-red-700",
];

function colorForCompany(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COMPANY_COLORS[Math.abs(hash) % COMPANY_COLORS.length];
}

export default function CompaniesPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    API.get("/leads")
      .then((res) => setLeads(extractArray(res.data)))
      .finally(() => setLoading(false));
  }, []);

  const companies = useMemo((): CompanyGroup[] => {
    const map: Record<string, CompanyGroup> = {};
    leads.forEach((lead) => {
      const key = lead.company?.trim() || "Unknown";
      if (!map[key]) {
        map[key] = {
          name: key,
          industry: lead.industry,
          leads: [],
          totalDealSize: 0,
          avgScore: 0,
          topScore: 0,
          statuses: {},
        };
      }
      map[key].leads.push(lead);
      map[key].totalDealSize += lead.deal_size ?? 0;
      if (lead.ai_score !== undefined) {
        map[key].topScore = Math.max(map[key].topScore, lead.ai_score);
      }
      const s = lead.status?.toLowerCase() ?? "unknown";
      map[key].statuses[s] = (map[key].statuses[s] ?? 0) + 1;
    });

    return Object.values(map)
      .map((c) => {
        const scored = c.leads.filter((l) => l.ai_score !== undefined);
        c.avgScore = scored.length ? Math.round(scored.reduce((s, l) => s + (l.ai_score ?? 0), 0) / scored.length) : 0;
        return c;
      })
      .sort((a, b) => b.totalDealSize - a.totalDealSize);
  }, [leads]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return companies.filter(
      (c) => c.name.toLowerCase().includes(q) || c.industry?.toLowerCase().includes(q)
    );
  }, [companies, search]);

  const totalPipeline = companies.reduce((s, c) => s + c.totalDealSize, 0);

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-36 mb-2" />
          <Skeleton className="h-4 w-52" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
          <p className="text-sm text-gray-500 mt-0.5">{companies.length} companies · {formatDeal(totalPipeline)} total pipeline</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Companies", value: companies.length, icon: Building2, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Total Pipeline", value: formatDeal(totalPipeline), icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
          { label: "Avg AI Score", value: companies.length ? Math.round(companies.reduce((s, c) => s + c.avgScore, 0) / companies.length) : 0, icon: Brain, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Industries", value: new Set(companies.map((c) => c.industry).filter(Boolean)).size, icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-50" },
        ].map((stat) => (
          <Card key={stat.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm">
          <SlidersHorizontal className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="w-12 h-12 text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No companies found</h3>
            <p className="text-gray-500 text-sm mb-4">Add leads with company names to see them here.</p>
            <Link href="/leads">
              <Button className="bg-orange-600 hover:bg-orange-700">View Leads</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Company grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((company) => {
            const colorClass = colorForCompany(company.name);
            const wonCount = company.statuses["won"] ?? 0;
            const winRate = company.leads.length ? Math.round((wonCount / company.leads.length) * 100) : 0;

            return (
              <Card key={company.name} className="hover:shadow-md transition-all duration-150 overflow-hidden group">
                <CardContent className="p-5">
                  {/* Company header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${colorClass}`}>
                        {getCompanyInitials(company.name)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">{company.name}</h3>
                        {company.industry && (
                          <Badge variant="secondary" className="text-xs mt-0.5">{company.industry}</Badge>
                        )}
                      </div>
                    </div>
                    {company.topScore > 0 && (
                      <div className="flex items-center gap-1 text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded-md">
                        <Star className="w-3 h-3" />
                        {company.topScore}
                      </div>
                    )}
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                      <Users className="w-3.5 h-3.5 text-blue-500 mx-auto mb-1" />
                      <p className="text-sm font-bold text-gray-900">{company.leads.length}</p>
                      <p className="text-xs text-gray-500">Contacts</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                      <DollarSign className="w-3.5 h-3.5 text-green-500 mx-auto mb-1" />
                      <p className="text-sm font-bold text-gray-900">{company.totalDealSize > 0 ? formatDeal(company.totalDealSize) : "—"}</p>
                      <p className="text-xs text-gray-500">Pipeline</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                      <TrendingUp className="w-3.5 h-3.5 text-orange-500 mx-auto mb-1" />
                      <p className="text-sm font-bold text-gray-900">{winRate}%</p>
                      <p className="text-xs text-gray-500">Win Rate</p>
                    </div>
                  </div>

                  {/* AI Score bar */}
                  {company.avgScore > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Brain className="w-3 h-3 text-purple-500" /> Avg AI Score
                        </span>
                        <span className="text-xs font-semibold text-gray-700">{company.avgScore}/100</span>
                      </div>
                      <Progress value={company.avgScore} className="h-1.5" />
                    </div>
                  )}

                  {/* Contacts preview */}
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {company.leads.slice(0, 4).map((lead, i) => (
                        <div
                          key={lead.id}
                          className="w-7 h-7 rounded-full bg-orange-100 border-2 border-white flex items-center justify-center text-xs font-semibold text-orange-700"
                          title={lead.name}
                        >
                          {lead.name[0]}
                        </div>
                      ))}
                      {company.leads.length > 4 && (
                        <div className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs font-semibold text-gray-600">
                          +{company.leads.length - 4}
                        </div>
                      )}
                    </div>
                    <Link href={`/leads?company=${encodeURIComponent(company.name)}`}>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-2">
                        View all
                        <ArrowUpRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
