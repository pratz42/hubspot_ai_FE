"use client";

import { useState } from "react";
import { CheckCircle, XCircle, ChevronDown, ChevronUp, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatApproval } from "@/lib/chat/types";

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

interface Props {
  approval: ChatApproval;
  onDecide: (approvalId: string, action: "approve" | "reject", reason?: string) => Promise<void>;
  deciding?: boolean;
}

export function ChatApprovalCard({ approval, onDecide, deciding }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  const isPending = approval.status === "pending";

  const handleApprove = async () => {
    await onDecide(approval.approval_id, "approve");
  };

  const handleReject = async () => {
    if (!showRejectInput) {
      setShowRejectInput(true);
      return;
    }
    await onDecide(approval.approval_id, "reject", rejectReason || undefined);
    setShowRejectInput(false);
    setRejectReason("");
  };

  const statusConfig = {
    pending: { color: "amber", label: "Pending Review", icon: Clock },
    approved: { color: "emerald", label: "Approved", icon: CheckCircle },
    rejected: { color: "red", label: "Rejected", icon: XCircle },
  }[approval.status];

  return (
    <div
      className={cn(
        "rounded-xl border bg-white shadow-sm overflow-hidden",
        approval.status === "pending" ? "border-amber-200" : "border-slate-100"
      )}
    >
      {/* Header */}
      <div className="px-3.5 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 leading-snug line-clamp-2">
              {approval.title}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(approval.created_at)}</p>
          </div>
          <span
            className={cn(
              "flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold",
              statusConfig.color === "amber" && "bg-amber-50 text-amber-700",
              statusConfig.color === "emerald" && "bg-emerald-50 text-emerald-700",
              statusConfig.color === "red" && "bg-red-50 text-red-600"
            )}
          >
            {statusConfig.label}
          </span>
        </div>

        <p className="text-xs text-slate-600 mt-2 leading-relaxed">
          {approval.description}
        </p>

        {/* Expand context */}
        {approval.context && Object.keys(approval.context).length > 0 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 mt-2 text-[11px] text-violet-600 hover:text-violet-700 transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            {expanded ? "Hide details" : "View details"}
          </button>
        )}

        {expanded && approval.context && (
          <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-1">
            {Object.entries(approval.context).map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <span className="font-medium text-slate-500 capitalize min-w-[80px]">{k}:</span>
                <span className="flex-1 truncate">{String(v)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      {isPending && (
        <div className="px-3.5 pb-3 space-y-2">
          {showRejectInput && (
            <input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)"
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-300/40 focus:border-red-300 placeholder:text-slate-400"
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              disabled={deciding}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors disabled:opacity-60"
            >
              {deciding ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <CheckCircle className="w-3 h-3" />
              )}
              Approve
            </button>
            <button
              onClick={handleReject}
              disabled={deciding}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 text-xs font-medium transition-colors disabled:opacity-60"
            >
              {deciding ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <XCircle className="w-3 h-3" />
              )}
              {showRejectInput ? "Confirm Reject" : "Reject"}
            </button>
          </div>
          {showRejectInput && (
            <button
              onClick={() => { setShowRejectInput(false); setRejectReason(""); }}
              className="w-full text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {!isPending && approval.resolved_at && (
        <div className="px-3.5 pb-2.5 text-[10px] text-slate-400">
          Resolved {formatDate(approval.resolved_at)}
          {approval.resolved_by && ` by ${approval.resolved_by}`}
        </div>
      )}
    </div>
  );
}
