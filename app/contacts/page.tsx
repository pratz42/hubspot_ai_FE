"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Search, Mail, Phone, Building2, Plus, Upload, X, ChevronDown,
  Users, Loader2, ArrowUpRight, Zap, Target, AlertTriangle,
  HelpCircle, SortDesc,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import API from "@/lib/api";
import { Pagination } from "@/components/pagination";

interface Contact {
  id: number;
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  title?: string;
  company_id?: number;
  industry?: string;
  lifecycle_stage?: string;
  lead_status?: string;
  source?: string;
  owner?: string;
  created_at: string;
  company_name?: string;
  pre_ai_score?: number | null;
  pre_ai_reason?: string | null;
}

interface AppUser {
  user_id: string;
  email: string;
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
  marketing_qualified_lead: "MQL",
  sales_qualified_lead: "SQL",
  opportunity: "Opportunity",
  customer: "Customer",
  evangelist: "Evangelist",
  other: "Other",
};

const LIFECYCLE_OPTIONS = [
  { value: "subscriber", label: "Subscriber" },
  { value: "lead", label: "Lead" },
  { value: "marketing_qualified_lead", label: "Marketing Qualified Lead" },
  { value: "sales_qualified_lead", label: "Sales Qualified Lead" },
  { value: "opportunity", label: "Opportunity" },
  { value: "customer", label: "Customer" },
  { value: "evangelist", label: "Evangelist" },
  { value: "other", label: "Other" },
];

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

function getInitials(first: string, last?: string) {
  return ((first[0] ?? "") + (last?.[0] ?? "")).toUpperCase();
}

function ScoreBadge({ score }: { score?: number | null }) {
  if (score == null) {
    return (
      <div className="w-11 h-11 rounded-full border-2 border-slate-200 bg-slate-50 flex items-center justify-center flex-shrink-0">
        <span className="text-[9px] font-semibold text-slate-400">N/A</span>
      </div>
    );
  }
  const ringColor = score >= 75 ? "border-emerald-400" : score >= 50 ? "border-amber-400" : "border-red-400";
  const bgColor = score >= 75 ? "bg-emerald-50" : score >= 50 ? "bg-amber-50" : "bg-red-50";
  const textColor = score >= 75 ? "text-emerald-700" : score >= 50 ? "text-amber-700" : "text-red-600";
  return (
    <div className={`w-11 h-11 rounded-full border-[2.5px] ${ringColor} ${bgColor} flex items-center justify-center flex-shrink-0 shadow-sm`}>
      <span className={`text-[11px] font-bold leading-none ${textColor}`}>{Math.round(score)}</span>
    </div>
  );
}

function getReadiness(c: Contact): { label: string; className: string } {
  if (c.pre_ai_score == null) return { label: "Not Scored", className: "bg-slate-100 text-slate-500" };
  if (!c.company_id) return { label: "Missing Company", className: "bg-slate-100 text-slate-600" };
  if (!c.title && c.pre_ai_score >= 55) return { label: "Missing Persona", className: "bg-amber-100 text-amber-700" };
  if (c.pre_ai_score >= 75) return { label: "Lead Ready", className: "bg-emerald-100 text-emerald-700" };
  if (c.pre_ai_score >= 60) return { label: "Strong ICP Fit", className: "bg-teal-100 text-teal-700" };
  if (c.pre_ai_score >= 45) return { label: "Needs Review", className: "bg-amber-100 text-amber-700" };
  return { label: "Low Confidence", className: "bg-red-100 text-red-600" };
}

function compactReason(reason?: string | null): string {
  if (!reason) return "";
  const because = reason.indexOf("because ");
  const trimmed = because !== -1 ? reason.slice(because + 8) : reason;
  return trimmed.length > 80 ? trimmed.slice(0, 80) + "…" : trimmed;
}

type FilterKey = "all" | "high_priority" | "lead_ready" | "needs_review" | "missing_persona";

const BLANK = {
  first_name: "", last_name: "", email: "", phone: "", title: "",
  source: "", industry: "", lifecycle_stage: "lead",
};

