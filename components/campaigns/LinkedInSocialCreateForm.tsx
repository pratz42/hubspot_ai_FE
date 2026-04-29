"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Sparkles, Loader2, ChevronDown, ChevronUp,
  CheckCircle2, AlertTriangle, Image as ImageIcon, Video, Newspaper,
} from "lucide-react";

export interface LinkedInSocialForm {
  campaign_name: string;
  objective: string;
  approval_owner: string;
  tone: string;
  post_count: number;
  campaign_theme: string;
  focus_mode: string;
  focus_industry: string;
  focus_product: string;
  cta_preference: string;
  include_video: boolean;
  include_image: boolean;
  constraints: string;
  success_metrics: string;
}

export interface UserOption {
  user_id: string;
  email: string;
}

interface Props {
  form: LinkedInSocialForm;
  onChange: (patch: Partial<LinkedInSocialForm>) => void;
  users: UserOption[];
  loadingUsers: boolean;
  usersError: string;
  onBack: () => void;
  onGenerate: () => void;
  generating: boolean;
  genError: string;
}

const TONES = ["professional", "casual", "authoritative", "thought-leader", "educational", "inspiring", "empathetic"];
const FOCUS_MODES = [
  { value: "general", label: "General" },
  { value: "industry", label: "Industry" },
  { value: "product", label: "Product" },
];

function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
}

