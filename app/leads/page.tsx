"use client";

import { useEffect, useState, Fragment } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search,
  Plus,
  Eye,
  Star,
  Mail,
  Phone,
  Users,
  ChevronDown,
  ChevronUp,
  Globe,
  Building2,
  Calendar,
  MessageSquare,
  Brain,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Zap,
  FileText,
  X,
  Loader2,
} from "lucide-react";
import API from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

const BLANK_FORM = {
  name: "",
  company: "",
  email: "",
  phone: "",
  industry: "",
  deal_size: "",
  source: "",
  comments: "",
  knowledge: "",
};

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
  status: string;
  created_at: string;
}

/* ── Formatters & style helpers ── */

const formatDealSize = (value?: number) => {
  if (value === undefined || value === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const getOfferingColor = (index: number) => {
  const colors = [
    "bg-blue-100 text-blue-800",
    "bg-purple-100 text-purple-800",
    "bg-green-100 text-green-800",
    "bg-orange-100 text-orange-800",
    "bg-pink-100 text-pink-800",
  ];
  return colors[index % colors.length];
};

const getScoreColor = (score?: number) => {
  if (!score) return "text-gray-500";
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
};

const getScoreBorder = (score?: number) => {
  if (!score) return "border-gray-200 bg-gray-50";
  if (score >= 80) return "border-green-200 bg-green-50";
  if (score >= 60) return "border-yellow-200 bg-yellow-50";
  return "border-red-200 bg-red-50";
};

const getStatusStyle = (status: string) => {
  switch (status.toLowerCase()) {
    case "active":     return "bg-green-100 text-green-700";
    case "new":        return "bg-blue-100 text-blue-700";
    case "qualified":  return "bg-purple-100 text-purple-700";
    case "closed":     return "bg-gray-100 text-gray-600";
    case "invalid":    return "bg-red-100 text-red-600";
    default:           return "bg-gray-100 text-gray-600";
  }
};

const getSourceStyle = (source?: string) => {
  switch (source?.toLowerCase()) {
    case "linkedin":                 return "bg-blue-100 text-blue-700";
    case "website": case "web":      return "bg-teal-100 text-teal-700";
    case "referral":                 return "bg-purple-100 text-purple-700";
    case "email":                    return "bg-yellow-100 text-yellow-700";
    case "demo request":             return "bg-orange-100 text-orange-700";
    default:                         return "bg-gray-100 text-gray-600";
  }
};

const getStrengthStyle = (strength: string) => {
  switch (strength) {
    case "high":   return { cls: "bg-green-100 text-green-700", Icon: TrendingUp };
    case "medium": return { cls: "bg-yellow-100 text-yellow-700", Icon: Minus };
    case "low":    return { cls: "bg-red-100 text-red-600", Icon: TrendingDown };
    default:       return { cls: "bg-gray-100 text-gray-600", Icon: Minus };
  }
};

const getSignalInfo = (signalType: string) => {
  const map: Record<string, { label: string; cls: string }> = {
    no_evidence:      { label: "No Evidence",       cls: "bg-gray-100 text-gray-600" },
    industry_match:   { label: "Industry Match",    cls: "bg-green-100 text-green-700" },
    company_research: { label: "Company Research",  cls: "bg-blue-100 text-blue-700" },
    negative_signal:  { label: "Negative Signal",   cls: "bg-red-100 text-red-600" },
    positive_signal:  { label: "Positive Signal",   cls: "bg-green-100 text-green-700" },
    web_research:     { label: "Web Research",      cls: "bg-teal-100 text-teal-700" },
  };
  return map[signalType] ?? {
    label: signalType.replace(/_/g, " "),
    cls: "bg-gray-100 text-gray-600",
  };
};

interface ScoreBreakdown {
  intentTotal: number | null;
  intentMax: number;
  evidenceTotal: number | null;
  evidenceMax: number;
  items: { category: string; label: string; delta: number; running: number }[];
}

const parseScoreBreakdown = (scoreComment?: string): ScoreBreakdown | null => {
  if (!scoreComment) return null;
  const intentMatch = scoreComment.match(/intent\s+([\d.]+)\/([\d]+)/i);
  const evidenceMatch = scoreComment.match(/[Ee]vidence\s+([\d.]+)\/([\d]+)/i);
  const items: ScoreBreakdown["items"] = [];
  const itemRegex = /(intent|evidence):\s*([^+\-\n]+?)\s*([+-][\d.]+)\s*->\s*([\d.]+)/gi;
  let match;
  while ((match = itemRegex.exec(scoreComment)) !== null) {
    items.push({
      category: match[1].toLowerCase(),
      label: match[2].trim(),
      delta: parseFloat(match[3]),
      running: parseFloat(match[4]),
    });
  }
  if (!intentMatch && !evidenceMatch && items.length === 0) return null;
  return {
    intentTotal: intentMatch ? parseFloat(intentMatch[1]) : null,
    intentMax: intentMatch ? parseInt(intentMatch[2]) : 70,
    evidenceTotal: evidenceMatch ? parseFloat(evidenceMatch[1]) : null,
    evidenceMax: evidenceMatch ? parseInt(evidenceMatch[2]) : 30,
    items,
  };
};

const getScoreNarrative = (scoreComment?: string): string | undefined => {
  if (!scoreComment) return undefined;
  const idx = scoreComment.indexOf("Score breakdown:");
  const narrative = idx === -1 ? scoreComment : scoreComment.substring(0, idx).trim();
  return narrative || undefined;
};

/* ── Component ── */

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detailsExpandedId, setDetailsExpandedId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Add Lead drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);

  useEffect(() => { fetchLeads(); }, []);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    setFilteredLeads(
      leads.filter(
        (l) =>
          l.name.toLowerCase().includes(term) ||
          l.company.toLowerCase().includes(term) ||
          l.email?.toLowerCase().includes(term) ||
          l.industry?.toLowerCase().includes(term) ||
          l.source?.toLowerCase().includes(term) ||
          l.comments?.toLowerCase().includes(term) ||
          l.sales_strategy?.toLowerCase().includes(term) ||
          l.score_comment?.toLowerCase().includes(term)
      )
    );
  }, [leads, searchTerm]);

  const fetchLeads = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await API.get("/leads");
      setLeads(res.data);
      setFilteredLeads(res.data);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load leads. Please refresh the page."));
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  const toggleExpand = (id: number) =>
    setExpandedId((prev) => (prev === id ? null : id));

  const openDrawer = () => {
    setForm({ ...BLANK_FORM });
    setFormError("");
    setFormSuccess(false);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (submitting) return;
    setDrawerOpen(false);
  };

  const setField = (field: keyof typeof BLANK_FORM, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.company.trim()) {
      setFormError("Name and company are required.");
      return;
    }
    setFormError("");
    setSubmitting(true);
    try {
      await API.post("/leads", {
        name: form.name.trim(),
        company: form.company.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        industry: form.industry.trim() || undefined,
        deal_size: form.deal_size ? parseFloat(form.deal_size) : undefined,
        source: form.source || undefined,
        comments: form.comments.trim() || undefined,
        knowledge: form.knowledge.trim() || undefined,
      });
      setFormSuccess(true);
      await fetchLeads(true);
      setTimeout(() => setDrawerOpen(false), 1200);
    } catch (err) {
      setFormError(getErrorMessage(err, "Failed to create lead. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-56" />
        <div className="h-10 bg-gray-200 rounded" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Management</h1>
          <p className="text-gray-500 mt-1 text-sm">
            AI-powered lead intelligence &amp; pipeline tracking
          </p>
        </div>
        <Button className="bg-orange-600 hover:bg-orange-700 text-sm" onClick={openDrawer}>
          <Plus className="w-4 h-4 mr-2" />
          Add Lead
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {error && (
            <div className="m-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Toolbar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-8 text-sm"
              />
            </div>
            <span className="text-xs text-gray-400 ml-1">
              {filteredLeads.length} lead{filteredLeads.length !== 1 ? "s" : ""}
            </span>
            {refreshing && (
              <span className="flex items-center gap-1 text-xs text-orange-500 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Refreshing…
              </span>
            )}
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" className="text-xs h-8">Filter</Button>
              <Button variant="outline" size="sm" className="text-xs h-8">Export</Button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {[
                    "Lead",
                    "Contact",
                    "Industry / Source",
                    "Deal Size",
                    "AI Score",
                    "Offerings",
                    "AI Insight",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left py-2.5 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredLeads.map((lead) => (
                  <Fragment key={lead.id}>
                    {/* ── Main row ── */}
                    <tr
                      onClick={() => toggleExpand(lead.id)}
                      className={`border-b border-gray-100 transition-colors cursor-pointer ${
                        expandedId === lead.id
                          ? "bg-orange-50/40"
                          : "hover:bg-gray-50/70"
                      }`}
                    >
                      {/* Lead */}
                      <td className="py-3 px-4 align-top min-w-[190px]">
                        <div className="font-semibold text-gray-900 leading-tight">
                          {lead.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{lead.company}</div>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusStyle(lead.status)}`}
                          >
                            {lead.status}
                          </span>
                          <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
                            <Calendar className="w-3 h-3" />
                            {formatDate(lead.created_at)}
                          </span>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-4 align-top min-w-[165px]">
                        <div className="space-y-1 text-xs text-gray-600">
                          {lead.email && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              <span className="truncate max-w-[135px]">{lead.email}</span>
                            </div>
                          )}
                          {lead.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              {lead.phone}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Industry / Source */}
                      <td className="py-3 px-4 align-top min-w-[140px]">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            <span className="text-xs text-gray-700 capitalize">
                              {lead.industry || "—"}
                            </span>
                          </div>
                          {lead.source && (
                            <span
                              className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${getSourceStyle(lead.source)}`}
                            >
                              {lead.source}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Deal Size */}
                      <td className="py-3 px-4 align-top min-w-[100px]">
                        <span className="font-semibold text-gray-800 text-sm">
                          {formatDealSize(lead.deal_size)}
                        </span>
                      </td>

                      {/* AI Score */}
                      <td className="py-3 px-4 align-top min-w-[135px]">
                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-bold text-sm ${getScoreBorder(lead.ai_score)} ${getScoreColor(lead.ai_score)}`}
                        >
                          <Star className="w-3.5 h-3.5" />
                          {lead.ai_score !== undefined ? lead.ai_score.toFixed(1) : "—"}
                        </div>
                        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                          <span
                            className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${
                              lead.used_web_evidence
                                ? "bg-teal-100 text-teal-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {lead.used_web_evidence ? "Web ✓" : "Fallback"}
                          </span>
                          {lead.evidence_cards && lead.evidence_cards.length > 0 && (() => {
                            const { cls, Icon } = getStrengthStyle(lead.evidence_cards[0].strength);
                            return (
                              <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5 ${cls}`}>
                                <Icon className="w-3 h-3" />
                                {lead.evidence_cards[0].strength}
                              </span>
                            );
                          })()}
                        </div>
                      </td>

                      {/* Offerings */}
                      <td className="py-3 px-4 align-top min-w-[200px]">
                        {lead.recommended_offerings && lead.recommended_offerings.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {lead.recommended_offerings.slice(0, 2).map((o, idx) => (
                              <span
                                key={idx}
                                className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getOfferingColor(idx)}`}
                              >
                                {o}
                              </span>
                            ))}
                            {lead.recommended_offerings.length > 2 && (
                              <span
                                className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 cursor-help"
                                title={lead.recommended_offerings.slice(2).join(", ")}
                              >
                                +{lead.recommended_offerings.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>

                      {/* AI Insight */}
                      <td className="py-3 px-4 align-top min-w-[210px] max-w-[240px]">
                        {lead.ai_reason && (
                          <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">
                            {lead.ai_reason}
                          </p>
                        )}
                        <button
                          className="mt-1.5 text-[11px] text-orange-600 hover:text-orange-700 font-medium flex items-center gap-0.5"
                          onClick={(e) => { e.stopPropagation(); toggleExpand(lead.id); }}
                        >
                          {expandedId === lead.id ? (
                            <>Collapse <ChevronUp className="w-3 h-3" /></>
                          ) : (
                            <>Full details <ChevronDown className="w-3 h-3" /></>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 align-top">
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/leads/${lead.id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button variant="ghost" size="sm" className="h-7 text-xs px-2">
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              View
                            </Button>
                          </Link>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleExpand(lead.id); }}
                            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {expandedId === lead.id
                              ? <ChevronUp className="w-4 h-4" />
                              : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* ── Expanded detail panel ── */}
                    {expandedId === lead.id && (() => {
                      const bd = parseScoreBreakdown(lead.score_comment);
                      const narrative = getScoreNarrative(lead.score_comment);
                      const intentItems = bd?.items.filter((x) => x.category === "intent") ?? [];
                      const evidenceItems = bd?.items.filter((x) => x.category === "evidence") ?? [];
                      return (
                        <tr className="border-b border-orange-100 bg-gradient-to-b from-orange-50/20 to-white">
                          <td colSpan={8} className="px-6 py-5">

                            {/* ── Level 0: Side-by-side primary view ── */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                              {/* LEFT — Action: what to do */}
                              <div className="space-y-3">
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                  <Target className="w-3 h-3 text-orange-400" /> Sales Strategy
                                </p>
                                <div className="bg-orange-50 rounded-xl border border-orange-200 p-4 space-y-3">
                                  {lead.sales_strategy && (
                                    <p className="text-xs text-gray-700 leading-relaxed">{lead.sales_strategy}</p>
                                  )}
                                  {lead.recommended_offerings && lead.recommended_offerings.length > 0 && (
                                    <div>
                                      <p className="text-[10px] text-orange-500 font-semibold uppercase tracking-wide mb-1.5">Pitch first</p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {lead.recommended_offerings.map((o, idx) => (
                                          <span key={idx} className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getOfferingColor(idx)}`}>
                                            {o}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* RIGHT — Why: reasoning + score narrative */}
                              <div className="space-y-3">
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                  <Brain className="w-3 h-3 text-orange-400" /> AI Analysis
                                </p>
                                <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                                  {lead.ai_reason && (
                                    <p className="text-xs font-medium text-gray-800 leading-relaxed">{lead.ai_reason}</p>
                                  )}
                                  {narrative && (
                                    <p className="text-xs text-gray-500 leading-relaxed border-t border-gray-100 pt-3">{narrative}</p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* ── Show more divider ── */}
                            <div className="mt-4 flex items-center gap-3">
                              <div className="flex-1 h-px bg-orange-100" />
                              <button
                                className="flex items-center gap-1.5 text-[11px] font-semibold text-orange-500 hover:text-orange-700 px-3 py-1 rounded-full border border-orange-200 bg-white hover:bg-orange-50 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailsExpandedId((prev) => prev === lead.id ? null : lead.id);
                                }}
                              >
                                {detailsExpandedId === lead.id ? (
                                  <><ChevronUp className="w-3 h-3" /> Hide evidence & details</>
                                ) : (
                                  <><ChevronDown className="w-3 h-3" /> Show evidence & details</>
                                )}
                              </button>
                              <div className="flex-1 h-px bg-orange-100" />
                            </div>

                            {/* ── Level 1: Side-by-side deep-dive (cascaded) ── */}
                            {detailsExpandedId === lead.id && (
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">

                                {/* LEFT — Evidence: how the score was built */}
                                <div className="space-y-3">
                                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Zap className="w-3 h-3 text-orange-400" /> Evidence & Score Breakdown
                                  </p>

                                  {/* Score breakdown visual */}
                                  {bd && (
                                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                                      <div className="space-y-3">
                                        {bd.intentTotal !== null && (
                                          <div>
                                            <div className="flex justify-between items-center text-[11px] mb-1">
                                              <span className="font-semibold text-orange-600 uppercase tracking-wide">Intent</span>
                                              <span className="font-bold text-gray-700 tabular-nums">{bd.intentTotal} / {bd.intentMax}</span>
                                            </div>
                                            <div className="h-2 bg-orange-100 rounded-full overflow-hidden">
                                              <div className="h-full bg-orange-400 rounded-full" style={{ width: `${(bd.intentTotal / bd.intentMax) * 100}%` }} />
                                            </div>
                                            {intentItems.length > 0 && (
                                              <div className="mt-2 space-y-1 pl-1">
                                                {intentItems.map((item, i) => (
                                                  <div key={i} className="flex justify-between items-center text-[11px]">
                                                    <span className="text-gray-400 capitalize">{item.label.replace(/_/g, " ")}</span>
                                                    <span className={`font-semibold tabular-nums ${item.delta > 0 ? "text-green-600" : item.delta < 0 ? "text-red-500" : "text-gray-300"}`}>
                                                      {item.delta > 0 ? "+" : ""}{item.delta % 1 === 0 ? item.delta.toFixed(0) : item.delta.toFixed(2)}
                                                    </span>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        {bd.evidenceTotal !== null && (
                                          <div className="pt-3 border-t border-gray-100">
                                            <div className="flex justify-between items-center text-[11px] mb-1">
                                              <span className="font-semibold text-teal-600 uppercase tracking-wide">Evidence</span>
                                              <span className="font-bold text-gray-700 tabular-nums">{bd.evidenceTotal} / {bd.evidenceMax}</span>
                                            </div>
                                            <div className="h-2 bg-teal-100 rounded-full overflow-hidden">
                                              <div className="h-full bg-teal-400 rounded-full" style={{ width: `${(bd.evidenceTotal / bd.evidenceMax) * 100}%` }} />
                                            </div>
                                            {evidenceItems.length > 0 && (
                                              <div className="mt-2 space-y-1 pl-1">
                                                {evidenceItems.map((item, i) => (
                                                  <div key={i} className="flex justify-between items-center text-[11px]">
                                                    <span className="text-gray-400 capitalize">{item.label.replace(/_/g, " ")}</span>
                                                    <span className={`font-semibold tabular-nums ${item.delta > 0 ? "text-green-600" : item.delta < 0 ? "text-red-500" : "text-gray-300"}`}>
                                                      {item.delta > 0 ? "+" : ""}{item.delta % 1 === 0 ? item.delta.toFixed(0) : item.delta.toFixed(2)}
                                                    </span>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Evidence cards */}
                                  {lead.evidence_cards && lead.evidence_cards.length > 0 ? (
                                    lead.evidence_cards.map((card, i) => {
                                      const sig = getSignalInfo(card.signal_type);
                                      const { cls, Icon: StrIcon } = getStrengthStyle(card.strength);
                                      return (
                                        <div key={i} className="bg-white rounded-xl border border-gray-200 p-3">
                                          <div className="flex items-start justify-between mb-2 gap-2">
                                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${sig.cls}`}>
                                              {sig.label}
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                              <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5 ${cls}`}>
                                                <StrIcon className="w-3 h-3" />{card.strength}
                                              </span>
                                              <span className={`text-xs font-bold tabular-nums ${card.points >= 0 ? "text-green-600" : "text-red-500"}`}>
                                                {card.points >= 0 ? "+" : ""}{card.points} pts
                                              </span>
                                            </div>
                                          </div>
                                          <p className="text-xs text-gray-700 leading-relaxed">{card.reason}</p>
                                          {card.source_excerpt && (
                                            <p className="mt-2 text-[11px] text-gray-400 italic border-l-2 border-gray-200 pl-2 line-clamp-2">
                                              "{card.source_excerpt}"
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
                                    <p className="text-xs text-gray-400 px-1">No evidence cards available.</p>
                                  )}
                                </div>

                                {/* RIGHT — Lead data: raw input & context */}
                                <div className="space-y-3">
                                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <FileText className="w-3 h-3 text-orange-400" /> Lead Details
                                  </p>

                                  {lead.comments && (
                                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                                        <MessageSquare className="w-3 h-3" /> Sales Notes
                                      </p>
                                      <p className="text-xs text-gray-700 leading-relaxed">{lead.comments}</p>
                                    </div>
                                  )}

                                  {lead.knowledge && (
                                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                                        <Globe className="w-3 h-3" /> Research
                                      </p>
                                      <p className="text-xs text-gray-600 leading-relaxed line-clamp-6">{lead.knowledge}</p>
                                      {lead.knowledge_sources && lead.knowledge_sources.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                                          {lead.knowledge_sources.map((src, i) => (
                                            <a
                                              key={i}
                                              href={src}
                                              target="_blank"
                                              rel="noopener noreferrer"
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

                                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Metadata</p>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                      <span className="text-gray-400">Lead ID</span>
                                      <span className="font-mono text-gray-700 text-right">#{lead.id}</span>
                                      <span className="text-gray-400">Created</span>
                                      <span className="text-gray-700 text-right">{formatDate(lead.created_at)}</span>
                                      <span className="text-gray-400">Web Evidence</span>
                                      <span className={`font-medium text-right ${lead.used_web_evidence ? "text-teal-600" : "text-amber-600"}`}>
                                        {lead.used_web_evidence ? "Yes" : "Fallback"}
                                      </span>
                                      <span className="text-gray-400">Evidence Cards</span>
                                      <span className="text-gray-700 text-right">{lead.evidence_cards?.length ?? 0}</span>
                                      <span className="text-gray-400">Sources</span>
                                      <span className="text-gray-700 text-right">{lead.knowledge_sources?.length ?? 0}</span>
                                    </div>
                                  </div>
                                </div>

                              </div>
                            )}

                          </td>
                        </tr>
                      );
                    })()}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLeads.length === 0 && !error && (
            <div className="text-center py-14">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-medium text-gray-900 mb-1">No leads found</h3>
              <p className="text-gray-500 text-sm">
                {searchTerm
                  ? "Try adjusting your search terms."
                  : "Get started by adding your first lead."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add Lead Drawer ── */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={closeDrawer}
          />

          {/* Panel */}
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Add New Lead</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  AI scoring runs automatically after creation
                </p>
              </div>
              <button
                onClick={closeDrawer}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body — scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

              {/* Name + Company */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="Aarav Mehta"
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Company <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="GSK"
                    value={form.company}
                    onChange={(e) => setField("company", e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              {/* Email + Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <Input
                    type="email"
                    placeholder="name@company.com"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                  <Input
                    placeholder="+91-9876543210"
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              {/* Industry + Source */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Industry</label>
                  <Input
                    placeholder="pharma, logistics…"
                    value={form.industry}
                    onChange={(e) => setField("industry", e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Source</label>
                  <Select value={form.source} onValueChange={(v) => setField("source", v)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="demo request">Demo Request</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Deal Size */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Deal Size (USD)
                </label>
                <Input
                  type="number"
                  min={0}
                  placeholder="250000"
                  value={form.deal_size}
                  onChange={(e) => setField("deal_size", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>

              {/* Comments */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Sales Notes / Comments
                </label>
                <textarea
                  rows={3}
                  placeholder="Key pain points, conversation context…"
                  value={form.comments}
                  onChange={(e) => setField("comments", e.target.value)}
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Knowledge */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Company Knowledge
                  <span className="ml-1 text-gray-400 font-normal">(used by AI for scoring)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Large-size company expanding its sales team in APAC…"
                  value={form.knowledge}
                  onChange={(e) => setField("knowledge", e.target.value)}
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                />
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 space-y-3">
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700 font-medium">
                  Lead created! AI scoring is running in the background.
                </div>
              )}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={closeDrawer}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                  onClick={handleSubmit}
                  disabled={submitting || formSuccess}
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</>
                  ) : (
                    <><Plus className="w-4 h-4 mr-2" />Create Lead</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
