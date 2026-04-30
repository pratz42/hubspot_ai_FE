"use client";

import { useState, useEffect, useRef, type ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Mail,
  Link2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Brain,
  Loader2,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
  Plus,
  AlertTriangle,
  MessageSquare,
  Star,
  Hash,
  Calendar,
  Eye,
  RefreshCw,
  Pause,
  Send,
  Pencil,
  Save,
  RotateCcw,
  X,
  Lock,
  Newspaper,
} from "lucide-react";
import API from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { CampaignSendPanel, CONTENT_LOCKED_STATUSES } from "@/components/campaigns/CampaignSendPanel";
import { CampaignActivityFeed } from "@/components/campaigns/CampaignActivityFeed";
import type { CampaignSendStatus } from "@/hooks/useCampaignSendStream";
import { LinkedInSocialCreateForm, type LinkedInSocialForm } from "@/components/campaigns/LinkedInSocialCreateForm";
import { LinkedInSocialWorkspace, type LinkedInSocialCampaignData, type LinkedInSocialAnalysis } from "@/components/campaigns/LinkedInSocialWorkspace";
import { LinkedInSocialStatsDrawer, type AssetStats } from "@/components/campaigns/LinkedInSocialStatsDrawer";

const DRAFT_EXISTS_STATES = new Set([
  "emails_generated", "qa_passed", "drafts_approved", "drafts_rejected",
]);

// ─── Types ───────────────────────────────────────────────────────────────────

interface Lead {
  id: number;
  name: string;
  company?: string;
  email?: string;
  ai_score?: number;
  status?: string;
}

interface Contact {
  id: number;
  first_name: string;
  last_name?: string;
  email: string;
  title?: string;
  company_name?: string;
  lifecycle_stage?: string;
}

interface GeneratedAsset {
  id: number;
  recipient_email?: string;
  recipient_name?: string;
  asset_type: string;
  sequence_step: number;
  subject: string;
  body: string;
  cta?: string;
  qa_score?: number;
  qa_notes?: string;
  approval_status: string;
}

interface CampaignListItem {
  id: number;
  name: string;
  type?: string;
  goal?: string;
  status: string;
  orchestration_state?: string;
  approval_status?: string;
  approval_owner?: string;
  plan_data?: Record<string, unknown>;
  created_at: string;
  // Send pipeline fields
  channel?: string;
  send_status?: string;
  sent_count?: number;
  failed_count?: number;
  draft_count?: number;
  skipped_count?: number;
  eligible_count?: number;
  excluded_count?: number;
}

interface CampaignStatusDetail {
  campaign: CampaignListItem;
  targets: Array<{
    resolved_email?: string;
    resolved_offerings?: string[];
    recipient_status: string;
    recipient_reason?: string;
  }>;
  assets: GeneratedAsset[];
  approvals: Array<{
    stage: string;
    decision: string;
    comments?: string;
    decided_by?: string;
    decided_at?: string;
  }>;
}

interface AISummary {
  headline: string;
  executive_summary: string;
  target_coverage: string;
  messaging_quality: string;
  tone_fit: string;
  strengths: string[];
  recommendations: string[];
  overall_rating: "excellent" | "good" | "needs_improvement";
}

interface UserOption {
  user_id: string;
  email: string;
}

interface CampaignResult {
  campaign_id: number;
  resolve_summary: {
    total_targets: number;
    eligible_targets: number;
    excluded_targets: number;
  };
  strategy: Record<string, unknown>;
  generated_assets_count: number;
  qa_summary: {
    passed: boolean;
    report: Array<{ asset_id: number; sequence_step: number; qa_score: number; qa_notes: string }>;
  };
  status: CampaignStatusDetail;
}

type Step = "list" | "type" | "details" | "targets" | "generating" | "results" | "view" | "ls_create" | "ls_generating" | "ls_workspace" | "ls_view";
type CampaignType = "email" | "linkedin" | "linkedin_social";

const EMAIL_TONES = ["consultative", "authoritative", "friendly", "urgent", "educational"];
const LINKEDIN_TONES = ["professional", "casual", "authoritative", "empathetic"];

const GENERATING_STEPS = [
  { label: "Creating campaign record", icon: Hash },
  { label: "Resolving targets & validating emails", icon: Users },
  { label: "Building AI strategy", icon: Brain },
  { label: "Crafting personalized messages", icon: Sparkles },
  { label: "Running quality assurance checks", icon: CheckCircle2 },
];

const LS_GENERATING_STEPS = [
  { label: "Creating campaign record", icon: Hash },
  { label: "Building post themes", icon: Brain },
  { label: "Writing post drafts", icon: Sparkles },
  { label: "Preparing publishing plan", icon: Calendar },
  { label: "Finalizing assets", icon: CheckCircle2 },
];

const ORCH_LABELS: Record<string, string> = {
  intake_received: "Created",
  targets_ready: "Targets Resolved",
  strategy_ready: "Strategy Ready",
  emails_generated: "Messages Generated",
  linkedin_messages_generated: "Messages Generated",
  qa_passed: "QA Passed",
  qa_failed: "QA Issues",
  drafts_approved: "Approved",
  drafts_rejected: "Rejected",
};