function OwnerPicker({ value, onChange, users, loading, error }: {
  value: string; onChange: (v: string) => void;
  users: UserOption[]; loading: boolean; error: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery(value); }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, value]);

  const filtered = query ? users.filter((u) => u.email.toLowerCase().includes(query.toLowerCase())) : users;

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Input
          placeholder={loading ? "Loading users…" : "Select approval owner…"}
          value={query}
          disabled={loading}
          onChange={(e) => { setQuery(e.target.value); onChange(""); if (!open) setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === "Escape") { setOpen(false); setQuery(value); } }}
          className={`border-slate-200 focus:ring-blue-500/30 focus:border-blue-400 pr-8 ${value ? "font-medium" : ""}`}
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
          {loading ? <Loader2 className="w-4 h-4 text-slate-400 animate-spin" /> : value ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>
      {open && !loading && (
        <div className="absolute z-50 top-full mt-1.5 w-full rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          {error && <div className="px-4 py-3 text-sm text-red-600 bg-red-50 flex items-center gap-2"><AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}</div>}
          {!error && filtered.length === 0 && <div className="px-4 py-6 text-center text-sm text-slate-400">No users found</div>}
          {!error && filtered.map((u) => {
            const nameHint = u.email.split("@")[0].replace(/[._]/g, " ");
            return (
              <button key={u.user_id} onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onChange(u.email); setQuery(u.email); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${value === u.email ? "bg-blue-50" : "hover:bg-slate-50"}`}>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {initials(nameHint)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 capitalize truncate">{nameHint}</p>
                  <p className="text-xs text-slate-400 truncate">{u.email}</p>
                </div>
                {value === u.email && <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function LinkedInSocialCreateForm({ form, onChange, users, loadingUsers, usersError, onBack, onGenerate, generating, genError }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const isValid = form.campaign_name.trim() !== "" && form.objective.trim() !== "" && form.approval_owner.trim() !== "";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 px-1">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
          <Newspaper className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">LinkedIn Social Campaign</h2>
          <p className="text-xs text-slate-500">AI-generated posts published from your personal LinkedIn account</p>
        </div>
      </div>

      {genError && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{genError}</p>
        </div>
      )}

      {/* Campaign Basics */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 rounded-t-xl">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Campaign Basics</span>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Campaign Name <span className="text-red-400">*</span></label>
            <Input placeholder="e.g. Q2 Brand Awareness Push" value={form.campaign_name}
              onChange={(e) => onChange({ campaign_name: e.target.value })}
              className="border-slate-200 focus:ring-blue-500/30 focus:border-blue-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Objective <span className="text-red-400">*</span></label>
            <textarea rows={3} placeholder="e.g. Build brand awareness around our supply chain solutions among logistics decision-makers…"
              value={form.objective} onChange={(e) => onChange({ objective: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none" />
            <p className="mt-1 text-xs text-slate-400">What do you want this campaign to achieve on LinkedIn?</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Approval Owner <span className="text-red-400">*</span></label>
            <OwnerPicker value={form.approval_owner} onChange={(v) => onChange({ approval_owner: v })}
              users={users} loading={loadingUsers} error={usersError} />
            {form.approval_owner && (
              <p className="mt-1.5 text-xs text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {form.approval_owner} selected
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content Direction */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Content Direction</span>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Campaign Theme</label>
            <Input placeholder="e.g. The future of supply chain visibility"
              value={form.campaign_theme} onChange={(e) => onChange({ campaign_theme: e.target.value })}
              className="border-slate-200 focus:ring-blue-500/30 focus:border-blue-400" />
            <p className="mt-1 text-xs text-slate-400">The overarching narrative that ties all posts together.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Tone</label>
              <select value={form.tone} onChange={(e) => onChange({ tone: e.target.value })}
                className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white">
                <option value="">Default</option>
                {TONES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1).replace(/-/g, " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Focus Mode</label>
              <select value={form.focus_mode} onChange={(e) => onChange({ focus_mode: e.target.value })}
                className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white">
                <option value="">Select focus…</option>
                {FOCUS_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Industry Focus</label>
              <Input placeholder="e.g. Logistics, Manufacturing" value={form.focus_industry}
                onChange={(e) => onChange({ focus_industry: e.target.value })}
                className="border-slate-200 focus:ring-blue-500/30 focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Product / Solution</label>
              <Input placeholder="e.g. TrackChain Pro" value={form.focus_product}
                onChange={(e) => onChange({ focus_product: e.target.value })}
                className="border-slate-200 focus:ring-blue-500/30 focus:border-blue-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">CTA Preference</label>
            <Input placeholder="e.g. Visit our website, Comment below, Share your experience"
              value={form.cta_preference} onChange={(e) => onChange({ cta_preference: e.target.value })}
              className="border-slate-200 focus:ring-blue-500/30 focus:border-blue-400" />
          </div>
        </div>
      </div>

      {/* Visual Media */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Visual Media</span>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => onChange({ include_image: !form.include_image })}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-lg border-2 transition-all text-left ${form.include_image ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${form.include_image ? "bg-blue-100" : "bg-slate-100"}`}>
                <ImageIcon className={`w-5 h-5 ${form.include_image ? "text-blue-600" : "text-slate-400"}`} />
              </div>
              <div>
                <p className={`text-sm font-semibold ${form.include_image ? "text-blue-800" : "text-slate-600"}`}>Include Images</p>
                <p className="text-xs text-slate-400 mt-0.5">AI suggests image prompts</p>
              </div>
              {form.include_image && <CheckCircle2 className="w-4 h-4 text-blue-500 ml-auto flex-shrink-0" />}
            </button>
            <button type="button" onClick={() => onChange({ include_video: !form.include_video })}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-lg border-2 transition-all text-left ${form.include_video ? "border-violet-400 bg-violet-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${form.include_video ? "bg-violet-100" : "bg-slate-100"}`}>
                <Video className={`w-5 h-5 ${form.include_video ? "text-violet-600" : "text-slate-400"}`} />
              </div>
              <div>
                <p className={`text-sm font-semibold ${form.include_video ? "text-violet-800" : "text-slate-600"}`}>Include Videos</p>
                <p className="text-xs text-slate-400 mt-0.5">AI suggests video concepts</p>
              </div>
              {form.include_video && <CheckCircle2 className="w-4 h-4 text-violet-500 ml-auto flex-shrink-0" />}
            </button>
          </div>
        </div>
      </div>

      {/* Volume */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Volume</span>
        </div>
        <div className="p-5">
          <div className="max-w-xs">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Number of Posts</label>
            <input type="number" min={1} max={20} value={form.post_count}
              onChange={(e) => onChange({ post_count: parseInt(e.target.value, 10) || 1 })}
              className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
            <p className="mt-1 text-xs text-slate-400">Each post is published manually in sequence after approval.</p>
          </div>
        </div>
      </div>

      {/* Advanced (collapsible) */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <button type="button" onClick={() => setShowAdvanced((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Advanced Settings</span>
          {showAdvanced ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        {showAdvanced && (
          <div className="p-5 space-y-4 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Constraints</label>
              <textarea rows={3} placeholder={"One per line, e.g.\nAvoid mentioning competitors\nKeep posts under 1300 characters"}
                value={form.constraints} onChange={(e) => onChange({ constraints: e.target.value })}
                className="w-full rounded-md border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Success Metrics</label>
              <textarea rows={3} placeholder={"One per line, e.g.\n500+ impressions per post\n5% engagement rate"}
                value={form.success_metrics} onChange={(e) => onChange({ success_metrics: e.target.value })}
                className="w-full rounded-md border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none" />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack} disabled={generating} className="gap-2 border-slate-200 text-slate-600">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <Button onClick={onGenerate} disabled={!isValid || generating}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm shadow-blue-200 px-6">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Generate Campaign
        </Button>
      </div>
    </div>
  );
}
