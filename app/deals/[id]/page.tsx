"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  Plus,
  Loader2,
  Mail,
  Phone,
  StickyNote,
  PhoneCall,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import API from "@/lib/api";

interface Contact { id: number; first_name: string; last_name?: string; email: string; title?: string; }
interface Company { id: number; name: string; domain?: string; industry?: string; }

interface Deal {
  id: number;
  name: string;
  amount?: number;
  close_date?: string;
  stage_name?: string;
  probability?: number;
  owner?: string;
  description?: string;
  primary_company_id?: number;
  created_at: string;
  contacts: Contact[];
  companies: Company[];
}

interface Activity {
  id: number;
  type: string;
  content?: string;
  timestamp: string;
  created_by?: string;
}

const ACT_COLORS: Record<string, string> = {
  note: "bg-yellow-100 text-yellow-700",
  call: "bg-green-100 text-green-700",
  email: "bg-blue-100 text-blue-700",
  meeting: "bg-purple-100 text-purple-700",
  deal_created: "bg-slate-100 text-slate-600",
  stage_change: "bg-orange-100 text-orange-700",
  deal_updated: "bg-sky-100 text-sky-700",
};

const ACT_ICONS: Record<string, React.ElementType> = {
  note: StickyNote,
  call: PhoneCall,
  email: Mail,
  meeting: Users,
  deal_created: Briefcase,
  stage_change: TrendingUp,
  deal_updated: Briefcase,
};

