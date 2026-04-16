"use client";

import { useEffect, useState, Fragment, useRef } from "react";
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
  Upload,
  Download,
  SlidersHorizontal,
  Pencil,
  CheckCircle2,
  AlertCircle,
  Filter,
} from "lucide-react";
import API, { extractArray } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { getPipelineStage, PIPELINE_STAGE_ORDER } from "@/lib/pipeline";

/* ── Types ─────────────────────────────────────────────────────────── */

const BLANK_FORM = {
  name: "",
  company: "",
  email: "",
  phone: "",
  industry: "",
  deal_size: "",
  source: "",
  status: "",
  comments: "",
  tags: "",
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
  tags?: string[];
  assigned_to?: string;
  status: string;
  created_at: string;
}

interface FilterOptions {
  industries: string[];
  sources: string[];
}

interface ActiveFilters {
  status: string;
  industry: string;
  source: string;
  min_deal: string;
  max_deal: string;
  min_score: string;
  max_score: string;
}

const BLANK_FILTERS: ActiveFilters = {
  status: "",
  industry: "",
  source: "",
  min_deal: "",
  max_deal: "",
  min_score: "",
  max_score: "",
};

interface ImportResult {
  created: number;
  updated: number;
  imported: number;
  failed: number;
  errors: { row: number; error: string }[];
}

/* ── Formatters & helpers ───────────────────────────────────────────── */

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

const getStatusStyle = (status: string) => getPipelineStage(status).badge;

const getSourceStyle = (source?: string) => {
  switch (source?.toLowerCase()) {
    case "linkedin": return "bg-blue-100 text-blue-700";
    case "website": case "web": return "bg-teal-100 text-teal-700";
    case "referral": return "bg-purple-100 text-purple-700";
    case "email": return "bg-yellow-100 text-yellow-700";
    case "demo request": return "bg-orange-100 text-orange-700";
    default: return "bg-gray-100 text-gray-600";
  }
};

const getStrengthStyle = (strength: string) => {
  switch (strength) {
    case "high": return { cls: "bg-green-100 text-green-700", Icon: TrendingUp };
    case "medium": return { cls: "bg-yellow-100 text-yellow-700", Icon: Minus };
    case "low": return { cls: "bg-red-100 text-red-600", Icon: TrendingDown };
    default: return { cls: "bg-gray-100 text-gray-600", Icon: Minus };
  }
};

const getSignalInfo = (signalType: string) => {
  const map: Record<string, { label: string; cls: string }> = {
    no_evidence: { label: "No Evidence", cls: "bg-gray-100 text-gray-600" },
    industry_match: { label: "Industry Match", cls: "bg-green-100 text-green-700" },
    company_research: { label: "Company Research", cls: "bg-blue-100 text-blue-700" },
    negative_signal: { label: "Negative Signal", cls: "bg-red-100 text-red-600" },
    positive_signal: { label: "Positive Signal", cls: "bg-green-100 text-green-700" },
    web_research: { label: "Web Research", cls: "bg-teal-100 text-teal-700" },
  };
  return map[signalType] ?? { label: signalType.replace(/_/g, " "), cls: "bg-gray-100 text-gray-600" };
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
};

const getScoreNarrative = (scoreComment?: string): string | undefined => {
  if (!scoreComment) return undefined;
  const idx = scoreComment.indexOf("Score breakdown:");
  const narrative = idx === -1 ? scoreComment : scoreComment.substring(0, idx).trim();
  return narrative || undefined;
};

const countActiveFilters = (f: ActiveFilters) =>
  Object.values(f).filter((v) => v !== "").length;

