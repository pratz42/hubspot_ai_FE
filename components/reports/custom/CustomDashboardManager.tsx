"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Plus, MoreHorizontal, Star, StarOff, Trash2, Edit2,
  Copy, Share2, LayoutDashboard, Check, X, Link, AlertTriangle,
  BarChart2, TrendingUp, Users, Megaphone,
} from "lucide-react";
import type { CustomDashboardItem, DashboardWidgetConfig } from "@/components/reports/types";
import { CustomDashboardView } from "@/components/reports/custom/CustomDashboardView";
import API from "@/lib/api";

// ── Template widget layouts ────────────────────────────────────────────────

const TEMPLATE_LAYOUTS: Record<string, DashboardWidgetConfig[]> = {
  "Executive Summary": [
    { widget_id: "overview_kpis",   type: "kpi",   title: "Key Metrics",     report_source: "overview" },
    { widget_id: "pipeline_funnel", type: "funnel", title: "Pipeline Health", report_source: "overview" },
    { widget_id: "revenue_trend",   type: "line",   title: "Revenue Trend",   report_source: "overview" },
  ],
  "Sales Performance": [
    { widget_id: "sales_kpis",    type: "kpi",    title: "Sales KPIs",     report_source: "sales" },
    { widget_id: "stage_funnel",  type: "funnel", title: "Stage Funnel",   report_source: "sales" },
    { widget_id: "win_loss",      type: "donut",  title: "Win / Loss",     report_source: "sales" },
    { widget_id: "deal_velocity", type: "line",   title: "Deal Velocity",  report_source: "sales" },
  ],
  "Lead Quality": [
    { widget_id: "leads_kpis",             type: "kpi",   title: "Lead KPIs",          report_source: "leads" },
    { widget_id: "score_distribution",     type: "bar",   title: "Score Distribution",  report_source: "leads" },
    { widget_id: "source_breakdown",       type: "donut", title: "Source Breakdown",    report_source: "leads" },
    { widget_id: "lifecycle_distribution", type: "donut", title: "Lifecycle Stages",    report_source: "leads" },
  ],
  "Campaign ROI": [
    { widget_id: "campaign_kpis",     type: "kpi",    title: "Campaign KPIs",    report_source: "campaigns" },
    { widget_id: "send_funnel",       type: "funnel", title: "Send Pipeline",    report_source: "campaigns" },
    { widget_id: "email_engagement",  type: "bar",    title: "Email Engagement", report_source: "campaigns" },
    { widget_id: "channel_breakdown", type: "donut",  title: "Channel Breakdown",report_source: "campaigns" },
  ],
};

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  if (h < 48) return "yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Recommended template starters ─────────────────────────────────────────

const TEMPLATES = [
  {
    name: "Executive Summary",
    description: "KPIs, pipeline funnel, revenue trend, top insights",
    icon: TrendingUp,
    color: "#f97316",
  },
  {
    name: "Sales Performance",
    description: "Stage funnel, deal velocity, win/loss, owner leaderboard",
    icon: BarChart2,
    color: "#60a5fa",
  },
  {
    name: "Lead Quality",
    description: "AI score distribution, source breakdown, top leads",
    icon: Users,
    color: "#34d399",
  },
  {
    name: "Campaign ROI",
    description: "Send funnel, engagement rates, top campaigns",
    icon: Megaphone,
    color: "#a78bfa",
  },
];

// ── Action Menu (per card) ─────────────────────────────────────────────────

interface ActionMenuProps {
  onRename: () => void;
  onDuplicate: () => void;
  onShare: () => void;
  onSetDefault: () => void;
  onDelete: () => void;
  isDefault: boolean;
}