const PER_PAGE = 25;

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({ ...BLANK });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{ created: number; updated: number; failed: number } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [companyMap, setCompanyMap] = useState<Record<number, string>>({});
  const [companiesList, setCompaniesList] = useState<{ id: number; name: string; industry?: string }[]>([]);
  const [formCompanySearch, setFormCompanySearch] = useState("");
  const [formCompanyId, setFormCompanyId] = useState<number | null>(null);
  const [formOwner, setFormOwner] = useState("");
  const [users, setUsers] = useState<AppUser[]>([]);

  async function fetchContacts(p = page) {
    setLoading(true);
    try {
      const res = await API.get("/contacts", { params: { page: p, per_page: PER_PAGE, search: search || undefined } });
      const data: Contact[] = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setContacts(data);
      setTotal(res.data?.total ?? data.length);
    } catch {
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCompanies() {
    try {
      const res = await API.get("/companies", { params: { limit: 500 } });
      const list: { id: number; name: string; industry?: string }[] = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      const map: Record<number, string> = {};
      list.forEach((c) => { map[c.id] = c.name; });
      setCompanyMap(map);
      setCompaniesList(list);
    } catch { /* ignore */ }
  }

  async function fetchUsers() {
    try {
      const res = await API.get("/auth/users");
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch { /* ignore */ }
  }

  useEffect(() => { fetchContacts(1); fetchCompanies(); fetchUsers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchContacts(1); }, 350);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { fetchContacts(page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => ({
    all: contacts.length,
    high_priority: contacts.filter((c) => (c.pre_ai_score ?? 0) >= 75).length,
    lead_ready: contacts.filter((c) => (c.pre_ai_score ?? 0) >= 60).length,
    needs_review: contacts.filter((c) => c.pre_ai_score != null && (c.pre_ai_score ?? 0) < 50).length,
    missing_persona: contacts.filter((c) => !c.title).length,
  }), [contacts]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let result = contacts.filter(
      (c) =>
        !q ||
        c.first_name.toLowerCase().includes(q) ||
        c.last_name?.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.title?.toLowerCase().includes(q) ||
        (c.company_id ? companyMap[c.company_id]?.toLowerCase().includes(q) : false)
    );
    if (activeFilter === "high_priority") result = result.filter((c) => (c.pre_ai_score ?? 0) >= 75);
    else if (activeFilter === "lead_ready") result = result.filter((c) => (c.pre_ai_score ?? 0) >= 60);
    else if (activeFilter === "needs_review") result = result.filter((c) => c.pre_ai_score != null && (c.pre_ai_score ?? 0) < 50);
    else if (activeFilter === "missing_persona") result = result.filter((c) => !c.title);
    return [...result].sort((a, b) => (b.pre_ai_score ?? -1) - (a.pre_ai_score ?? -1));
  }, [contacts, search, companyMap, activeFilter]);

  const formCompanyResults = useMemo(() => {
    if (!formCompanySearch) return [];
    const q = formCompanySearch.toLowerCase();
    return companiesList.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [companiesList, formCompanySearch]);

  function openDrawer() {
    setDrawerOpen(true);
    setForm({ ...BLANK });
    setFormError("");
    setFormCompanySearch("");
    setFormCompanyId(null);
    setFormOwner("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.first_name.trim()) { setFormError("First name is required."); return; }
    if (!form.email.trim()) { setFormError("Email is required."); return; }
    if (!formCompanyId) { setFormError("Company is required."); return; }
    if (!form.source?.trim()) { setFormError("Source is required."); return; }
    setSaving(true);
    try {
      await API.post("/contacts", {
        first_name: form.first_name.trim(),
        last_name: form.last_name?.trim() || undefined,
        email: form.email.trim(),
        phone: form.phone?.trim() || undefined,
        title: form.title?.trim() || undefined,
        source: form.source?.trim() || undefined,
        industry: form.industry?.trim() || undefined,
        lifecycle_stage: form.lifecycle_stage || "lead",
        company_id: formCompanyId || undefined,
        owner: formOwner || undefined,
      });
      setDrawerOpen(false);
      setForm({ ...BLANK });
      setFormCompanyId(null);
      setFormCompanySearch("");
      setFormOwner("");
      fetchContacts();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setFormError(msg ?? "Failed to create contact.");
    } finally {
      setSaving(false);
    }
  }

  async function handleImport() {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    const fd = new FormData();
    fd.append("file", importFile);
    try {
      const res = await API.post("/contacts/import-csv", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setImportResult(res.data);
      fetchContacts();
    } catch {
      setImportResult({ created: 0, updated: 0, failed: -1 });
    } finally {
      setImporting(false);
    }
  }

  const FILTER_CARDS: {
    key: FilterKey; label: string; icon: React.ElementType; count: number; sub: string;
    iconBg: string; iconColor: string; activeBg: string;
  }[] = [
    { key: "all", label: "All Contacts", icon: Users, count: total, sub: "total", iconBg: "bg-slate-100", iconColor: "text-slate-500", activeBg: "bg-slate-800" },
    { key: "high_priority", label: "High Priority", icon: Zap, count: counts.high_priority, sub: "score ≥ 75", iconBg: "bg-emerald-100", iconColor: "text-emerald-600", activeBg: "bg-emerald-600" },
    { key: "lead_ready", label: "Lead Ready", icon: Target, count: counts.lead_ready, sub: "score ≥ 60", iconBg: "bg-blue-100", iconColor: "text-blue-600", activeBg: "bg-blue-600" },
    { key: "needs_review", label: "Needs Review", icon: AlertTriangle, count: counts.needs_review, sub: "score < 50", iconBg: "bg-amber-100", iconColor: "text-amber-600", activeBg: "bg-amber-500" },
    { key: "missing_persona", label: "Missing Persona", icon: HelpCircle, count: counts.missing_persona, sub: "no job title", iconBg: "bg-rose-100", iconColor: "text-rose-500", activeBg: "bg-rose-500" },
  ];

  if (loading && contacts.length === 0) {
    return (
      <div className="p-6 space-y-5">
        <div className="h-7 bg-slate-200 rounded-lg w-32 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-slate-100 animate-pulse">
              <div className="w-11 h-11 rounded-full bg-slate-200 flex-shrink-0" />
              <div className="w-9 h-9 rounded-full bg-slate-200 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-slate-200 rounded w-36" />
                <div className="h-3 bg-slate-100 rounded w-52" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Contacts</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} contacts · sorted by AI priority</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-semibold border-slate-200"
            onClick={() => { setImportOpen(true); setImportResult(null); setImportFile(null); }}
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            Import CSV
          </Button>
          <Button size="sm" className="bg-orange-600 hover:bg-orange-700 h-8 text-xs font-semibold" onClick={openDrawer}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Intelligence Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {FILTER_CARDS.map((card) => {
          const isActive = activeFilter === card.key;
          const Icon = card.icon;
          return (
            <button
              key={card.key}
              onClick={() => setActiveFilter(card.key)}
              className={`text-left rounded-xl border p-3.5 transition-all focus:outline-none ${
                isActive
                  ? `${card.activeBg} border-transparent shadow-md`
                  : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className={`inline-flex p-1.5 rounded-lg ${isActive ? "bg-white/20" : card.iconBg}`}>
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : card.iconColor}`} />
                </div>
                <span className={`text-2xl font-bold leading-none ${isActive ? "text-white" : "text-slate-900"}`}>
                  {card.count}
                </span>
              </div>
              <p className={`text-xs font-semibold ${isActive ? "text-white" : "text-slate-700"}`}>{card.label}</p>
              <p className={`text-[10px] mt-0.5 ${isActive ? "text-white/70" : "text-slate-400"}`}>{card.sub}</p>
            </button>
          );
        })}
      </div>

      {/* Search + result count */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search contacts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 h-9"
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <SortDesc className="w-3.5 h-3.5" />
          <span>Score high → low</span>
        </div>
        <span className="text-xs text-slate-400 font-medium ml-auto">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Contact Intelligence List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-700 mb-1">No contacts found</h3>
          <p className="text-slate-400 text-xs mb-5">
            {activeFilter !== "all" ? "Try clearing the filter or import contacts." : "Import a CSV or add your first contact."}
          </p>
          {activeFilter !== "all" ? (
            <Button size="sm" variant="outline" className="h-8 text-xs font-semibold" onClick={() => setActiveFilter("all")}>
              Clear filter
            </Button>
          ) : (
            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 h-8 text-xs font-semibold" onClick={openDrawer}>
              <Plus className="w-3.5 h-3.5 mr-1" />Add Contact
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Column headers */}
          <div className="flex items-center gap-4 px-5 py-2.5 border-b border-slate-200 bg-slate-50">
            <div className="w-11 flex-shrink-0" />
            <div className="w-9 flex-shrink-0" />
            <div className="flex-1 min-w-0 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact</div>
            <div className="hidden lg:block w-40 flex-shrink-0 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Company</div>
            <div className="hidden xl:block w-28 flex-shrink-0 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Industry</div>
            <div className="w-36 flex-shrink-0 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stage / Readiness</div>
            <div className="hidden md:block w-28 flex-shrink-0 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Owner</div>
            <div className="w-20 flex-shrink-0" />
          </div>

          {filtered.map((contact) => {
            const fullName = `${contact.first_name} ${contact.last_name ?? ""}`.trim();
            const grad = avatarGradient(fullName);
            const lcColor = LIFECYCLE_COLORS[contact.lifecycle_stage ?? "other"] ?? "bg-slate-100 text-slate-600";
            const lcLabel = LIFECYCLE_LABELS[contact.lifecycle_stage ?? "other"] ?? contact.lifecycle_stage ?? "—";
            const companyName = contact.company_id ? companyMap[contact.company_id] : undefined;
            const readiness = getReadiness(contact);
            const aiHint = compactReason(contact.pre_ai_reason);

            return (
              <div
                key={contact.id}
                className="group flex items-center gap-4 px-5 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors"
              >
                {/* Score Badge */}
                <ScoreBadge score={contact.pre_ai_score} />

                {/* Avatar */}
                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-sm`}>
                  {getInitials(contact.first_name, contact.last_name)}
                </div>

                {/* Contact info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/contacts/${contact.id}`}
                      className="font-semibold text-slate-900 text-sm hover:text-orange-600 transition-colors"
                    >
                      {fullName}
                    </Link>
                    {contact.title && (
                      <span className="text-xs text-slate-400 truncate max-w-[120px]">{contact.title}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{contact.email}</p>
                  {aiHint && (
                    <p className="text-[11px] text-slate-400 italic mt-0.5 truncate">{aiHint}</p>
                  )}
                </div>

                {/* Company */}
                <div className="hidden lg:block w-40 flex-shrink-0">
                  {companyName && contact.company_id ? (
                    <Link href={`/companies/${contact.company_id}`} className="flex items-center gap-1.5 hover:text-orange-600 transition-colors group/co">
                      <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${avatarGradient(companyName)} flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0`}>
                        {companyName.slice(0, 1).toUpperCase()}
                      </div>
                      <span className="text-xs font-medium text-slate-700 group-hover/co:text-orange-600 truncate transition-colors">{companyName}</span>
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-300">No company</span>
                  )}
                </div>

                {/* Industry */}
                <div className="hidden xl:block w-28 flex-shrink-0">
                  {contact.industry ? (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 truncate max-w-[108px]">
                      {contact.industry}
                    </span>
                  ) : (
                    <span className="text-slate-300 text-xs">—</span>
                  )}
                </div>

                {/* Stage + Readiness */}
                <div className="w-36 flex-shrink-0 space-y-1">
                  <span className={`inline-flex px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${lcColor}`}>
                    {lcLabel}
                  </span>
                  <br />
                  <span className={`inline-flex px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${readiness.className}`}>
                    {readiness.label}
                  </span>
                </div>

                {/* Owner */}
                <div className="hidden md:block w-28 flex-shrink-0">
                  {contact.owner ? (
                    <span className="text-xs text-slate-500 truncate block">{contact.owner.split("@")[0]}</span>
                  ) : (
                    <span className="text-slate-300 text-xs">Unassigned</span>
                  )}
                </div>

                {/* Actions */}
                <div className="w-20 flex-shrink-0 flex items-center justify-end gap-1">
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-300 hover:text-indigo-500 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                      title="Send email"
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone}`}
                      className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-300 hover:text-emerald-500 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                      title="Call"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <Link
                    href={`/contacts/${contact.id}`}
                    className="p-1.5 rounded-lg hover:bg-orange-50 text-slate-300 hover:text-orange-500 transition-colors"
                    title="View contact"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} total={total} perPage={PER_PAGE} onChange={(p) => setPage(p)} />

      {/* Add Contact Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <div className="w-full max-w-md bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Add Contact</h2>
              <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">{formError}</div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">First Name *</label>
                  <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="h-9 text-sm" placeholder="John" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Last Name</label>
                  <Input value={form.last_name ?? ""} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="h-9 text-sm" placeholder="Doe" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Email *</label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-9 text-sm" placeholder="john@example.com" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Phone</label>
                <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-9 text-sm" placeholder="+91 98765 43210" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Job Title</label>
                <Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-9 text-sm" placeholder="VP Sales" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Industry
                  {formCompanyId !== null && form.industry && (
                    <span className="ml-1 text-[10px] text-orange-500 normal-case font-normal">(from company)</span>
                  )}
                </label>
                <Input
                  value={form.industry ?? ""}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  readOnly={formCompanyId !== null}
                  className={`h-9 text-sm ${formCompanyId !== null ? "bg-slate-50 text-slate-500 cursor-not-allowed" : ""}`}
                  placeholder="Technology, Logistics…"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Source *</label>
                <Input value={form.source ?? ""} onChange={(e) => setForm({ ...form, source: e.target.value })} className="h-9 text-sm" placeholder="LinkedIn, referral…" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Lifecycle Stage</label>
                <div className="relative">
                  <select
                    value={form.lifecycle_stage ?? "lead"}
                    onChange={(e) => setForm({ ...form, lifecycle_stage: e.target.value })}
                    className="w-full h-9 border border-slate-200 rounded-lg px-3 text-sm text-slate-900 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {LIFECYCLE_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Company *</label>
                {formCompanyId !== null ? (
                  <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
                    <Building2 className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                    <span className="text-sm font-semibold text-slate-800 flex-1">{companyMap[formCompanyId]}</span>
                    <button type="button" onClick={() => { setFormCompanyId(null); setFormCompanySearch(""); setForm((prev) => ({ ...prev, industry: "" })); }} className="text-slate-400 hover:text-slate-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      placeholder="Search company…"
                      value={formCompanySearch}
                      onChange={(e) => setFormCompanySearch(e.target.value)}
                      className="h-9 text-sm"
                    />
                    {formCompanyResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                        {formCompanyResults.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setFormCompanyId(c.id);
                              setFormCompanySearch("");
                              if (c.industry) setForm((prev) => ({ ...prev, industry: c.industry! }));
                            }}
                            className="w-full px-3 py-2.5 text-left hover:bg-orange-50 border-b border-slate-100 last:border-0 transition-colors"
                          >
                            <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                            {c.industry && <p className="text-xs text-slate-400">{c.industry}</p>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {users.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Contact Owner</label>
                  <div className="relative">
                    <select
                      value={formOwner}
                      onChange={(e) => setFormOwner(e.target.value)}
                      className="w-full h-9 border border-slate-200 rounded-lg px-3 text-sm text-slate-900 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">None</option>
                      {users.map((u) => (
                        <option key={u.user_id} value={u.email}>{u.email}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              )}
              <div className="pt-2">
                <Button type="submit" disabled={saving} className="w-full bg-orange-600 hover:bg-orange-700 h-9 text-sm font-semibold">
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : "Add Contact"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setImportOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Import Contacts CSV</h2>
              <button onClick={() => setImportOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              CSV must include: <code className="bg-slate-100 px-1 rounded">first_name</code>, <code className="bg-slate-100 px-1 rounded">email</code>. Optional: last_name, phone, title, company, source.
            </p>
            <div
              className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-orange-400 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              {importFile ? (
                <p className="text-sm font-semibold text-slate-700">{importFile.name}</p>
              ) : (
                <p className="text-sm text-slate-400">Click to select CSV file</p>
              )}
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} />
            </div>
            {importResult && (
              <div className={`rounded-lg px-4 py-3 text-sm ${importResult.failed === -1 ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
                {importResult.failed === -1
                  ? "Import failed. Check your CSV format."
                  : `Created: ${importResult.created} · Updated: ${importResult.updated} · Failed: ${importResult.failed}`}
              </div>
            )}
            <Button
              onClick={handleImport}
              disabled={!importFile || importing}
              className="w-full bg-orange-600 hover:bg-orange-700 h-9 text-sm font-semibold"
            >
              {importing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing…</> : "Import"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
