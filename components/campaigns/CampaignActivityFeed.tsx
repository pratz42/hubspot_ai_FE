"use client";

import { useState } from "react";
import { RefreshCw, Loader2, Activity, Mail, Link2, User, Bot, CheckCircle2, XCircle, AlertTriangle, Clock, Send, Pause, Play, RotateCcw, ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { useCampaignActivities, type CampaignActivity } from "@/hooks/useCampaignActivities";
import type { CampaignSendStatus } from "@/hooks/useCampaignSendStream";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function eventLabel(eventType: string): string {
  switch (eventType) {
    case "campaign.send_queued": return "Send queued";
    case "campaign.send_started": return "Send started";
    case "campaign.send_completed": return "Send completed";
    case "campaign.send_partial": return "Send partially completed";
    case "campaign.send_failed": return "Send failed";
    case "campaign.paused": return "Send paused";
    case "campaign.resumed": return "Send resumed";
    case "campaign.cancelled": return "Send cancelled";
    case "campaign.retry_failed": return "Retrying failed recipients";
    case "campaign.manual_send_marked": return "Marked sent";
    case "campaign.recipient_failed": return "Recipient marked failed";
    case "campaign.recipient_skipped": return "Recipient skipped";
    case "campaign.email_sent": return "Email sent";
    case "campaign.email_delivered": return "Email delivered";
    case "campaign.email_opened": return "Email opened";
    case "campaign.email_clicked": return "Link clicked";
    case "campaign.email_bounced": return "Email bounced";
    case "campaign.email_draft_created": return "Draft created";
    case "campaign.draft_edited": return "Draft edited";
    default: return eventType.replace(/^campaign\./, "").replace(/_/g, " ");
  }
}

function eventIcon(eventType: string) {
  switch (eventType) {
    case "campaign.send_queued": return <Clock className="w-3.5 h-3.5 text-amber-500" />;
    case "campaign.send_started": return <Send className="w-3.5 h-3.5 text-blue-500" />;
    case "campaign.send_completed": return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
    case "campaign.send_partial": return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
    case "campaign.send_failed": return <XCircle className="w-3.5 h-3.5 text-red-500" />;
    case "campaign.paused": return <Pause className="w-3.5 h-3.5 text-amber-500" />;
    case "campaign.resumed": return <Play className="w-3.5 h-3.5 text-blue-500" />;
    case "campaign.cancelled": return <XCircle className="w-3.5 h-3.5 text-slate-400" />;
    case "campaign.retry_failed": return <RotateCcw className="w-3.5 h-3.5 text-orange-500" />;
    case "campaign.manual_send_marked": return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
    case "campaign.email_delivered": return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
    case "campaign.email_opened": return <Mail className="w-3.5 h-3.5 text-blue-400" />;
    case "campaign.email_clicked": return <Activity className="w-3.5 h-3.5 text-violet-500" />;
    case "campaign.email_bounced": return <AlertTriangle className="w-3.5 h-3.5 text-red-400" />;
    case "campaign.email_draft_created": return <Mail className="w-3.5 h-3.5 text-violet-400" />;
    case "campaign.draft_edited": return <Pencil className="w-3.5 h-3.5 text-orange-400" />;
    default:
      if (eventType.includes("email")) return <Mail className="w-3.5 h-3.5 text-slate-400" />;
      if (eventType.includes("linkedin")) return <Link2 className="w-3.5 h-3.5 text-blue-400" />;
      return <Activity className="w-3.5 h-3.5 text-slate-400" />;
  }
}

function actorLabel(actorType: string, actorEmail: string | null, actorId: string | null): string {
  if (actorType === "system") return "System";
  if (actorType === "webhook") return "Webhook";
  return actorEmail ?? actorId ?? "User";
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function groupByDay(activities: CampaignActivity[]): Map<string, CampaignActivity[]> {
  const map = new Map<string, CampaignActivity[]>();
  for (const a of activities) {
    const key = formatDate(a.created_at);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  }
  return map;
}

function metaSummary(meta: Record<string, unknown> | null, eventType?: string): string | null {
  if (!meta) return null;
  const parts: string[] = [];

  if (meta.sequence_step != null) parts.push(`Step ${meta.sequence_step}`);

  // Draft edit event — show recipient + changed fields
  if (eventType === "campaign.draft_edited") {
    const name = meta.recipient_name ?? meta.recipient_email;
    if (name) parts.push(String(name));
    if (Array.isArray(meta.fields_changed) && meta.fields_changed.length > 0)
      parts.push(`changed: ${(meta.fields_changed as string[]).join(", ")}`);
    if (meta.approval_reset) parts.push("approval reset to pending");
    return parts.join(" · ") || null;
  }

  const eligible = meta.eligible ?? meta.eligible_count;
  if (eligible != null) parts.push(`${eligible} eligible`);
  if (meta.sent != null) parts.push(`${meta.sent} sent`);
  if (meta.drafted != null && Number(meta.drafted) > 0) parts.push(`${meta.drafted} drafted`);
  if (meta.failed != null && Number(meta.failed) > 0) parts.push(`${meta.failed} failed`);
  if (meta.skipped != null && Number(meta.skipped) > 0) parts.push(`${meta.skipped} skipped`);
  if (meta.retry_count != null) parts.push(`${meta.retry_count} retrying`);
  if (meta.send_mode != null) parts.push(`mode: ${String(meta.send_mode).replace("_", " ")}`);
  if (meta.reason != null) parts.push(String(meta.reason));
  return parts.length > 0 ? parts.join(" · ") : null;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CampaignActivityFeedProps {
  campaignId: number;
  sendStatus?: CampaignSendStatus | string;
}

export function CampaignActivityFeed({ campaignId, sendStatus }: CampaignActivityFeedProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { activities, isLoading, error, refetch } = useCampaignActivities(campaignId, sendStatus as CampaignSendStatus);

  const grouped = groupByDay(activities);
  const unreadCount = activities.length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header — clickable to collapse/expand */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-violet-600" />
          </div>
          <p className="text-sm font-bold text-slate-800">Activity Feed</p>
          {!isOpen && unreadCount > 0 && (
            <span className="text-xs font-medium text-violet-600 bg-violet-50 border border-violet-200 rounded-full px-2 py-0.5">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isOpen && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => { e.stopPropagation(); refetch(); }}
              className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </span>
          )}
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="px-5 py-4">
          {isLoading && activities.length === 0 && (
            <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading activity…</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 py-4">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {!isLoading && !error && activities.length === 0 && (
            <div className="py-10 text-center">
              <Activity className="w-6 h-6 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No activity yet</p>
              <p className="text-xs text-slate-300 mt-1">Events will appear here once sending starts</p>
            </div>
          )}

          {activities.length > 0 && (
            <div className="space-y-6">
              {Array.from(grouped.entries()).map(([day, dayActivities]) => (
                <div key={day}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{day}</span>
                    <div className="flex-1 border-t border-slate-100" />
                  </div>
                  <div className="space-y-1">
                    {dayActivities.map((activity) => {
                      const summary = metaSummary(activity.metadata_json, activity.event_type);
                      return (
                        <div
                          key={activity.id}
                          className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group"
                        >
                          {/* Icon */}
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-white">
                            {eventIcon(activity.event_type)}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-slate-700">
                                {eventLabel(activity.event_type)}
                              </span>
                              {activity.channel && (
                                <span className="text-xs text-slate-400 capitalize flex items-center gap-1">
                                  {activity.channel === "email" ? (
                                    <Mail className="w-3 h-3" />
                                  ) : (
                                    <Link2 className="w-3 h-3" />
                                  )}
                                  {activity.channel}
                                </span>
                              )}
                            </div>
                            {summary && (
                              <p className="text-xs text-slate-400 mt-0.5">{summary}</p>
                            )}
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-slate-300 flex items-center gap-1">
                                {activity.actor_type === "user" ? (
                                  <User className="w-3 h-3" />
                                ) : (
                                  <Bot className="w-3 h-3" />
                                )}
                                {actorLabel(activity.actor_type, activity.actor_email, activity.actor_id)}
                              </span>
                            </div>
                          </div>

                          {/* Time */}
                          <span className="text-xs text-slate-300 flex-shrink-0 mt-0.5">
                            {formatTime(activity.created_at)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