const STEP_AI_CONTEXT: Partial<Record<Step, { title: string; body: string; bullets: string[] }>> = {
  type: {
    title: "AI Campaign Engine",
    body: "Our AI studies your contacts, surfaces the best outreach angle for each, and writes personalized messages at scale — in seconds.",
    bullets: ["Personalized per recipient", "Multi-step sequences", "Built-in QA scoring"],
  },
  details: {
    title: "Campaign Intelligence",
    body: "The AI uses your objective and tone to build a tailored strategy — themes, CTAs, and sequencing that align with your goal.",
    bullets: ["Tone-matched messaging", "Goal-aware strategy", "Smart CTA selection"],
  },
  targets: {
    title: "Precision Targeting",
    body: "Select leads and contacts. The AI resolves emails, cross-checks for duplicates, and builds a personalized profile for each recipient.",
    bullets: ["Email deduplication", "Offering resolution", "Profile enrichment"],
  },
  generating: {
    title: "AI at Work",
    body: "The AI is analyzing each recipient's profile, building an outreach strategy, and crafting messages that feel personal — not templated.",
    bullets: ["Strategy generation", "Per-recipient personalization", "Automated QA pass"],
  },
  results: {
    title: "Campaign Ready",
    body: "Your AI-generated campaign is ready to review. Each message was crafted based on the recipient's role, signals, and your campaign objective.",
    bullets: ["Messages scored by QA", "Approve or revise", "Sequence ready to send"],
  },
  view: {
    title: "Campaign Detail",
    body: "Review the AI-generated messages for this campaign. Approve to finalize or return to the list to manage other campaigns.",
    bullets: ["Per-recipient messages", "QA scores attached", "Approve or reject"],
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function groupByRecipient(assets: GeneratedAsset[]): Map<string, GeneratedAsset[]> {
  const map = new Map<string, GeneratedAsset[]>();
  for (const a of assets) {
    const key = a.recipient_email || "unknown";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  }
  for (const [, g] of map) g.sort((a, b) => a.sequence_step - b.sequence_step);
  return map;
}

function qaColor(score?: number) {
  if (!score || score < 60) return "text-red-500 bg-red-50 border-red-200";
  if (score < 80) return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-emerald-600 bg-emerald-50 border-emerald-200";
}

function initials(name?: string): string {
  if (!name) return "?";
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

function orchStateColor(state?: string) {
  if (!state) return "bg-slate-100 text-slate-500";
  if (state === "drafts_approved") return "bg-emerald-100 text-emerald-700";
  if (state === "drafts_rejected") return "bg-red-100 text-red-700";
  if (state === "qa_failed") return "bg-amber-100 text-amber-700";
  if (state === "qa_passed" || state.includes("generated")) return "bg-violet-100 text-violet-700";
  return "bg-slate-100 text-slate-500";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type SendStatusConfig = {
  label: string;
  cls: string;
  icon: ReactElement;
};

const SEND_STATUS_CONFIG: Record<string, SendStatusConfig> = {
  queued: {
    label: "Queued",
    cls: "bg-blue-100 text-blue-700 border-blue-300",
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
  },
  sending: {
    label: "Sending",
    cls: "bg-blue-100 text-blue-700 border-blue-300",
    icon: <Send className="w-3 h-3" />,
  },
  paused: {
    label: "Paused",
    cls: "bg-amber-100 text-amber-700 border-amber-300",
    icon: <Pause className="w-3 h-3" />,
  },
  sent: {
    label: "Sent",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-300",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  partial_failed: {
    label: "Partial",
    cls: "bg-amber-100 text-amber-700 border-amber-300",
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  cancelled: {
    label: "Cancelled",
    cls: "bg-slate-100 text-slate-500 border-slate-300",
    icon: <XCircle className="w-3 h-3" />,
  },
  failed: {
    label: "Failed",
    cls: "bg-red-100 text-red-700 border-red-300",
    icon: <XCircle className="w-3 h-3" />,
  },
};

function sendStatusBadge(sendStatus?: string) {
  if (!sendStatus || sendStatus === "not_started") return null;
  const cfg = SEND_STATUS_CONFIG[sendStatus];
  const cls = cfg?.cls ?? "bg-slate-100 text-slate-500 border-slate-300";
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 ${cls}`}>
      {cfg?.icon}
      {cfg?.label ?? sendStatus}
    </span>
  );
}

function listRowBackground(sendStatus?: string): string {
  if (!sendStatus || sendStatus === "not_started" || sendStatus === "cancelled") return "";
  if (sendStatus === "partial_failed" || sendStatus === "paused") return "bg-amber-50/60";
  if (sendStatus === "sending" || sendStatus === "queued") return "bg-blue-50/40";
  if (sendStatus === "failed") return "bg-red-50/40";
  if (sendStatus === "sent") return "bg-emerald-50/30";
  return "";
}

// ─── AI Side Panel ───────────────────────────────────────────────────────────

function AISidePanel({
  step,
  campaignType,
  totalSelected,
  result,
}: {
  step: Step;
  campaignType: CampaignType;
  totalSelected: number;
  result: CampaignResult | null;
}) {
  const ctx = STEP_AI_CONTEXT[step];
  if (!ctx) return null;

  return (
    <div className="relative overflow-hidden rounded-xl bg-slate-950 border border-slate-800/60 p-6 h-full flex flex-col">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_-5%_-5%,rgba(234,88,12,0.18)_0%,transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_110%_110%,rgba(124,58,237,0.10)_0%,transparent_55%)]" />

      <div className="relative z-10 flex flex-col h-full gap-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">{ctx.title}</h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{ctx.body}</p>
          </div>
        </div>

        <div className="border-t border-slate-800/60" />

        <div className="space-y-2.5">
          {ctx.bullets.map((b) => (
            <div key={b} className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
              <span className="text-xs text-slate-300">{b}</span>
            </div>
          ))}
        </div>

        <div className="mt-auto space-y-3">
          {step === "targets" && totalSelected > 0 && (
            <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 px-3.5 py-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-xs font-semibold text-orange-300">Selected</span>
              </div>
              <p className="text-xl font-bold text-white">{totalSelected}</p>
              <p className="text-xs text-slate-400">target{totalSelected !== 1 ? "s" : ""} queued</p>
            </div>
          )}

          {step === "results" && result && (
            <div className="space-y-2">
              <div className="rounded-lg bg-white/5 border border-white/10 px-3.5 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Messages generated</span>
                  <span className="text-sm font-bold text-white">{result.generated_assets_count}</span>
                </div>
              </div>
              <div className="rounded-lg bg-white/5 border border-white/10 px-3.5 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Eligible targets</span>
                  <span className="text-sm font-bold text-white">{result.resolve_summary.eligible_targets}</span>
                </div>
              </div>
              <div className={`rounded-lg px-3.5 py-2.5 ${result.qa_summary.passed ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-amber-500/10 border border-amber-500/20"}`}>
                <div className="flex items-center gap-2">
                  {result.qa_summary.passed
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    : <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                  <span className={`text-xs font-semibold ${result.qa_summary.passed ? "text-emerald-300" : "text-amber-300"}`}>
                    QA {result.qa_summary.passed ? "Passed" : "Has Issues"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {(step === "details" || step === "targets" || step === "generating") && (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${campaignType === "email" ? "bg-orange-500/15 text-orange-300 border border-orange-500/20" : "bg-blue-500/15 text-blue-300 border border-blue-500/20"}`}>
              {campaignType === "email" ? <Mail className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
              {campaignType === "email" ? "Email Campaign" : "LinkedIn Campaign"}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 border-t border-slate-800/60 pt-4">
          <Brain className="w-3.5 h-3.5 text-slate-700 flex-shrink-0" />
          Powered by Gemini 2.5 Flash
        </div>
      </div>
    </div>
  );
}

// ─── Step Indicator ──────────────────────────────────────────────────────────

function StepBar({ step }: { step: Step }) {
  const steps: Array<{ key: Step; label: string }> = [
    { key: "type", label: "Channel" },
    { key: "details", label: "Details" },
    { key: "targets", label: "Targets" },
    { key: "generating", label: "Generate" },
    { key: "results", label: "Results" },
  ];
  const idx = steps.findIndex((s) => s.key === step);
  if (idx === -1) return null;
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${i < idx ? "bg-emerald-100 text-emerald-700" : i === idx ? "bg-orange-100 text-orange-700 ring-1 ring-orange-300" : "bg-slate-100 text-slate-400"}`}>
            {i < idx ? <CheckCircle2 className="w-3 h-3" /> : <span className="w-3 h-3 flex items-center justify-center font-bold">{i + 1}</span>}
            {s.label}
          </div>
          {i < steps.length - 1 && (
            <div className={`w-5 h-px mx-0.5 ${i < idx ? "bg-emerald-300" : "bg-slate-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Strategy Card ───────────────────────────────────────────────────────────

function StrategyCard({ strategy, type }: { strategy: Record<string, unknown>; type: CampaignType }) {
  const themes = (strategy.themes as string[]) || (strategy.key_themes as string[]) || [];
  const tone = (strategy.tone as string) || "";
  const seqCount = (strategy.sequence_count as number) || 0;
  const cta = (strategy.cta as string) || (strategy.primary_cta as string) || "";

  return (
    <div className="relative overflow-hidden rounded-xl bg-slate-950 border border-slate-800/60 p-5">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_0%_0%,rgba(124,58,237,0.12)_0%,transparent_60%)]" />
      <div className="relative z-10 space-y-4">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-bold text-white">AI Strategy</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {tone && (
            <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2.5">
              <div className="text-xs text-slate-500 mb-0.5 uppercase tracking-wider font-medium">Tone</div>
              <div className="text-sm font-semibold text-white capitalize">{tone}</div>
            </div>
          )}
          {seqCount > 0 && (
            <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2.5">
              <div className="text-xs text-slate-500 mb-0.5 uppercase tracking-wider font-medium">Steps</div>
              <div className="text-sm font-semibold text-white">{seqCount}</div>
            </div>
          )}
        </div>
        {themes.length > 0 && (
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">Key Themes</div>
            <div className="flex flex-wrap gap-1.5">
              {themes.map((t, i) => (
                <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-violet-500/15 text-violet-300 border border-violet-500/20">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
        {cta && (
          <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 px-3 py-2.5">
            <div className="text-xs text-orange-400/70 uppercase tracking-wider font-medium mb-0.5">Primary CTA</div>
            <div className="text-sm text-orange-200 font-medium">{cta}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Message Card ─────────────────────────────────────────────────────────────

function assetStatusBadge(status: string) {
  if (status === "approved") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200 flex-shrink-0"><CheckCircle2 className="w-3 h-3" />Approved</span>;
  if (status === "rejected") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200 flex-shrink-0"><XCircle className="w-3 h-3" />Rejected</span>;
  return null;
}

function MessageCard({
  asset,
  campaignId,
  isEmail,
  effectiveStatus,
  isApprovalOwner,
  isBulkDecided,
  isContentLocked,
  approvingAssetId,
  onApproveAsset,
  onDraftEdited,
}: {
  asset: GeneratedAsset;
  campaignId: number;
  isEmail: boolean;
  effectiveStatus: string;
  isApprovalOwner: boolean;
  isBulkDecided: boolean;
  isContentLocked: boolean;
  approvingAssetId: number | null;
  onApproveAsset: (assetId: number, decision: "approved" | "rejected") => void;
  onDraftEdited: (assetId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editSubject, setEditSubject] = useState(asset.subject);
  const [editBody, setEditBody] = useState(asset.body);
  const [editCta, setEditCta] = useState(asset.cta ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const score = asset.qa_score ?? 100;
  const isApproving = approvingAssetId === asset.id;
  const canAct = isApprovalOwner && !isBulkDecided;
  const isDirty = editSubject !== asset.subject || editBody !== asset.body || editCta !== (asset.cta ?? "");

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [editBody, editing]);

  function startEditing() {
    setEditSubject(asset.subject);
    setEditBody(asset.body);
    setEditCta(asset.cta ?? "");
    setSaveError(null);
    setEditing(true);
    setOpen(true);
  }

  async function handleSave() {
    const trimSubject = editSubject.trim();
    const trimBody = editBody.trim();
    if (!trimSubject) { setSaveError("Subject cannot be empty."); return; }
    if (!trimBody) { setSaveError("Body cannot be empty."); return; }
    setSaving(true);
    setSaveError(null);
    try {
      const patch: Record<string, string> = { subject: trimSubject, body: trimBody };
      if (editCta.trim()) patch.cta = editCta.trim();
      await API.patch(`/campaigns/${campaignId}/assets/${asset.id}`, patch);
      setEditing(false);
      onDraftEdited(asset.id);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`rounded-lg border bg-white overflow-hidden transition-colors ${effectiveStatus === "approved" ? "border-emerald-200" : effectiveStatus === "rejected" ? "border-red-200" : "border-slate-200"}`}>
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity">
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-violet-500 flex items-center justify-center text-xs font-bold text-white">
            {asset.sequence_step}
          </div>
          <div className="flex-1 min-w-0">
            {isEmail
              ? <p className="text-sm font-medium text-slate-800 truncate">{asset.subject || "Email message"}</p>
              : <p className="text-sm font-medium text-slate-800 truncate">{asset.body.slice(0, 65)}…</p>}
          </div>
        </button>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${qaColor(score)}`}>{score}</div>
          {assetStatusBadge(effectiveStatus)}
          {!isContentLocked && (
            editing ? (
              <button
                onClick={() => { setEditing(false); setSaveError(null); }}
                className="flex items-center gap-1 text-xs font-medium text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 rounded-md px-2 py-1 transition-colors"
              >
                <X className="w-3 h-3" /> Cancel
              </button>
            ) : (
              <button
                onClick={startEditing}
                className="flex items-center gap-1 text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200 hover:bg-orange-100 rounded-md px-2 py-1 transition-colors"
              >
                <Pencil className="w-3 h-3" /> Edit
              </button>
            )
          )}
          <button onClick={() => setOpen((v) => !v)} className="text-slate-400 hover:text-slate-600 transition-colors">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100">
          {editing ? (
            /* ── Inline edit form ── */
            <div className="pt-3 space-y-3">
              {effectiveStatus === "approved" && (
                <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">This draft was approved. Saving will reset approval back to <strong>pending</strong>.</p>
                </div>
              )}
              {isEmail && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Subject</label>
                  <input
                    type="text"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    maxLength={500}
                    className="w-full text-sm text-slate-800 bg-white border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
                  />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Body</label>
                <textarea
                  ref={bodyRef}
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={6}
                  className="w-full text-sm text-slate-800 bg-white border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all resize-none leading-relaxed"
                  style={{ minHeight: "140px" }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  CTA <span className="text-slate-300 font-normal normal-case">(optional)</span>
                </label>
                <input
                  type="text"
                  value={editCta}
                  onChange={(e) => setEditCta(e.target.value)}
                  maxLength={300}
                  className="w-full text-sm text-slate-800 bg-white border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
                  placeholder="Call-to-action text (optional)…"
                />
              </div>
              {saveError && (
                <p className="text-xs text-red-600 flex items-center gap-1.5"><X className="w-3.5 h-3.5" />{saveError}</p>
              )}
              <div className="flex items-center gap-2 pt-1">
                {isDirty && (
                  <button
                    onClick={() => { setEditSubject(asset.subject); setEditBody(asset.body); setEditCta(asset.cta ?? ""); setSaveError(null); }}
                    disabled={saving}
                    className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => { setEditing(false); setSaveError(null); }}
                    disabled={saving}
                    className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-md border border-slate-200 bg-white transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !isDirty}
                    className="text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-40"
                  >
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Save
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ── Read-only view ── */
            <>
              {isEmail && (
                <div className="pt-3">
                  <div className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">Subject</div>
                  <p className="text-sm font-semibold text-slate-900">{asset.subject}</p>
                </div>
              )}
              <div className={isEmail ? "" : "pt-3"}>
                <div className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-2">Body</div>
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-lg p-3 border border-slate-100">
                  {asset.body}
                </div>
              </div>
              {asset.cta && (
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">CTA</div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-100">{asset.cta}</span>
                </div>
              )}
              {asset.qa_notes && asset.qa_notes !== "passed" && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">{asset.qa_notes}</p>
                </div>
              )}

              {/* Per-message approval actions */}
              {canAct && (
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => onApproveAsset(asset.id, "approved")}
                    disabled={isApproving}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-60 ${effectiveStatus === "approved" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"}`}
                  >
                    {isApproving ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsUp className="w-3 h-3" />}
                    Approve
                  </button>
                  <button
                    onClick={() => onApproveAsset(asset.id, "rejected")}
                    disabled={isApproving}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-60 ${effectiveStatus === "rejected" ? "bg-red-100 text-red-700 border-red-200" : "bg-white text-slate-600 border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200"}`}
                  >
                    <ThumbsDown className="w-3 h-3" />
                    Reject
                  </button>
                  {effectiveStatus !== "pending" && (
                    <span className={`ml-auto text-xs font-medium ${effectiveStatus === "approved" ? "text-emerald-600" : "text-red-600"}`}>
                      {effectiveStatus === "approved" ? "Approved" : "Rejected"}
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Recipient Group ─────────────────────────────────────────────────────────

function RecipientGroup({
  email, assets, campaignId, isEmail, assetApprovals, isApprovalOwner, isBulkDecided, isContentLocked, approvingAssetId, onApproveAsset, onDraftEdited,
}: {
  email: string;
  assets: GeneratedAsset[];
  campaignId: number;
  isEmail: boolean;
  assetApprovals: Record<number, string>;
  isApprovalOwner: boolean;
  isBulkDecided: boolean;
  isContentLocked: boolean;
  approvingAssetId: number | null;
  onApproveAsset: (assetId: number, decision: "approved" | "rejected") => void;
  onDraftEdited: (assetId: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const name = assets[0]?.recipient_name || email.split("@")[0];
  const avgQa = assets.length ? Math.round(assets.reduce((s, a) => s + (a.qa_score ?? 100), 0) / assets.length) : 100;
  const effectiveStatuses = assets.map((a) => assetApprovals[a.id] ?? a.approval_status);
  const approvedCount = effectiveStatuses.filter((s) => s === "approved").length;
  const rejectedCount = effectiveStatuses.filter((s) => s === "rejected").length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-left">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {initials(name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
          <p className="text-xs text-slate-400 truncate">{email}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-slate-500 font-medium">{assets.length} msg{assets.length !== 1 ? "s" : ""}</span>
          {approvedCount > 0 && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">{approvedCount} ✓</span>}
          {rejectedCount > 0 && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">{rejectedCount} ✗</span>}
          <div className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${qaColor(avgQa)}`}>avg {avgQa}</div>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>
      {expanded && (
        <div className="px-5 pb-5 space-y-2 border-t border-slate-100 pt-4">
          {assets.map((a) => (
            <MessageCard
              key={a.id}
              asset={a}
              campaignId={campaignId}
              isEmail={isEmail}
              effectiveStatus={assetApprovals[a.id] ?? a.approval_status}
              isApprovalOwner={isApprovalOwner}
              isBulkDecided={isBulkDecided}
              isContentLocked={isContentLocked}
              approvingAssetId={approvingAssetId}
              onApproveAsset={onApproveAsset}
              onDraftEdited={onDraftEdited}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── AI Summary Panel ────────────────────────────────────────────────────────

const RATING_CONFIG = {
  excellent: { label: "Excellent", dot: "bg-emerald-400", badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25", bar: "bg-emerald-500", width: "w-full" },
  good: { label: "Good", dot: "bg-blue-400", badge: "bg-blue-500/15 text-blue-300 border-blue-500/25", bar: "bg-blue-500", width: "w-3/4" },
  needs_improvement: { label: "Needs Improvement", dot: "bg-amber-400", badge: "bg-amber-500/15 text-amber-300 border-amber-500/25", bar: "bg-amber-500", width: "w-2/5" },
};

function AISummaryPanel({
  summary,
  loading,
  error,
  onGenerate,
}: {
  summary: AISummary | null;
  loading: boolean;
  error: string;
  onGenerate: () => void;
}) {
  const rating = summary ? (RATING_CONFIG[summary.overall_rating] ?? RATING_CONFIG.good) : null;

  return (
    <div className="relative overflow-hidden rounded-xl bg-slate-950 border border-slate-800/60">
      {/* Ambient glows */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_-5%_-5%,rgba(234,88,12,0.15)_0%,transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_105%_105%,rgba(124,58,237,0.12)_0%,transparent_55%)]" />

      <div className="relative z-10 p-5">
        {/* Header row */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <span className="text-xs font-bold text-white uppercase tracking-wider">AI Summary</span>
            <p className="text-xs text-slate-500 mt-0.5">Generated by Gemini 2.5 Flash</p>
          </div>

          {/* Rating badge — far right */}
          {rating && summary && (
            <div className={`ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold flex-shrink-0 ${rating.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${rating.dot}`} />
              {rating.label}
            </div>
          )}
        </div>

        {/* Idle state — before user has triggered generation */}
        {!loading && !error && !summary && (
          <div className="flex items-center justify-between gap-4 py-1">
            <p className="text-sm text-slate-400">
              Let AI analyse this campaign and surface insights, quality signals, and recommendations.
            </p>
            <button
              onClick={onGenerate}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold transition-colors flex-shrink-0 shadow-sm shadow-orange-500/20"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Generate Summary
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 py-2">
              <Loader2 className="w-4 h-4 text-orange-400 animate-spin flex-shrink-0" />
              <span className="text-sm text-slate-400">AI is analyzing your campaign…</span>
            </div>
            {/* Skeleton lines */}
            <div className="space-y-2 animate-pulse">
              <div className="h-4 bg-white/5 rounded-lg w-3/4" />
              <div className="h-3 bg-white/5 rounded-lg w-full" />
              <div className="h-3 bg-white/5 rounded-lg w-5/6" />
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="h-16 bg-white/5 rounded-lg" />
                <div className="h-16 bg-white/5 rounded-lg" />
              </div>
            </div>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-sm text-red-300">Could not generate summary</span>
            </div>
            <button onClick={onGenerate} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        {/* Loaded state */}
        {!loading && !error && summary && (
          <div className="space-y-4">
            {/* Headline */}
            <p className="text-base font-bold text-white leading-snug">{summary.headline}</p>

            {/* Executive summary */}
            <p className="text-sm text-slate-300 leading-relaxed">{summary.executive_summary}</p>

            {/* Insight pills row */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                { label: "Coverage", value: summary.target_coverage },
                { label: "Message Quality", value: summary.messaging_quality },
                { label: "Tone Fit", value: summary.tone_fit },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg bg-white/5 border border-white/8 px-3 py-2.5">
                  <div className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">{label}</div>
                  <p className="text-xs text-slate-300 leading-relaxed">{value}</p>
                </div>
              ))}
            </div>

            {/* Strengths + Recommendations */}
            <div className="grid grid-cols-2 gap-3">
              {/* Strengths */}
              <div className="rounded-lg bg-emerald-500/8 border border-emerald-500/15 px-4 py-3">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">Strengths</span>
                </div>
                <ul className="space-y-1.5">
                  {summary.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                      <span className="text-xs text-slate-300 leading-relaxed">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommendations */}
              <div className="rounded-lg bg-amber-500/8 border border-amber-500/15 px-4 py-3">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">Watch Out</span>
                </div>
                {summary.recommendations.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No issues found</p>
                ) : (
                  <ul className="space-y-1.5">
                    {summary.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                        <span className="text-xs text-slate-300 leading-relaxed">{r}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Approval Owner Combobox ─────────────────────────────────────────────────

function ApprovalOwnerCombobox({
  value,
  onChange,
  users,
  loading,
  error,
}: {
  value: string;
  onChange: (email: string) => void;
  users: UserOption[];
  loading: boolean;
  error: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(value);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, value]);

  const filtered = query
    ? users.filter((u) => u.email.toLowerCase().includes(query.toLowerCase()))
    : users;

  const isSelected = (email: string) => value === email;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          placeholder={loading ? "Loading users…" : "Search and select a user…"}
          value={query}
          disabled={loading}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange("");
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === "Escape") { setOpen(false); setQuery(value); } }}
          className={`border-slate-200 focus:ring-orange-500/30 focus:border-orange-400 pr-8 ${value ? "text-slate-900 font-medium" : ""}`}
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
          {loading
            ? <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            : value
              ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {open && !loading && (
        <div className="absolute z-50 top-full mt-1.5 w-full rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-red-600 bg-red-50">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          {!error && filtered.length === 0 && (
            <div className="flex flex-col items-center gap-1 px-4 py-6 text-center">
              <Users className="w-5 h-5 text-slate-300" />
              <p className="text-sm text-slate-400">No users match "{query}"</p>
            </div>
          )}
          {!error && filtered.length > 0 && (
            <div className="max-h-52 overflow-y-auto divide-y divide-slate-50">
              {filtered.map((u) => {
                const sel = isSelected(u.email);
                const nameHint = u.email.split("@")[0].replace(/[._]/g, " ");
                return (
                  <button
                    key={u.user_id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { onChange(u.email); setQuery(u.email); setOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${sel ? "bg-orange-50" : "hover:bg-slate-50"}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {initials(nameHint)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate capitalize">{nameHint}</p>
                      <p className="text-xs text-slate-400 truncate">{u.email}</p>
                    </div>
                    {sel && <CheckCircle2 className="w-4 h-4 text-orange-500 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Campaign Results Body (shared by "results" and "view") ──────────────────

function CampaignResultsBody({
  campaignId,
  campaignName,
  campaignType,
  resolveSummary,
  strategy,
  generatedCount,
  qaPassed,
  assets,
  existingApproval,
  approvalOwner,
  currentUserEmail,
  assetApprovals,
  approvingAssetId,
  isContentLocked = false,
  onApprove,
  onAssetApprove,
  onDraftEdited,
  approving,
  approved,
}: {
  campaignId: number;
  campaignName: string;
  campaignType: CampaignType;
  resolveSummary: { total_targets: number; eligible_targets: number; excluded_targets: number };
  strategy: Record<string, unknown>;
  generatedCount: number;
  qaPassed: boolean;
  assets: GeneratedAsset[];
  existingApproval?: string | null;
  approvalOwner?: string;
  currentUserEmail?: string;
  assetApprovals: Record<number, string>;
  approvingAssetId: number | null;
  isContentLocked?: boolean;
  onApprove: (decision: "approved" | "rejected") => void;
  onAssetApprove: (assetId: number, decision: "approved" | "rejected") => void;
  onDraftEdited: (assetId: number) => void;
  approving: boolean;
  approved: boolean | null;
}) {
  const alreadyDecided = existingApproval === "approved" || existingApproval === "rejected";
  const showApproved = approved !== null ? approved : existingApproval === "approved";
  const isDecided = approved !== null || alreadyDecided;
  const isApprovalOwner = !approvalOwner || !currentUserEmail
    ? false
    : approvalOwner.toLowerCase() === currentUserEmail.toLowerCase();

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-xl bg-slate-950 border border-slate-800/60 px-6 py-5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_-10%_-10%,rgba(234,88,12,0.18)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_110%_110%,rgba(124,58,237,0.10)_0%,transparent_60%)]" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0">
            {campaignType === "email" ? <Mail className="w-5 h-5 text-orange-400" /> : <Link2 className="w-5 h-5 text-blue-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-white truncate">{campaignName}</h2>
            <p className="text-xs text-slate-400 mt-0.5 capitalize">{campaignType} campaign</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/15 text-violet-300 text-xs font-semibold border border-violet-500/20">
              <Sparkles className="w-3 h-3" /> AI Generated
            </span>
            {qaPassed
              ? <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30"><CheckCircle2 className="w-3 h-3" /> QA Passed</span>
              : <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-semibold border border-amber-500/30"><AlertTriangle className="w-3 h-3" /> QA Issues</span>}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Targets", value: resolveSummary.total_targets, icon: Users, col: "text-blue-600", bg: "bg-blue-50", border: "border-l-blue-500" },
          { label: "Eligible", value: resolveSummary.eligible_targets, icon: CheckCircle2, col: "text-emerald-600", bg: "bg-emerald-50", border: "border-l-emerald-500" },
          { label: "Excluded", value: resolveSummary.excluded_targets, icon: XCircle, col: "text-red-500", bg: "bg-red-50", border: "border-l-red-500" },
          { label: "Messages", value: generatedCount, icon: MessageSquare, col: "text-violet-600", bg: "bg-violet-50", border: "border-l-violet-500" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border border-slate-200 bg-white shadow-sm px-5 py-4 border-l-4 ${s.border}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${s.bg}`}><s.icon className={`w-3.5 h-3.5 ${s.col}`} /></div>
              <span className="text-xs text-slate-500 font-medium">{s.label}</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Strategy + messages + approval */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="space-y-4">
          {Object.keys(strategy).length > 0 && <StrategyCard strategy={strategy} type={campaignType} />}

          {/* Approval */}
          {isDecided ? (
            <div className={`rounded-xl border px-5 py-4 flex items-center gap-3 ${showApproved ? "bg-emerald-950/40 border-emerald-800/60" : "bg-red-950/40 border-red-800/60"}`}>
              {showApproved ? <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" /> : <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
              <div>
                <p className={`text-sm font-semibold ${showApproved ? "text-emerald-300" : "text-red-300"}`}>
                  {showApproved ? "Campaign Approved" : "Campaign Rejected"}
                </p>
                <p className="text-xs text-slate-500">Decision recorded</p>
              </div>
            </div>
          ) : isApprovalOwner ? (
            <div className="relative overflow-hidden rounded-xl bg-slate-950 border border-slate-800/60 p-5">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_0%_100%,rgba(234,88,12,0.10)_0%,transparent_60%)]" />
              <div className="relative z-10 space-y-3">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-bold text-white">Finalize Campaign</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Approve all messages to finalize, or reject to send back for revision. You can also approve or reject individual messages above.
                </p>
                <div className="flex gap-2">
                  <Button onClick={() => onApprove("approved")} disabled={approving} className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-8">
                    {approving ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsUp className="w-3 h-3" />} Approve All
                  </Button>
                  <Button onClick={() => onApprove("rejected")} disabled={approving} variant="outline" className="flex-1 gap-1.5 border-red-800 text-red-400 hover:bg-red-950/50 text-xs font-semibold h-8">
                    <ThumbsDown className="w-3 h-3" /> Reject All
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
                  <Star className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <span className="text-sm font-semibold text-slate-700">Awaiting Approval</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed mb-3">
                Only the designated approval owner can approve or reject messages in this campaign.
              </p>
              {approvalOwner && (
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {initials(approvalOwner.split("@")[0])}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700 capitalize truncate">{approvalOwner.split("@")[0].replace(/[._]/g, " ")}</p>
                    <p className="text-xs text-slate-400 truncate">{approvalOwner}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-700">Generated Messages</h3>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-medium">{generatedCount} total</span>
          </div>
          {assets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No messages were generated</p>
            </div>
          ) : (
            Array.from(groupByRecipient(assets)).map(([email, group]) => (
              <RecipientGroup
                key={email}
                email={email}
                assets={group}
                campaignId={campaignId}
                isEmail={campaignType === "email"}
                assetApprovals={assetApprovals}
                isApprovalOwner={isApprovalOwner}
                isBulkDecided={isDecided}
                isContentLocked={isContentLocked}
                approvingAssetId={approvingAssetId}
                onApproveAsset={onAssetApprove}
                onDraftEdited={onDraftEdited}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function CampaignPage() {
  const [step, setStep] = useState<Step>("list");
  const [campaignType, setCampaignType] = useState<CampaignType>("email");

  // Campaigns list
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState("");

  // Viewing an existing campaign
  const [viewingStatus, setViewingStatus] = useState<CampaignStatusDetail | null>(null);
  const [loadingView, setLoadingView] = useState(false);
  const [viewApproved, setViewApproved] = useState<boolean | null>(null);
  const [viewApproving, setViewApproving] = useState(false);
  // Real-time content-lock state fed back from CampaignSendPanel (SSE-derived)
  const [sendContentLocked, setSendContentLocked] = useState(false);
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [loadingAiSummary, setLoadingAiSummary] = useState(false);
  const [aiSummaryError, setAiSummaryError] = useState("");

  // Current authenticated user
  const [currentUserEmail, setCurrentUserEmail] = useState("");

  // Per-asset approval overrides
  const [assetApprovals, setAssetApprovals] = useState<Record<number, string>>({});
  const [approvingAssetId, setApprovingAssetId] = useState<number | null>(null);

  // Approval owner users
  const [approvalUsers, setApprovalUsers] = useState<UserOption[]>([]);
  const [loadingApprovalUsers, setLoadingApprovalUsers] = useState(false);
  const [approvalUsersError, setApprovalUsersError] = useState("");

  // Wizard form state
  const [form, setForm] = useState({
    campaign_name: "", objective: "", approval_owner: "", tone: "",
    sequence_count: 3, cta_preference: "",
    industry_focus: "",
  });
  const [leads, setLeads] = useState<Lead[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [targetTab, setTargetTab] = useState<"leads" | "contacts">("leads");
  const [search, setSearch] = useState("");
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(new Set());
  const [loadingTargets, setLoadingTargets] = useState(false);

  // Generation
  const [genStepIdx, setGenStepIdx] = useState(0);
  const genIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [result, setResult] = useState<CampaignResult | null>(null);
  const [genError, setGenError] = useState("");
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState<boolean | null>(null);

  // LinkedIn Social flow
  const [lsForm, setLsForm] = useState<LinkedInSocialForm>({
    campaign_name: "", objective: "", approval_owner: "", tone: "",
    post_count: 5, campaign_theme: "",
    focus_mode: "", focus_industry: "", focus_product: "",
    cta_preference: "", include_video: false, include_image: true,
    constraints: "", success_metrics: "",
  });
  const [lsResult, setLsResult] = useState<LinkedInSocialCampaignData | null>(null);
  const [lsGenError, setLsGenError] = useState("");
  const [lsGenStepIdx, setLsGenStepIdx] = useState(0);
  const lsGenIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [lsStatsAssetId, setLsStatsAssetId] = useState<number | null>(null);
  const [lsStatsExisting, setLsStatsExisting] = useState<AssetStats | undefined>(undefined);
  const [lsAnalysis, setLsAnalysis] = useState<Record<number, LinkedInSocialAnalysis>>({});
  const [lsAnalyzing, setLsAnalyzing] = useState<Set<number>>(new Set());

  const detailsValid = form.campaign_name.trim() !== "" && form.objective.trim() !== "" && form.approval_owner.trim() !== "";
  const totalSelected = selectedLeads.size + selectedContacts.size;
  const setField = (key: keyof typeof form, value: string | number) => setForm((f) => ({ ...f, [key]: value }));

  // Fetch campaigns list
  const fetchCampaigns = () => {
    setLoadingList(true);
    setListError("");
    API.get("/campaigns")
      .then((r) => setCampaigns(Array.isArray(r.data) ? r.data : []))
      .catch(() => setListError("Failed to load campaigns"))
      .finally(() => setLoadingList(false));
  };

  useEffect(() => {
    fetchCampaigns();
    API.get("/auth/me").then((r) => setCurrentUserEmail(r.data?.email || "")).catch(() => {});
  }, []);

  // Fetch valid approval users when entering details step or LinkedIn Social create
  useEffect(() => {
    if ((step !== "details" && step !== "ls_create") || approvalUsers.length > 0) return;
    setLoadingApprovalUsers(true);
    setApprovalUsersError("");
    API.get("/auth/users")
      .then((r) => setApprovalUsers(Array.isArray(r.data) ? r.data : []))
      .catch(() => setApprovalUsersError("Could not load users"))
      .finally(() => setLoadingApprovalUsers(false));
  }, [step]);

  // Fetch leads/contacts on targets step
  useEffect(() => {
    if (step !== "targets") return;
    setLoadingTargets(true);
    Promise.all([API.get("/leads?per_page=200"), API.get("/contacts?per_page=200")])
      .then(([lr, cr]) => {
        const pick = (d: unknown): unknown[] => {
          if (Array.isArray(d)) return d;
          if (d && typeof d === "object") {
            const o = d as Record<string, unknown>;
            return (Array.isArray(o.data) ? o.data : Array.isArray(o.leads) ? o.leads : []) as unknown[];
          }
          return [];
        };
        setLeads(pick(lr.data) as Lead[]);
        setContacts(pick(cr.data) as Contact[]);
      })
      .catch(console.error)
      .finally(() => setLoadingTargets(false));
  }, [step]);

  // Animated progress during generation
  useEffect(() => {
    if (step !== "generating") {
      if (genIntervalRef.current) clearInterval(genIntervalRef.current);
      return;
    }
    setGenStepIdx(0);
    let i = 0;
    genIntervalRef.current = setInterval(() => {
      i += 1;
      if (i < GENERATING_STEPS.length - 1) setGenStepIdx(i);
      else clearInterval(genIntervalRef.current!);
    }, 2200);
    return () => { if (genIntervalRef.current) clearInterval(genIntervalRef.current); };
  }, [step]);

  const filteredLeads = leads.filter((l) =>
    l.name?.toLowerCase().includes(search.toLowerCase()) ||
    l.company?.toLowerCase().includes(search.toLowerCase()) ||
    l.email?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredContacts = contacts.filter((c) =>
    `${c.first_name} ${c.last_name || ""}`.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  const fetchAiSummary = (id: number) => {
    setAiSummary(null);
    setAiSummaryError("");
    setLoadingAiSummary(true);
    API.post(`/campaigns/${id}/ai-summary`)
      .then((r) => setAiSummary(r.data))
      .catch(() => setAiSummaryError("Could not generate AI summary"))
      .finally(() => setLoadingAiSummary(false));
  };

  // Stats are stored inside external_metadata.manual_linkedin_stats by the backend.
  // Map them to the top-level `stats` field that the workspace components expect.
  function mapLsAssets(raw: unknown[]): LinkedInSocialCampaignData["assets"] {
    return (raw ?? []).map((a) => {
      const asset = a as Record<string, unknown>;
      const meta = (asset.external_metadata as Record<string, unknown>) ?? {};
      const stats = (meta.manual_linkedin_stats as LinkedInSocialCampaignData["assets"][number]["stats"]) ?? undefined;
      return { ...asset, stats } as LinkedInSocialCampaignData["assets"][number];
    });
  }

  const handleViewCampaign = (id: number, type?: string) => {
    if (type === "linkedin_social") {
      setLsResult(null);
      setLsAnalysis({});
      setLsAnalyzing(new Set());
      setLsStatsAssetId(null);
      setLoadingView(true);
      setStep("ls_view");
      API.get(`/campaigns/${id}/linkedin-social/status`)
        .then((r) => {
          const d = r.data as { campaign: Record<string, unknown>; assets: unknown[] };
          const planData = d.campaign.plan_data as Record<string, unknown> | undefined;
          setLsResult({
            campaign_id: id,
            campaign: d.campaign as LinkedInSocialCampaignData["campaign"],
            assets: mapLsAssets(d.assets),
            strategy: planData?.strategy as LinkedInSocialCampaignData["strategy"] | undefined,
          });
        })
        .catch(console.error)
        .finally(() => setLoadingView(false));
      return;
    }
    setCampaignType((type as CampaignType) || "email");
    setViewApproved(null);
    setSendContentLocked(false);
    setAiSummary(null);
    setAiSummaryError("");
    setAssetApprovals({});
    setLoadingView(true);
    setStep("view");
    API.get(`/campaigns/${id}/status`)
      .then((r) => setViewingStatus(r.data))
      .catch(console.error)
      .finally(() => setLoadingView(false));
  };

  const handleGenerate = async () => {
    setGenError("");
    setAiSummary(null);
    setAiSummaryError("");
    setStep("generating");
    const defaultTone = campaignType === "email" ? "consultative" : "professional";
    const payload = campaignType === "email"
      ? { campaign_name: form.campaign_name, objective: form.objective, approval_owner: form.approval_owner, tone: form.tone || defaultTone, sequence_count: form.sequence_count, cta_preference: form.cta_preference || undefined, lead_ids: Array.from(selectedLeads), contact_ids: Array.from(selectedContacts) }
      : { campaign_name: form.campaign_name, objective: form.objective, approval_owner: form.approval_owner, tone: form.tone || defaultTone, sequence_count: form.sequence_count, cta_preference: form.cta_preference || undefined, industry_focus: form.industry_focus || undefined, lead_ids: Array.from(selectedLeads), contact_ids: Array.from(selectedContacts) };
    try {
      const endpoint = campaignType === "email" ? "/campaigns/email/create-and-generate" : "/campaigns/linkedin/create-and-generate";
      const res = await API.post(endpoint, payload);
      setResult(res.data);
      setGenStepIdx(GENERATING_STEPS.length - 1);
      setTimeout(() => { setStep("results"); fetchCampaigns(); }, 700);
    } catch (err) {
      setGenError(getErrorMessage(err, "Generation failed. Please try again."));
      setStep("targets");
    }
  };

  const handleAssetApprove = async (campaignId: number, assetId: number, decision: "approved" | "rejected") => {
    setApprovingAssetId(assetId);
    try {
      const { data } = await API.post(`/campaigns/${campaignId}/assets/${assetId}/approve`, { decision });
      const updatedStatus: CampaignStatusDetail = data.status;
      const bulk: Record<number, string> = {};
      updatedStatus.assets.forEach((a) => { bulk[a.id] = a.approval_status ?? decision; });
      setAssetApprovals((prev) => ({ ...prev, ...bulk }));
      const campStatus = updatedStatus.campaign.approval_status;
      if (campStatus === "approved" || campStatus === "rejected") {
        setViewApproved(campStatus === "approved");
        setApproved(campStatus === "approved");
      }
      setViewingStatus((prev) => (prev && prev.campaign.id === campaignId ? updatedStatus : prev));
      setResult((prev) =>
        prev && prev.campaign_id === campaignId ? { ...prev, status: updatedStatus } : prev
      );
      setCampaigns((prev) =>
        prev.map((c) => c.id === campaignId ? { ...c, ...updatedStatus.campaign } : c)
      );
    } catch (err) { console.error(err); }
    finally { setApprovingAssetId(null); }
  };

  const handleApprove = async (decision: "approved" | "rejected") => {
    if (!result) return;
    setApproving(true);
    try {
      const { data } = await API.post(`/campaigns/${result.campaign_id}/approve-drafts`, { decision });
      const updatedStatus: CampaignStatusDetail = data.status;
      setApproved(updatedStatus.campaign.approval_status === "approved");
      const bulk: Record<number, string> = {};
      updatedStatus.assets.forEach((a) => { bulk[a.id] = a.approval_status ?? decision; });
      setAssetApprovals((prev) => ({ ...prev, ...bulk }));
      setResult((prev) => prev ? { ...prev, status: updatedStatus } : prev);
      setCampaigns((prev) =>
        prev.map((c) => c.id === result.campaign_id ? { ...c, ...updatedStatus.campaign } : c)
      );
      fetchCampaigns();
    } catch (err) { console.error(err); }
    finally { setApproving(false); }
  };

  const handleViewApprove = async (decision: "approved" | "rejected") => {
    if (!viewingStatus) return;
    setViewApproving(true);
    try {
      const { data } = await API.post(`/campaigns/${viewingStatus.campaign.id}/approve-drafts`, { decision });
      const updatedStatus: CampaignStatusDetail = data.status;
      setViewApproved(updatedStatus.campaign.approval_status === "approved");
      const bulk: Record<number, string> = {};
      updatedStatus.assets.forEach((a) => { bulk[a.id] = a.approval_status ?? decision; });
      setAssetApprovals((prev) => ({ ...prev, ...bulk }));
      setViewingStatus(updatedStatus);
      setCampaigns((prev) =>
        prev.map((c) => c.id === viewingStatus.campaign.id ? { ...c, ...updatedStatus.campaign } : c)
      );
      fetchCampaigns();
    } catch (err) { console.error(err); }
    finally { setViewApproving(false); }
  };

  const handleDraftEdited = async (assetId: number) => {
    const editedCampaignId = viewingStatus?.campaign.id ?? result?.campaign_id ?? null;
    if (editedCampaignId == null) return;

    try {
      const { data: updatedStatus }: { data: CampaignStatusDetail } =
        await API.get(`/campaigns/${editedCampaignId}/status`);

      const bulk: Record<number, string> = {};
      updatedStatus.assets.forEach((a) => { bulk[a.id] = a.approval_status ?? "pending"; });
      setAssetApprovals((prev) => ({ ...prev, ...bulk }));

      setViewApproved(updatedStatus.campaign.approval_status === "approved" ? true : null);
      setApproved(updatedStatus.campaign.approval_status === "approved" ? true : null);

      setViewingStatus((prev) => (prev ? updatedStatus : prev));
      setResult((prev) => prev ? { ...prev, status: updatedStatus } : prev);
      setCampaigns((prev) =>
        prev.map((c) => c.id === editedCampaignId ? { ...c, ...updatedStatus.campaign } : c)
      );
      fetchCampaigns();
    } catch (err) { console.error(err); }
  };

  const handleLsGenerate = async () => {
    setLsGenError("");
    setLsGenStepIdx(0);
    setStep("ls_generating");
    let i = 0;
    lsGenIntervalRef.current = setInterval(() => {
      i += 1;
      if (i < LS_GENERATING_STEPS.length - 1) setLsGenStepIdx(i);
      else clearInterval(lsGenIntervalRef.current!);
    }, 2200);
    const payload: Record<string, unknown> = {
      campaign_name: lsForm.campaign_name,
      objective: lsForm.objective,
      approval_owner: lsForm.approval_owner,
      tone: lsForm.tone || "professional",
      post_count: lsForm.post_count,
      include_video: lsForm.include_video,
      include_image: lsForm.include_image,
    };
    if (lsForm.campaign_theme.trim()) payload.campaign_theme = lsForm.campaign_theme.trim();
    if (lsForm.focus_mode) payload.focus_mode = lsForm.focus_mode;
    if (lsForm.focus_industry.trim()) payload.focus_industry = lsForm.focus_industry.trim();
    if (lsForm.focus_product.trim()) payload.focus_product = lsForm.focus_product.trim();
    if (lsForm.cta_preference.trim()) payload.cta_preference = lsForm.cta_preference.trim();
    const constraintsList = lsForm.constraints.split("\n").map((s) => s.trim()).filter(Boolean);
    if (constraintsList.length) payload.constraints = constraintsList;
    const metricsList = lsForm.success_metrics.split("\n").map((s) => s.trim()).filter(Boolean);
    if (metricsList.length) payload.success_metrics = metricsList;
    try {
      const { data } = await API.post("/campaigns/linkedin-social/create-and-generate", payload);
      if (lsGenIntervalRef.current) clearInterval(lsGenIntervalRef.current);
      setLsResult(data as LinkedInSocialCampaignData);
      setLsGenStepIdx(LS_GENERATING_STEPS.length - 1);
      setTimeout(() => { setStep("ls_workspace"); fetchCampaigns(); }, 700);
    } catch (err) {
      if (lsGenIntervalRef.current) clearInterval(lsGenIntervalRef.current);
      setLsGenError(getErrorMessage(err, "Generation failed. Please try again."));
      setStep("ls_create");
    }
  };

  const handleLsPublishSuccess = () => {
    fetchCampaigns();
    const campaignId = lsResult?.campaign_id ?? lsResult?.campaign?.id;
    if (campaignId) {
      API.get(`/campaigns/${campaignId}/linkedin-social/status`)
        .then((r) => {
          const d = r.data as { campaign: Record<string, unknown>; assets: unknown[] };
          const freshAssets = mapLsAssets(d.assets);
          const freshCampaign = d.campaign as LinkedInSocialCampaignData["campaign"];
          setLsResult((prev) => prev ? {
            ...prev,
            campaign: freshCampaign,
            assets: freshAssets,
            status: prev.status ? { ...prev.status, campaign: freshCampaign, assets: freshAssets } : prev.status,
          } : prev);
        })
        .catch(() => {});
    }
  };

  const handleLsDuplicate = () => {
    if (lsResult) {
      const c = lsResult.campaign as Record<string, unknown>;
      setLsForm((prev) => ({
        ...prev,
        campaign_name: `${(c.name as string) || prev.campaign_name} (copy)`,
        objective: (c.objective as string) || prev.objective,
          campaign_theme: (c.campaign_theme as string) || prev.campaign_theme,
      }));
    }
    setLsResult(null);
    setLsAnalysis({});
    setLsAnalyzing(new Set());
    setStep("ls_create");
  };

  const handleLsOpenStats = (assetId: number) => {
    const asset = lsResult?.assets?.find((a) => a.id === assetId) ?? lsResult?.status?.assets?.find((a) => a.id === assetId);
    const meta = (asset as Record<string, unknown> | undefined)?.external_metadata as Record<string, unknown> | undefined;
    const existingStats = (asset?.stats ?? meta?.manual_linkedin_stats) as AssetStats | undefined;
    setLsStatsExisting(existingStats);
    setLsStatsAssetId(assetId);
  };

  const handleLsStatsSaved = (assetId: number, stats: AssetStats) => {
    setLsResult((prev) => {
      if (!prev) return prev;
      const updateAssets = (arr: LinkedInSocialCampaignData["assets"]) =>
        arr.map((a) => a.id === assetId ? { ...a, stats } : a);
      return {
        ...prev,
        assets: updateAssets(prev.assets ?? []),
        status: prev.status ? { ...prev.status, assets: updateAssets(prev.status.assets ?? []) } : prev.status,
      };
    });
  };

  const handleLsAnalyze = async (assetId: number) => {
    if (!lsResult) return;
    const campaignId = lsResult.campaign_id ?? lsResult.campaign?.id;
    setLsAnalyzing((prev) => new Set(prev).add(assetId));
    try {
      const { data } = await API.post(`/campaigns/${campaignId}/linkedin-social/assets/${assetId}/performance/analyze`);
      setLsAnalysis((prev) => ({ ...prev, [assetId]: data as LinkedInSocialAnalysis }));
    } catch {
      setLsAnalysis((prev) => ({ ...prev, [assetId]: { summary: "Analysis failed. Please try again." } }));
    } finally {
      setLsAnalyzing((prev) => { const n = new Set(prev); n.delete(assetId); return n; });
    }
  };

  const handleReset = () => {
    setStep("list");
    setCampaignType("email");
    setForm({ campaign_name: "", objective: "", approval_owner: "", tone: "", sequence_count: 3, cta_preference: "", industry_focus: "" });
    setSelectedLeads(new Set()); setSelectedContacts(new Set()); setSearch("");
    setResult(null); setGenError(""); setApproved(null);
    setViewingStatus(null); setAiSummary(null); setAiSummaryError("");
    setAssetApprovals({}); setApprovingAssetId(null);
    // LinkedIn Social
    setLsForm({ campaign_name: "", objective: "", approval_owner: "", tone: "", post_count: 5, campaign_theme: "", focus_mode: "", focus_industry: "", focus_product: "", cta_preference: "", include_video: false, include_image: true, constraints: "", success_metrics: "" });
    setLsResult(null); setLsGenError(""); setLsGenStepIdx(0);
    setLsStatsAssetId(null); setLsStatsExisting(undefined);
    setLsAnalysis({}); setLsAnalyzing(new Set());
    if (lsGenIntervalRef.current) clearInterval(lsGenIntervalRef.current);
  };

  const isWizard = ["type", "details", "targets", "generating"].includes(step);
  const isResults = step === "results";
  const isView = step === "view";
  const isList = step === "list";
  const isLsCreate = step === "ls_create";
  const isLsGenerating = step === "ls_generating";
  const isLsWorkspace = step === "ls_workspace" || step === "ls_view";

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="p-6 max-w-7xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">AI Campaign Builder</h1>
          <p className="text-sm text-slate-500 mt-0.5">Generate personalized outreach at scale, powered by AI</p>
        </div>
        <div className="flex items-center gap-2">
          {(isResults || isView || isWizard || isLsCreate || isLsGenerating || isLsWorkspace) && (
            <Button onClick={handleReset} variant="outline" className="gap-2 border-slate-200 text-slate-700 text-sm">
              <ArrowLeft className="w-4 h-4" /> All Campaigns
            </Button>
          )}
          {isList && (
            <Button onClick={() => setStep("type")} className="gap-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-sm shadow-orange-200">
              <Plus className="w-4 h-4" /> New Campaign
            </Button>
          )}
        </div>
      </div>

      {/* Step bar for wizard */}
      {isWizard && <StepBar step={step} />}

      {/* ── LIST ──────────────────────────────────────────────────────────── */}
      {isList && (
        <div className="space-y-4">
          {loadingList && (
            <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading campaigns…</span>
            </div>
          )}

          {!loadingList && listError && (
            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{listError}</p>
              <Button variant="outline" onClick={fetchCampaigns} className="ml-auto gap-1.5 text-xs border-red-200 text-red-600 h-7 px-2">
                <RefreshCw className="w-3 h-3" /> Retry
              </Button>
            </div>
          )}

          {!loadingList && !listError && campaigns.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white py-20 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-5">
                <Sparkles className="w-7 h-7 text-slate-300" />
              </div>
              <h3 className="text-base font-semibold text-slate-700 mb-2">No campaigns yet</h3>
              <p className="text-sm text-slate-400 max-w-xs leading-relaxed mb-6">
                Create your first AI-powered campaign and reach contacts with personalized messages.
              </p>
              <Button onClick={() => setStep("type")} className="gap-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold">
                <Plus className="w-4 h-4" /> Create First Campaign
              </Button>
            </div>
          )}

          {!loadingList && campaigns.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {campaigns.length} Campaign{campaigns.length !== 1 ? "s" : ""}
                </span>
                <Button variant="ghost" onClick={fetchCampaigns} className="gap-1.5 text-xs text-slate-500 h-7 px-2">
                  <RefreshCw className="w-3 h-3" /> Refresh
                </Button>
              </div>
              <div className="divide-y divide-slate-100">
                {campaigns.map((c) => {
                  const isLinkedInSocial = c.type === "linkedin_social";
                  const isEmail = !isLinkedInSocial && c.type !== "linkedin";
                  const orchLabel = isLinkedInSocial
                    ? (c.orchestration_state?.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase()) || "Draft")
                    : (ORCH_LABELS[c.orchestration_state || ""] || c.orchestration_state || "Draft");
                  return (
                    <div key={c.id} className={`flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group ${isLinkedInSocial ? "" : listRowBackground(c.send_status)}`}>
                      {/* Type icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isLinkedInSocial ? "bg-violet-100" : isEmail ? "bg-orange-100" : "bg-blue-100"}`}>
                        {isLinkedInSocial
                          ? <Newspaper className="w-4 h-4 text-violet-600" />
                          : isEmail
                            ? <Mail className="w-4 h-4 text-orange-600" />
                            : <Link2 className="w-4 h-4 text-blue-600" />}
                      </div>

                      {/* Name + goal + send counts */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{c.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {c.goal && <p className="text-xs text-slate-400 truncate max-w-[200px]">{c.goal}</p>}
                          {(c.sent_count != null && c.sent_count > 0) && (
                            <span className="text-xs text-emerald-600 font-semibold">{c.sent_count} sent</span>
                          )}
                          {(c.failed_count != null && c.failed_count > 0) && (
                            <span className="text-xs text-red-500 font-semibold">{c.failed_count} failed</span>
                          )}
                          {(c.skipped_count != null && c.skipped_count > 0) && (
                            <span className="text-xs text-slate-400 font-medium">{c.skipped_count} skipped</span>
                          )}
                          {(c.excluded_count != null && c.excluded_count > 0) && (
                            <span className="text-xs text-slate-400 font-medium">{c.excluded_count} excluded</span>
                          )}
                        </div>
                      </div>

                      {/* Send status badge (if send has been started) */}
                      {!isLinkedInSocial && sendStatusBadge(c.send_status)}

                      {/* Orchestration state badge */}
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${isLinkedInSocial ? "bg-violet-100 text-violet-700" : orchStateColor(c.orchestration_state)}`}>
                        {orchLabel}
                      </span>

                      {/* Type badge */}
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${isLinkedInSocial ? "bg-violet-50 text-violet-700 border-violet-100" : isEmail ? "bg-orange-50 text-orange-700 border-orange-100" : "bg-blue-50 text-blue-700 border-blue-100"}`}>
                        {isLinkedInSocial ? "LinkedIn Social" : isEmail ? "Email" : "LinkedIn"}
                      </span>

                      {/* Date */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-shrink-0">
                        <Calendar className="w-3 h-3" />
                        {formatDate(c.created_at)}
                      </div>

                      {/* View button */}
                      <Button
                        onClick={() => handleViewCampaign(c.id, c.type)}
                        variant="outline"
                        className="gap-1.5 border-slate-200 text-slate-600 text-xs h-8 px-3 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── VIEW (existing campaign) ────────────────────────────────────── */}
      {isView && (
        <div className="space-y-5">
          {loadingView ? (
            <div className="flex items-center justify-center py-24 gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading campaign…</span>
            </div>
          ) : viewingStatus ? (() => {
            const c = viewingStatus.campaign;
            const targets = viewingStatus.targets;
            const assets = viewingStatus.assets;
            const eligible = targets.filter((t) => ["eligible", "needs_offering_review"].includes(t.recipient_status)).length;
            const excluded = targets.filter((t) => t.recipient_status === "excluded").length;
            const allQaPassed = assets.every((a) => (a.qa_score ?? 100) >= 70);
            const strategy = (c.plan_data as Record<string, unknown>)?.strategy as Record<string, unknown> ?? {};
            const existingApproval = c.approval_status && c.approval_status !== "pending" ? c.approval_status : null;
            const viewType: CampaignType = c.type === "linkedin" ? "linkedin" : "email";

            const isContentLocked = sendContentLocked || CONTENT_LOCKED_STATUSES.has((c.send_status ?? "not_started") as CampaignSendStatus);
            return (
              <>
                {/* AI Summary — only shown once the campaign has generated assets */}
                {assets.length > 0 ? (
                  <AISummaryPanel
                    summary={aiSummary}
                    loading={loadingAiSummary}
                    error={aiSummaryError}
                    onGenerate={() => fetchAiSummary(c.id)}
                  />
                ) : (
                  <div className="relative overflow-hidden rounded-xl bg-slate-950 border border-slate-800/60 px-5 py-4">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_0%_0%,rgba(234,88,12,0.12)_0%,transparent_60%)]" />
                    <div className="relative z-10 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4 text-orange-400" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white uppercase tracking-wider">AI Summary</p>
                        <p className="text-xs text-slate-500 mt-0.5">Available once campaign generation completes</p>
                      </div>
                      <span className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${orchStateColor(c.orchestration_state)} bg-opacity-80`}>
                        {ORCH_LABELS[c.orchestration_state || ""] || c.orchestration_state || "In Progress"}
                      </span>
                    </div>
                  </div>
                )}

                <CampaignResultsBody
                  campaignId={c.id}
                  campaignName={c.name}
                  campaignType={viewType}
                  resolveSummary={{ total_targets: targets.length, eligible_targets: eligible, excluded_targets: excluded }}
                  strategy={strategy}
                  generatedCount={assets.length}
                  qaPassed={allQaPassed}
                  assets={assets}
                  existingApproval={isContentLocked ? c.approval_status ?? null : existingApproval}
                  approvalOwner={c.approval_owner}
                  currentUserEmail={currentUserEmail}
                  assetApprovals={assetApprovals}
                  approvingAssetId={isContentLocked ? null : approvingAssetId}
                  isContentLocked={isContentLocked}
                  onApprove={isContentLocked ? () => {} : handleViewApprove}
                  onAssetApprove={isContentLocked ? () => {} : (assetId, decision) => handleAssetApprove(c.id, assetId, decision)}
                  onDraftEdited={handleDraftEdited}
                  approving={isContentLocked ? false : viewApproving}
                  approved={viewApproved}
                />

                {/* Campaign Send Panel — visible once drafts exist; locks send when not yet approved */}
                {(DRAFT_EXISTS_STATES.has(c.orchestration_state ?? "") || isContentLocked) && (
                  <CampaignSendPanel
                    campaignId={c.id}
                    campaignType={viewType}
                    approvalStatus={c.approval_status}
                    currentUserEmail={currentUserEmail}
                    approvalOwner={c.approval_owner}
                    onSendStarted={fetchCampaigns}
                    onContentLockedChange={setSendContentLocked}
                  />
                )}

                {/* Activity Feed */}
                <CampaignActivityFeed
                  campaignId={c.id}
                  sendStatus={c.send_status as CampaignSendStatus | undefined}
                />
              </>
            );
          })() : (
            <div className="rounded-xl border border-dashed border-slate-200 p-16 text-center">
              <p className="text-sm text-slate-400">Could not load campaign details</p>
            </div>
          )}
        </div>
      )}

      {/* ── RESULTS (newly generated) ──────────────────────────────────── */}
      {isResults && result && (
        <>
          {result.status.assets.length > 0 && (
            <AISummaryPanel
              summary={aiSummary}
              loading={loadingAiSummary}
              error={aiSummaryError}
              onGenerate={() => fetchAiSummary(result.campaign_id)}
            />
          )}
          <CampaignResultsBody
            campaignId={result.campaign_id}
            campaignName={result.status.campaign.name || form.campaign_name}
            campaignType={campaignType}
            resolveSummary={result.resolve_summary}
            strategy={result.strategy}
            generatedCount={result.generated_assets_count}
            qaPassed={result.qa_summary.passed}
            assets={result.status.assets}
            existingApproval={null}
            approvalOwner={result.status.campaign.approval_owner}
            currentUserEmail={currentUserEmail}
            assetApprovals={assetApprovals}
            approvingAssetId={approvingAssetId}
            onApprove={handleApprove}
            onAssetApprove={(assetId, decision) => handleAssetApprove(result.campaign_id, assetId, decision)}
            onDraftEdited={handleDraftEdited}
            approving={approving}
            approved={approved}
          />
          {/* Send panel — visible once drafts exist; locks send when not yet approved */}
          {DRAFT_EXISTS_STATES.has((result.status.campaign.orchestration_state as string) ?? "") && (
            <CampaignSendPanel
              campaignId={result.campaign_id}
              campaignType={campaignType as "email" | "linkedin"}
              approvalStatus={result.status.campaign.approval_status as string | null | undefined}
              currentUserEmail={currentUserEmail}
              approvalOwner={result.status.campaign.approval_owner as string | undefined}
              onSendStarted={fetchCampaigns}
              onContentLockedChange={setSendContentLocked}
            />
          )}
          <CampaignActivityFeed campaignId={result.campaign_id} />
        </>
      )}

      {/* ── LINKEDIN SOCIAL: Create form ──────────────────────────────── */}
      {isLsCreate && (
        <div className="max-w-2xl mx-auto">
          <LinkedInSocialCreateForm
            form={lsForm}
            onChange={(patch) => setLsForm((f) => ({ ...f, ...patch }))}
            users={approvalUsers}
            loadingUsers={loadingApprovalUsers}
            usersError={approvalUsersError}
            onBack={() => setStep("type")}
            onGenerate={handleLsGenerate}
            generating={false}
            genError={lsGenError}
          />
        </div>
      )}

      {/* ── LINKEDIN SOCIAL: Generating ───────────────────────────────── */}
      {isLsGenerating && (
        <div className="max-w-lg mx-auto py-12 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-7 h-7 text-blue-500" />
            </div>
            <p className="text-base font-semibold text-slate-800">AI is preparing your LinkedIn Social campaign</p>
            <p className="text-sm text-slate-400">This usually takes 20–45 seconds</p>
          </div>
          <div className="space-y-2">
            {LS_GENERATING_STEPS.map(({ label, icon: Icon }, i) => {
              const done = i < lsGenStepIdx, active = i === lsGenStepIdx;
              return (
                <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${active ? "bg-blue-50 border border-blue-200" : done ? "opacity-60" : "opacity-30"}`}>
                  {done ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : active ? <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" /> : <Icon className="w-4 h-4 text-slate-300 flex-shrink-0" />}
                  <span className={`text-sm font-medium ${active ? "text-blue-700" : done ? "text-slate-500" : "text-slate-400"}`}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── LINKEDIN SOCIAL: Workspace / View ─────────────────────────── */}
      {isLsWorkspace && (
        <div className="space-y-5">
          {loadingView && step === "ls_view" ? (
            <div className="flex items-center justify-center py-24 gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading campaign…</span>
            </div>
          ) : lsResult ? (
            <LinkedInSocialWorkspace
              data={lsResult}
              mode={step === "ls_workspace" ? "generated" : "history"}
              onPublishSuccess={handleLsPublishSuccess}
              onOpenStats={handleLsOpenStats}
              onAnalyze={handleLsAnalyze}
              onDuplicate={handleLsDuplicate}
              analysis={lsAnalysis}
              analyzing={lsAnalyzing}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-16 text-center">
              <p className="text-sm text-slate-400">Could not load campaign details</p>
            </div>
          )}
        </div>
      )}

      {/* Stats drawer (portal-style) */}
      {lsStatsAssetId !== null && lsResult && (
        <LinkedInSocialStatsDrawer
          campaignId={lsResult.campaign_id ?? lsResult.campaign?.id}
          assetId={lsStatsAssetId}
          existingStats={lsStatsExisting}
          onClose={() => { setLsStatsAssetId(null); setLsStatsExisting(undefined); }}
          onSaved={handleLsStatsSaved}
        />
      )}

      {/* ── WIZARD: two-col layout ─────────────────────────────────────── */}
      {isWizard && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <AISidePanel step={step} campaignType={campaignType} totalSelected={totalSelected} result={result} />
          </div>
          <div className="lg:col-span-3">

            {/* ── TYPE ─────────────────────────────────────────────────── */}
            {step === "type" && (
              <div className="space-y-4 flex flex-col justify-center h-full">
                <p className="text-sm text-slate-600 font-medium">Choose your campaign type:</p>
                {[
                  { type: "email" as CampaignType, icon: Mail, title: "Email Campaign", desc: "Personalized multi-step email sequences crafted per recipient with subject lines, body, and CTA.", iconBg: "bg-orange-100", iconColor: "text-orange-600", hover: "hover:border-orange-300", ctaColor: "text-orange-600" },
                  { type: "linkedin" as CampaignType, icon: Link2, title: "LinkedIn Outreach Campaign", desc: "Connection + conversation sequences tailored to each prospect's role and industry.", iconBg: "bg-blue-100", iconColor: "text-blue-600", hover: "hover:border-blue-300", ctaColor: "text-blue-600" },
                ].map((opt) => (
                  <button key={opt.type} onClick={() => { setCampaignType(opt.type); setStep("details"); }}
                    className={`group relative overflow-hidden w-full rounded-xl border-2 border-slate-200 bg-white p-6 text-left ${opt.hover} hover:shadow-md transition-all`}>
                    <div className="relative flex items-start gap-4">
                      <div className={`w-11 h-11 rounded-xl ${opt.iconBg} flex items-center justify-center flex-shrink-0`}>
                        <opt.icon className={`w-5 h-5 ${opt.iconColor}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-bold text-slate-900 mb-1">{opt.title}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">{opt.desc}</p>
                      </div>
                      <div className={`flex items-center gap-1 font-semibold text-sm mt-1 flex-shrink-0 ${opt.ctaColor}`}>
                        Select <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </button>
                ))}
                {/* LinkedIn Social — separate flow */}
                <button
                  onClick={() => { setCampaignType("linkedin_social"); setStep("ls_create"); }}
                  className="group relative overflow-hidden w-full rounded-xl border-2 border-slate-200 bg-white p-6 text-left hover:border-violet-300 hover:shadow-md transition-all"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_70%_at_110%_110%,rgba(124,58,237,0.06)_0%,transparent_70%)]" />
                  <div className="relative flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <Newspaper className="w-5 h-5 text-violet-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-bold text-slate-900">LinkedIn Social Post</h3>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">New</span>
                      </div>
                      <p className="text-sm text-slate-500 leading-relaxed">Publish AI-generated LinkedIn posts from your personal account. Ideal for brand awareness and thought leadership.</p>
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {["Create drafts", "Review & edit", "Publish", "Track analytics"].map((t) => (
                          <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100 font-medium">{t}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 font-semibold text-sm mt-1 flex-shrink-0 text-violet-600">
                      Select <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* ── DETAILS ──────────────────────────────────────────────── */}
            {step === "details" && (
              <div className="space-y-5">
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Campaign Name <span className="text-red-400">*</span></label>
                    <Input placeholder="e.g. Q2 Enterprise Outreach" value={form.campaign_name} onChange={(e) => setField("campaign_name", e.target.value)} className="border-slate-200 focus:ring-orange-500/30 focus:border-orange-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Objective <span className="text-red-400">*</span></label>
                    <textarea rows={3} placeholder={campaignType === "email" ? "e.g. Book discovery calls with logistics heads…" : "e.g. Connect with procurement managers…"} value={form.objective} onChange={(e) => setField("objective", e.target.value)} className="w-full rounded-md border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Tone</label>
                      <select value={form.tone} onChange={(e) => setField("tone", e.target.value)} className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 bg-white">
                        <option value="">Default</option>
                        {(campaignType === "email" ? EMAIL_TONES : LINKEDIN_TONES).map((t) => (
                          <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Sequence Steps</label>
                      <input type="number" min={1} max={campaignType === "email" ? 6 : 10} value={form.sequence_count} onChange={(e) => setField("sequence_count", parseInt(e.target.value, 10) || 1)} className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400" />
                    </div>
                  </div>
                  {campaignType === "linkedin" && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Industry Focus</label>
                      <Input placeholder="e.g. Logistics, Manufacturing…" value={form.industry_focus} onChange={(e) => setField("industry_focus", e.target.value)} className="border-slate-200 focus:ring-orange-500/30 focus:border-orange-400" />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">CTA Preference</label>
                    <Input placeholder="e.g. Schedule a 15-min call" value={form.cta_preference} onChange={(e) => setField("cta_preference", e.target.value)} className="border-slate-200 focus:ring-orange-500/30 focus:border-orange-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                      Approval Owner <span className="text-red-400">*</span>
                    </label>
                    <ApprovalOwnerCombobox
                      value={form.approval_owner}
                      onChange={(email) => setField("approval_owner", email)}
                      users={approvalUsers}
                      loading={loadingApprovalUsers}
                      error={approvalUsersError}
                    />
                    {form.approval_owner && (
                      <p className="mt-1.5 text-xs text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {form.approval_owner} selected
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Button variant="outline" onClick={() => setStep("type")} className="gap-2 border-slate-200 text-slate-600"><ArrowLeft className="w-4 h-4" /> Back</Button>
                  <Button onClick={() => setStep("targets")} disabled={!detailsValid} className="gap-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-sm shadow-orange-200">
                    Next: Select Targets <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── TARGETS ──────────────────────────────────────────────── */}
            {step === "targets" && (
              <div className="space-y-4">
                {genError && (
                  <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                    <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700">{genError}</p>
                  </div>
                )}
                {totalSelected > 0 && (
                  <div className="flex items-center gap-3 rounded-lg bg-orange-50 border border-orange-200 px-4 py-2.5">
                    <Users className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-semibold text-orange-800">{totalSelected} target{totalSelected !== 1 ? "s" : ""} selected</span>
                    {selectedLeads.size > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200 font-medium">{selectedLeads.size} leads</span>}
                    {selectedContacts.size > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 font-medium">{selectedContacts.size} contacts</span>}
                  </div>
                )}
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center border-b border-slate-100 px-4 pt-3 gap-1">
                    {(["leads", "contacts"] as const).map((tab) => (
                      <button key={tab} onClick={() => setTargetTab(tab)}
                        className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${targetTab === tab ? "text-orange-700 border-b-2 border-orange-500 -mb-px bg-white" : "text-slate-500 hover:text-slate-700"}`}>
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        <span className="ml-1 text-xs text-slate-400">({tab === "leads" ? leads.length : contacts.length})</span>
                      </button>
                    ))}
                    <div className="ml-auto pb-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg w-44 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400" />
                      </div>
                    </div>
                  </div>
                  {loadingTargets ? (
                    <div className="flex items-center justify-center py-16 gap-2 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading…</span></div>
                  ) : targetTab === "leads" ? (
                    <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
                      {filteredLeads.length === 0 ? <div className="py-12 text-center text-sm text-slate-400">No leads found</div> : filteredLeads.map((lead) => {
                        const sel = selectedLeads.has(lead.id);
                        return (
                          <button key={lead.id} onClick={() => setSelectedLeads((p) => { const n = new Set(p); sel ? n.delete(lead.id) : n.add(lead.id); return n; })}
                            className={`w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors text-left ${sel ? "bg-orange-50/60" : ""}`}>
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${sel ? "bg-orange-500 border-orange-500" : "border-slate-300"}`}>
                              {sel && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                            </div>
                            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-700 flex-shrink-0">{initials(lead.name)}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">{lead.name}</p>
                              <p className="text-xs text-slate-400 truncate">{lead.company && `${lead.company} · `}{lead.email || "no email"}</p>
                            </div>
                            {lead.ai_score != null && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${qaColor(lead.ai_score)}`}>{lead.ai_score}</span>}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
                      {filteredContacts.length === 0 ? <div className="py-12 text-center text-sm text-slate-400">No contacts found</div> : filteredContacts.map((c) => {
                        const sel = selectedContacts.has(c.id);
                        const name = `${c.first_name} ${c.last_name || ""}`.trim();
                        return (
                          <button key={c.id} onClick={() => setSelectedContacts((p) => { const n = new Set(p); sel ? n.delete(c.id) : n.add(c.id); return n; })}
                            className={`w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors text-left ${sel ? "bg-blue-50/60" : ""}`}>
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${sel ? "bg-blue-500 border-blue-500" : "border-slate-300"}`}>
                              {sel && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                            </div>
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">{initials(name)}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
                              <p className="text-xs text-slate-400 truncate">{c.company_name && `${c.company_name} · `}{c.title && `${c.title} · `}{c.email}</p>
                            </div>
                            {c.lifecycle_stage && <span className="text-xs text-slate-400 capitalize flex-shrink-0">{c.lifecycle_stage.replace(/_/g, " ")}</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <Button variant="outline" onClick={() => setStep("details")} className="gap-2 border-slate-200 text-slate-600"><ArrowLeft className="w-4 h-4" /> Back</Button>
                  <Button onClick={handleGenerate} disabled={totalSelected === 0} className="gap-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-sm shadow-orange-200 px-6">
                    <Sparkles className="w-4 h-4" /> Generate with AI
                    {totalSelected > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-orange-500/30 text-xs font-bold">{totalSelected}</span>}
                  </Button>
                </div>
              </div>
            )}

            {/* ── GENERATING ───────────────────────────────────────────── */}
            {step === "generating" && (
              <div className="flex flex-col justify-center h-full py-8 space-y-6">
                <div className="text-center space-y-1">
                  <p className="text-sm font-semibold text-slate-700">Processing your campaign…</p>
                  <p className="text-xs text-slate-400">This usually takes 15–40 seconds</p>
                </div>
                <div className="space-y-2">
                  {GENERATING_STEPS.map(({ label, icon: Icon }, i) => {
                    const done = i < genStepIdx, active = i === genStepIdx;
                    return (
                      <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${active ? "bg-orange-50 border border-orange-200" : done ? "opacity-60" : "opacity-30"}`}>
                        {done ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : active ? <Loader2 className="w-4 h-4 text-orange-500 animate-spin flex-shrink-0" /> : <Icon className="w-4 h-4 text-slate-300 flex-shrink-0" />}
                        <span className={`text-sm font-medium ${active ? "text-orange-700" : done ? "text-slate-500" : "text-slate-400"}`}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