function ActionMenu({ onRename, onDuplicate, onShare, onSetDefault, onDelete, isDefault }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const item = (label: string, icon: React.ReactNode, onClick: () => void, danger = false) => (
    <button
      onClick={() => { onClick(); setOpen(false); }}
      className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-colors text-left
        ${danger ? "text-red-400 hover:bg-red-500/10" : "text-slate-300 hover:bg-slate-700/60"}`}
    >
      <span className="w-3.5 h-3.5 flex-shrink-0">{icon}</span>
      {label}
    </button>
  );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors"
        aria-label="Dashboard actions"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-50 w-48 bg-slate-800 border border-slate-700/60 rounded-xl shadow-xl py-1 flex flex-col gap-0.5">
          {item("Rename", <Edit2 className="w-3.5 h-3.5" />, onRename)}
          {item("Duplicate", <Copy className="w-3.5 h-3.5" />, onDuplicate)}
          {item("Share", <Share2 className="w-3.5 h-3.5" />, onShare)}
          {item(
            isDefault ? "Remove as default" : "Set as default",
            <LayoutDashboard className="w-3.5 h-3.5" />,
            onSetDefault,
          )}
          <div className="border-t border-slate-700/40 my-0.5" />
          {item("Delete", <Trash2 className="w-3.5 h-3.5" />, onDelete, true)}
        </div>
      )}
    </div>
  );
}

// ── Share Panel ────────────────────────────────────────────────────────────

function SharePanel({ id, onClose }: { id: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/reports?section=custom&dashboard=${id}`
    : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access denied — silently ignore
    }
  };

  return (
    <div className="mt-3 p-3 bg-slate-900/70 border border-slate-700/40 rounded-lg flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">
          Share link
        </p>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
        <Link className="w-3 h-3 text-slate-500 flex-shrink-0" />
        <span className="text-[10px] text-slate-400 flex-1 truncate">{shareUrl}</span>
        <button
          onClick={copyLink}
          className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded transition-colors ${
            copied ? "text-emerald-400" : "text-orange-400 hover:text-orange-300"
          }`}
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <p className="text-[10px] text-slate-600">
        Anyone with this link and access to the CRM can view this dashboard.
      </p>
    </div>
  );
}

// ── Dashboard Card ─────────────────────────────────────────────────────────

interface CardProps {
  dashboard: CustomDashboardItem;
  isFavorite: boolean;
  isDefault: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onShare: () => void;
  onSetDefault: () => void;
  onDelete: () => void;
}

function DashboardCard({
  dashboard, isFavorite, isDefault,
  onOpen, onToggleFavorite, onRename, onDuplicate, onShare, onSetDefault, onDelete,
}: CardProps) {
  const [sharing, setSharing] = useState(false);

  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 flex flex-col gap-3 hover:border-slate-600/60 transition-colors group">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 bg-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <LayoutDashboard className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-200 truncate leading-snug">
              {dashboard.name}
            </p>
            {isDefault && (
              <span className="text-[9px] text-orange-400 font-semibold uppercase tracking-wide">
                Default
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onToggleFavorite}
            className="p-1.5 rounded-lg text-slate-600 hover:text-amber-400 transition-colors"
            aria-label={isFavorite ? "Remove from favourites" : "Add to favourites"}
          >
            {isFavorite
              ? <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              : <StarOff className="w-3.5 h-3.5" />}
          </button>
          <ActionMenu
            onRename={onRename}
            onDuplicate={onDuplicate}
            onShare={() => setSharing((v) => !v)}
            onSetDefault={onSetDefault}
            onDelete={onDelete}
            isDefault={isDefault}
          />
        </div>
      </div>

      {/* Description */}
      {dashboard.description ? (
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
          {dashboard.description}
        </p>
      ) : (
        <p className="text-xs text-slate-700 italic">No description</p>
      )}

      {/* Share panel */}
      {sharing && (
        <SharePanel id={dashboard.id} onClose={() => setSharing(false)} />
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-700/30">
        <span className="text-[10px] text-slate-600">
          Updated {formatDate(dashboard.updated_at)}
        </span>
        <button
          onClick={onOpen}
          className="text-[10px] text-orange-400 hover:text-orange-300 font-semibold transition-colors"
        >
          Open →
        </button>
      </div>
    </div>
  );
}

// ── Create Dashboard Form ──────────────────────────────────────────────────

function CreateForm({ onSubmit, onCancel, busy }: {
  onSubmit: (name: string, description: string, layout?: DashboardWidgetConfig[]) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  return (
    <div className="bg-slate-800/60 border border-orange-500/30 rounded-xl p-4 flex flex-col gap-3">
      <p className="text-sm font-semibold text-slate-200">New Dashboard</p>
      <input
        ref={nameRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && name.trim()) onSubmit(name.trim(), desc.trim());
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Dashboard name"
        className="bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-orange-500/50"
      />
      <input
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Escape") onCancel(); }}
        placeholder="Description (optional)"
        className="bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-orange-500/50"
      />
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => { if (name.trim()) onSubmit(name.trim(), desc.trim()); }}
          disabled={!name.trim() || busy}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
        >
          {busy ? "Creating…" : "Create"}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Rename Inline ──────────────────────────────────────────────────────────

function RenameCard({ dashboard, onSave, onCancel, busy }: {
  dashboard: CustomDashboardItem;
  onSave: (name: string) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [name, setName] = useState(dashboard.name);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.select(); }, []);

  return (
    <div className="bg-slate-800/40 border border-orange-500/30 rounded-xl p-4 flex flex-col gap-3">
      <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Rename dashboard</p>
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && name.trim()) onSave(name.trim());
          if (e.key === "Escape") onCancel();
        }}
        className="bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-orange-500/50"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={() => { if (name.trim()) onSave(name.trim()); }}
          disabled={!name.trim() || name === dashboard.name || busy}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
        >
          <Check className="w-3 h-3" />
          {busy ? "Saving…" : "Save"}
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Delete Confirm Card ────────────────────────────────────────────────────

function DeleteConfirmCard({ dashboard, onConfirm, onCancel, busy }: {
  dashboard: CustomDashboardItem;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  return (
    <div className="bg-slate-800/40 border border-red-500/30 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-slate-200">Delete "{dashboard.name}"?</p>
          <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone.</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onConfirm}
          disabled={busy}
          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          {busy ? "Deleting…" : "Delete"}
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Empty / Recommended state ──────────────────────────────────────────────

function EmptyState({ onCreateFromTemplate, busy }: {
  onCreateFromTemplate: (name: string, description: string, layout: DashboardWidgetConfig[]) => void;
  busy: boolean;
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="w-16 h-16 bg-slate-800/60 rounded-2xl flex items-center justify-center">
          <BarChart2 className="w-8 h-8 text-slate-600" />
        </div>
        <div className="text-center max-w-sm">
          <h3 className="text-sm font-semibold text-slate-300 mb-1">No custom dashboards yet</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Build a dashboard by choosing widgets from any report section.
            Start with a template or build from scratch.
          </p>
        </div>
      </div>

      <div>
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-3">
          Start with a template
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {TEMPLATES.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.name}
                onClick={() => onCreateFromTemplate(t.name, t.description, TEMPLATE_LAYOUTS[t.name] ?? [])}
                disabled={busy}
                className="flex flex-col items-start gap-2.5 p-4 bg-slate-800/40 border border-slate-700/40 rounded-xl text-left hover:border-slate-600/60 disabled:opacity-50 transition-colors group"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${t.color}18` }}
                >
                  <Icon className="w-4 h-4" style={{ color: t.color }} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
                    {t.name}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{t.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

interface Props {
  initialDashboards: CustomDashboardItem[];
  refetch: () => void;
  loading: boolean;
}

type PendingAction =
  | { type: "rename"; id: string }
  | { type: "delete"; id: string }
  | null;

export function CustomDashboardManager({ initialDashboards, refetch, loading }: Props) {
  const [dashboards, setDashboards] = useState<CustomDashboardItem[]>(initialDashboards);
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [defaultId, setDefaultId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [openDashboardId, setOpenDashboardId] = useState<string | null>(null);

  // Keep local list in sync when parent re-fetches
  useEffect(() => { setDashboards(initialDashboards); }, [initialDashboards]);

  const clearError = useCallback(() => setMutationError(null), []);

  // ── Layout change (from inside the dashboard view) ──────────────────────

  const handleLayoutSaved = useCallback((id: string, layout: DashboardWidgetConfig[]) => {
    setDashboards((prev) =>
      prev.map((d) => d.id === id ? { ...d, layout, updated_at: new Date().toISOString() } : d),
    );
  }, []);

  // ── API helpers ─────────────────────────────────────────────────────────

  const handleCreate = useCallback(async (name: string, description: string, layout: DashboardWidgetConfig[] = []) => {
    setBusy(true);
    clearError();
    try {
      const res = await API.post<CustomDashboardItem>("/reports/dashboards", { name, description, layout });
      setDashboards((prev) => [res.data, ...prev]);
      setCreating(false);
      // Auto-open the new dashboard so the user can see it immediately
      setOpenDashboardId(res.data.id);
    } catch {
      setMutationError("Failed to create dashboard. Please try again.");
    } finally {
      setBusy(false);
    }
  }, [clearError]);

  const handleRename = useCallback(async (id: string, name: string) => {
    setBusy(true);
    clearError();
    try {
      await API.patch(`/reports/dashboards/${id}`, { name });
      setDashboards((prev) =>
        prev.map((d) => (d.id === id ? { ...d, name, updated_at: new Date().toISOString() } : d)),
      );
      setPending(null);
    } catch {
      setMutationError("Failed to rename. Please try again.");
    } finally {
      setBusy(false);
    }
  }, [clearError]);

  const handleDuplicate = useCallback(async (id: string) => {
    const source = dashboards.find((d) => d.id === id);
    if (!source) return;
    setBusy(true);
    clearError();
    try {
      const res = await API.post<CustomDashboardItem>("/reports/dashboards", {
        name: `${source.name} (copy)`,
        description: source.description,
        layout: source.layout ?? [],
        filters: source.filters,
      });
      setDashboards((prev) => [res.data, ...prev]);
    } catch {
      setMutationError("Failed to duplicate dashboard.");
    } finally {
      setBusy(false);
    }
  }, [dashboards, clearError]);

  const handleDelete = useCallback(async (id: string) => {
    setBusy(true);
    clearError();
    try {
      await API.delete(`/reports/dashboards/${id}`);
      setDashboards((prev) => prev.filter((d) => d.id !== id));
      setPending(null);
      if (defaultId === id) setDefaultId(null);
    } catch {
      setMutationError("Failed to delete dashboard.");
    } finally {
      setBusy(false);
    }
  }, [defaultId, clearError]);

  const toggleFavorite = useCallback((id: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleDefault = useCallback((id: string) => {
    setDefaultId((prev) => (prev === id ? null : id));
  }, []);

  // ── Sorted display order: favorites first, then by updated_at ────────────
  const sorted = [...dashboards].sort((a, b) => {
    const fa = favoriteIds.has(a.id);
    const fb = favoriteIds.has(b.id);
    if (fa !== fb) return fa ? -1 : 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!loading && dashboards.length === 0 && !creating) {
    return (
      <div className="flex flex-col gap-4">
        {mutationError && <ErrorBanner message={mutationError} onDismiss={clearError} />}
        <EmptyState
          onCreateFromTemplate={handleCreate}
          busy={busy}
        />
      </div>
    );
  }

  // ── Dashboard detail view ────────────────────────────────────────────────
  const openDashboard = openDashboardId
    ? dashboards.find((d) => d.id === openDashboardId) ?? null
    : null;

  if (openDashboard) {
    return (
      <CustomDashboardView
        dashboard={openDashboard}
        onBack={() => setOpenDashboardId(null)}
        onLayoutSaved={handleLayoutSaved}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-200">My Dashboards</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {dashboards.length} saved dashboard{dashboards.length !== 1 ? "s" : ""}
            {favoriteIds.size > 0 && ` · ${favoriteIds.size} favourited`}
          </p>
        </div>
        <button
          onClick={() => { setCreating(true); setPending(null); }}
          disabled={creating}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Dashboard
        </button>
      </div>

      {/* Mutation error banner */}
      {mutationError && <ErrorBanner message={mutationError} onDismiss={clearError} />}

      {/* Create form */}
      {creating && (
        <CreateForm
          onSubmit={handleCreate}
          onCancel={() => setCreating(false)}
          busy={busy}
        />
      )}

      {/* Dashboard grid */}
      {sorted.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((dashboard) => {
            if (pending?.type === "rename" && pending.id === dashboard.id) {
              return (
                <RenameCard
                  key={dashboard.id}
                  dashboard={dashboard}
                  onSave={(name) => handleRename(dashboard.id, name)}
                  onCancel={() => setPending(null)}
                  busy={busy}
                />
              );
            }
            if (pending?.type === "delete" && pending.id === dashboard.id) {
              return (
                <DeleteConfirmCard
                  key={dashboard.id}
                  dashboard={dashboard}
                  onConfirm={() => handleDelete(dashboard.id)}
                  onCancel={() => setPending(null)}
                  busy={busy}
                />
              );
            }
            return (
              <DashboardCard
                key={dashboard.id}
                dashboard={dashboard}
                isFavorite={favoriteIds.has(dashboard.id)}
                isDefault={defaultId === dashboard.id}
                onOpen={() => setOpenDashboardId(dashboard.id)}
                onToggleFavorite={() => toggleFavorite(dashboard.id)}
                onRename={() => setPending({ type: "rename", id: dashboard.id })}
                onDuplicate={() => handleDuplicate(dashboard.id)}
                onShare={() => {}}
                onSetDefault={() => toggleDefault(dashboard.id)}
                onDelete={() => setPending({ type: "delete", id: dashboard.id })}
              />
            );
          })}
        </div>
      )}

      {/* Recommended templates (shown when < 2 dashboards exist) */}
      {dashboards.length < 2 && !creating && (
        <div className="mt-2">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-3">
            Recommended templates
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {TEMPLATES.map((t) => {
              const Icon = t.icon;
              const alreadyExists = dashboards.some((d) => d.name === t.name);
              return (
                <button
                  key={t.name}
                  onClick={() => !alreadyExists && handleCreate(t.name, t.description, TEMPLATE_LAYOUTS[t.name] ?? [])}
                  disabled={alreadyExists || busy}
                  className="flex flex-col items-start gap-2.5 p-4 bg-slate-800/30 border border-slate-700/30 rounded-xl text-left hover:border-slate-600/60 disabled:opacity-40 transition-colors group"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: `${t.color}18` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: t.color }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">
                      {alreadyExists ? `${t.name} ✓` : t.name}
                    </p>
                    <p className="text-[10px] text-slate-600 mt-0.5 leading-relaxed">{t.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Error Banner ───────────────────────────────────────────────────────────

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl">
      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
      <span className="text-xs text-red-300 flex-1">{message}</span>
      <button onClick={onDismiss} className="text-red-500 hover:text-red-300">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