/* ── Main component ──────────────────────────────────────────────────── */

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detailsExpandedId, setDetailsExpandedId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Add / Edit drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);

  // Filter panel
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<ActiveFilters>({ ...BLANK_FILTERS });
  const [pendingFilters, setPendingFilters] = useState<ActiveFilters>({ ...BLANK_FILTERS });
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ industries: [], sources: [] });

  // CSV Import modal
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchLeads(); fetchFilterOptions(); }, []);

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

  const buildFilterParams = (f: ActiveFilters) => {
    const params: Record<string, string> = {};
    if (f.status) params.status = f.status;
    if (f.industry) params.industry = f.industry;
    if (f.source) params.source = f.source;
    if (f.min_deal) params.min_deal = f.min_deal;
    if (f.max_deal) params.max_deal = f.max_deal;
    if (f.min_score) params.min_score = f.min_score;
    if (f.max_score) params.max_score = f.max_score;
    return params;
  };

  const fetchLeads = async (isRefresh = false, activeFilters?: ActiveFilters) => {
    if (isRefresh) setRefreshing(true);
    try {
      const params = buildFilterParams(activeFilters ?? filters);
      const res = await API.get("/leads", { params });
      const data = extractArray<Lead>(res.data);
      setLeads(data);
      setFilteredLeads(data);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load leads. Please refresh the page."));
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const res = await API.get("/leads/filter-options");
      setFilterOptions({
        industries: res.data.industries ?? [],
        sources: res.data.sources ?? [],
      });
    } catch {
      // non-critical
    }
  };

  /* ── Filter handlers ── */
  const openFilter = () => {
    setPendingFilters({ ...filters });
    setFilterOpen(true);
  };

  const applyFilters = () => {
    setFilters({ ...pendingFilters });
    setFilterOpen(false);
    setLoading(true);
    fetchLeads(false, pendingFilters);
  };

  const clearFilters = () => {
    const blank = { ...BLANK_FILTERS };
    setFilters(blank);
    setPendingFilters(blank);
    setFilterOpen(false);
    setLoading(true);
    fetchLeads(false, blank);
  };

  /* ── Add / Edit drawer ── */
  const openAddDrawer = () => {
    setEditingLead(null);
    setForm({ ...BLANK_FORM });
    setFormError("");
    setFormSuccess(false);
    setDrawerOpen(true);
  };

  const openEditDrawer = (lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLead(lead);
    setForm({
      name: lead.name ?? "",
      company: lead.company ?? "",
      email: lead.email ?? "",
      phone: lead.phone ?? "",
      industry: lead.industry ?? "",
      deal_size: lead.deal_size != null ? String(lead.deal_size) : "",
      source: lead.source ?? "",
      status: lead.status ?? "",
      comments: lead.comments ?? "",
      tags: (lead.tags ?? []).join(", "),
    });
    setFormError("");
    setFormSuccess(false);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (submitting) return;
    setDrawerOpen(false);
    setEditingLead(null);
  };

  const setField = (field: keyof typeof BLANK_FORM, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.company.trim()) {
      setFormError("Name and company are required.");
      return;
    }
    if (!editingLead && !form.email.trim()) {
      setFormError("Email is required.");
      return;
    }
    if (!editingLead) {
      if (!form.industry.trim()) { setFormError("Industry is required."); return; }
      if (!form.source.trim()) { setFormError("Source is required."); return; }
      if (!form.deal_size) { setFormError("Deal Size is required."); return; }
    }
    setFormError("");
    setSubmitting(true);
    try {
      const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
      if (editingLead) {
        await API.patch(`/leads/${editingLead.id}`, {
          name: form.name.trim(),
          company: form.company.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          industry: form.industry.trim() || undefined,
          deal_size: form.deal_size ? parseFloat(form.deal_size) : undefined,
          source: form.source.trim() || undefined,
          status: form.status || undefined,
          comments: form.comments.trim() || undefined,
          tags,
        });
      } else {
        await API.post("/leads", {
          name: form.name.trim(),
          company: form.company.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          industry: form.industry.trim(),
          deal_size: parseFloat(form.deal_size),
          source: form.source.trim(),
          comments: form.comments.trim() || undefined,
          tags,
        });
      }
      setFormSuccess(true);
      await fetchLeads(true);
      setTimeout(() => setDrawerOpen(false), 1000);
    } catch (err) {
      setFormError(getErrorMessage(err, `Failed to ${editingLead ? "update" : "create"} lead.`));
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Export CSV ── */
  const handleExport = () => {
    const params = new URLSearchParams(buildFilterParams(filters) as Record<string, string>);
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const url = `http://localhost:8000/leads/export-csv?${params.toString()}`;
    const a = document.createElement("a");
    a.href = url;
    if (token) {
      // Fetch with auth header and trigger download
      fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => res.blob())
        .then((blob) => {
          const blobUrl = URL.createObjectURL(blob);
          a.href = blobUrl;
          a.download = "leads-export.csv";
          a.click();
          URL.revokeObjectURL(blobUrl);
        });
    } else {
      a.download = "leads-export.csv";
      a.click();
    }
  };

  /* ── CSV Import ── */
  const openImport = () => {
    setImportFile(null);
    setImportResult(null);
    setImportOpen(true);
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      const res = await API.post("/leads/import-csv", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImportResult(res.data);
      await fetchLeads(true);
    } catch (err) {
      setImportResult({
        created: 0, updated: 0, imported: 0, failed: 1,
        errors: [{ row: 0, error: getErrorMessage(err, "Import failed.") }],
      });
    } finally {
      setImporting(false);
    }
  };

  const toggleExpand = (id: number) =>
    setExpandedId((prev) => (prev === id ? null : id));

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="p-8 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-56" />
        <div className="h-10 bg-gray-200 rounded" />
        {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-200 rounded" />)}
      </div>
    );
  }

  const activeFilterCount = countActiveFilters(filters);

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {leads.length} lead{leads.length !== 1 ? "s" : ""} · AI-powered intelligence &amp; pipeline tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="text-sm" onClick={openImport}>
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button className="bg-orange-600 hover:bg-orange-700 text-sm" onClick={openAddDrawer}>
            <Plus className="w-4 h-4 mr-2" />
            Add Lead
          </Button>
        </div>
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
                placeholder="Search leads…"
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
              <Button
                variant="outline"
                size="sm"
                className={`text-xs h-8 ${activeFilterCount > 0 ? "border-orange-400 text-orange-600 bg-orange-50" : ""}`}
                onClick={openFilter}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
                Filter
                {activeFilterCount > 0 && (
                  <span className="ml-1.5 bg-orange-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-8" onClick={handleExport}>
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Export
              </Button>
            </div>
          </div>

          {/* Active filter chips */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border-b border-orange-100 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              {filters.status && (
                <span className="text-xs bg-white border border-orange-200 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                  Status: {filters.status}
                </span>
              )}
              {filters.industry && (
                <span className="text-xs bg-white border border-orange-200 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                  Industry: {filters.industry}
                </span>
              )}
              {filters.source && (
                <span className="text-xs bg-white border border-orange-200 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                  Source: {filters.source}
                </span>
              )}
              {(filters.min_deal || filters.max_deal) && (
                <span className="text-xs bg-white border border-orange-200 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                  Deal: {filters.min_deal ? `$${filters.min_deal}` : "any"} – {filters.max_deal ? `$${filters.max_deal}` : "any"}
                </span>
              )}
              {(filters.min_score || filters.max_score) && (
                <span className="text-xs bg-white border border-orange-200 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                  Score: {filters.min_score || "0"} – {filters.max_score || "100"}
                </span>
              )}
              <button
                onClick={clearFilters}
                className="ml-auto text-xs text-orange-600 hover:text-orange-800 font-medium underline"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {["Lead", "Contact", "Industry / Source", "Deal Size", "AI Score", "Offerings", "AI Insight", "Actions"].map((h) => (
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
                    {/* Main row */}
                    <tr
                      onClick={() => toggleExpand(lead.id)}
                      className={`border-b border-gray-100 transition-colors cursor-pointer ${
                        expandedId === lead.id ? "bg-orange-50/40" : "hover:bg-gray-50/70"
                      }`}
                    >
                      {/* Lead */}
                      <td className="py-3 px-4 align-top min-w-[190px]">
                        <div className="font-semibold text-gray-900 leading-tight">{lead.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{lead.company}</div>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusStyle(lead.status)}`}>
                            {getPipelineStage(lead.status).label}
                          </span>
                          <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
                            <Calendar className="w-3 h-3" />
                            {formatDate(lead.created_at)}
                          </span>
                        </div>
                        {lead.tags && lead.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {lead.tags.slice(0, 2).map((tag, i) => (
                              <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
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
                            <span className="text-xs text-gray-700 capitalize">{lead.industry || "—"}</span>
                          </div>
                          {lead.source && (
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${getSourceStyle(lead.source)}`}>
                              {lead.source}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Deal Size */}
                      <td className="py-3 px-4 align-top min-w-[100px]">
                        <span className="font-semibold text-gray-800 text-sm">{formatDealSize(lead.deal_size)}</span>
                      </td>

                      {/* AI Score */}
                      <td className="py-3 px-4 align-top min-w-[135px]">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-bold text-sm ${getScoreBorder(lead.ai_score)} ${getScoreColor(lead.ai_score)}`}>
                          <Star className="w-3.5 h-3.5" />
                          {lead.ai_score !== undefined ? lead.ai_score.toFixed(1) : "—"}
                        </div>
                        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                          <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${lead.used_web_evidence ? "bg-teal-100 text-teal-700" : "bg-amber-100 text-amber-700"}`}>
                            {lead.used_web_evidence ? "Web ✓" : "Fallback"}
                          </span>
                          {lead.evidence_cards && lead.evidence_cards.length > 0 && (() => {
                            const { cls, Icon } = getStrengthStyle(lead.evidence_cards[0].strength);
                            return (
                              <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5 ${cls}`}>
                                <Icon className="w-3 h-3" />{lead.evidence_cards[0].strength}
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
                              <span key={idx} className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getOfferingColor(idx)}`}>
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
                          <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">{lead.ai_reason}</p>
                        )}
                        <button
                          className="mt-1.5 text-[11px] text-orange-600 hover:text-orange-700 font-medium flex items-center gap-0.5"
                          onClick={(e) => { e.stopPropagation(); toggleExpand(lead.id); }}
                        >
                          {expandedId === lead.id ? <>Collapse <ChevronUp className="w-3 h-3" /></> : <>Full details <ChevronDown className="w-3 h-3" /></>}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 align-top">
                        <div className="flex items-center gap-1">
                          <Link href={`/leads/${lead.id}`} onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-7 text-xs px-2">
                              <Eye className="w-3.5 h-3.5 mr-1" />View
                            </Button>
                          </Link>
                          <button
                            onClick={(e) => openEditDrawer(lead, e)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-orange-600 transition-colors"
                            title="Edit lead"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleExpand(lead.id); }}
                            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {expandedId === lead.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded detail panel */}
                    {expandedId === lead.id && (() => {
                      const bd = parseScoreBreakdown(lead.score_comment);
                      const narrative = getScoreNarrative(lead.score_comment);
                      const intentItems = bd?.items.filter((x) => x.category === "intent") ?? [];
                      const evidenceItems = bd?.items.filter((x) => x.category === "evidence") ?? [];
                      return (
                        <tr className="border-b border-orange-100 bg-gradient-to-b from-orange-50/20 to-white">
                          <td colSpan={8} className="px-6 py-5">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                                          <span key={idx} className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getOfferingColor(idx)}`}>{o}</span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
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

                            <div className="mt-4 flex items-center gap-3">
                              <div className="flex-1 h-px bg-orange-100" />
                              <button
                                className="flex items-center gap-1.5 text-[11px] font-semibold text-orange-500 hover:text-orange-700 px-3 py-1 rounded-full border border-orange-200 bg-white hover:bg-orange-50 transition-colors"
                                onClick={(e) => { e.stopPropagation(); setDetailsExpandedId((prev) => prev === lead.id ? null : lead.id); }}
                              >
                                {detailsExpandedId === lead.id
                                  ? <><ChevronUp className="w-3 h-3" /> Hide evidence &amp; details</>
                                  : <><ChevronDown className="w-3 h-3" /> Show evidence &amp; details</>}
                              </button>
                              <div className="flex-1 h-px bg-orange-100" />
                            </div>

                            {detailsExpandedId === lead.id && (
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                                <div className="space-y-3">
                                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Zap className="w-3 h-3 text-orange-400" /> Evidence &amp; Score Breakdown
                                  </p>
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
                                  {lead.evidence_cards && lead.evidence_cards.length > 0 ? (
                                    lead.evidence_cards.map((card, i) => {
                                      const sig = getSignalInfo(card.signal_type);
                                      const { cls, Icon: StrIcon } = getStrengthStyle(card.strength);
                                      return (
                                        <div key={i} className="bg-white rounded-xl border border-gray-200 p-3">
                                          <div className="flex items-start justify-between mb-2 gap-2">
                                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${sig.cls}`}>{sig.label}</span>
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
                                    <p className="text-xs text-gray-400 px-1">No evidence cards available.</p>
                                  )}
                                </div>

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
                                            <a key={i} href={src} target="_blank" rel="noopener noreferrer"
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
                                      {lead.assigned_to && <>
                                        <span className="text-gray-400">Assigned To</span>
                                        <span className="text-gray-700 text-right">{lead.assigned_to}</span>
                                      </>}
                                      <span className="text-gray-400">Web Evidence</span>
                                      <span className={`font-medium text-right ${lead.used_web_evidence ? "text-teal-600" : "text-amber-600"}`}>
                                        {lead.used_web_evidence ? "Yes" : "Fallback"}
                                      </span>
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
                {searchTerm || activeFilterCount > 0
                  ? "Try adjusting your search or filters."
                  : "Get started by adding your first lead."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add / Edit Lead Drawer ── */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={closeDrawer} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingLead ? "Edit Lead" : "Add New Lead"}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editingLead ? `Editing ${editingLead.name}` : "AI scoring runs automatically after creation"}
                </p>
              </div>
              <button onClick={closeDrawer} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                  <Input placeholder="Aarav Mehta" value={form.name} onChange={(e) => setField("name", e.target.value)} className="h-8 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Company <span className="text-red-500">*</span></label>
                  <Input placeholder="Acme Corp" value={form.company} onChange={(e) => setField("company", e.target.value)} className="h-8 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Email {!editingLead && <span className="text-red-500">*</span>}
                  </label>
                  <Input type="email" placeholder="name@company.com" value={form.email} onChange={(e) => setField("email", e.target.value)} className="h-8 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                  <Input placeholder="+91-9876543210" value={form.phone} onChange={(e) => setField("phone", e.target.value)} className="h-8 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Industry {!editingLead && <span className="text-red-500">*</span>}
                  </label>
                  <Input placeholder="pharma, logistics…" value={form.industry} onChange={(e) => setField("industry", e.target.value)} className="h-8 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Source {!editingLead && <span className="text-red-500">*</span>}
                  </label>
                  <Input placeholder="LinkedIn, Website, Referral…" value={form.source} onChange={(e) => setField("source", e.target.value)} className="h-8 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Deal Size (USD) {!editingLead && <span className="text-red-500">*</span>}
                  </label>
                  <Input type="number" min={0} placeholder="250000" value={form.deal_size} onChange={(e) => setField("deal_size", e.target.value)} className="h-8 text-sm" />
                </div>
                {editingLead && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                    <Select value={form.status} onValueChange={(v) => setField("status", v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select status" /></SelectTrigger>
                      <SelectContent>
                        {PIPELINE_STAGE_ORDER.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tags <span className="text-gray-400 font-normal">(comma separated)</span></label>
                <Input placeholder="enterprise, high-priority, APAC" value={form.tags} onChange={(e) => setField("tags", e.target.value)} className="h-8 text-sm" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Sales Notes / Comments</label>
                <textarea
                  rows={3}
                  placeholder="Key pain points, conversation context…"
                  value={form.comments}
                  onChange={(e) => setField("comments", e.target.value)}
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                />
              </div>

            </div>

            <div className="px-6 py-4 border-t border-gray-200 space-y-3">
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{formError}</div>
              )}
              {formSuccess && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700 font-medium">
                  {editingLead ? "Lead updated successfully!" : "Lead created! AI scoring is running in the background."}
                </div>
              )}
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={closeDrawer} disabled={submitting}>Cancel</Button>
                <Button className="flex-1 bg-orange-600 hover:bg-orange-700" onClick={handleSubmit} disabled={submitting || formSuccess}>
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{editingLead ? "Saving…" : "Creating…"}</>
                  ) : (
                    <>{editingLead ? <><Pencil className="w-4 h-4 mr-2" />Save Changes</> : <><Plus className="w-4 h-4 mr-2" />Create Lead</>}</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Filter Drawer ── */}
      {filterOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setFilterOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-orange-500" />
                <h2 className="text-base font-semibold text-gray-900">Filter Leads</h2>
              </div>
              <button onClick={() => setFilterOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Status</label>
                <Select value={pendingFilters.status} onValueChange={(v) => setPendingFilters((p) => ({ ...p, status: v === "_all" ? "" : v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Any status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Any status</SelectItem>
                    {PIPELINE_STAGE_ORDER.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Industry</label>
                <Select value={pendingFilters.industry} onValueChange={(v) => setPendingFilters((p) => ({ ...p, industry: v === "_all" ? "" : v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Any industry" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Any industry</SelectItem>
                    {filterOptions.industries.map((ind) => (
                      <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Source</label>
                <Select value={pendingFilters.source} onValueChange={(v) => setPendingFilters((p) => ({ ...p, source: v === "_all" ? "" : v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Any source" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Any source</SelectItem>
                    {filterOptions.sources.length > 0
                      ? filterOptions.sources.map((src) => <SelectItem key={src} value={src}>{src}</SelectItem>)
                      : ["linkedin", "website", "referral", "email", "demo request", "other"].map((src) => (
                          <SelectItem key={src} value={src} className="capitalize">{src}</SelectItem>
                        ))
                    }
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Deal Size (USD)</label>
                <div className="flex gap-2">
                  <Input
                    type="number" min={0} placeholder="Min"
                    value={pendingFilters.min_deal}
                    onChange={(e) => setPendingFilters((p) => ({ ...p, min_deal: e.target.value }))}
                    className="h-9 text-sm"
                  />
                  <Input
                    type="number" min={0} placeholder="Max"
                    value={pendingFilters.max_deal}
                    onChange={(e) => setPendingFilters((p) => ({ ...p, max_deal: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">AI Score (0–100)</label>
                <div className="flex gap-2">
                  <Input
                    type="number" min={0} max={100} placeholder="Min"
                    value={pendingFilters.min_score}
                    onChange={(e) => setPendingFilters((p) => ({ ...p, min_score: e.target.value }))}
                    className="h-9 text-sm"
                  />
                  <Input
                    type="number" min={0} max={100} placeholder="Max"
                    value={pendingFilters.max_score}
                    onChange={(e) => setPendingFilters((p) => ({ ...p, max_score: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-200 space-y-2">
              <Button className="w-full bg-orange-600 hover:bg-orange-700 text-sm" onClick={applyFilters}>
                Apply Filters
              </Button>
              <Button variant="outline" className="w-full text-sm" onClick={clearFilters}>
                Clear All Filters
              </Button>
            </div>
          </div>
        </>
      )}

      {/* ── CSV Import Modal ── */}
      {importOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => { if (!importing) setImportOpen(false); }} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Import Leads from CSV</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Upload a CSV file to bulk import or update leads</p>
                </div>
                <button onClick={() => { if (!importing) setImportOpen(false); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                {/* File drop zone */}
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    importFile ? "border-orange-400 bg-orange-50" : "border-gray-200 hover:border-orange-300 hover:bg-orange-50/30"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file && file.name.endsWith(".csv")) setImportFile(file);
                  }}
                >
                  <Upload className={`w-8 h-8 mx-auto mb-2 ${importFile ? "text-orange-500" : "text-gray-300"}`} />
                  {importFile ? (
                    <div>
                      <p className="text-sm font-medium text-orange-700">{importFile.name}</p>
                      <p className="text-xs text-orange-500 mt-0.5">{(importFile.size / 1024).toFixed(1)} KB · Click to change</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Click to select a CSV file</p>
                      <p className="text-xs text-gray-400 mt-1">or drag and drop here</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setImportFile(file);
                    }}
                  />
                </div>

                {/* CSV format hint */}
                <div className="bg-gray-50 rounded-lg px-4 py-3 text-xs text-gray-500 space-y-1">
                  <p className="font-semibold text-gray-600">Expected CSV columns:</p>
                  <p>Name*, Company*, Email*, Phone, Industry, Source, Deal Size, Status, Tags, Comments</p>
                  <p className="text-gray-400">* Required for new leads. Existing leads are matched by email and updated.</p>
                </div>

                {/* Import result */}
                {importResult && (
                  <div className={`rounded-xl border p-4 space-y-2 ${importResult.failed > 0 && importResult.imported === 0 ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}`}>
                    <div className="flex items-center gap-2">
                      {importResult.failed > 0 && importResult.imported === 0
                        ? <AlertCircle className="w-4 h-4 text-red-500" />
                        : <CheckCircle2 className="w-4 h-4 text-green-600" />}
                      <p className="text-sm font-semibold text-gray-800">Import complete</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white rounded-lg py-2">
                        <p className="text-lg font-bold text-green-600">{importResult.created}</p>
                        <p className="text-[11px] text-gray-500">Created</p>
                      </div>
                      <div className="bg-white rounded-lg py-2">
                        <p className="text-lg font-bold text-blue-600">{importResult.updated}</p>
                        <p className="text-[11px] text-gray-500">Updated</p>
                      </div>
                      <div className="bg-white rounded-lg py-2">
                        <p className="text-lg font-bold text-red-500">{importResult.failed}</p>
                        <p className="text-[11px] text-gray-500">Failed</p>
                      </div>
                    </div>
                    {importResult.errors.length > 0 && (
                      <div className="mt-2 max-h-28 overflow-y-auto space-y-1">
                        {importResult.errors.map((e, i) => (
                          <p key={i} className="text-[11px] text-red-600">
                            Row {e.row}: {e.error}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setImportOpen(false)} disabled={importing}>
                  {importResult ? "Close" : "Cancel"}
                </Button>
                {!importResult && (
                  <Button
                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                    onClick={handleImport}
                    disabled={!importFile || importing}
                  >
                    {importing ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing…</>
                    ) : (
                      <><Upload className="w-4 h-4 mr-2" />Import</>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
