"use client";

import { useEffect, useState, Fragment, useRef } from "react";
import { useScoreStream } from "@/hooks/useScoreStream";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Plus, Eye, Star, Mail, Phone, Users, ChevronDown, ChevronUp,
  Globe, Building2, Calendar, Brain, Clock, XCircle, MessageSquare,
  Target, TrendingUp, TrendingDown, Minus, ExternalLink, Zap, FileText,
  X, Loader2, Upload, Download, SlidersHorizontal, Pencil, CheckCircle2,
  AlertCircle, Filter, Briefcase, Sparkles, LayoutList, AlignJustify,
  Flame, Thermometer, Activity, AlertTriangle, BookOpen,
} from "lucide-react";
import API, { extractArray } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";
import { getErrorMessage } from "@/lib/errors";
import { getPipelineStage, PIPELINE_STAGE_ORDER } from "@/lib/pipeline";
import { Pagination } from "@/components/pagination";
import { LeadsAIQueryBar } from "@/components/leads/LeadsAIQueryBar";
import { SuggestedPromptChips } from "@/components/leads/SuggestedPromptChips";
import { QueryInterpretationBanner } from "@/components/leads/QueryInterpretationBanner";
import { QueryLoadingState } from "@/components/leads/QueryLoadingState";
import { ContextualAskAIButton } from "@/components/chat/ContextualAskAIButton";
import { useChatPageContext } from "@/hooks/useChatContext";
import { QueryErrorState } from "@/components/leads/QueryErrorState";
import type { NLQueryResponse } from "@/components/leads/nl-query-types";
import { StageView } from "./StageView";
import type { StageLead } from "./StageView";

/* ── Types ─────────────────────────────────────────────────────────── */

const BLANK_FORM = {
  name: "",
  deal_size: "",
  status: "new",
  comments: "",
  tags: "",
};

interface EvidenceCard {
  points?: number;
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
  score_breakdown?: {
    components?: { label: string; value: number; reason: string }[];
    intent_score?: number;
    evidence_score?: number;
    final_score?: number;
    summary?: string;
    score_breakdown?: {
      components?: { label: string; value: number; reason: string }[];
      intent_score?: number;
      evidence_score?: number;
    };
  };
  final_score_breakdown?: {
    summary?: string;
    components?: { component: string; category: string; points: number; reason: string; running_total: number; formula: string }[];
    totals?: { intent_score: number; evidence_score: number; raw_score: number; final_score: number };
    final_policy_reason?: string;
  };
  sales_strategy?: string;
  recommended_offerings?: string[];
  tags?: string[];
  assigned_to?: string;
  contact_id?: number;
  company_id_assoc?: number;
  status: string;
  created_at: string;
  scoring_status?: string;
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

type NLQueryResult = NLQueryResponse<Lead & { hybrid_score?: number }>;

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
    "bg-indigo-50 text-indigo-700 border border-indigo-100",
    "bg-violet-50 text-violet-700 border border-violet-100",
    "bg-emerald-50 text-emerald-700 border border-emerald-100",
    "bg-orange-50 text-orange-700 border border-orange-100",
    "bg-pink-50 text-pink-700 border border-pink-100",
  ];
  return colors[index % colors.length];
};

const getScoreColor = (score?: number, scoringStatus?: string) => {
  if (scoringStatus === "pending" || scoringStatus === "scoring") return "text-blue-500";
  if (scoringStatus === "failed") return "text-red-400";
  if (!score) return "text-slate-400";
  if (score >= 80) return "text-emerald-700";
  if (score >= 60) return "text-amber-700";
  return "text-red-600";
};

