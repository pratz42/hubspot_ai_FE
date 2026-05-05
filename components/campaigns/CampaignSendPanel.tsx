"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Send, Pause, Play, XCircle, RefreshCw, Loader2, Mail, Link2,
  CheckCircle2, AlertTriangle, Clock, ExternalLink, ChevronDown,
  ChevronUp, Users, Ban, Activity, Lock, ChevronRight, Trash2, Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  useCampaignSendStream,
  type CampaignSendStatus,
  type StepStatus,
} from "@/hooks/useCampaignSendStream";
import { useEligibilitySummary } from "@/hooks/useEligibilitySummary";
import { useLinkedInAttempts, type LinkedInAttemptRow, type SendAttempt } from "@/hooks/useLinkedInAttempts";
import { useEmailProviderStatus, type EmailProviderConnection } from "@/hooks/useEmailProviderStatus";
import API from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CampaignSendPanelProps {
  campaignId: number;
  campaignType: "email" | "linkedin";
  approvalStatus: string | null | undefined;
  currentUserEmail?: string;
  approvalOwner?: string;
  onSendStarted?: () => void;
  onContentLockedChange?: (locked: boolean) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTIVE_SEND_STATUSES = new Set<CampaignSendStatus>(["queued", "sending", "paused"]);
const TERMINAL_SEND_STATUSES = new Set<CampaignSendStatus>(["sent", "partial_failed", "cancelled", "failed"]);
export const CONTENT_LOCKED_STATUSES = new Set<CampaignSendStatus>([
  "queued", "sending", "paused", "sent", "partial_failed",
]);
const STEP_TERMINAL = new Set(["succeeded", "partial", "failed", "cancelled", "dead_lettered"]);
const STEP_ACTIVE = new Set(["queued", "processing", "paused"]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stepDispatchLabel(status: string): string {
  const map: Record<string, string> = {
    not_started: "Not started",
    queued: "Queued",
    processing: "Sending",
    paused: "Paused",
    succeeded: "Complete",
    partial: "Partial",
    failed: "Failed",
    cancelled: "Cancelled",
    dead_lettered: "Failed",
  };
  return map[status] ?? status;
}

function stepDispatchColors(status: string): string {
  if (status === "succeeded") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "processing" || status === "queued") return "bg-blue-100 text-blue-700 border-blue-200";
  if (status === "paused" || status === "partial") return "bg-amber-100 text-amber-700 border-amber-200";
  if (status === "failed" || status === "dead_lettered" || status === "cancelled") return "bg-red-100 text-red-700 border-red-200";
  return "bg-slate-100 text-slate-500 border-slate-200";
}

function stepGradient(stepIdx: number): string {
  const gradients = [
    "from-orange-500 to-amber-400",
    "from-violet-500 to-purple-400",
    "from-blue-500 to-cyan-400",
    "from-emerald-500 to-teal-400",
    "from-rose-500 to-pink-400",
    "from-indigo-500 to-blue-400",
  ];
  return gradients[stepIdx % gradients.length];
}

function attemptStatusLabel(s: string): string {
  const labels: Record<string, string> = {
    marked_sent: "Sent", sent: "Sent", draft_created: "Draft",
    delivered: "Delivered", opened: "Opened", clicked: "Clicked",
    failed: "Failed", skipped: "Skipped", suppressed: "Suppressed", processing: "In Progress",
  };
  return labels[s] ?? s;
}

function attemptStatusColors(s: string): string {
  if (s === "marked_sent" || s === "sent" || s === "delivered") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (s === "opened" || s === "clicked") return "bg-blue-100 text-blue-700 border-blue-200";
  if (s === "draft_created") return "bg-violet-100 text-violet-700 border-violet-200";
  if (s === "failed") return "bg-red-100 text-red-700 border-red-200";
  if (s === "processing") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-500 border-slate-200";
}

// ─── ConnectOutlookButton ─────────────────────────────────────────────────────

function ConnectOutlookButton() {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setConnecting(true);
    setError(null);
    try {
      const returnUrl = encodeURIComponent(window.location.href);
      const res = await API.get<{ redirect_url: string }>(
        `/integrations/email/start?provider=microsoft&return_url=${returnUrl}`,
      );
      window.location.href = res.data.redirect_url;
    } catch {
      setError("Could not start connection. Try again.");
      setConnecting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-red-500 text-xs">{error}</span>}
      <button
        onClick={handleConnect}
        disabled={connecting}
        className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50"
      >
        {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
        Connect Outlook
      </button>
    </div>
  );
}

// ─── ProviderModeBar ──────────────────────────────────────────────────────────
// Compact top strip: shows connected email + mode toggle.

function ProviderModeBar({
  providers,
  allConnections,
  selectedId,
  onSelect,
  sendMode,
  onSendModeChange,
  disabled,
  onDisconnect,
  onReconnect,
}: {
  providers: EmailProviderConnection[];
  allConnections: EmailProviderConnection[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  sendMode: "drafts" | "send_direct";
  onSendModeChange: (m: "drafts" | "send_direct") => void;
  disabled: boolean;
  onDisconnect: (id: string) => Promise<void>;
  onReconnect: () => void;
}) {
  const [providerOpen, setProviderOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const active = providers.find((p) => p.id === selectedId) ?? providers[0];
  const needsReconnect = allConnections.filter((c) => c.status === "needs_reconnect");

  async function handleDisconnect(id: string) {
    setDisconnecting(id);
    try {
      await onDisconnect(id);
    } finally {
      setDisconnecting(null);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2.5">
      {/* Provider row */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider w-16 flex-shrink-0">Send from</span>
        {providers.length === 0 ? (
          <div className="flex items-center gap-2 flex-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs text-amber-600 font-medium">No email provider connected</span>
            <ConnectOutlookButton />
          </div>
        ) : (
          <div className="relative flex-1 flex items-center gap-2">
            {/* Account selector */}
            <button
              onClick={() => setProviderOpen((o) => !o)}
              disabled={disabled || providers.length <= 1}
              className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md px-2.5 py-1.5 hover:border-slate-300 transition-colors disabled:opacity-60"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              <span className="truncate max-w-[180px]">{active?.account_email ?? "Select account"}</span>
              <span className="text-slate-400 capitalize">({active?.provider})</span>
              {providers.length > 1 && <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0" />}
            </button>

            {/* Disconnect button for selected account */}
            {active && (
              <button
                onClick={() => handleDisconnect(active.id)}
                disabled={disabled || disconnecting === active.id}
                title="Disconnect this account"
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors disabled:opacity-40"
              >
                {disconnecting === active.id
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Unlink className="w-3 h-3" />}
                <span>Disconnect</span>
              </button>
            )}

            {/* Multi-account dropdown */}
            {providerOpen && providers.length > 1 && (
              <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[240px] overflow-hidden">
                {providers.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center gap-2.5 px-3 py-2.5 text-xs hover:bg-slate-50 transition-colors ${p.id === selectedId ? "bg-orange-50" : ""}`}
                  >
                    <button
                      className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                      onClick={() => { onSelect(p.id); setProviderOpen(false); }}
                    >
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 truncate">{p.account_email}</p>
                        <p className="text-slate-400 capitalize">{p.provider}</p>
                      </div>
                      {p.id === (selectedId ?? providers[0]?.id) && <CheckCircle2 className="w-3 h-3 text-orange-500 flex-shrink-0" />}
                    </button>
                    <button
                      onClick={() => { handleDisconnect(p.id); setProviderOpen(false); }}
                      disabled={disconnecting === p.id}
                      title="Disconnect"
                      className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      {disconnecting === p.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Trash2 className="w-3 h-3" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Needs-reconnect warning rows */}
      {needsReconnect.map((conn) => (
        <div key={conn.id} className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-2.5 py-1.5">
          <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
          <span className="text-xs text-amber-700 flex-1 min-w-0 truncate">
            <span className="font-semibold">{conn.account_email}</span> lost access — needs reconnection
          </span>
          <button
            onClick={onReconnect}
            className="text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors flex-shrink-0 underline"
          >
            Reconnect
          </button>
          <button
            onClick={() => handleDisconnect(conn.id)}
            disabled={disconnecting === conn.id}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors flex-shrink-0 ml-1"
          >
            {disconnecting === conn.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          </button>
        </div>
      ))}

      {/* Mode row */}
      <div className="flex items-center gap-2.5">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider w-16 flex-shrink-0">Mode</span>
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md p-0.5">
          {(["drafts", "send_direct"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onSendModeChange(mode)}
              disabled={disabled}
              className={`px-3 py-1 rounded text-xs font-medium transition-all disabled:opacity-50
                ${sendMode === mode
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700"}`}
            >
              {mode === "drafts" ? "Create Drafts" : "Send Now"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── StepProgressBar ─────────────────────────────────────────────────────────

function StepProgressBar({
  sendMode,
  sentCount,
  draftedCount,
  failedCount,
  eligibleCount,
}: {
  sendMode: "drafts" | "send_direct";
  sentCount: number;
  draftedCount: number;
  failedCount: number;
  eligibleCount: number;
}) {

  const total = eligibleCount || 1;
  const done = sendMode === "drafts" ? draftedCount : sentCount;
  const pct = Math.min(100, Math.round(((done + failedCount) / total) * 100));

  return (
    <div className="mt-2.5 space-y-1.5">
      <Progress value={pct} className="h-1.5" />
      <div className="flex items-center gap-3 text-xs">
        {sendMode === "drafts" ? (
          <span className="flex items-center gap-1 text-violet-600 font-medium">
            <Mail className="w-3 h-3" />
            {draftedCount}/{total} drafted
          </span>
        ) : (
          <span className="flex items-center gap-1 text-emerald-600 font-medium">
            <CheckCircle2 className="w-3 h-3" />
            {sentCount}/{total} sent
          </span>
        )}
        {failedCount > 0 && (
          <span className="flex items-center gap-1 text-red-500 font-medium">
            <XCircle className="w-3 h-3" />
            {failedCount} failed
          </span>
        )}
        <span className="ml-auto text-slate-400 tabular-nums font-semibold">{pct}%</span>
      </div>
    </div>
  );
}

// ─── StepCard ─────────────────────────────────────────────────────────────────

function StepCard({
  step,
  stepIdx,
  totalSteps,
  sendMode,
  isApproved,
  hasProvider,
  isLocked,
  isStreamingThisStep,
  liveProgress,
  actionLoading,
  onSend,
  onPause,
  onResume,
  onCancel,
  onRetry,
  campaignId,
}: {
  step: StepStatus;
  stepIdx: number;
  totalSteps: number;
  sendMode: "drafts" | "send_direct";
  isApproved: boolean;
  hasProvider: boolean;
  isLocked: boolean;
  isStreamingThisStep: boolean;
  liveProgress: { sentCount: number; draftedCount: number; failedCount: number; eligibleCount: number };
  actionLoading: string | null;
  onSend: (s: number) => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onRetry: () => void;
  campaignId: number;
}) {
  const [attemptsOpen, setAttemptsOpen] = useState(false);
  const [attempts, setAttempts] = useState<SendAttempt[]>([]);
  const [nameMap, setNameMap] = useState<Map<number, string>>(new Map());
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  const status = step.dispatchStatus;
  const isActive = STEP_ACTIVE.has(status);
  const isTerminal = STEP_TERMINAL.has(status);
  const isNotStarted = status === "not_started";
  const isPaused = status === "paused";
  const isSending = status === "processing";
  const isQueued = status === "queued";
  const busy = !!actionLoading;
  // Only show live progress when SSE is actively streaming this step's job.
  // This prevents the previous step's stale counts bleeding into the next step's card.
  const isThisStepLive = isStreamingThisStep &&
    step.dispatchJobId != null &&
    liveProgress.eligibleCount > 0;

  // Live counts override stored counts only when we're actually streaming this step's job
  const sentCount = isThisStepLive ? liveProgress.sentCount : step.sentCount;
  const draftedCount = isThisStepLive ? liveProgress.draftedCount : step.draftedCount;
  const failedCount = isThisStepLive ? liveProgress.failedCount : step.failedCount;
  const eligibleCount = isThisStepLive && liveProgress.eligibleCount > 0
    ? liveProgress.eligibleCount
    : step.eligibleCount || step.recipientCount;

  async function toggleAttempts() {
    if (attemptsOpen) { setAttemptsOpen(false); return; }
    if (attempts.length > 0) { setAttemptsOpen(true); return; }
    setLoadingAttempts(true);
    try {
      const [attRes, audRes] = await Promise.all([
        API.get<SendAttempt[]>(`/campaigns/${campaignId}/send/attempts`),
        API.get<{ contact_id: number | null; display_name_snapshot: string }[]>(
          `/campaigns/${campaignId}/send/audience`,
        ),
      ]);
      const map = new Map<number, string>();
      for (const s of audRes.data) {
        if (s.contact_id != null) map.set(s.contact_id, s.display_name_snapshot);
      }
      setNameMap(map);
      // Filter attempts to this step's dispatch job
      const filtered = step.dispatchJobId
        ? attRes.data.filter((a) => a.dispatch_job_id === step.dispatchJobId)
        : attRes.data;
      setAttempts(filtered);
      setAttemptsOpen(true);
    } finally {
      setLoadingAttempts(false);
    }
  }

  return (
    <div className={`rounded-xl border transition-all overflow-hidden
      ${isLocked
        ? "border-slate-100 bg-slate-50/60 opacity-60"
        : isActive
        ? "border-orange-300 bg-orange-50/30 shadow-sm shadow-orange-100"
        : isTerminal
        ? "border-slate-200 bg-white"
        : "border-slate-200 bg-white hover:border-slate-300"}`}
    >
      {/* Step header */}
      <div className="flex items-start gap-3.5 px-4 py-3.5">
        {/* Step number badge */}
        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${stepGradient(stepIdx)} flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm`}>
          <span className="text-white text-xs font-bold">{step.step}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-800">
              Step {step.step} of {totalSteps}
            </span>
          </div>

          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Users className="w-3 h-3" />
              {step.recipientCount} recipient{step.recipientCount !== 1 ? "s" : ""}
            </span>
            {/* Completion summary for terminal steps */}
            {isTerminal && (
              <span className="text-xs text-slate-500">
                {sendMode === "drafts"
                  ? `${draftedCount}/${eligibleCount} drafted`
                  : `${sentCount}/${eligibleCount} sent`}
                {failedCount > 0 && ` · ${failedCount} failed`}
              </span>
            )}
          </div>

          {/* Live progress bar — shown while actively streaming this step */}
          {(isActive || isThisStepLive) && (
            <StepProgressBar
              sendMode={sendMode}
              sentCount={sentCount}
              draftedCount={draftedCount}
              failedCount={failedCount}
              eligibleCount={eligibleCount}
            />
          )}
        </div>

        {/* Right side: status + actions */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {/* Status badge */}
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${stepDispatchColors(status)}`}>
            {(status === "processing" || status === "queued") && (
              isStreamingThisStep
                ? <Activity className="w-3 h-3 animate-pulse" />
                : <Loader2 className="w-3 h-3 animate-spin" />
            )}
            {status === "succeeded" && <CheckCircle2 className="w-3 h-3" />}
            {status === "paused" && <Clock className="w-3 h-3" />}
            {(status === "failed" || status === "dead_lettered" || status === "cancelled") && <XCircle className="w-3 h-3" />}
            {status === "partial" && <AlertTriangle className="w-3 h-3" />}
            {stepDispatchLabel(status)}
          </span>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            {isNotStarted && isApproved && (
              isLocked ? (
                <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                  <Lock className="w-3 h-3" />
                  Complete Step {step.step - 1} first
                </span>
              ) : (
                <Button
                  size="sm"
                  onClick={() => onSend(step.step)}
                  disabled={busy || !hasProvider}
                  className="h-7 px-3 gap-1.5 text-xs bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
                >
                  {actionLoading === `send-${step.step}`
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : sendMode === "drafts" ? <Mail className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                  {sendMode === "drafts" ? "Create Drafts" : "Send"}
                </Button>
              )
            )}

            {isSending && (
              <Button
                variant="outline"
                size="sm"
                onClick={onPause}
                disabled={busy}
                className="h-7 px-2.5 gap-1 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                {actionLoading === "pause" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Pause className="w-3 h-3" />}
                Pause
              </Button>
            )}

            {isPaused && (
              <Button
                size="sm"
                onClick={onResume}
                disabled={busy}
                className="h-7 px-2.5 gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white"
              >
                {actionLoading === "resume" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                Resume
              </Button>
            )}

            {(isSending || isPaused || isQueued) && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                disabled={busy}
                className="h-7 w-7 p-0 border-red-200 text-red-500 hover:bg-red-50"
                title="Cancel"
              >
                {actionLoading === "cancel" ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
              </Button>
            )}

            {isTerminal && failedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                disabled={busy}
                className="h-7 px-2.5 gap-1 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                {actionLoading === "retry" ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Retry {failedCount}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Attempts toggle — only for terminal steps */}
      {isTerminal && (
        <div className="border-t border-slate-100">
          <button
            onClick={toggleAttempts}
            className="w-full flex items-center justify-between px-4 py-2 text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              {loadingAttempts
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : attemptsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Recipient details
            </span>
            <ChevronRight className="w-3 h-3" />
          </button>

          {attemptsOpen && attempts.length > 0 && (
            <div className="border-t border-slate-100 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-2 text-left font-semibold text-slate-500">Contact</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-500">Status</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-500">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attempts.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-700">
                        {a.contact_id != null ? (nameMap.get(a.contact_id) ?? `Contact ${a.contact_id}`) : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${attemptStatusColors(a.status)}`}>
                          {attemptStatusLabel(a.status)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-red-500 max-w-[200px] truncate">
                        {a.last_error ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── LinkedIn section (unchanged from before) ─────────────────────────────────

function LinkedInContactCard({
  row, campaignId, disabled, patchOptimistic, onRefresh,
}: {
  row: LinkedInAttemptRow; campaignId: number; disabled: boolean;
  patchOptimistic: (contactId: number, status: string) => void; onRefresh: () => void;
}) {
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [markingDone, setMarkingDone] = useState(false);
  const [draftBody, setDraftBody] = useState<string | null>(null);
  const [openLink, setOpenLink] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  const status = row.attempt?.status ?? (row.eligibilityStatus !== "eligible" ? row.eligibilityStatus : "pending");
  const isDone = status === "marked_sent" || status === "sent";
  const isExcluded = row.eligibilityStatus !== "eligible";

  async function handleCompose() {
    if (expanded) { setExpanded(false); return; }
    setLoadingDraft(true);
    setCardError(null);
    try {
      const res = await API.get<{ draft_body: string; open_link: string | null }>(
        `/campaigns/${campaignId}/linkedin/draft/${row.contactId}`,
      );
      setDraftBody(res.data.draft_body);
      setOpenLink(res.data.open_link ?? null);
      setExpanded(true);
    } catch {
      setCardError("Failed to load draft");
    } finally {
      setLoadingDraft(false);
    }
  }

  async function handleMarkSent() {
    setMarkingDone(true);
    setCardError(null);
    patchOptimistic(row.contactId, "marked_sent");
    try {
      await API.post(`/campaigns/${campaignId}/recipients/${row.contactId}/mark-sent`);
      setExpanded(false);
      onRefresh();
    } catch {
      setCardError("Failed to mark sent");
      patchOptimistic(row.contactId, row.attempt?.status ?? "processing");
    } finally {
      setMarkingDone(false);
    }
  }

  return (
    <div className={`rounded-lg border transition-all
      ${isDone ? "border-emerald-200 bg-emerald-50/40"
        : isExcluded ? "border-slate-100 bg-slate-50 opacity-60"
        : "border-slate-200 bg-white"}`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
          {row.displayName.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{row.displayName}</p>
          {(row.titleSnapshot || row.companySnapshot) && (
            <p className="text-xs text-slate-400 truncate">
              {[row.titleSnapshot, row.companySnapshot].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${attemptStatusColors(status)}`}>
          {attemptStatusLabel(status)}
        </span>
        {!isExcluded && !isDone && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCompose}
            disabled={disabled || loadingDraft}
            className="flex-shrink-0 gap-1.5 text-xs h-7 px-2.5"
          >
            {loadingDraft ? <Loader2 className="w-3 h-3 animate-spin" />
              : expanded ? <ChevronUp className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
            {expanded ? "Close" : "Compose"}
          </Button>
        )}
      </div>
      {expanded && (
        <div className="border-t border-slate-100 px-4 py-3 space-y-3">
          {cardError && <p className="text-xs text-red-600">{cardError}</p>}
          {draftBody && (
            <div className="rounded-md bg-slate-50 border border-slate-200 p-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Message</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{draftBody}</p>
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            {openLink && (
              <a href={openLink} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
                <ExternalLink className="w-3 h-3" /> Open LinkedIn Profile
              </a>
            )}
            <Button size="sm" onClick={handleMarkSent} disabled={markingDone}
              className="h-7 px-3 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
              {markingDone ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Mark as Sent
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Orchestrator ────────────────────────────────────────────────────────

export function CampaignSendPanel({
  campaignId,
  campaignType,
  approvalStatus,
  approvalOwner,
  onSendStarted,
  onContentLockedChange,
}: CampaignSendPanelProps) {
  const isEmail = campaignType === "email";
  const isLinkedIn = campaignType === "linkedin";

  const { progress, steps, isStreaming, refetch: refetchProgress } = useCampaignSendStream(campaignId);
  const { summary, isLoading: loadingEligibility, refetch: refetchSummary } = useEligibilitySummary(campaignId, campaignType);
  const { connections: allProviderConnections, disconnect: disconnectProvider, reconnect: reconnectProvider } = useEmailProviderStatus();
  const {
    rows: liRows,
    isLoading: loadingLI,
    refetch: refetchLI,
    patchOptimistic,
  } = useLinkedInAttempts(isLinkedIn ? campaignId : null);

  const [sendMode, setSendMode] = useState<"drafts" | "send_direct">("drafts");
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const isApproved = approvalStatus === "approved";
  const activeProviders = summary?.activeProviders ?? [];
  const effectiveConnectionId = selectedConnectionId ?? activeProviders[0]?.id ?? null;

  // Derive overall panel status from steps array (when available) or progress
  const hasAnyStepActive = steps.some((s) => STEP_ACTIVE.has(s.dispatchStatus));
  const hasAnyStepDone = steps.some((s) => STEP_TERMINAL.has(s.dispatchStatus));
  const isContentLocked = hasAnyStepDone || hasAnyStepActive ||
    CONTENT_LOCKED_STATUSES.has(progress.status);

  useEffect(() => {
    onContentLockedChange?.(isContentLocked);
  }, [isContentLocked, onContentLockedChange]);

  const doAction = useCallback(async (label: string, fn: () => Promise<void>) => {
    setActionLoading(label);
    setActionError(null);
    try {
      await fn();
      await refetchProgress();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  }, [refetchProgress]);

  async function handleSendStep(sequenceStep: number) {
    await doAction(`send-${sequenceStep}`, async () => {
      const payload: Record<string, unknown> = {
        send_mode: sendMode,
        sequence_step: sequenceStep,
      };
      if (isEmail && effectiveConnectionId) payload.provider_connection_id = effectiveConnectionId;
      await API.post(`/campaigns/${campaignId}/send`, payload);
      onSendStarted?.();
    });
  }

  async function handleLinkedInSend() {
    await doAction("send-li", async () => {
      await API.post(`/campaigns/${campaignId}/send`, { send_mode: "manual_send" });
      onSendStarted?.();
      refetchLI();
    });
  }

  async function handlePause() {
    await doAction("pause", async () => { await API.post(`/campaigns/${campaignId}/send/pause`); });
  }

  async function handleResume() {
    await doAction("resume", async () => { await API.post(`/campaigns/${campaignId}/send/resume`); });
  }

  async function handleCancel() {
    await doAction("cancel", async () => { await API.post(`/campaigns/${campaignId}/send/cancel`); });
  }

  async function handleRetryFailed() {
    await doAction("retry", async () => { await API.post(`/campaigns/${campaignId}/send/retry-failed`); });
  }

  // Steps summary badge for header
  const doneSteps = steps.filter((s) => STEP_TERMINAL.has(s.dispatchStatus)).length;
  const totalSteps = steps.length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className={`w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors text-left${!collapsed ? " border-b border-slate-100" : ""}`}
      >
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isEmail ? "bg-orange-100" : "bg-blue-100"}`}>
            {isEmail
              ? <Mail className="w-3.5 h-3.5 text-orange-600" />
              : <Link2 className="w-3.5 h-3.5 text-blue-600" />}
          </div>
          <p className="text-sm font-bold text-slate-800">{isEmail ? "Email Campaign" : "LinkedIn Campaign"}</p>
          {isStreaming && (
            <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
              <Activity className="w-3 h-3 animate-pulse" /> Live
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isEmail && totalSteps > 0 && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border
              ${doneSteps === totalSteps && totalSteps > 0
                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                : hasAnyStepActive
                ? "bg-blue-100 text-blue-700 border-blue-200"
                : "bg-slate-100 text-slate-500 border-slate-200"}`}>
              {doneSteps}/{totalSteps} step{totalSteps !== 1 ? "s" : ""} done
            </span>
          )}
          {collapsed
            ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
            : <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />}
        </div>
      </button>

      {!collapsed && (
        <div className="p-5 space-y-4">
          {/* Content lock notice */}
          {isContentLocked && (
            <div className="flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5">
              <Lock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <p className="text-xs font-medium text-amber-700">
                Content is locked — at least one step has been dispatched.
              </p>
            </div>
          )}

          {/* Not approved warning */}
          {!isApproved && !hasAnyStepDone && !hasAnyStepActive && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Campaign not yet approved</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  {approvalOwner ? `Awaiting approval from ${approvalOwner}.` : "Must be approved before sending."}
                </p>
              </div>
            </div>
          )}

          {/* Action error */}
          {actionError && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-800">Error</p>
                <p className="text-xs text-red-600 mt-0.5 break-words">{actionError}</p>
              </div>
              <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Approval pending notice — shown when drafts exist but not yet approved */}
          {!isApproved && !isContentLocked && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <Lock className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Approval required before sending</p>
                <p className="text-xs text-amber-600 mt-0.5">Review and approve the campaign drafts above to enable sending.</p>
              </div>
            </div>
          )}

          {/* Audience summary pill */}
          {summary && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
              <Users className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="text-xs text-slate-500">
                <span className="font-semibold text-emerald-600">{summary.eligible} eligible</span>
                {summary.excluded > 0 && <span className="ml-2 text-amber-600">{summary.excluded} excluded</span>}
                {summary.suppressed > 0 && <span className="ml-2 text-slate-400">{summary.suppressed} suppressed</span>}
                <span className="ml-2 text-slate-400">of {summary.total} total</span>
              </span>
              {loadingEligibility && <Loader2 className="w-3 h-3 animate-spin text-slate-300 ml-auto" />}
            </div>
          )}

          {/* ── EMAIL: Provider bar + Step cards ────────────────────── */}
          {isEmail && (
            <>
              <ProviderModeBar
                providers={activeProviders}
                allConnections={allProviderConnections.filter((c) => c.status !== "revoked")}
                selectedId={effectiveConnectionId}
                onSelect={setSelectedConnectionId}
                sendMode={sendMode}
                onSendModeChange={setSendMode}
                disabled={!!actionLoading}
                onDisconnect={async (id) => { await disconnectProvider(id); refetchSummary(); }}
                onReconnect={reconnectProvider}
              />

              {/* Step cards */}
              {steps.length > 0 ? (
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Sequence Steps
                  </p>
                  {steps.map((step, idx) => {
                    const prevStep = idx > 0 ? steps[idx - 1] : null;
                    const isLocked = prevStep != null && !STEP_TERMINAL.has(prevStep.dispatchStatus);
                    const isStreamingThisStep = isStreaming &&
                      step.dispatchJobId != null &&
                      step.dispatchJobId === progress.dispatchJobId;
                    return (
                      <StepCard
                        key={step.step}
                        step={step}
                        stepIdx={idx}
                        totalSteps={totalSteps}
                        sendMode={sendMode}
                        isApproved={isApproved}
                        hasProvider={activeProviders.length > 0}
                        isLocked={isLocked}
                        isStreamingThisStep={isStreamingThisStep}
                        liveProgress={{
                          sentCount: progress.sentCount,
                          draftedCount: progress.draftCount,
                          failedCount: progress.failedCount,
                          eligibleCount: progress.eligibleRecipients || progress.totalRecipients,
                        }}
                        actionLoading={actionLoading}
                        onSend={handleSendStep}
                        onPause={handlePause}
                        onResume={handleResume}
                        onCancel={handleCancel}
                        onRetry={handleRetryFailed}
                        campaignId={campaignId}
                      />
                    );
                  })}
                </div>
              ) : isApproved ? (
                /* No steps yet — assets not generated */
                <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center">
                  <Mail className="w-6 h-6 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No email steps generated yet</p>
                  <p className="text-xs text-slate-300 mt-1">Generate campaign assets to see sequence steps here</p>
                </div>
              ) : null}
            </>
          )}

          {/* ── LINKEDIN: Single launch + contact cards ──────────────── */}
          {isLinkedIn && (
            <>
              {/* Active contacts */}
              {ACTIVE_SEND_STATUSES.has(progress.status) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recipients</p>
                    <button
                      onClick={refetchLI}
                      className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" /> Refresh
                    </button>
                  </div>
                  {loadingLI ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
                      <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading…</span>
                    </div>
                  ) : liRows.length === 0 ? (
                    <div className="py-6 text-center text-sm text-slate-400">No recipients found</div>
                  ) : (
                    <div className="space-y-2">
                      {liRows.map((row) => (
                        <LinkedInContactCard
                          key={row.contactId}
                          row={row}
                          campaignId={campaignId}
                          disabled={!!actionLoading}
                          patchOptimistic={patchOptimistic}
                          onRefresh={refetchLI}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* LinkedIn launch button */}
              {progress.status === "not_started" && isApproved && (
                <Button
                  onClick={handleLinkedInSend}
                  disabled={!!actionLoading || (summary?.eligible ?? 0) === 0}
                  className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  {actionLoading === "send-li"
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Send className="w-4 h-4" />}
                  Start LinkedIn Send
                </Button>
              )}

              {/* LinkedIn pause/resume/cancel */}
              {ACTIVE_SEND_STATUSES.has(progress.status) && (
                <div className="flex items-center gap-2">
                  {progress.status === "sending" && (
                    <Button variant="outline" size="sm" onClick={handlePause} disabled={!!actionLoading}
                      className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50">
                      {actionLoading === "pause" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
                      Pause
                    </Button>
                  )}
                  {progress.status === "paused" && (
                    <Button size="sm" onClick={handleResume} disabled={!!actionLoading}
                      className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                      {actionLoading === "resume" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      Resume
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={handleCancel} disabled={!!actionLoading}
                    className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50">
                    {actionLoading === "cancel" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                    Cancel
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