function formatAmount(value?: number) {
  if (!value) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

export default function DealDetailPage() {
  const params = useParams();
  const dealId = params?.id;
  const [deal, setDeal] = useState<Deal | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // Log activity
  const [actType, setActType] = useState<"note" | "call" | "email" | "meeting">("note");
  const [actContent, setActContent] = useState("");
  const [logging, setLogging] = useState(false);
  const [logError, setLogError] = useState("");

  useEffect(() => {
    if (!dealId) return;
    Promise.all([
      API.get(`/deals/${dealId}`),
      API.get(`/deals/${dealId}/activities`),
    ]).then(([dealRes, actRes]) => {
      setDeal(dealRes.data);
      setActivities(Array.isArray(actRes.data) ? actRes.data : []);
    }).finally(() => setLoading(false));
  }, [dealId]);

  async function logActivity() {
    if (!actContent.trim()) { setLogError("Activity content is required."); return; }
    setLogError("");
    setLogging(true);
    try {
      await API.post("/activities", { type: actType, content: actContent.trim(), deal_id: Number(dealId) });
      const res = await API.get(`/deals/${dealId}/activities`);
      setActivities(Array.isArray(res.data) ? res.data : []);
      setActContent("");
    } catch {
      setLogError("Failed to log activity.");
    } finally {
      setLogging(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-6 bg-slate-200 rounded w-40 animate-pulse" />
        <div className="h-32 bg-slate-200 rounded-xl animate-pulse" />
        <div className="h-64 bg-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="p-6 flex flex-col items-center justify-center py-24">
        <p className="text-slate-500">Deal not found.</p>
        <Link href="/deals"><Button className="mt-4 bg-orange-600 hover:bg-orange-700 h-8 text-xs">Back to Deals</Button></Link>
      </div>
    );
  }

  const primaryCompany = deal.companies.find((c) => c.id === deal.primary_company_id) ?? deal.companies[0];

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      {/* Back */}
      <Link href="/deals" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-orange-600 transition-colors font-medium">
        <ArrowLeft className="w-4 h-4" />
        Back to Deals
      </Link>

      {/* Deal header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{deal.name}</h1>
              {deal.stage_name && (
                <span className="inline-flex mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">{deal.stage_name}</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-emerald-700">{formatAmount(deal.amount)}</p>
            {deal.probability !== undefined && (
              <p className="text-xs text-slate-400 mt-0.5">{deal.probability}% probability</p>
            )}
          </div>
        </div>

        {deal.description && <p className="mt-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">{deal.description}</p>}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Close Date</p>
            <div className="flex items-center gap-1.5 text-sm text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {deal.close_date ? new Date(deal.close_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Deal Owner</p>
            <p className="text-sm text-slate-700">{deal.owner ?? "—"}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Amount</p>
            <div className="flex items-center gap-1 text-sm font-bold text-emerald-700">
              <DollarSign className="w-3.5 h-3.5" />
              {formatAmount(deal.amount)}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Probability</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-orange-400 rounded-full" style={{ width: `${deal.probability ?? 0}%` }} />
              </div>
              <span className="text-xs font-semibold text-slate-600">{deal.probability ?? 0}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: associations */}
        <div className="space-y-4">
          {/* Companies */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />Companies
            </h3>
            {deal.companies.length === 0 ? (
              <p className="text-xs text-slate-400">No companies associated</p>
            ) : (
              <div className="space-y-2">
                {deal.companies.map((c) => (
                  <Link key={c.id} href={`/companies/${c.id}`} className="flex items-center gap-2 rounded-lg p-1.5 -mx-1.5 hover:bg-slate-50 transition-colors group">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">{c.name}</p>
                      {c.id === deal.primary_company_id && (
                        <span className="text-[10px] text-orange-600 font-bold">PRIMARY</span>
                      )}
                      {c.industry && <p className="text-xs text-slate-400">{c.industry}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Contacts */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />Contacts
            </h3>
            {deal.contacts.length === 0 ? (
              <p className="text-xs text-slate-400">No contacts associated</p>
            ) : (
              <div className="space-y-2.5">
                {deal.contacts.map((c) => (
                  <div key={c.id} className="flex items-start gap-2 rounded-lg p-1.5 -mx-1.5 hover:bg-slate-50 transition-colors group">
                    <Link href={`/contacts/${c.id}`} className="flex items-start gap-2 flex-1 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-violet-600">
                        {c.first_name[0]}{c.last_name?.[0] ?? ""}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 group-hover:text-violet-600 transition-colors">{c.first_name} {c.last_name ?? ""}</p>
                        {c.title && <p className="text-xs text-slate-400">{c.title}</p>}
                      </div>
                    </Link>
                    {c.email && <a href={`mailto:${c.email}`} onClick={(e) => e.stopPropagation()} className="text-slate-300 hover:text-indigo-500 transition-colors flex-shrink-0 mt-1"><Mail className="w-3.5 h-3.5" /></a>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Activity log */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700">Activity Log</h3>
            <span className="text-xs text-slate-400">{activities.length} activities</span>
          </div>

          {/* Log form */}
          <div className="px-5 py-4 border-b border-slate-100 space-y-3">
            <div className="flex gap-2">
              {(["note", "call", "email", "meeting"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setActType(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${actType === t ? "bg-orange-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={actContent}
                onChange={(e) => setActContent(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); logActivity(); } }}
                placeholder={`Log a ${actType}…`}
                className="h-9 text-sm flex-1"
              />
              <Button onClick={logActivity} disabled={logging} className="bg-orange-600 hover:bg-orange-700 h-9 text-xs font-semibold px-3">
                {logging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </div>
            {logError && <p className="text-xs text-red-600">{logError}</p>}
          </div>

          {/* Activities list */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {activities.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No activities yet. Log the first one above.</p>
              </div>
            ) : (
              activities.map((act) => {
                const Icon = ACT_ICONS[act.type] ?? StickyNote;
                const colorCls = ACT_COLORS[act.type] ?? "bg-slate-100 text-slate-600";
                return (
                  <div key={act.id} className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${colorCls}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 leading-snug">{act.content ?? act.type.replace(/_/g, " ")}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(act.timestamp).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        {act.created_by && ` · ${/^[0-9a-f-]{36}$/i.test(act.created_by) ? "System" : act.created_by}`}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${colorCls}`}>
                      {act.type.replace(/_/g, " ").toUpperCase()}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
