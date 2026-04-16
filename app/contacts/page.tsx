"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Search,
  Mail,
  Phone,
  Building2,
  Star,
  ArrowUpRight,
  Users,
  Brain,
  SlidersHorizontal,
} from "lucide-react";
import API, { extractArray } from "@/lib/api";
import { getPipelineStage } from "@/lib/pipeline";

interface Lead {
  id: number;
  name: string;
  company: string;
  email?: string;
  phone?: string;
  industry?: string;
  deal_size?: number;
  source?: string;
  ai_score?: number;
  status: string;
  created_at: string;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function getScoreBadge(score?: number) {
  if (!score) return null;
  if (score >= 80) return { label: "Hot", color: "bg-red-100 text-red-700" };
  if (score >= 60) return { label: "Warm", color: "bg-yellow-100 text-yellow-700" };
  return { label: "Cold", color: "bg-blue-100 text-blue-700" };
}

export default function ContactsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"table" | "grid">("table");

  useEffect(() => {
    API.get("/leads")
      .then((res) => setLeads(extractArray(res.data)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return leads.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.company?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.industry?.toLowerCase().includes(q)
    );
  }, [leads, search]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-gray-100">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-sm text-gray-500 mt-0.5">{leads.length} contacts across all companies</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={view === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("table")}
            className={view === "table" ? "bg-orange-600 hover:bg-orange-700" : ""}
          >
            List
          </Button>
          <Button
            variant={view === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("grid")}
            className={view === "grid" ? "bg-orange-600 hover:bg-orange-700" : ""}
          >
            Grid
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Contacts", value: leads.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Hot Leads", value: leads.filter((l) => (l.ai_score ?? 0) >= 80).length, icon: Star, color: "text-red-600", bg: "bg-red-50" },
          { label: "With Email", value: leads.filter((l) => l.email).length, icon: Mail, color: "text-green-600", bg: "bg-green-50" },
          { label: "AI Scored", value: leads.filter((l) => l.ai_score !== undefined).length, icon: Brain, color: "text-purple-600", bg: "bg-purple-50" },
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

      {/* Search bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search contacts..."
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
            <Users className="w-12 h-12 text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No contacts found</h3>
            <p className="text-gray-500 text-sm mb-4">Try adjusting your search or add new leads.</p>
            <Link href="/leads">
              <Button className="bg-orange-600 hover:bg-orange-700">View Leads</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Table view */}
      {view === "table" && filtered.length > 0 && (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>AI Score</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((lead) => {
                const scoreBadge = getScoreBadge(lead.ai_score);
                return (
                  <TableRow key={lead.id} className="cursor-pointer">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">{getInitials(lead.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{lead.name}</p>
                          <p className="text-xs text-gray-500">{new Date(lead.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-gray-700">
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                        {lead.company}
                      </div>
                    </TableCell>
                    <TableCell>
                      {lead.industry ? (
                        <Badge variant="secondary" className="text-xs">{lead.industry}</Badge>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPipelineStage(lead.status).badge}`}>
                        {getPipelineStage(lead.status).label}
                      </span>
                    </TableCell>
                    <TableCell>
                      {lead.ai_score !== undefined ? (
                        <div className="flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 text-yellow-500" />
                          <span className="text-sm font-medium">{lead.ai_score}</span>
                          {scoreBadge && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${scoreBadge.color}`}>{scoreBadge.label}</span>
                          )}
                        </div>
                      ) : <span className="text-gray-400 text-xs">Not scored</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {lead.email && (
                          <a href={`mailto:${lead.email}`} className="text-gray-400 hover:text-blue-600 transition-colors" onClick={(e) => e.stopPropagation()}>
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {lead.phone && (
                          <a href={`tel:${lead.phone}`} className="text-gray-400 hover:text-green-600 transition-colors" onClick={(e) => e.stopPropagation()}>
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link href={`/leads/${lead.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Grid view */}
      {view === "grid" && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((lead) => {
            const scoreBadge = getScoreBadge(lead.ai_score);
            return (
              <Link href={`/leads/${lead.id}`} key={lead.id}>
                <Card className="hover:shadow-md transition-all duration-150 cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback>{getInitials(lead.name)}</AvatarFallback>
                      </Avatar>
                      {scoreBadge && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${scoreBadge.color}`}>{scoreBadge.label}</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm group-hover:text-orange-600 transition-colors">{lead.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> {lead.company}
                    </p>
                    {lead.industry && (
                      <Badge variant="secondary" className="text-xs mt-2">{lead.industry}</Badge>
                    )}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        {lead.email && <Mail className="w-3.5 h-3.5 text-gray-400" />}
                        {lead.phone && <Phone className="w-3.5 h-3.5 text-gray-400" />}
                      </div>
                      {lead.ai_score !== undefined && (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Star className="w-3 h-3 text-yellow-500" />
                          <span className="font-medium">{lead.ai_score}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
