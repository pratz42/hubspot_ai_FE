"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Mail, Phone, Building2, Calendar, Globe, MapPin,
  Briefcase, Star, User, Tag, AlertCircle, Loader2, ExternalLink,
  Activity, TrendingUp, Clock,
} from "lucide-react";
import API from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { getPipelineStage } from "@/lib/pipeline";

interface Contact {
  id: number;
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  title?: string;
  company_id?: number;
  industry?: string;
  city?: string;
  country?: string;
  lifecycle_stage?: string;
  lead_status?: string;
  source?: string;
  owner?: string;
  notes?: string;
  created_at: string;
}

interface Company {
  id: number;
  name: string;
  industry?: string;
  website?: string;
  domain?: string;
  location?: string;
  linkedin_url?: string;
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
  marketing_qualified_lead: "Marketing Qualified Lead",
  sales_qualified_lead: "Sales Qualified Lead",
  opportunity: "Opportunity",
  customer: "Customer",
  evangelist: "Evangelist",
  other: "Other",
};

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

export default function ContactDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [contact, setContact] = useState<Contact | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    Promise.all([
      API.get(`/contacts/${id}`),
      API.get("/leads", { params: { contact_id: id, per_page: 50 } }),
    ])
      .then(async ([contactRes, leadsRes]) => {
        const c: Contact = contactRes.data;
        setContact(c);
        const leadsData = leadsRes.data?.data ?? leadsRes.data ?? [];
        setLeads(Array.isArray(leadsData) ? leadsData : []);
        if (c.company_id) {
          try {
            const coRes = await API.get(`/companies/${c.company_id}`);
            setCompany(coRes.data);
          } catch { /* no company */ }
        }
      })
      .catch((err) => setError(getErrorMessage(err, "Unable to load contact.")))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center py-16">
          <AlertCircle className="w-8 h-8 text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-700">{error || "Contact not found"}</p>
          <Link href="/contacts" className="mt-4">
            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 h-8 text-xs">
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />Back to Contacts
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const fullName = `${contact.first_name} ${contact.last_name ?? ""}`.trim();
  const grad = avatarGradient(fullName);
  const lcColor = LIFECYCLE_COLORS[contact.lifecycle_stage ?? "other"] ?? "bg-slate-100 text-slate-600";
  const lcLabel = LIFECYCLE_LABELS[contact.lifecycle_stage ?? "other"] ?? contact.lifecycle_stage ?? "—";

  return (
    <div className="p-6 max-w-6xl space-y-5">
      <Link href="/contacts">
        <button className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors mb-1">
          <ArrowLeft className="w-4 h-4" />Back to Contacts
        </button>
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className={`h-1.5 bg-gradient-to-r ${grad}`} />
        <div className="p-5 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-xl font-bold text-white shadow-sm flex-shrink-0`}>
              {(contact.first_name[0] ?? "") + (contact.last_name?.[0] ?? "")}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap mb-1">
                <h1 className="text-xl font-bold text-slate-900">{fullName}</h1>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${lcColor}`}>{lcLabel}</span>
              </div>
              <p className="text-sm text-slate-500">
                {contact.title && <span className="font-medium text-slate-700">{contact.title}</span>}
                {contact.title && company && <span className="mx-1.5 text-slate-300">·</span>}
                {company && (
                  <Link href={`/companies/${company.id}`} className="hover:text-orange-600 transition-colors font-medium">
                    {company.name}
                  </Link>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {contact.email && (
              <a href={`mailto:${contact.email}`}>
                <Button variant="outline" size="sm" className="h-8 text-xs border-slate-200 hover:border-indigo-300 hover:text-indigo-600">
                  <Mail className="w-3.5 h-3.5 mr-1.5" />Email
                </Button>
              </a>
            )}
            {contact.phone && (
              <a href={`tel:${contact.phone}`}>
                <Button variant="outline" size="sm" className="h-8 text-xs border-slate-200 hover:border-emerald-300 hover:text-emerald-600">
                  <Phone className="w-3.5 h-3.5 mr-1.5" />Call
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
                { icon: Mail, label: "Email", value: contact.email, href: `mailto:${contact.email}` },
                { icon: Phone, label: "Phone", value: contact.phone, href: `tel:${contact.phone}` },
                { icon: Briefcase, label: "Job Title", value: contact.title },
                { icon: Globe, label: "Source", value: contact.source },
                { icon: Tag, label: "Industry", value: contact.industry },
                { icon: MapPin, label: "Location", value: [contact.city, contact.country].filter(Boolean).join(", ") || null },
                { icon: User, label: "Owner", value: contact.owner },
                { icon: Calendar, label: "Created", value: formatDate(contact.created_at) },
              ].filter((f) => f.value).map((field) => (
                <div key={field.label} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <field.icon className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{field.label}</p>
                    {field.href ? (
                      <a href={field.href} className="text-sm font-medium text-indigo-600 hover:underline break-all">{field.value}</a>
                    ) : (
                      <p className="text-sm font-medium text-slate-900 mt-0.5">{field.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {contact.notes && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Notes</p>
                <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-100 leading-relaxed">{contact.notes}</p>
              </div>
            )}
          </div>

          {/* Company card */}
          {company && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Company</h2>
              <Link href={`/companies/${company.id}`} className="group flex items-center gap-3 hover:bg-slate-50 rounded-lg p-2 -mx-2 transition-colors">
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${avatarGradient(company.name)} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
                  {company.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 group-hover:text-orange-600 transition-colors">{company.name}</p>
                  {company.industry && <p className="text-xs text-slate-400">{company.industry}</p>}
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-orange-500 flex-shrink-0" />
              </Link>
              {(company.website || company.domain) && (
                <a
                  href={company.website ?? `https://${company.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-1.5 text-xs text-indigo-600 hover:underline px-2"
                >
                  <Globe className="w-3 h-3" />
                  {company.website ?? company.domain}
                </a>
              )}
            </div>
          )}
        </div>

        {/* Right: Leads */}
        <div className="lg:col-span-2 space-y-4">
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
              <div className="text-center py-10">
                <TrendingUp className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No leads associated with this contact yet.</p>
                <Link href="/leads">
                  <button className="mt-3 text-xs font-semibold text-orange-600 hover:text-orange-700">
                    Create a lead from the Leads page →
                  </button>
                </Link>
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