const getScoreBorder = (score?: number, scoringStatus?: string) => {
  if (scoringStatus === "pending") return "border-slate-200 bg-slate-50";
  if (scoringStatus === "scoring") return "border-blue-200 bg-blue-50";
  if (scoringStatus === "failed") return "border-red-200 bg-red-50";
  if (!score) return "border-slate-200 bg-slate-50";
  if (score >= 80) return "border-emerald-200 bg-emerald-50";
  if (score >= 60) return "border-amber-200 bg-amber-50";
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
  const intentMatch = scoreComment.match(/intent\s+(?:subtotal\s+)?([\d.]+)\/([\d]+)/i);
  const evidenceMatch = scoreComment.match(/evidence\s+(?:subtotal\s+)?([\d.]+)\/([\d]+)/i);
  const items: ScoreBreakdown["items"] = [];
  const itemRegex = /(intent|evidence):\s*([^\n]+?):\s*([+-][\d.]+)\s*->\s*([\d.]+)/gi;
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

const BREAKDOWN_RE = /(?:exact\s+)?score\s+breakdown:/i;

const getScoreNarrative = (scoreComment?: string): string | undefined => {
  if (!scoreComment) return undefined;
  const match = BREAKDOWN_RE.exec(scoreComment);
  const narrative = match ? scoreComment.substring(0, match.index).trim() : scoreComment;
  return narrative || undefined;
};

const countActiveFilters = (f: ActiveFilters) =>
  Object.values(f).filter((v) => v !== "").length;

interface ParsedKnowledge {
  context?: string;
  sellerPoints: { title: string; body: string }[];
  campaignContext?: string;
}

const KNOWLEDGE_TITLES = [
  "Lead Situation & Signals",
  "Company Activity",
  "Decision Context",
  "Competitive Landscape",
  "Financial & Growth Signals",
];

function parseKnowledge(text?: string): ParsedKnowledge {
  if (!text) return { sellerPoints: [] };
  const contextMatch = text.match(/Lead Context[:\s]+([\s\S]*?)(?=\n\s*Seller-Relevant|$)/i);
  const context = contextMatch ? contextMatch[1].trim() : undefined;
  const sellerSection = text.match(/Seller-Relevant Knowledge[:\s]+([\s\S]*?)(?=\n\s*Why This Matters|$)/i);
  const sellerPoints: ParsedKnowledge["sellerPoints"] = [];
  if (sellerSection) {
    const pointRegex = /(\d+)\.\s+([\s\S]*?)(?=\n\s*\d+\.|$)/g;
    let m;
    while ((m = pointRegex.exec(sellerSection[1])) !== null) {
      const idx = parseInt(m[1]) - 1;
      sellerPoints.push({ title: KNOWLEDGE_TITLES[idx] ?? `Point ${m[1]}`, body: m[2].trim() });
    }
  }
  const campaignMatch = text.match(/Why This Matters[^:]*:[:\s]+([\s\S]*?)(?=\n\s*Best-Fit Products|$)/i);
  const campaignContext = campaignMatch ? campaignMatch[1].trim() : undefined;
  return { context, sellerPoints, campaignContext };
}

type SmartFilter = "all" | "hot" | "warm" | "with_evidence" | "high_intent" | "needs_action";

/* ── Main component ──────────────────────────────────────────────────── */

const PER_PAGE = 25;

export default function LeadsPage() {
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
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

  // Association search for Add Lead
  const [assocType, setAssocType] = useState<"contact" | "company">("contact");
  const [assocSearch, setAssocSearch] = useState("");
  const [assocResults, setAssocResults] = useState<{ id: number; label: string; sub: string; company_id?: number; industry?: string; source?: string }[]>([]);
  const [selectedAssoc, setSelectedAssoc] = useState<{ id: number; label: string; type: "contact" | "company" } | null>(null);
  const [assocSearching, setAssocSearching] = useState(false);
  const [companyIndustry, setCompanyIndustry] = useState<string>("");
  const [contactDetails, setContactDetails] = useState<{ company_name?: string; industry?: string; source?: string } | null>(null);

  // AI natural-language query
  const [aiQuery, setAiQuery] = useState("");
  const [aiSearching, setAiSearching] = useState(false);
  const [aiResult, setAiResult] = useState<NLQueryResult | null>(null);
  const [aiError, setAiError] = useState("");
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  // View toggle
  const [view, setView] = useState<"stage" | "table">("stage");

  // AI smart filter
  const [smartFilter, setSmartFilter] = useState<SmartFilter>("all");

  // CSV Import modal
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pageRef = useRef(page);
  const searchTermRef = useRef(searchTerm);
  const filtersRef = useRef(filters);

  // SSE for single-add: tracks the one newly created lead until it is scored.
  const [sseLeadId, setSseLeadId] = useState<number | null>(null);
  const [sseLeadStatus, setSseLeadStatus] = useState<string>("pending");
  const { liveStatus: leadLiveStatus } = useScoreStream({
    entityType: "lead",
    entityId: sseLeadId,
    initialStatus: sseLeadStatus,
    onComplete: async () => {
      if (sseLeadId) {
        try {
          const res = await API.get(`/leads/${sseLeadId}`);
          setFilteredLeads((prev) => prev.map((l) => (l.id === sseLeadId ? res.data : l)));
        } catch { /* ignore */ }
      }
      setSseLeadId(null);
    },
  });

  useChatPageContext({
    page: "leads",
    entity_type: "lead",
    suggested_prompts: [
      "Summarize top leads this week",
      "Which leads need immediate follow-up?",
      "Explain the AI scoring for leads",
      "Draft a follow-up email for hot leads",
    ],
  });

  useEffect(() => { fetchFilterOptions(); }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchLeads(false, filters, page); }, [page]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (page !== 1) setPage(1);
      else fetchLeads(false, filters, 1);
    }, 350);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  useEffect(() => { pageRef.current = page; }, [page]);
  useEffect(() => { searchTermRef.current = searchTerm; }, [searchTerm]);
  useEffect(() => { filtersRef.current = filters; }, [filters]);

  // Propagate SSE live status to the tracked row in real time.
  useEffect(() => {
    if (!sseLeadId || !leadLiveStatus) return;
    setFilteredLeads((prev) =>
      prev.map((l) => (l.id === sseLeadId ? { ...l, scoring_status: leadLiveStatus } : l))
    );
  }, [sseLeadId, leadLiveStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll silently while any lead is still being scored — but skip the one
  // already tracked by SSE so we don't double-poll for single-add leads.
  const hasActiveScoringLeads = filteredLeads.some(
    (l) =>
      (l.scoring_status === "pending" || l.scoring_status === "scoring") &&
      l.id !== sseLeadId
  );
  useEffect(() => {
    if (!hasActiveScoringLeads) return;
    const id = setInterval(async () => {
      try {
        const params: Record<string, string | number> = {
          ...buildFilterParams(filtersRef.current),
          page: pageRef.current,
          per_page: PER_PAGE,
        };
        if (searchTermRef.current) params.search = searchTermRef.current;
        const res = await API.get("/leads", { params });
        const data = extractArray<Lead>(res.data);
        setFilteredLeads(data);
        setTotal(res.data?.total ?? data.length);
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(id);
  }, [hasActiveScoringLeads]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const fetchLeads = async (isRefresh = false, activeFilters?: ActiveFilters, p = page) => {
    if (isRefresh) setRefreshing(true);
    try {
      const params: Record<string, string | number> = {
        ...buildFilterParams(activeFilters ?? filters),
        page: p,
        per_page: PER_PAGE,
      };
      if (searchTerm) params.search = searchTerm;
      const res = await API.get("/leads", { params });
      const data = extractArray<Lead>(res.data);
      setFilteredLeads(data);
      setTotal(res.data?.total ?? data.length);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load leads. Please refresh the page."));
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  const handleAiQuery = async (q: string) => {
    if (!q.trim()) return;
    setAiSearching(true);
    setAiError("");
    // Keep previous results visible while fetching — only clear on success or new query
    try {
      const res = await API.get("/nl_query", { params: { query: q.trim() } });
      setAiResult(res.data);
    } catch (err) {
      setAiError(getErrorMessage(err, "AI query failed. Please try again."));
    } finally {
      setAiSearching(false);
    }
  };

  const clearAiResult = () => {
    setAiResult(null);
    setAiQuery("");
    setAiError("");
    setAiPanelOpen(false);
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
    setPage(1);
    fetchLeads(false, pendingFilters, 1);
  };

  const clearFilters = () => {
    const blank = { ...BLANK_FILTERS };
    setFilters(blank);
    setPendingFilters(blank);
    setFilterOpen(false);
    setLoading(true);
    setPage(1);
    fetchLeads(false, blank, 1);
  };

  /* ── Add / Edit drawer ── */
  const openAddDrawer = () => {
    setEditingLead(null);
    setForm({ ...BLANK_FORM });
    setFormError("");
    setFormSuccess(false);
    setAssocType("contact");
    setAssocSearch("");
    setAssocResults([]);
    setSelectedAssoc(null);
    setCompanyIndustry("");
    setContactDetails(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLead(lead);
    setForm({
      name: lead.name ?? "",
      deal_size: lead.deal_size != null ? String(lead.deal_size) : "",
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
    setFormError("");
    setSubmitting(true);
    try {
      const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
      if (editingLead) {
        if (form.status !== "new" && !form.deal_size) { setFormError("Deal Size is required for this stage."); setSubmitting(false); return; }

        const dealSizeChanged = form.deal_size !== String(editingLead.deal_size ?? "");
        const commentsChanged = form.comments.trim() !== (editingLead.comments ?? "").trim();

        await API.patch(`/leads/${editingLead.id}`, {
          name: form.name.trim() || undefined,
          deal_size: form.deal_size ? parseFloat(form.deal_size) : undefined,
          status: form.status || undefined,
          comments: form.comments.trim() || undefined,
          tags,
        });

        if (dealSizeChanged || commentsChanged) {
          setRefreshing(true);
          try {
            await API.post(`/leads/${editingLead.id}/refresh-knowledge`, {});
          } finally {
            setRefreshing(false);
          }
        }
      } else {
        if (!selectedAssoc) { setFormError("Select a Contact or Company first."); setSubmitting(false); return; }
        if (form.status !== "new" && !form.deal_size) { setFormError("Deal Size is required for this stage."); setSubmitting(false); return; }

        if (!form.name.trim()) { setFormError("Lead name is required."); setSubmitting(false); return; }
        const payload: Record<string, unknown> = {
          name: form.name.trim(),
          status: form.status || "new",
          comments: form.comments.trim() || undefined,
          tags,
        };
        if (form.deal_size) payload.deal_size = parseFloat(form.deal_size);
        if (assocType === "contact") {
          payload.contact_id = selectedAssoc.id;
        } else {
          payload.company_id_assoc = selectedAssoc.id;
        }
        const { data: createdLead } = await API.post<Lead>("/leads", payload);
        setSseLeadId(createdLead.id);
        setSseLeadStatus(createdLead.scoring_status ?? "pending");
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
    if (aiResult) {
      const CSV_COLS: [string, (l: Lead & { hybrid_score?: number }) => string][] = [
        ["Name",                  (l) => l.name],
        ["Company",               (l) => l.company],
        ["Email",                 (l) => l.email ?? ""],
        ["Phone",                 (l) => l.phone ?? ""],
        ["Industry",              (l) => l.industry ?? ""],
        ["Source",                (l) => l.source ?? ""],
        ["Deal Size",             (l) => l.deal_size != null ? String(Math.round(l.deal_size)) : ""],
        ["Status",                (l) => l.status],
        ["Tags",                  (l) => (l.tags ?? []).join(", ")],
        ["Assigned To",           (l) => l.assigned_to ?? ""],
        ["Comments",              (l) => l.comments ?? ""],
        ["AI Score",              (l) => l.ai_score != null ? String(Math.round(l.ai_score)) : ""],
        ["Recommended Offerings", (l) => (l.recommended_offerings ?? []).join(", ")],
        ["AI Analysis",           (l) => l.score_comment ?? ""],
        ["Sales Strategy",        (l) => l.sales_strategy ?? ""],
      ];

      const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
      const rows = [
        CSV_COLS.map(([h]) => escape(h)).join(","),
        ...aiResult.results.map((l) => CSV_COLS.map(([, fn]) => escape(fn(l))).join(",")),
      ];
      const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = "leads-ai-export.csv";
      a.click();
      URL.revokeObjectURL(blobUrl);
      return;
    }

    const exportParams = buildFilterParams(filters) as Record<string, string>;
    if (searchTerm) exportParams.search = searchTerm;
    const params = new URLSearchParams(exportParams);
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const url = `${API_BASE_URL}/leads/export-csv?${params.toString()}`;
    const a = document.createElement("a");
    a.href = url;
    if (token) {
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

  /* ── Convert to Deal ── */
  const handleConvertToDeal = async (leadId: number) => {
    try {
      const res = await API.post(`/leads/${leadId}/convert-to-deal`);
      const dealId = res.data?.deal_id;
      if (dealId) {
        window.location.href = `/deals`;
      }
    } catch (err) {
      setError(getErrorMessage(err, "Failed to convert lead to deal."));
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
      <div className="p-6 space-y-4">
        <div className="h-7 bg-slate-200 rounded-lg w-32 animate-pulse" />
        <div className="h-10 bg-slate-200 rounded-lg animate-pulse" />
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 border-b border-slate-100 animate-pulse bg-slate-50/50 last:border-0" />
          ))}
        </div>
      </div>
    );
  }

  const activeFilterCount = countActiveFilters(filters);
  const baseLeads = aiResult ? aiResult.results : filteredLeads;

  const getIntentScore = (l: Lead) =>
    l.final_score_breakdown?.totals?.intent_score ?? 0;

  const hasBreakdownData = (l: Lead) =>
    (l.final_score_breakdown?.components?.length ?? 0) > 0;

  const smartFilteredLeads = smartFilter === "all" ? baseLeads : baseLeads.filter((l) => {
    const score = l.ai_score ?? 0;
    switch (smartFilter) {
      case "hot": return score >= 80;
      case "warm": return score >= 60 && score < 80;
      case "with_evidence": return (l.evidence_cards?.length ?? 0) > 0;
      case "high_intent": return getIntentScore(l) >= 50;
      case "needs_action": return score < 60 && hasBreakdownData(l);
      default: return true;
    }
  });
  const displayLeads = smartFilteredLeads;
  const resultCount = aiResult ? aiResult.count : total;
  const aiPanelVisible = aiPanelOpen || !!aiResult || aiSearching || !!aiError;

  const smartCounts = {
    all: baseLeads.length,
    hot: baseLeads.filter((l) => (l.ai_score ?? 0) >= 80).length,
    warm: baseLeads.filter((l) => { const s = l.ai_score ?? 0; return s >= 60 && s < 80; }).length,
    with_evidence: baseLeads.filter((l) => (l.evidence_cards?.length ?? 0) > 0).length,
    high_intent: baseLeads.filter((l) => getIntentScore(l) >= 50).length,
    needs_action: baseLeads.filter((l) => (l.ai_score ?? 0) < 60 && hasBreakdownData(l)).length,
  };

  return (
    <div className="px-6 py-5 space-y-4 max-w-[1600px] mx-auto">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Leads</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {resultCount} lead{resultCount !== 1 ? "s" : ""}
            {aiResult ? " · AI results" : " · pipeline intelligence"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ContextualAskAIButton
            variant="compact"
            label="AI Chat"
            context={{
              page: "leads",
              entity_type: "lead",
              suggested_prompts: [
                "Summarize top leads this week",
                "Which leads need immediate follow-up?",
                "Explain the AI scoring for leads",
                "Draft a follow-up email for hot leads",
              ],
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 gap-1.5"
            onClick={openImport}
          >
            <Upload className="w-3.5 h-3.5" />Import
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-orange-600 hover:bg-orange-700 shadow-sm shadow-orange-200 gap-1.5"
            onClick={openAddDrawer}
          >
            <Plus className="w-3.5 h-3.5" />Add Lead
          </Button>
        </div>
      </div>

      {/* ── AI Priority Intelligence Strip ─────────────────────────── */}
      {!aiResult && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {([
            { key: "all" as SmartFilter, label: "All Leads", icon: Activity, color: "text-slate-600", bg: "bg-slate-50 border-slate-200 hover:border-slate-300", activeBg: "bg-slate-700 border-slate-700", activeText: "text-white" },
            { key: "hot" as SmartFilter, label: "Hot Leads", icon: Flame, color: "text-red-600", bg: "bg-red-50 border-red-100 hover:border-red-300", activeBg: "bg-red-500 border-red-500", activeText: "text-white", sublabel: "Score ≥ 80" },
            { key: "warm" as SmartFilter, label: "Warm Leads", icon: Thermometer, color: "text-amber-600", bg: "bg-amber-50 border-amber-100 hover:border-amber-300", activeBg: "bg-amber-500 border-amber-500", activeText: "text-white", sublabel: "Score 60–79" },
            { key: "with_evidence" as SmartFilter, label: "With Evidence", icon: Globe, color: "text-teal-600", bg: "bg-teal-50 border-teal-100 hover:border-teal-300", activeBg: "bg-teal-500 border-teal-500", activeText: "text-white", sublabel: "Web verified" },
            { key: "high_intent" as SmartFilter, label: "High Intent", icon: Zap, color: "text-orange-600", bg: "bg-orange-50 border-orange-100 hover:border-orange-300", activeBg: "bg-orange-500 border-orange-500", activeText: "text-white", sublabel: "Intent ≥ 50/70" },
            { key: "needs_action" as SmartFilter, label: "Needs Action", icon: AlertTriangle, color: "text-violet-600", bg: "bg-violet-50 border-violet-100 hover:border-violet-300", activeBg: "bg-violet-500 border-violet-500", activeText: "text-white", sublabel: "Score < 60" },
          ] as { key: SmartFilter; label: string; icon: React.ElementType; color: string; bg: string; activeBg: string; activeText: string; sublabel?: string }[]).map(({ key, label, icon: Icon, color, bg, activeBg, activeText, sublabel }) => {
            const isActive = smartFilter === key;
            const count = smartCounts[key];
            return (
              <button
                key={key}
                onClick={() => setSmartFilter(key)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${isActive ? `${activeBg} ${activeText} shadow-sm` : `${bg} ${color}`}`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "opacity-90" : ""}`} />
                <div className="min-w-0">
                  <div className={`text-xs font-semibold leading-tight ${isActive ? "text-white" : ""}`}>{label}</div>
                  <div className={`text-[11px] tabular-nums font-bold ${isActive ? "text-white/80" : "text-slate-500"}`}>
                    {count} {sublabel && <span className={`font-normal ${isActive ? "text-white/60" : "text-slate-400"}`}>· {sublabel}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Main card ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">

        {/* Error */}
        {error && (
          <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* ── Unified control bar ─────────────────────────────────── */}
        <div className="flex items-center gap-2 px-4 h-12 border-b border-slate-100">
          {/* Search */}
          <div className="relative w-64 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
            <Input
              placeholder="Search leads…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs bg-slate-50 border-slate-200 focus:bg-white focus:border-slate-300 rounded-lg"
            />
          </div>

          <div className="w-px h-5 bg-slate-100 mx-0.5" />

          {/* Filter */}
          <button
            onClick={openFilter}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-all ${
              activeFilterCount > 0
                ? "bg-orange-50 text-orange-600 border border-orange-200"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filter
            {activeFilterCount > 0 && (
              <span className="bg-orange-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Export */}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all"
          >
            <Download className="w-3.5 h-3.5" />Export
          </button>

          <div className="w-px h-5 bg-slate-100 mx-0.5" />

          {/* View toggle */}
          <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setView("stage")}
              className={`flex items-center gap-1 h-7 px-2.5 rounded-md text-xs font-semibold transition-all ${
                view === "stage"
                  ? "bg-white shadow-sm text-slate-800"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />Stage
            </button>
            <button
              onClick={() => setView("table")}
              className={`flex items-center gap-1 h-7 px-2.5 rounded-md text-xs font-semibold transition-all ${
                view === "table"
                  ? "bg-white shadow-sm text-slate-800"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <AlignJustify className="w-3.5 h-3.5" />Table
            </button>
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-3">
            {/* Result count */}
            <span className="text-xs text-slate-400 tabular-nums">
              {aiResult ? (
                <span className="text-violet-600 font-medium">{aiResult.results.length} of {aiResult.count}</span>
              ) : (
                <>{total} result{total !== 1 ? "s" : ""}</>
              )}
            </span>

            {refreshing && (
              <Loader2 className="w-3.5 h-3.5 text-orange-400 animate-spin" />
            )}

            <div className="w-px h-5 bg-slate-100" />

            {/* Ask AI toggle */}
            <button
              onClick={() => setAiPanelOpen((p) => !p)}
              className={`relative flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-semibold overflow-hidden select-none transition-all duration-200
                ${aiPanelVisible
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white border border-orange-400 shadow-sm shadow-orange-200/70 scale-[1.00]"
                  : "ai-ask-idle bg-gradient-to-r from-amber-50 to-orange-50 text-orange-600 border border-orange-200 hover:from-orange-100 hover:to-amber-100 hover:border-orange-300 hover:shadow-md hover:shadow-orange-100/70 hover:scale-[1.02] active:scale-[0.98]"
                }`}
            >
              <Sparkles className={`w-3.5 h-3.5 shrink-0 ${!aiPanelVisible ? "ai-icon-breathe" : ""}`} />
              <span>Ask AI</span>
              {aiResult && (
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${aiPanelVisible ? "bg-white/80" : "bg-orange-400"}`} />
              )}
              {!aiPanelVisible && (
                <span
                  className="ai-shimmer-strip absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/55 to-transparent pointer-events-none"
                  aria-hidden="true"
                />
              )}
            </button>
          </div>
        </div>

        {/* ── Active manual filter chips ───────────────────────────── */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-100 bg-slate-50/60 overflow-x-auto">
            <Filter className="w-3 h-3 text-orange-400 shrink-0" />
            {filters.status && (
              <span className="text-[11px] bg-white border border-orange-200 text-orange-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                Status: {filters.status}
              </span>
            )}
            {filters.industry && (
              <span className="text-[11px] bg-white border border-orange-200 text-orange-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                Industry: {filters.industry}
              </span>
            )}
            {filters.source && (
              <span className="text-[11px] bg-white border border-orange-200 text-orange-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                Source: {filters.source}
              </span>
            )}
            {(filters.min_deal || filters.max_deal) && (
              <span className="text-[11px] bg-white border border-orange-200 text-orange-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                Deal: {filters.min_deal ? `$${filters.min_deal}` : "any"} – {filters.max_deal ? `$${filters.max_deal}` : "any"}
              </span>
            )}
            {(filters.min_score || filters.max_score) && (
              <span className="text-[11px] bg-white border border-orange-200 text-orange-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                Score: {filters.min_score || "0"} – {filters.max_score || "100"}
              </span>
            )}
            <button
              onClick={clearFilters}
              className="ml-auto shrink-0 text-[11px] text-orange-500 hover:text-orange-700 font-semibold whitespace-nowrap"
            >
              Clear ×
            </button>
          </div>
        )}

        {/* ── Collapsible AI panel ─────────────────────────────────── */}
        {aiPanelVisible && (
          <div className="px-4 pt-3 pb-3 border-b border-orange-100/60 bg-gradient-to-b from-orange-50/40 to-transparent space-y-2.5 border-l-2 border-l-orange-200/70">
            <LeadsAIQueryBar
              value={aiQuery}
              onChange={setAiQuery}
              onSubmit={(q) => { setAiPanelOpen(true); handleAiQuery(q); }}
              loading={aiSearching}
              onClear={clearAiResult}
              hasResult={!!aiResult}
            />
            {!aiSearching && (
              <SuggestedPromptChips
                onSelect={(prompt) => { setAiQuery(prompt); setAiPanelOpen(true); handleAiQuery(prompt); }}
                disabled={aiSearching}
                maxVisible={4}
              />
            )}
          </div>
        )}

        {/* AI interpretation banner */}
        {aiResult && (
          <QueryInterpretationBanner
            result={aiResult}
            query={aiQuery}
            onClear={clearAiResult}
          />
        )}

        {/* AI error */}
        {aiError && !aiSearching && (
          <QueryErrorState
            error={aiError}
            onRetry={() => aiQuery.trim() && handleAiQuery(aiQuery)}
            onDismiss={() => setAiError("")}
          />
        )}

        {/* AI loading */}
        {aiSearching && <QueryLoadingState />}

        {/* ── Stage view / Table view ─────────────────────────────── */}
        {view === "stage" ? (
          <div className="p-4">
            <StageView
              leads={displayLeads as StageLead[]}
              onEdit={(lead, e) => openEditDrawer(lead as Lead, e)}
              onConvertToDeal={handleConvertToDeal}
            />
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                {[
                  ["Lead", "min-w-[200px]"],
                  ["Contact", "min-w-[150px]"],
                  ["Industry", "min-w-[130px]"],
                  ["Value", "min-w-[90px]"],
                  ["AI Score", "min-w-[110px]"],
                  ["AI Suggestions", "min-w-[170px]"],
                  ["AI Insight", "min-w-[180px] max-w-[220px]"],
                  ["", "w-[110px]"],
                ].map(([h, cls]) => (
                  <th
                    key={h}
                    className={`text-left py-2.5 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap ${cls}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {displayLeads.map((lead) => (
                <Fragment key={lead.id}>
                  {/* ── Main row ── */}
                  <tr
                    onClick={() => toggleExpand(lead.id)}
                    className={`border-b border-slate-50 transition-colors cursor-pointer group ${
                      expandedId === lead.id
                        ? "bg-orange-50/20"
                        : "hover:bg-slate-50/60"
                    }`}
                  >
                    {/* Lead */}
                    <td className="py-3 px-4 align-middle min-w-[200px]">
                      <div className="font-semibold text-slate-800 text-[13px] leading-snug">{lead.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <Building2 className="w-3 h-3 shrink-0" />
                        {lead.company_id_assoc ? (
                          <Link href={`/companies/${lead.company_id_assoc}`} className="hover:text-orange-600 transition-colors truncate max-w-[140px]" onClick={(e) => e.stopPropagation()}>{lead.company}</Link>
                        ) : lead.contact_id ? (
                          <Link href={`/contacts/${lead.contact_id}`} className="hover:text-orange-600 transition-colors truncate max-w-[140px]" onClick={(e) => e.stopPropagation()}>{lead.company}</Link>
                        ) : <span className="truncate max-w-[140px]">{lead.company}</span>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize ${getStatusStyle(lead.status)}`}>
                          {getPipelineStage(lead.status).label}
                        </span>
                        {lead.tags && lead.tags.length > 0 && (
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                            {lead.tags[0]}{lead.tags.length > 1 ? ` +${lead.tags.length - 1}` : ""}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="py-3 px-4 align-middle min-w-[150px]">
                      <div className="space-y-1 text-[11px] text-slate-500">
                        {lead.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-slate-300 shrink-0" />
                            <span className="truncate max-w-[120px]">{lead.email}</span>
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-300 shrink-0" />
                            <span>{lead.phone}</span>
                          </div>
                        )}
                        {!lead.email && !lead.phone && <span className="text-slate-300">—</span>}
                      </div>
                    </td>

                    {/* Industry · Source */}
                    <td className="py-3 px-4 align-middle min-w-[130px]">
                      <div className="text-[12px] text-slate-700 font-medium capitalize leading-snug">
                        {lead.industry || <span className="text-slate-300">—</span>}
                      </div>
                      {lead.source && (
                        <span className={`mt-1 inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize ${getSourceStyle(lead.source)}`}>
                          {lead.source}
                        </span>
                      )}
                    </td>

                    {/* Value */}
                    <td className="py-3 px-4 align-middle min-w-[90px]">
                      <span className="text-[13px] font-bold text-slate-800 tabular-nums">{formatDealSize(lead.deal_size)}</span>
                    </td>

                    {/* AI Score */}
                    <td className="py-3 px-4 align-middle min-w-[120px]">
                      {lead.scoring_status === "pending" ? (
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-semibold border-slate-200 bg-slate-50 text-slate-400 animate-pulse">
                          <Clock className="w-3 h-3" />Queued
                        </div>
                      ) : lead.scoring_status === "scoring" ? (
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-semibold border-blue-200 bg-blue-50 text-blue-500">
                          <Brain className="w-3 h-3 animate-pulse" />Scoring…
                        </div>
                      ) : lead.scoring_status === "failed" ? (
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-semibold border-red-200 bg-red-50 text-red-500">
                          <XCircle className="w-3 h-3" />Failed
                        </div>
                      ) : lead.ai_score != null ? (
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-bold ${getScoreBorder(lead.ai_score)} ${getScoreColor(lead.ai_score)}`}>
                          <Star className="w-3 h-3" />
                          {lead.ai_score.toFixed(0)}
                        </div>
                      ) : (
                        <span className="text-slate-200 text-sm">—</span>
                      )}
                      {(() => {
                        const intentScore = lead.final_score_breakdown?.totals?.intent_score ?? null;
                        const evidenceScore = lead.final_score_breakdown?.totals?.evidence_score ?? null;
                        if (intentScore == null && evidenceScore == null) return null;
                        return (
                          <div className="mt-1.5 space-y-0.5">
                            {intentScore != null && (
                              <div className="flex items-center gap-1">
                                <div className="w-14 h-1 bg-orange-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-orange-400 rounded-full" style={{ width: `${Math.min((intentScore / 70) * 100, 100)}%` }} />
                                </div>
                                <span className="text-[9px] text-orange-500 font-semibold tabular-nums">{intentScore}/70</span>
                              </div>
                            )}
                            {evidenceScore != null && (
                              <div className="flex items-center gap-1">
                                <div className="w-14 h-1 bg-teal-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-teal-400 rounded-full" style={{ width: `${Math.min((evidenceScore / 30) * 100, 100)}%` }} />
                                </div>
                                <span className="text-[9px] text-teal-500 font-semibold tabular-nums">{evidenceScore}/30</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      <div className="flex flex-col gap-0.5 mt-1">
                        {aiResult?.result_mode === "semantic" && (lead as Lead & { hybrid_score?: number }).hybrid_score != null && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-violet-50 text-violet-600 border border-violet-100 flex items-center gap-0.5 w-fit">
                            <Sparkles className="w-2.5 h-2.5" />
                            {((lead as Lead & { hybrid_score?: number }).hybrid_score! * 100).toFixed(0)}%
                          </span>
                        )}
                        {lead.used_web_evidence && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-teal-50 text-teal-600 border border-teal-100 w-fit">Web</span>
                        )}
                      </div>
                    </td>

                    {/* Offerings */}
                    <td className="py-3 px-4 align-middle min-w-[170px]">
                      {lead.recommended_offerings && lead.recommended_offerings.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {lead.recommended_offerings.slice(0, 2).map((o, idx) => (
                            <span key={idx} className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${getOfferingColor(idx)}`}>
                              {o}
                            </span>
                          ))}
                          {lead.recommended_offerings.length > 2 && (
                            <span
                              className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-400 cursor-help"
                              title={lead.recommended_offerings.slice(2).join(", ")}
                            >
                              +{lead.recommended_offerings.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-200 text-xs">—</span>
                      )}
                    </td>

                    {/* Insight */}
                    <td className="py-3 px-4 align-middle min-w-[180px] max-w-[220px]">
                      {lead.score_comment && (
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{lead.score_comment}</p>
                      )}
                      <button
                        className="mt-1 text-[10px] text-orange-500 hover:text-orange-700 font-semibold flex items-center gap-0.5 transition-colors"
                        onClick={(e) => { e.stopPropagation(); toggleExpand(lead.id); }}
                      >
                        {expandedId === lead.id
                          ? <><ChevronUp className="w-3 h-3" />Collapse</>
                          : <><ChevronDown className="w-3 h-3" />Details</>}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 align-middle w-[110px]">
                      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Link href={`/leads/${lead.id}`} onClick={(e) => e.stopPropagation()}>
                          <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-orange-600 transition-colors" title="View">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </Link>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleConvertToDeal(lead.id); }}
                          className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 transition-colors"
                          title="Convert to Deal"
                        >
                          <Briefcase className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => openEditDrawer(lead, e)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-orange-600 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleExpand(lead.id); }}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {expandedId === lead.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>

                    {/* Expanded detail panel */}
                    {expandedId === lead.id && (() => {
                      const fsb = lead.final_score_breakdown;
                      const fsbComps = fsb?.components ?? [];
                      const hasFsb = fsbComps.length > 0;
                      const bd = !hasFsb ? parseScoreBreakdown(lead.score_comment) : null;
                      const narrative = getScoreNarrative(lead.score_comment);
                      const intentItems = fsbComps.filter((c) => c.category === "Intent");
                      const evidenceItems = fsbComps.filter((c) => c.category === "Evidence");
                      const bdIntentItems = bd?.items.filter((x) => x.category === "intent") ?? [];
                      const bdEvidenceItems = bd?.items.filter((x) => x.category === "evidence") ?? [];
                      const intentScore = fsb?.totals?.intent_score ?? null;
                      const evidenceScore = fsb?.totals?.evidence_score ?? null;
                      const pk = parseKnowledge(lead.knowledge);
                      return (
                        <tr className="border-b border-slate-100 bg-gradient-to-b from-orange-50/20 to-white">
                          <td colSpan={8} className="px-6 py-5">
                            {/* Top row: Sales Strategy + AI Analysis + Lead Situation */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                              {/* Sales Strategy */}
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                  <Target className="w-3 h-3 text-orange-500" /> Sales Strategy
                                </p>
                                <div className="bg-orange-50 rounded-xl border border-orange-200/70 p-3.5 space-y-3 h-full">
                                  {lead.sales_strategy && (
                                    <p className="text-xs text-slate-700 leading-relaxed">{lead.sales_strategy}</p>
                                  )}
                                  {lead.recommended_offerings && lead.recommended_offerings.length > 0 && (
                                    <div>
                                      <p className="text-[10px] text-orange-600 font-bold uppercase tracking-wide mb-1.5">Recommended Offerings</p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {lead.recommended_offerings.map((o, idx) => (
                                          <span key={idx} className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${getOfferingColor(idx)}`}>{o}</span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {!lead.sales_strategy && (!lead.recommended_offerings || lead.recommended_offerings.length === 0) && (
                                    <p className="text-xs text-slate-400 italic">No strategy data available.</p>
                                  )}
                                </div>
                              </div>

                              {/* AI Analysis + Score Breakdown */}
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                  <Brain className="w-3 h-3 text-violet-500" /> AI Analysis
                                </p>
                                <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-3">
                                  {lead.score_comment && (
                                    <p className="text-xs text-slate-700 leading-relaxed">{narrative ?? lead.score_comment}</p>
                                  )}
                                  {/* Score bars */}
                                  {(hasFsb || bd) && (
                                    <div className="pt-2 border-t border-slate-100 space-y-2">
                                      {hasFsb ? (
                                        <>
                                          {intentScore != null && (
                                            <div>
                                              <div className="flex justify-between text-[11px] mb-1">
                                                <span className="font-semibold text-orange-600 uppercase tracking-wide">Intent</span>
                                                <span className="font-bold text-slate-700 tabular-nums">{intentScore} / 70</span>
                                              </div>
                                              <div className="h-1.5 bg-orange-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-orange-400 rounded-full" style={{ width: `${Math.min((intentScore / 70) * 100, 100)}%` }} />
                                              </div>
                                              {intentItems.length > 0 && (
                                                <div className="mt-1.5 space-y-1 pl-1">
                                                  {intentItems.map((comp, i) => (
                                                    <div key={i} className="flex justify-between items-center text-[11px]">
                                                      <span className="text-slate-400 truncate max-w-[160px]">{comp.component}</span>
                                                      <span className={`font-semibold tabular-nums ${comp.points > 0 ? "text-green-600" : comp.points < 0 ? "text-red-500" : "text-slate-300"}`}>
                                                        {comp.points > 0 ? "+" : ""}{comp.points}
                                                      </span>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                          {evidenceScore != null && (
                                            <div className="pt-2 border-t border-slate-100">
                                              <div className="flex justify-between text-[11px] mb-1">
                                                <span className="font-semibold text-teal-600 uppercase tracking-wide">Evidence</span>
                                                <span className="font-bold text-slate-700 tabular-nums">{evidenceScore} / 30</span>
                                              </div>
                                              <div className="h-1.5 bg-teal-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-teal-400 rounded-full" style={{ width: `${Math.min((evidenceScore / 30) * 100, 100)}%` }} />
                                              </div>
                                              {evidenceItems.length > 0 && (
                                                <div className="mt-1.5 space-y-1 pl-1">
                                                  {evidenceItems.map((comp, i) => (
                                                    <div key={i} className="flex justify-between items-center text-[11px]">
                                                      <span className="text-slate-400 truncate max-w-[160px]">{comp.component}</span>
                                                      <span className={`font-semibold tabular-nums ${comp.points > 0 ? "text-green-600" : comp.points < 0 ? "text-red-500" : "text-slate-300"}`}>
                                                        {comp.points > 0 ? "+" : ""}{comp.points}
                                                      </span>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </>
                                      ) : bd ? (
                                        <>
                                          {bd.intentTotal !== null && (
                                            <div>
                                              <div className="flex justify-between text-[11px] mb-1">
                                                <span className="font-semibold text-orange-600 uppercase tracking-wide">Intent</span>
                                                <span className="font-bold text-slate-700 tabular-nums">{bd.intentTotal} / {bd.intentMax}</span>
                                              </div>
                                              <div className="h-1.5 bg-orange-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-orange-400 rounded-full" style={{ width: `${(bd.intentTotal / bd.intentMax) * 100}%` }} />
                                              </div>
                                              {bdIntentItems.length > 0 && (
                                                <div className="mt-1.5 space-y-1 pl-1">
                                                  {bdIntentItems.map((item, i) => (
                                                    <div key={i} className="flex justify-between items-center text-[11px]">
                                                      <span className="text-slate-400 capitalize">{item.label.replace(/_/g, " ")}</span>
                                                      <span className={`font-semibold tabular-nums ${item.delta > 0 ? "text-green-600" : item.delta < 0 ? "text-red-500" : "text-slate-300"}`}>
                                                        {item.delta > 0 ? "+" : ""}{item.delta % 1 === 0 ? item.delta.toFixed(0) : item.delta.toFixed(2)}
                                                      </span>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                          {bd.evidenceTotal !== null && (
                                            <div className="pt-2 border-t border-slate-100">
                                              <div className="flex justify-between text-[11px] mb-1">
                                                <span className="font-semibold text-teal-600 uppercase tracking-wide">Evidence</span>
                                                <span className="font-bold text-slate-700 tabular-nums">{bd.evidenceTotal} / {bd.evidenceMax}</span>
                                              </div>
                                              <div className="h-1.5 bg-teal-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-teal-400 rounded-full" style={{ width: `${(bd.evidenceTotal / bd.evidenceMax) * 100}%` }} />
                                              </div>
                                              {bdEvidenceItems.length > 0 && (
                                                <div className="mt-1.5 space-y-1 pl-1">
                                                  {bdEvidenceItems.map((item, i) => (
                                                    <div key={i} className="flex justify-between items-center text-[11px]">
                                                      <span className="text-slate-400 capitalize">{item.label.replace(/_/g, " ")}</span>
                                                      <span className={`font-semibold tabular-nums ${item.delta > 0 ? "text-green-600" : item.delta < 0 ? "text-red-500" : "text-slate-300"}`}>
                                                        {item.delta > 0 ? "+" : ""}{item.delta % 1 === 0 ? item.delta.toFixed(0) : item.delta.toFixed(2)}
                                                      </span>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </>
                                      ) : null}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Lead Situation (parsed knowledge) */}
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                  <BookOpen className="w-3 h-3 text-indigo-500" /> Lead Situation
                                </p>
                                <div className="bg-indigo-50/50 rounded-xl border border-indigo-100 p-3.5 space-y-2.5">
                                  {pk.context && (
                                    <p className="text-xs text-slate-700 leading-relaxed">{pk.context}</p>
                                  )}
                                  {pk.sellerPoints.slice(0, 2).map((pt, i) => (
                                    <div key={i} className="rounded-lg bg-white border border-indigo-100 p-2.5">
                                      <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide mb-1">{pt.title}</p>
                                      <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-3">{pt.body}</p>
                                    </div>
                                  ))}
                                  {!pk.context && pk.sellerPoints.length === 0 && lead.knowledge && (
                                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-5">{lead.knowledge}</p>
                                  )}
                                  {!pk.context && pk.sellerPoints.length === 0 && !lead.knowledge && (
                                    <p className="text-xs text-slate-400 italic">No research data available.</p>
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
                                    <Zap className="w-3 h-3 text-orange-400" /> Evidence Cards
                                  </p>
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
                                              {card.points != null && (
                                                <span className={`text-xs font-bold tabular-nums ${card.points >= 0 ? "text-green-600" : "text-red-500"}`}>
                                                  {card.points >= 0 ? "+" : ""}{card.points} pts
                                                </span>
                                              )}
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
                                  {pk.campaignContext && (
                                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                                        <Brain className="w-3 h-3" /> Campaign Context
                                      </p>
                                      <p className="text-xs text-gray-600 leading-relaxed">{pk.campaignContext}</p>
                                    </div>
                                  )}
                                  {lead.knowledge_sources && lead.knowledge_sources.length > 0 && (
                                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                                        <Globe className="w-3 h-3" /> Web Sources
                                      </p>
                                      <div className="space-y-1">
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
                                    </div>
                                  )}
                                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Metadata</p>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
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
        )}

          {!aiResult && (
            <Pagination page={page} total={total} perPage={PER_PAGE} onChange={(p) => setPage(p)} />
          )}

          {displayLeads.length === 0 && !error && !aiSearching && !aiError && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              {aiResult ? (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-violet-50 border border-violet-200 flex items-center justify-center mb-4">
                    <Sparkles className="w-6 h-6 text-violet-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-1">No matches found</h3>
                  <p className="text-slate-400 text-xs max-w-xs">Try rephrasing your query or broadening the criteria.</p>
                  <button onClick={clearAiResult} className="mt-4 text-xs font-semibold text-violet-600 hover:text-violet-700">
                    ← Back to all leads
                  </button>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-4">
                    <Users className="w-6 h-6 text-slate-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-1">No leads found</h3>
                  <p className="text-slate-400 text-xs max-w-xs">
                    {searchTerm || activeFilterCount > 0
                      ? "Try adjusting your search or active filters."
                      : "Get started by adding your first lead or importing a CSV."}
                  </p>
                  {!searchTerm && activeFilterCount === 0 && (
                    <button onClick={openAddDrawer} className="mt-4 text-xs font-semibold text-orange-600 hover:text-orange-700">
                      + Add your first lead
                    </button>
                  )}
                </>
              )}
            </div>
          )}
      </div>

      {/* ── Add / Edit Lead Drawer ── */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={closeDrawer} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {editingLead ? "Edit Lead" : "Add New Lead"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingLead ? `Editing ${editingLead.name}` : "AI scoring runs automatically after creation"}
                </p>
              </div>
              <button onClick={closeDrawer} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-slate-50/30">
              {!editingLead ? (
                <>
                  {/* Lead Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                      Lead Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="e.g. Acme Corp – Q3 Expansion"
                      value={form.name}
                      onChange={(e) => setField("name", e.target.value)}
                      className="h-9 text-sm bg-white border-slate-200"
                    />
                  </div>

                  {/* Association type toggle */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Associate with <span className="text-red-500">*</span></label>
                    <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white">
                      {(["contact", "company"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => { setAssocType(t); setAssocSearch(""); setAssocResults([]); setSelectedAssoc(null); setCompanyIndustry(""); setContactDetails(null); }}
                          className={`flex-1 py-2 text-xs font-semibold capitalize transition-colors ${assocType === t ? "bg-orange-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Association search */}
                  {!selectedAssoc ? (
                    <div className="relative">
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Search {assocType}</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          placeholder={`Type to search ${assocType}s…`}
                          value={assocSearch}
                          onChange={async (e) => {
                            const q = e.target.value;
                            setAssocSearch(q);
                            if (q.length < 2) { setAssocResults([]); return; }
                            setAssocSearching(true);
                            try {
                              if (assocType === "contact") {
                                const res = await API.get("/contacts", { params: { search: q, limit: 10 } });
                                const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
                                setAssocResults(list.map((c: { id: number; first_name: string; last_name?: string; email: string; company_id?: number; industry?: string; source?: string }) => ({
                                  id: c.id,
                                  label: `${c.first_name} ${c.last_name ?? ""}`.trim(),
                                  sub: c.email,
                                  company_id: c.company_id,
                                  industry: c.industry,
                                  source: c.source,
                                })));
                              } else {
                                const res = await API.get("/companies", { params: { search: q, limit: 10 } });
                                const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
                                setAssocResults(list.map((c: { id: number; name: string; industry?: string }) => ({
                                  id: c.id,
                                  label: c.name,
                                  sub: c.industry ?? "",
                                })));
                              }
                            } finally {
                              setAssocSearching(false);
                            }
                          }}
                          className="pl-9 h-9 text-sm bg-white border-slate-200"
                        />
                      </div>
                      {assocResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                          {assocResults.map((r) => (
                            <button
                              key={r.id}
                              type="button"
                              onClick={async () => {
                                setSelectedAssoc({ id: r.id, label: r.label, type: assocType });
                                if (assocType === "company") {
                                  setCompanyIndustry(r.sub || "");
                                } else {
                                  let companyName: string | undefined;
                                  if (r.company_id) {
                                    try {
                                      const cRes = await API.get(`/companies/${r.company_id}`);
                                      companyName = cRes.data?.name;
                                    } catch { /* ignore */ }
                                  }
                                  setContactDetails({ company_name: companyName, industry: r.industry, source: r.source });
                                }
                                setAssocSearch("");
                                setAssocResults([]);
                              }}
                              className="w-full px-4 py-2.5 text-left hover:bg-orange-50 transition-colors border-b border-slate-100 last:border-0"
                            >
                              <p className="text-sm font-semibold text-slate-800">{r.label}</p>
                              <p className="text-xs text-slate-400">{r.sub}</p>
                            </button>
                          ))}
                        </div>
                      )}
                      {assocSearching && <p className="text-xs text-slate-400 mt-1">Searching…</p>}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{selectedAssoc.label}</p>
                        <p className="text-xs text-orange-600 capitalize">{selectedAssoc.type} selected</p>
                      </div>
                      <button type="button" onClick={() => { setSelectedAssoc(null); setCompanyIndustry(""); setContactDetails(null); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Industry / Source — conditional on association type */}
                  {assocType === "contact" && selectedAssoc ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 space-y-2">
                      <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">Auto-fetched from contact</p>
                      {contactDetails?.company_name && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Company</span>
                          <span className="font-semibold text-slate-800">{contactDetails.company_name}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Industry</span>
                        <span className="font-semibold text-slate-800">{contactDetails?.industry || <span className="text-slate-400 font-normal">—</span>}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Source</span>
                        <span className="font-semibold text-slate-800">{contactDetails?.source || <span className="text-slate-400 font-normal">—</span>}</span>
                      </div>
                    </div>
                  ) : assocType === "company" && selectedAssoc ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 space-y-2">
                      <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">Auto-fetched from company</p>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Industry</span>
                        <span className="font-semibold text-slate-800">{companyIndustry || <span className="text-slate-400 font-normal">—</span>}</span>
                      </div>
                    </div>
                  ) : null}

                  {/* Lead Stage */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Lead Stage</label>
                    <Select value={form.status} onValueChange={(v) => setField("status", v)}>
                      <SelectTrigger className="h-9 text-sm bg-white border-slate-200"><SelectValue placeholder="Select stage" /></SelectTrigger>
                      <SelectContent>
                        {PIPELINE_STAGE_ORDER.map((s) => (
                          <SelectItem key={s} value={s}>{getPipelineStage(s).label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                        Deal Size ($){form.status !== "new" && <span className="text-red-500 ml-0.5">*</span>}
                      </label>
                      <Input type="number" min={0} placeholder="500000" value={form.deal_size} onChange={(e) => setField("deal_size", e.target.value)} className="h-9 text-sm bg-white border-slate-200" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Tags</label>
                      <Input placeholder="enterprise, APAC" value={form.tags} onChange={(e) => setField("tags", e.target.value)} className="h-9 text-sm bg-white border-slate-200" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Sales Notes</label>
                    <textarea rows={3} placeholder="Key pain points, context…" value={form.comments} onChange={(e) => setField("comments", e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 resize-none" />
                  </div>
                </>
              ) : (
                /* Edit mode */
                <>
                  {/* Read-only info derived from FK — not editable here */}
                  {editingLead && (editingLead.company || editingLead.email || editingLead.industry) && (
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 space-y-1.5 text-xs text-slate-600">
                      {editingLead.company && <div><span className="font-semibold text-slate-400 uppercase tracking-wide">Company: </span>{editingLead.company}</div>}
                      {editingLead.email && <div><span className="font-semibold text-slate-400 uppercase tracking-wide">Email: </span>{editingLead.email}</div>}
                      {editingLead.industry && <div><span className="font-semibold text-slate-400 uppercase tracking-wide">Industry: </span>{editingLead.industry}</div>}
                      {editingLead.source && <div><span className="font-semibold text-slate-400 uppercase tracking-wide">Source: </span>{editingLead.source}</div>}
                      <p className="text-[10px] text-slate-400 pt-1">To change company/contact details, update the Contact or Company record directly.</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Lead Name</label>
                    <Input value={form.name} onChange={(e) => setField("name", e.target.value)} className="h-9 text-sm bg-white border-slate-200" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Deal Size ($)</label>
                      <Input type="number" min={0} value={form.deal_size} onChange={(e) => setField("deal_size", e.target.value)} className="h-9 text-sm bg-white border-slate-200" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Status</label>
                      <Select value={form.status} onValueChange={(v) => setField("status", v)}>
                        <SelectTrigger className="h-9 text-sm bg-white border-slate-200"><SelectValue placeholder="Select status" /></SelectTrigger>
                        <SelectContent>
                          {PIPELINE_STAGE_ORDER.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Tags</label>
                    <Input value={form.tags} onChange={(e) => setField("tags", e.target.value)} className="h-9 text-sm bg-white border-slate-200" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Sales Notes</label>
                    <textarea rows={3} value={form.comments} onChange={(e) => setField("comments", e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 resize-none" />
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 space-y-3 bg-white">
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{formError}</div>
              )}
              {formSuccess && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 font-semibold">
                  {editingLead ? "Lead updated successfully!" : "Lead created! AI scoring is running in the background."}
                </div>
              )}
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 border-slate-200 text-slate-700" onClick={closeDrawer} disabled={submitting}>Cancel</Button>
                <Button className="flex-1 bg-orange-600 hover:bg-orange-700 font-semibold" onClick={handleSubmit} disabled={submitting || formSuccess}>
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
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-orange-500" />
                </div>
                <h2 className="text-sm font-bold text-slate-900">Filter Leads</h2>
              </div>
              <button onClick={() => setFilterOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 bg-slate-50/30">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Status</label>
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
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Industry</label>
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
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Source</label>
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
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Deal Size (USD)</label>
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
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">AI Score (0–100)</label>
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

            <div className="px-5 py-4 border-t border-slate-200 space-y-2 bg-white">
              <Button className="w-full bg-orange-600 hover:bg-orange-700 text-sm font-semibold" onClick={applyFilters}>
                Apply Filters
              </Button>
              <Button variant="outline" className="w-full text-sm border-slate-200 text-slate-600" onClick={clearFilters}>
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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Import Leads from CSV</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Upload a CSV file to bulk import or update leads</p>
                </div>
                <button onClick={() => { if (!importing) setImportOpen(false); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
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
