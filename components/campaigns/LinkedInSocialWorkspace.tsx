"use client";

import { useState } from "react";
import {
  CheckCircle2, Loader2, Sparkles, Brain,
  Image as ImageIcon, Video, BarChart2,
  Send, Lock, Pencil, Save, X, RotateCcw, AlertTriangle,
  ChevronDown, ChevronUp, TrendingUp, Zap, Newspaper, Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import API from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LinkedInSocialAsset {
  id: number;
  campaign_id: number;
  post_number?: number;
  sequence_step?: number;
  title?: string;
  hook?: string;
  subject?: string;
  body: string;
  cta?: string;
  include_image?: boolean;
  include_video?: boolean;
  scheduled_at?: string;
  asset_type?: string;
  status?: string;
  external_status?: string;
  external_id?: string;
  approval_status?: string;
  published_at?: string;
  stats?: {
    impressions?: number | null;
    reactions?: number | null;
    comments?: number | null;
    reposts?: number | null;
    clicks?: number | null;
    followers_gained?: number | null;
    notes?: string;
  };
}

export interface LinkedInSocialCampaignData {
  campaign_id: number;
  campaign: {
    id: number;
    name: string;
    type?: string;
    status?: string;
    objective?: string;
    company_profile_key?: string;
    campaign_theme?: string;
    approval_owner?: string;
    published_at?: string;
    created_at?: string;
    [key: string]: unknown;
  };
  strategy?: {
    themes?: string[];
    tone?: string;
    focus_mode?: string;
    focus_industry?: string;
    focus_product?: string;
    [key: string]: unknown;
  };
  assets: LinkedInSocialAsset[];
  post_count?: number;
  generated_assets_count?: number;
  status?: {
    campaign: LinkedInSocialCampaignData["campaign"];
    assets: LinkedInSocialAsset[];
  };
}

export interface LinkedInSocialAnalysis {
  campaign_id?: number;
  asset_id?: number;
  stats?: {
    impressions?: number | null;
    reactions?: number | null;
    comments?: number | null;
    reposts?: number | null;
    clicks?: number | null;
    followers_gained?: number | null;
    notes?: string | null;
    captured_at?: string;
  };
  performance?: {
    engagements?: number;
    engagement_rate?: number;
    social_engagement_rate?: number;
    click_rate?: number;
    comment_rate?: number;
    follower_rate?: number;
    diagnosis?: string;
  };
  analysis?: {
    performance_summary?: string;
    diagnosis?: string[];
    recommended_changes?: {
      hook?: string;
      body?: string;
      cta?: string;
      hashtags?: string;
    };
    revised_post?: {
      body?: string;
      hashtags?: string[];
    };
    what_to_test_next?: string[];
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-blue-100 text-blue-700 border-blue-200",
  draft_ready: "bg-blue-100 text-blue-700 border-blue-200",
  ready_to_publish: "bg-amber-100 text-amber-700 border-amber-200",
  scheduled: "bg-amber-100 text-amber-700 border-amber-200",
  published: "bg-emerald-100 text-emerald-700 border-emerald-200",
  failed: "bg-red-100 text-red-700 border-red-200",
  analyzing: "bg-violet-100 text-violet-700 border-violet-200",
};

function statusBadge(status?: string) {
  const s = status || "draft";
  const cls = STATUS_COLORS[s] || "bg-slate-100 text-slate-500 border-slate-200";
  const label = s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border flex-shrink-0 ${cls}`}>
      {label}
    </span>
  );
}

function formatDateTime(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ─── Strategy Card ────────────────────────────────────────────────────────────

function SocialStrategyCard({
  strategy, campaignTheme,
}: {
  strategy?: LinkedInSocialCampaignData["strategy"];
  campaignTheme?: string;
}) {
  if (!strategy && !campaignTheme) return null;
  const themes = strategy?.themes || [];
  const tone = strategy?.tone;
  const focusMode = (strategy?.focus_mode as string | undefined)?.replace(/_/g, " ");
  const industry = strategy?.focus_industry as string | undefined;

  return (
    <div className="relative overflow-hidden rounded-xl bg-slate-950 border border-slate-800/60 p-5">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_0%_0%,rgba(59,130,246,0.12)_0%,transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_100%_100%,rgba(124,58,237,0.10)_0%,transparent_55%)]" />
      <div className="relative z-10 space-y-4">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-bold text-white">AI Content Strategy</span>
        </div>
        {campaignTheme && (
          <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2.5">
            <div className="text-xs text-slate-500 mb-0.5 uppercase tracking-wider font-medium">Campaign Theme</div>
            <div className="text-sm font-medium text-white">{campaignTheme}</div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {tone && (
            <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2.5">
              <div className="text-xs text-slate-500 mb-0.5 uppercase tracking-wider font-medium">Tone</div>
              <div className="text-sm font-semibold text-white capitalize">{tone.replace(/-/g, " ")}</div>
            </div>
          )}
          {focusMode && (
            <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2.5">
              <div className="text-xs text-slate-500 mb-0.5 uppercase tracking-wider font-medium">Focus</div>
              <div className="text-sm font-semibold text-white capitalize">{focusMode}</div>
            </div>
          )}
        </div>
        {themes.length > 0 && (
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">Post Themes</div>
            <div className="flex flex-wrap gap-1.5">
              {themes.map((t, i) => (
                <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/15 text-blue-300 border border-blue-500/20">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
        {industry && (
          <div className="rounded-lg bg-violet-500/10 border border-violet-500/20 px-3 py-2.5">
            <div className="text-xs text-violet-400/70 uppercase tracking-wider font-medium mb-0.5">Industry</div>
            <div className="text-sm text-violet-200 font-medium">{industry}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Analysis Panel ───────────────────────────────────────────────────────────
// Isolated so it can manage its own local "pending" spinner immediately on click,
// then hand off to the parent-derived `analyzing` prop once the API call is in flight.

function AnalysisPanel({
  assetId, analyzing, analysis, onAnalyze, isPostPublished, isRevisionPending, campaignApproved,
  onStageRevision, onApplyToLinkedIn,
}: {
  assetId: number;
  analyzing: boolean;
  analysis?: LinkedInSocialAnalysis;
  onAnalyze: (id: number) => void;
  isPostPublished: boolean;
  isRevisionPending: boolean;  // true = was published, now draft (external_id set, external_status = draft)
  campaignApproved: boolean;
  onStageRevision: (assetId: number, body: string, hashtags: string[], cta: string) => Promise<void>;
  onApplyToLinkedIn: (assetId: number, body?: string) => Promise<void>;
}) {
  const [visible, setVisible] = useState(false);
  const [localPending, setLocalPending] = useState(false);
  const [staging, setStaging] = useState(false);
  const [stageError, setStageError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const isBusy = analyzing || localPending;
  const hasResults = !isBusy && !!analysis?.analysis?.performance_summary;

  async function handleStage() {
    const revised = analysis?.analysis?.revised_post;
    if (!revised?.body) return;
    setStaging(true);
    setStageError(null);
    try {
      const body = revised.body;
      const hashtags = Array.isArray(revised.hashtags) ? revised.hashtags : [];
      const cta = analysis?.analysis?.recommended_changes?.cta ?? "";
      await onStageRevision(assetId, body, hashtags, cta);
      // UI updates from server refresh — no local staged flag needed
    } catch (err) {
      setStageError(err instanceof Error ? err.message : "Failed to stage revision.");
    } finally {
      setStaging(false);
    }
  }

  async function handleApply() {
    const revised = analysis?.analysis?.revised_post;
    if (!revised?.body) return;
    const hashtags = Array.isArray(revised.hashtags) ? revised.hashtags : [];
    const bodyWithHashtags = hashtags.length ? `${revised.body}\n\n${hashtags.join(" ")}` : revised.body;
    setApplying(true);
    setApplyError(null);
    try {
      await onApplyToLinkedIn(assetId, bodyWithHashtags);
      setVisible(false); // collapse panel — post is live again; user can re-analyze for a new revision
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : "Failed to update LinkedIn post. Please try again.");
    } finally {
      setApplying(false);
    }
  }

  function handleClick() {
    setVisible(true);
    setLocalPending(true);
    onAnalyze(assetId);
    // Clear local flag after a tick — by then parent's `analyzing` is true
    setTimeout(() => setLocalPending(false), 80);
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={isBusy}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 hover:bg-violet-100 transition-colors disabled:opacity-60"
      >
        {isBusy
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <Sparkles className="w-3.5 h-3.5" />}
        {hasResults ? "Re-analyze" : "Analyze Performance"}
      </button>

      {visible && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-violet-200 bg-violet-100/50">
            <Brain className="w-3.5 h-3.5 text-violet-600" />
            <span className="text-xs font-semibold text-violet-800">Performance Analysis</span>
            <button
              onClick={() => setVisible(false)}
              className="ml-auto text-violet-400 hover:text-violet-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            {isBusy && (
              <>
                <div className="flex items-center gap-3 py-1">
                  <Loader2 className="w-4 h-4 text-violet-500 animate-spin flex-shrink-0" />
                  <span className="text-sm text-violet-700">Analyzing engagement data…</span>
                </div>
                {/* Skeleton */}
                <div className="space-y-2 animate-pulse">
                  <div className="h-3 bg-violet-200/60 rounded-md w-full" />
                  <div className="h-3 bg-violet-200/60 rounded-md w-4/5" />
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="h-12 bg-violet-200/40 rounded-lg" />
                    <div className="h-12 bg-violet-200/40 rounded-lg" />
                  </div>
                </div>
              </>
            )}
            {!isBusy && analysis?.analysis && (
              <>
                {/* Performance metrics */}
                {analysis.performance && (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Engagements", value: analysis.performance.engagements },
                      { label: "Eng. Rate", value: analysis.performance.engagement_rate != null ? `${(analysis.performance.engagement_rate * 100).toFixed(1)}%` : null },
                      { label: "Click Rate", value: analysis.performance.click_rate != null ? `${(analysis.performance.click_rate * 100).toFixed(1)}%` : null },
                    ].filter(s => s.value != null).map(s => (
                      <div key={s.label} className="rounded-lg bg-violet-50 border border-violet-100 px-2 py-2 text-center">
                        <div className="text-sm font-bold text-violet-800">{s.value}</div>
                        <div className="text-xs text-violet-500 mt-0.5">{s.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Summary */}
                {analysis.analysis.performance_summary && (
                  <p className="text-xs text-slate-700 leading-relaxed">{analysis.analysis.performance_summary}</p>
                )}

                {/* Diagnosis */}
                {(analysis.analysis.diagnosis?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1.5">Diagnosis</p>
                    <ul className="space-y-1">
                      {analysis.analysis.diagnosis!.map((d, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommended changes */}
                {analysis.analysis.recommended_changes && (
                  <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      <p className="text-xs font-semibold text-blue-700">Recommended Changes</p>
                    </div>
                    {Object.entries(analysis.analysis.recommended_changes)
                      .filter(([, v]) => !!v)
                      .map(([key, val]) => (
                        <div key={key}>
                          <p className="text-xs font-medium text-blue-600 capitalize">{key}</p>
                          <p className="text-xs text-slate-600 mt-0.5">{val}</p>
                        </div>
                      ))}
                  </div>
                )}

                {/* Revised post — actions derived entirely from server state */}
                {analysis.analysis.revised_post?.body && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Revised Post</p>

                    <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2.5 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {analysis.analysis.revised_post.body}
                    </div>
                    {Array.isArray(analysis.analysis.revised_post.hashtags) && analysis.analysis.revised_post.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {analysis.analysis.revised_post.hashtags.map((h, i) => (
                          <span key={i} className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5">{h}</span>
                        ))}
                      </div>
                    )}

                    {/* Stage for Approval — post is currently live on LinkedIn */}
                    {isPostPublished && (
                      <div className="pt-1 space-y-1.5">
                        <button
                          onClick={handleStage}
                          disabled={staging}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 transition-colors disabled:opacity-50"
                        >
                          {staging
                            ? <><Loader2 className="w-3 h-3 animate-spin" />Staging…</>
                            : <><Pencil className="w-3 h-3" />Stage for Approval</>}
                        </button>
                        <p className="text-xs text-slate-400 leading-snug">
                          Saves the revised draft and resets approval. Once re-approved, use Apply to Post to update LinkedIn.
                        </p>
                        {stageError && (
                          <p className="text-xs text-red-600 flex items-center gap-1"><X className="w-3 h-3" />{stageError}</p>
                        )}
                      </div>
                    )}

                    {/* Apply to Post — revision is staged (was published, now draft); gated on approval */}
                    {isRevisionPending && (
                      <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          <p className="text-xs font-medium text-slate-700">Revision staged — awaiting approval</p>
                        </div>
                        {campaignApproved ? (
                          <>
                            <button
                              onClick={handleApply}
                              disabled={applying}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 w-full justify-center"
                            >
                              {applying
                                ? <><Loader2 className="w-3 h-3 animate-spin" />Publishing to LinkedIn…</>
                                : <><Send className="w-3 h-3" />Apply to Post</>}
                            </button>
                            {applyError && (
                              <p className="text-xs text-red-600 flex items-center gap-1"><X className="w-3 h-3" />{applyError}</p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-amber-700 flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                            Waiting for approval owner to approve before publishing to LinkedIn.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* What to test next */}
                {(analysis.analysis.what_to_test_next?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-violet-700 uppercase tracking-wider mb-1.5">What to Test Next</p>
                    <ul className="space-y-1">
                      {analysis.analysis.what_to_test_next!.map((w, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <TrendingUp className="w-3 h-3 text-violet-500 mt-0.5 flex-shrink-0" />
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function SocialPostCard({
  asset, campaignId, isPostPublished, isRevisionPending, isPublishable, campaignApproved, onPublish,
  onOpenStats, onAnalyze, onApplyRevision, onApplyToLinkedIn, onSaveSuccess, analysis, analyzing,
}: {
  asset: LinkedInSocialAsset;
  campaignId: number;
  isPostPublished: boolean;
  isRevisionPending: boolean;
  isPublishable: boolean;
  campaignApproved: boolean;
  onPublish: () => Promise<void>;
  onOpenStats: (assetId: number) => void;
  onAnalyze: (assetId: number) => void;
  onApplyRevision: (assetId: number, body: string, hashtags: string[], cta: string) => Promise<void>;
  onApplyToLinkedIn: (assetId: number, body?: string) => Promise<void>;
  onSaveSuccess: () => void;
  analysis?: LinkedInSocialAnalysis;
  analyzing: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(asset.body);
  const [editCta, setEditCta] = useState(asset.cta ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const postNum = asset.post_number ?? asset.sequence_step ?? 1;
  const isDirty = editBody !== asset.body || editCta !== (asset.cta ?? "");
  const hasStats = asset.stats && Object.values(asset.stats).some((v) => v != null && v !== "");

  async function handlePublish() {
    setPublishing(true);
    setPublishError(null);
    try {
      await onPublish();
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Publish failed. Please try again.");
    } finally {
      setPublishing(false);
    }
  }

  async function handleSave() {
    if (!editBody.trim()) { setSaveError("Body cannot be empty."); return; }
    setSaving(true);
    setSaveError(null);
    try {
      await API.patch(`/campaigns/${campaignId}/assets/${asset.id}`, {
        body: editBody.trim(),
        ...(editCta.trim() ? { cta: editCta.trim() } : {}),
      });
      setEditing(false);
      onSaveSuccess();
    } catch (err) {
      setSaveError(getErrorMessage(err, "Save failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`rounded-xl border bg-white overflow-hidden shadow-sm border-l-4 transition-all ${isPostPublished ? "border-slate-200 border-l-emerald-400" : isPublishable ? "border-slate-200 border-l-blue-500" : "border-slate-200 border-l-blue-300"}`}>
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm ${isPostPublished ? "bg-emerald-500" : "bg-gradient-to-br from-blue-500 to-violet-500"}`}>
            {isPostPublished ? <CheckCircle2 className="w-4 h-4" /> : postNum}
          </div>
          <div className="flex-1 min-w-0">
            {asset.title || asset.hook
              ? <p className="text-sm font-semibold text-slate-800 truncate">{asset.title || asset.hook}</p>
              : <p className="text-sm font-medium text-slate-600 truncate">{asset.body.slice(0, 72)}…</p>}
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {isPostPublished && asset.published_at && (
                <span className="text-xs text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />Published {formatDateTime(asset.published_at)}
                </span>
              )}
              {!isPostPublished && campaignApproved && !isPublishable && (
                <span className="text-xs text-slate-400">Waiting for Step {(asset.sequence_step ?? 1) - 1} to publish first</span>
              )}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          {asset.include_image && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100">
              <ImageIcon className="w-3 h-3" /> Image
            </span>
          )}
          {asset.include_video && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-violet-50 text-violet-600 border border-violet-100">
              <Video className="w-3 h-3" /> Video
            </span>
          )}
          {statusBadge(isPostPublished ? "published" : (asset.external_status || asset.status || "draft"))}
          {isPostPublished && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-50 text-slate-400 border border-slate-200">
              <Lock className="w-3 h-3" /> Locked
            </span>
          )}
          {!isPostPublished && !editing && (
            <button
              onClick={() => { setEditing(true); setOpen(true); }}
              className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md px-2 py-1 transition-colors"
            >
              <Pencil className="w-3 h-3" /> Edit
            </button>
          )}
          {editing && (
            <button
              onClick={() => { setEditing(false); setSaveError(null); setEditBody(asset.body); setEditCta(asset.cta ?? ""); }}
              className="flex items-center gap-1 text-xs font-medium text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 rounded-md px-2 py-1 transition-colors"
            >
              <X className="w-3 h-3" /> Cancel
            </button>
          )}
          <button onClick={() => setOpen((v) => !v)} className="text-slate-400 hover:text-slate-600 transition-colors">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded body */}
      {open && (
        <div className="px-4 pb-5 space-y-3 border-t border-slate-100">
          {editing ? (
            <div className="pt-3 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Post Body</label>
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={8}
                  className="w-full text-sm text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 transition-all resize-none leading-relaxed"
                />
                <p className="text-xs text-slate-400 text-right">{editBody.length} characters</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  CTA <span className="text-slate-300 font-normal normal-case">(optional)</span>
                </label>
                <input
                  type="text"
                  value={editCta}
                  onChange={(e) => setEditCta(e.target.value)}
                  placeholder="Call-to-action text…"
                  className="w-full text-sm text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 transition-all"
                />
              </div>
              {saveError && (
                <p className="text-xs text-red-600 flex items-center gap-1.5">
                  <X className="w-3.5 h-3.5" />{saveError}
                </p>
              )}
              <div className="flex items-center gap-2 pt-1">
                {isDirty && (
                  <button
                    onClick={() => { setEditBody(asset.body); setEditCta(asset.cta ?? ""); setSaveError(null); }}
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
                    className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-40"
                  >
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Save
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="pt-3 space-y-3">
              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-lg p-4 border border-slate-100">
                {asset.body}
              </div>
              {asset.cta && (
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">CTA</div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                    {asset.cta}
                  </span>
                </div>
              )}

              {/* Performance stats */}
              {hasStats && asset.stats && (
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-2">Performance Stats</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(["impressions", "reactions", "comments", "reposts", "clicks", "followers_gained"] as const)
                      .filter((k) => asset.stats![k] != null)
                      .map((k) => (
                        <div key={k} className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-center">
                          <div className="text-lg font-bold text-slate-900">{asset.stats![k]}</div>
                          <div className="text-xs text-slate-400 capitalize">{k.replace(/_/g, " ")}</div>
                        </div>
                      ))}
                  </div>
                  {asset.stats.notes && (
                    <p className="text-xs text-slate-500 mt-2 italic">{asset.stats.notes}</p>
                  )}
                </div>
              )}

              {/* Post actions */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                <button
                  onClick={() => onOpenStats(asset.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  {hasStats ? "Update Stats" : "Add Stats"}
                </button>
                <AnalysisPanel
                  assetId={asset.id}
                  analyzing={analyzing}
                  analysis={analysis}
                  onAnalyze={onAnalyze}
                  isPostPublished={isPostPublished}
                  isRevisionPending={isRevisionPending}
                  campaignApproved={campaignApproved}
                  onStageRevision={onApplyRevision}
                  onApplyToLinkedIn={onApplyToLinkedIn}
                />
              </div>

              {/* Sequence-step publish button — hidden for revision-pending posts */}
              {campaignApproved && isPublishable && !isPostPublished && !isRevisionPending && (
                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={handlePublish}
                    disabled={publishing}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm shadow-blue-200"
                  >
                    {publishing
                      ? <><Loader2 className="w-4 h-4 animate-spin" />Publishing…</>
                      : <><Send className="w-4 h-4" />Publish Now</>}
                  </button>
                  {publishError && (
                    <p className="mt-2 text-xs text-red-600 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />{publishError}
                    </p>
                  )}
                </div>
              )}

              {/* Apply staged revision — post was published, revised, approved; ready to push update */}
              {isRevisionPending && (
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  {campaignApproved ? (
                    <>
                      <button
                        onClick={async () => {
                          setApplying(true);
                          setApplyError(null);
                          try { await onApplyToLinkedIn(asset.id); }
                          catch (err) { setApplyError(err instanceof Error ? err.message : "Failed to update LinkedIn post."); }
                          finally { setApplying(false); }
                        }}
                        disabled={applying}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-sm shadow-emerald-200"
                      >
                        {applying
                          ? <><Loader2 className="w-4 h-4 animate-spin" />Applying…</>
                          : <><Send className="w-4 h-4" />Apply Revision to LinkedIn</>}
                      </button>
                      <p className="text-xs text-slate-400 leading-snug">Revision approved — this will update your live LinkedIn post.</p>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      <p className="text-xs text-amber-700">Revision staged — awaiting approval before it can be applied to LinkedIn.</p>
                    </div>
                  )}
                  {applyError && (
                    <p className="text-xs text-red-600 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />{applyError}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Approval Bar ────────────────────────────────────────────────────────────

function getCurrentUserEmail(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return (payload.email as string) || null;
  } catch {
    return null;
  }
}

function ApprovalBar({
  campaignId,
  approvalOwner,
  onApproved,
}: {
  campaignId: number;
  approvalOwner?: string;
  onApproved: () => void;
}) {
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentEmail = getCurrentUserEmail();
  const isOwner = !approvalOwner || (!!currentEmail && approvalOwner.toLowerCase() === currentEmail.toLowerCase());

  async function handleApprove() {
    setApproving(true);
    setError(null);
    try {
      await API.post(`/campaigns/${campaignId}/approve-drafts`, { decision: "approved" });
      onApproved();
    } catch (err) {
      setError(getErrorMessage(err, "Approval failed. Please try again."));
    } finally {
      setApproving(false);
    }
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
      <div className="flex flex-wrap items-center gap-4 px-5 py-4">
        <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900">Approval Required</p>
          {isOwner ? (
            <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
              Review the posts above. Once you&apos;re happy, approve the campaign to unlock publishing.
            </p>
          ) : (
            <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
              Waiting for <span className="font-medium">{approvalOwner}</span> to approve this campaign before it can be published.
            </p>
          )}
        </div>
        {isOwner && (
          <Button
            onClick={handleApprove}
            disabled={approving}
            className="gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm shadow-amber-200 flex-shrink-0"
          >
            {approving
              ? <><Loader2 className="w-4 h-4 animate-spin" />Approving…</>
              : <><CheckCircle2 className="w-4 h-4" />Approve Campaign</>}
          </Button>
        )}
      </div>
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border-t border-red-100 px-5 py-3">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Workspace ───────────────────────────────────────────────────────────

interface Props {
  data: LinkedInSocialCampaignData;
  /** "generated" = just created; "history" = opened from campaign list */
  mode: "generated" | "history";
  onPublishSuccess: (data: unknown) => void;
  onOpenStats: (assetId: number) => void;
  onAnalyze: (assetId: number) => void;
  onDuplicate: () => void;
  analysis: Record<number, LinkedInSocialAnalysis>;
  analyzing: Set<number>;
}

export function LinkedInSocialWorkspace({
  data, mode, onPublishSuccess, onOpenStats, onAnalyze, onDuplicate, analysis, analyzing,
}: Props) {
  const [refreshing, setRefreshing] = useState(false);

  const campaign = data.status?.campaign ?? data.campaign;
  const assets = data.status?.assets ?? data.assets ?? [];
  const strategy = data.strategy;
  const campaignId = data.campaign_id ?? campaign.id;
  const orchestrationState = (campaign.orchestration_state as string) || "";

  // All states derived directly from server data — no local overrides
  const sortedAssets = [...assets].sort((a, b) => (a.sequence_step ?? 1) - (b.sequence_step ?? 1));
  const isAssetPublished = (a: LinkedInSocialAsset) => a.external_status === "published";
  // Revision pending = post was published (has external_id), then explicitly staged back to draft.
  // "failed" is a failed publish attempt — treat it as re-publishable, not as a staged revision.
  const isAssetRevisionPending = (a: LinkedInSocialAsset) => a.external_status === "draft" && !!a.external_id;
  const publishedCount = sortedAssets.filter(isAssetPublished).length;
  const allPostsPublished = sortedAssets.length > 0 && publishedCount === sortedAssets.length;
  const isPublished = orchestrationState === "linkedin_posts_published" || allPostsPublished;
  const isApproved = (campaign.approval_status as string) === "approved";

  async function handleRefresh() {
    setRefreshing(true);
    try { await new Promise<void>((resolve) => { onPublishSuccess(null); setTimeout(resolve, 800); }); }
    finally { setRefreshing(false); }
  }

  function handleSaveSuccess() { onPublishSuccess(null); }

  async function handleApplyToLinkedIn(assetId: number, body?: string) {
    const payload = body ? { body } : {};
    await API.patch(`/campaigns/${campaignId}/linkedin-social/assets/${assetId}`, payload);
    onPublishSuccess(null);
  }

  async function handleStageRevision(assetId: number, body: string, hashtags: string[], cta: string) {
    const bodyWithHashtags = hashtags.length ? `${body}\n\n${hashtags.join(" ")}` : body;
    await API.patch(`/campaigns/${campaignId}/linkedin-social/assets/${assetId}`, {
      body: bodyWithHashtags, ...(cta ? { cta } : {}), hashtags, approval_status: "pending",
    });
    onPublishSuccess(null);
  }

  async function handlePublishPost() {
    const { data: res } = await API.post(`/campaigns/${campaignId}/linkedin-social/publish`);
    onPublishSuccess(res);
  }

  return (
    <div className="space-y-5">
      {/* Mode context banner */}
      {mode === "generated" && !isPublished && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3">
          <Sparkles className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <p className="text-sm text-blue-700 font-medium">
            {isApproved
              ? "Campaign approved — open each post in sequence and click Publish Now to go live."
              : "Your campaign was generated. Review the drafts below, then approve and publish."}
          </p>
        </div>
      )}

      {/* Campaign header */}
      <div className="relative overflow-hidden rounded-xl bg-slate-950 border border-slate-800/60 px-5 py-5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_-10%_-10%,rgba(59,130,246,0.18)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_110%_110%,rgba(124,58,237,0.12)_0%,transparent_60%)]" />
        <div className="relative z-10">
          <div className="flex flex-wrap items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Newspaper className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-white truncate">{campaign.name || "LinkedIn Social Campaign"}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                LinkedIn Social · {assets.length} post{assets.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh campaign"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/10 border border-white/10 transition-colors disabled:opacity-40 flex-shrink-0"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 text-blue-300 text-xs font-semibold border border-blue-500/20 flex-shrink-0">
                <Sparkles className="w-3 h-3" /> AI Generated
              </span>
              {isPublished ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30 flex-shrink-0">
                  <CheckCircle2 className="w-3 h-3" /> All Published
                </span>
              ) : isApproved ? (
                <>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-semibold border border-emerald-500/20 flex-shrink-0">
                    <CheckCircle2 className="w-3 h-3" /> Approved
                  </span>
                  {publishedCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 text-blue-300 text-xs font-semibold border border-blue-500/20 flex-shrink-0">
                      {publishedCount}/{assets.length} Published
                    </span>
                  )}
                </>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 text-xs font-semibold border border-amber-500/20 flex-shrink-0">
                  <Send className="w-3 h-3" /> Pending Approval
                </span>
              )}
              {isPublished && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 flex-shrink-0">
                  <Lock className="w-3 h-3" /> Locked
                </span>
              )}
            </div>
          </div>

          {campaign.objective && (
            <div className="mt-4 px-4 py-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">Objective</p>
              <p className="text-sm text-slate-300">{campaign.objective as string}</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          {
            label: "Posts Generated",
            value: assets.length,
            color: "text-blue-600",
            border: "border-l-blue-500",
          },
          {
            label: "Published",
            value: publishedCount,
            color: publishedCount > 0 ? "text-emerald-600" : "text-slate-400",
            border: publishedCount > 0 ? "border-l-emerald-500" : "border-l-slate-300",
          },
          {
            label: "With Visuals",
            value: assets.filter((a) => a.include_image || a.include_video).length,
            color: "text-violet-600",
            border: "border-l-violet-500",
          },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border border-slate-200 bg-white shadow-sm px-4 py-3.5 border-l-4 ${s.border}`}>
            <div className="text-xs text-slate-500 font-medium mb-1.5 leading-snug">{s.label}</div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Two-column: strategy + posts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div>
          <SocialStrategyCard
            strategy={strategy}
            campaignTheme={campaign.campaign_theme as string | undefined}
          />
        </div>

        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-slate-700">
              {isPublished ? "Published Posts" : isApproved ? "Posts — Publish in Sequence" : "Draft Posts"}
            </h3>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
              {assets.length} posts
            </span>
            {isApproved && !isPublished && (
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium border border-blue-100">
                {publishedCount}/{assets.length} published
              </span>
            )}
            {isPublished && (
              <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium border border-emerald-100 flex items-center gap-1">
                <Lock className="w-3 h-3" /> All published — editing disabled
              </span>
            )}
          </div>
          {sortedAssets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center">
              <Newspaper className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No posts were generated</p>
            </div>
          ) : (
            sortedAssets.map((asset, idx) => {
              const isPostPublished = isAssetPublished(asset);
              const isRevisionPending = isAssetRevisionPending(asset);
              const isPublishable = sortedAssets.slice(0, idx).every(isAssetPublished);
              return (
                <SocialPostCard
                  key={asset.id}
                  asset={asset}
                  campaignId={campaignId}
                  isPostPublished={isPostPublished}
                  isRevisionPending={isRevisionPending}
                  isPublishable={isPublishable}
                  campaignApproved={isApproved}
                  onPublish={handlePublishPost}
                  onOpenStats={onOpenStats}
                  onAnalyze={onAnalyze}
                  onApplyRevision={handleStageRevision}
                  onApplyToLinkedIn={handleApplyToLinkedIn}
                  onSaveSuccess={handleSaveSuccess}
                  analysis={analysis[asset.id]}
                  analyzing={analyzing.has(asset.id)}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Bottom: approval → in-progress → complete */}
      {isPublished ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 overflow-hidden">
          <div className="flex flex-wrap items-center gap-4 px-5 py-4">
            <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-emerald-800">All Posts Published</p>
              <p className="text-xs text-emerald-600 mt-0.5">
                All {assets.length} posts are live on your LinkedIn account.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-300 flex-shrink-0">
                <Lock className="w-3 h-3" /> Content locked
              </span>
              <Button
                variant="outline"
                onClick={onDuplicate}
                className="gap-1.5 text-xs h-8 px-3 border-emerald-300 text-emerald-700 hover:bg-emerald-50 flex-shrink-0"
              >
                <Copy className="w-3.5 h-3.5" /> New campaign
              </Button>
            </div>
          </div>
          <div className="px-5 py-3 border-t border-emerald-200 bg-white/50">
            <p className="text-xs text-slate-600 leading-relaxed">
              Use per-post controls to track stats and analyze performance.
            </p>
          </div>
        </div>
      ) : isApproved ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 flex flex-wrap items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center flex-shrink-0">
            <Send className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-900">Publishing in Sequence</p>
            <p className="text-xs text-blue-700 mt-0.5">
              {publishedCount > 0
                ? `${publishedCount} of ${assets.length} posts published. Open the next post above and click "Publish Now".`
                : `Open Post 1 above and click "Publish Now" to begin. Each post unlocks after the previous one is published.`}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-300 flex-shrink-0">
            {publishedCount}/{assets.length} Published
          </span>
        </div>
      ) : (
        <ApprovalBar
          campaignId={campaignId}
          approvalOwner={campaign.approval_owner as string | undefined}
          onApproved={() => onPublishSuccess(null)}
        />
      )}
    </div>
  );
}
