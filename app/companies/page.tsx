"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import {
  Search,
  Building2,
  Globe,
  Phone,
  Plus,
  Upload,
  X,
  Layers,
  Users,
  Loader2,
  MapPin,
  ChevronDown,
} from "lucide-react";

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import API from "@/lib/api";

interface Company {
  id: number;
  name: string;
  domain?: string;
  industry?: string;
  size?: string;
  location?: string;
  website?: string;
  phone?: string;
  description?: string;
  owner?: string;
  linkedin_url?: string;
  created_at: string;
}

interface Contact {
  id: number;
  first_name: string;
  last_name?: string;
  email: string;
  company_id?: number;
}

interface AppUser {
  user_id: string;
  email: string;
}

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

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function getContactInitials(first: string, last?: string) {
  return ((first[0] ?? "") + (last?.[0] ?? "")).toUpperCase();
}

const BLANK: Partial<Company> = {
  name: "",
  domain: "",
  industry: "",
  size: "",
  location: "",
  website: "",
  phone: "",
  description: "",
  linkedin_url: "",
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({ ...BLANK });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [formOwner, setFormOwner] = useState("");
  const [users, setUsers] = useState<AppUser[]>([]);

  // CSV import
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{ created: number; updated: number; failed: number } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function fetchCompanies() {
    try {
      const res = await API.get("/companies", { params: { limit: 500 } });
      const data: Company[] = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setCompanies(data);
    } catch {
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchContacts() {
    try {
      const res = await API.get("/contacts", { params: { limit: 500 } });
      const data: Contact[] = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setContacts(data);
    } catch { /* ignore */ }
  }

  async function fetchUsers() {
    try {
      const res = await API.get("/auth/users");
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    fetchCompanies();
    fetchContacts();
    fetchUsers();
  }, []);

  const contactsByCompany = useMemo(() => {
    const map: Record<number, Contact[]> = {};
    contacts.forEach((c) => {
      if (c.company_id) {
        if (!map[c.company_id]) map[c.company_id] = [];
        map[c.company_id].push(c);
      }
    });
    return map;
  }, [contacts]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.domain?.toLowerCase().includes(q) ||
        c.industry?.toLowerCase().includes(q) ||
        c.location?.toLowerCase().includes(q)
    );
  }, [companies, search]);

  const industryCount = new Set(companies.map((c) => c.industry).filter(Boolean)).size;

  const statCards = [
    { label: "Total Companies", value: companies.length, color: "from-indigo-600 to-indigo-700", iconBg: "bg-indigo-500", icon: Building2 },
    { label: "Industries", value: industryCount, color: "from-orange-500 to-orange-600", iconBg: "bg-orange-400", icon: Layers },
    { label: "With Website", value: companies.filter((c) => c.website || c.domain).length, color: "from-emerald-600 to-emerald-700", iconBg: "bg-emerald-500", icon: Globe },
    { label: "With Phone", value: companies.filter((c) => c.phone).length, color: "from-violet-600 to-violet-700", iconBg: "bg-violet-500", icon: Phone },
  ];

  function openDrawer() {
    setDrawerOpen(true);
    setForm({ ...BLANK });
    setFormError("");
    setFormOwner("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.name?.trim()) { setFormError("Company name is required."); return; }
    if (!form.industry?.trim()) { setFormError("Industry is required."); return; }
    setSaving(true);
    try {
      await API.post("/companies", {
        name: form.name.trim(),
        domain: form.domain?.trim() || undefined,
        industry: form.industry.trim(),
        size: form.size?.trim() || undefined,
        location: form.location?.trim() || undefined,
        website: form.website?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        description: form.description?.trim() || undefined,
        owner: formOwner || undefined,
        linkedin_url: form.linkedin_url?.trim() || undefined,
      });
      setDrawerOpen(false);
      setForm({ ...BLANK });
      setFormOwner("");
      fetchCompanies();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setFormError(msg ?? "Failed to create company.");
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
      const res = await API.post("/companies/import-csv", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setImportResult(res.data);
      fetchCompanies();
    } catch {
      setImportResult({ created: 0, updated: 0, failed: -1 });
    } finally {
      setImporting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-5">
        <div className="h-7 bg-slate-200 rounded-lg w-36 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-slate-100 animate-pulse">
              <div className="w-9 h-9 rounded-xl bg-slate-200 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-slate-200 rounded w-36" />
                <div className="h-3 bg-slate-100 rounded w-24" />
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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Companies</h1>
          <p className="text-sm text-slate-500 mt-0.5">{companies.length} companies</p>
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
          <Button
            size="sm"
            className="bg-orange-600 hover:bg-orange-700 h-8 text-xs font-semibold"
            onClick={openDrawer}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Company
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${card.color} p-5 shadow-md`}>
            <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
            <div className="relative">
              <div className={`inline-flex p-2 rounded-lg ${card.iconBg} mb-3`}>
                <card.icon className="h-4 w-4 text-white" />
              </div>
              <div className="text-2xl font-bold text-white">{card.value}</div>
              <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mt-0.5">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search companies…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 h-9"
          />
        </div>
        <span className="text-xs text-slate-400 font-medium">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-4">
            <Building2 className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-700 mb-1">No companies found</h3>
          <p className="text-slate-400 text-xs mb-5">Import a CSV or add your first company.</p>
          <Button size="sm" className="bg-orange-600 hover:bg-orange-700 h-8 text-xs font-semibold" onClick={openDrawer}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Company
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {["Company", "Industry", "Location", "Company Contacts", "Owner"].map((h) => (
                  <th key={h} className="text-left py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((company) => {
                const grad = avatarGradient(company.name);
                const compContacts = contactsByCompany[company.id] ?? [];
                return (
                  <tr key={company.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    {/* Company */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center font-bold text-xs text-white flex-shrink-0 shadow-sm`}>
                          {getInitials(company.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm truncate">{company.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {company.domain && (
                              <p className="text-xs text-slate-400 truncate">{company.domain}</p>
                            )}
                            {(company.website || company.domain) && (
                              <a
                                href={company.website ?? `https://${company.domain}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-300 hover:text-orange-500 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                                title="Website"
                              >
                                <Globe className="w-3 h-3" />
                              </a>
                            )}
                            {company.linkedin_url && (
                              <a
                                href={company.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-300 hover:text-blue-600 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                                title="LinkedIn Company Page"
                              >
                                <LinkedinIcon className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Industry */}
                    <td className="py-3.5 px-5">
                      {company.industry ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                          {company.industry}
                        </span>
                      ) : <span className="text-slate-300 text-xs">—</span>}
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-5">
                      <div className="space-y-0.5">
                        {company.location && (
                          <div className="flex items-center gap-1 text-xs text-slate-600">
                            <MapPin className="w-3 h-3 text-slate-300 flex-shrink-0" />
                            <span>{company.location}</span>
                          </div>
                        )}
                        {company.size && (
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Users className="w-3 h-3 text-slate-300 flex-shrink-0" />
                            <span>{company.size}</span>
                          </div>
                        )}
                        {!company.location && !company.size && <span className="text-slate-300 text-xs">—</span>}
                      </div>
                    </td>

                    {/* Company Contacts */}
                    <td className="py-3.5 px-5">
                      {compContacts.length === 0 ? (
                        <span className="text-slate-300 text-xs">—</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-1.5">
                            {compContacts.slice(0, 4).map((c) => (
                              <div
                                key={c.id}
                                title={`${c.first_name} ${c.last_name ?? ""} · ${c.email}`}
                                className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold flex items-center justify-center border-2 border-white ring-1 ring-violet-200 flex-shrink-0"
                              >
                                {getContactInitials(c.first_name, c.last_name)}
                              </div>
                            ))}
                          </div>
                          <div className="text-xs text-slate-600">
                            {compContacts.length === 1
                              ? <span className="font-medium">{compContacts[0].first_name} {compContacts[0].last_name ?? ""}</span>
                              : <span className="font-medium">{compContacts.length} contacts</span>
                            }
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Owner */}
                    <td className="py-3.5 px-5 text-xs text-slate-500">
                      {company.owner ? (
                        <span className="truncate max-w-[120px] block">{company.owner}</span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Company Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <div className="w-full max-w-md bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Add Company</h2>
              <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">{formError}</div>
              )}
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Company Name *</label>
                <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-9 text-sm" placeholder="Acme Corp" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Industry *</label>
                <Input value={form.industry ?? ""} onChange={(e) => setForm({ ...form, industry: e.target.value })} className="h-9 text-sm" placeholder="Technology, Retail, Logistics…" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Domain</label>
                <Input value={form.domain ?? ""} onChange={(e) => setForm({ ...form, domain: e.target.value })} className="h-9 text-sm" placeholder="acme.com" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Company Size</label>
                  <Input value={form.size ?? ""} onChange={(e) => setForm({ ...form, size: e.target.value })} className="h-9 text-sm" placeholder="50-200" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Location</label>
                  <Input value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value })} className="h-9 text-sm" placeholder="Mumbai, India" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Website</label>
                <Input value={form.website ?? ""} onChange={(e) => setForm({ ...form, website: e.target.value })} className="h-9 text-sm" placeholder="https://acme.com" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Phone</label>
                <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-9 text-sm" placeholder="+91 22 1234 5678" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">LinkedIn Company Page</label>
                <Input
                  value={form.linkedin_url ?? ""}
                  onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
                  className="h-9 text-sm"
                  placeholder="https://linkedin.com/company/acme"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Description</label>
                <textarea
                  value={form.description ?? ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  placeholder="Brief description…"
                />
              </div>

              {/* Company Owner */}
              {users.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Company Owner</label>
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
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : "Add Company"}
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
              <h2 className="text-base font-bold text-slate-900">Import Companies CSV</h2>
              <button onClick={() => setImportOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              CSV must include: <code className="bg-slate-100 px-1 rounded">name</code>. Optional: domain, industry, size, location, website, phone.
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
