"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Mail, Phone, Building2, Calendar, Globe, MapPin,
  Briefcase, User, Tag, AlertCircle, Loader2, ExternalLink,
  Activity, TrendingUp, Clock, Star, Users,
} from "lucide-react";
import API from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { getPipelineStage } from "@/lib/pipeline";

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

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
  title?: string;
  lifecycle_stage?: string;
}

interface Lead {
  id: number;
  name: string;
  company: string;
  deal_size?: number;
  ai_score?: number;
  status: string;
  created_at: string;
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

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatDeal(v?: number) {
  if (!v) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
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

export default function CompanyDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [company, setCompany] = useState<Company | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    Promise.all([
      API.get(`/companies/${id}`),
      API.get("/contacts", { params: { company_id: id, per_page: 50 } }),
      API.get("/leads", { params: { company_id_assoc: id, per_page: 50 } }),
    ])
      .then(([companyRes, contactsRes, leadsRes]) => {
        setCompany(companyRes.data);
        const contactsData = contactsRes.data?.data ?? contactsRes.data ?? [];
        setContacts(Array.isArray(contactsData) ? contactsData : []);
        const leadsData = leadsRes.data?.data ?? leadsRes.data ?? [];
        setLeads(Array.isArray(leadsData) ? leadsData : []);
      })
      .catch((err) => setError(getErrorMessage(err, "Unable to load company.")))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center py-16">
          <AlertCircle className="w-8 h-8 text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-700">{error || "Company not found"}</p>
          <Link href="/companies" className="mt-4">
            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 h-8 text-xs">
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />Back to Companies
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const grad = avatarGradient(company.name);
  const initials = company.name.slice(0, 2).toUpperCase();

  return (
    <div className="p-6 max-w-6xl space-y-5">
      <Link href="/companies">
        <button className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors mb-1">
          <ArrowLeft className="w-4 h-4" />Back to Companies
        </button>
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className={`h-1.5 bg-gradient-to-r ${grad}`} />
        <div className="p-5 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-xl font-bold text-white shadow-sm flex-shrink-0`}>
              {initials}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 mb-1">{company.name}</h1>
              <div className="flex items-center gap-2.5 flex-wrap">
                {company.industry && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Building2 className="w-3 h-3" />{company.industry}
                  </span>
                )}
                {company.location && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="w-3 h-3" />{company.location}
                  </span>
                )}
                {company.size && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Users className="w-3 h-3" />{company.size} employees
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {company.website && (
              <a href={company.website} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="h-8 text-xs border-slate-200 hover:border-indigo-300 hover:text-indigo-600">
                  <Globe className="w-3.5 h-3.5 mr-1.5" />Website
                </Button>
              </a>
            )}
            {company.phone && (
              <a href={`tel:${company.phone}`}>
                <Button variant="outline" size="sm" className="h-8 text-xs border-slate-200 hover:border-emerald-300 hover:text-emerald-600">
                  <Phone className="w-3.5 h-3.5 mr-1.5" />Call
                </Button>
              </a>
            )}
            {company.linkedin_url && (
              <a href={company.linkedin_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="h-8 text-xs border-slate-200 hover:border-blue-300 hover:text-blue-600">
                  <LinkedinIcon className="w-3.5 h-3.5 mr-1.5" />LinkedIn
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: About */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">About</h2>
            <div className="space-y-3">
              {[
                { icon: Globe, label: "Website", value: company.website, href: company.website },
                { icon: Globe, label: "Domain", value: company.domain },
                { icon: Phone, label: "Phone", value: company.phone, href: `tel:${company.phone}` },
                { icon: Building2, label: "Industry", value: company.industry },
                { icon: Users, label: "Size", value: company.size ? `${company.size} employees` : null },
                { icon: MapPin, label: "Location", value: company.location },
                { icon: User, label: "Owner", value: company.owner },
                { icon: Calendar, label: "Created", value: formatDate(company.created_at) },
              ].filter((f) => f.value).map((field) => (
                <div key={field.label} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <field.icon className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{field.label}</p>
                    {field.href ? (
                      <a href={field.href} target={field.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="text-sm font-medium text-indigo-600 hover:underline break-all">{field.value}</a>
                    ) : (
                      <p className="text-sm font-medium text-slate-900 mt-0.5">{field.value}</p>
                    )}
                  </div>
                </div>
              ))}
              {company.linkedin_url && (
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <LinkedinIcon className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">LinkedIn</p>
                    <a href={company.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-600 hover:underline break-all">{company.linkedin_url}</a>
                  </div>
                </div>
              )}
            </div>
            {company.description && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Description</p>
                <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-100 leading-relaxed">{company.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Contacts + Leads */}
        <div className="lg:col-span-2 space-y-4">
          {/* Contacts */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                Contacts
                {contacts.length > 0 && (
                  <span className="ml-1 text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold">{contacts.length}</span>
                )}
              </h2>
              <Link href="/contacts">
                <Button size="sm" variant="outline" className="h-7 text-xs border-slate-200">
                  + New Contact
                </Button>
              </Link>
            </div>
            {contacts.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No contacts associated with this company yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {contacts.map((contact) => {
                  const fullName = `${contact.first_name} ${contact.last_name ?? ""}`.trim();
                  const cGrad = avatarGradient(fullName);
                  const lcColor = LIFECYCLE_COLORS[contact.lifecycle_stage ?? "other"] ?? "bg-slate-100 text-slate-600";
                  const lcLabel = LIFECYCLE_LABELS[contact.lifecycle_stage ?? "other"] ?? contact.lifecycle_stage ?? "";
                  return (
                    <Link key={contact.id} href={`/contacts/${contact.id}`}>
                      <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors cursor-pointer">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cGrad} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
                          {(contact.first_name[0] ?? "") + (contact.last_name?.[0] ?? "")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{fullName}</p>
                          <p className="text-xs text-slate-400 truncate">{contact.email}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {contact.title && <span className="text-xs text-slate-500 hidden sm:block">{contact.title}</span>}
                          {lcLabel && <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${lcColor}`}>{lcLabel}</span>}
                          <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Leads */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-orange-500" />
                Associated Leads
                {leads.length > 0 && (
                  <span className="ml-1 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-bold">{leads.length}</span>
                )}
              </h2>
              <Link href="/leads">
                <Button size="sm" variant="outline" className="h-7 text-xs border-slate-200">
                  + New Lead
                </Button>
              </Link>
            </div>
            {leads.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No leads associated with this company yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leads.map((lead) => {
                  const stage = getPipelineStage(lead.status);
                  return (
                    <Link key={lead.id} href={`/leads/${lead.id}`}>
                      <div className="flex items-center gap-4 p-3 rounded-lg border border-slate-100 hover:border-orange-200 hover:bg-orange-50/30 transition-colors cursor-pointer">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{lead.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${stage.badge}`}>{stage.label}</span>
                            <span className="text-xs text-slate-400 flex items-center gap-0.5">
                              <Clock className="w-3 h-3" />{formatDate(lead.created_at)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {lead.deal_size != null && (
                            <span className="text-sm font-bold text-slate-700">{formatDeal(lead.deal_size)}</span>
                          )}
                          {lead.ai_score != null && (
                            <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${lead.ai_score >= 80 ? "bg-emerald-100 text-emerald-700" : lead.ai_score >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}>
                              <Star className="w-3 h-3" />{lead.ai_score.toFixed(0)}
                            </span>
                          )}
                          <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
