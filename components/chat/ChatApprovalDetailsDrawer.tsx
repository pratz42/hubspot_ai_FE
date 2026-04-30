"use client";

import { X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatApprovalCard } from "./ChatApprovalCard";
import type { ChatApproval } from "@/lib/chat/types";

interface Props {
  approval: ChatApproval | null;
  open: boolean;
  onClose: () => void;
  onDecide: (approvalId: string, action: "approve" | "reject", reason?: string) => Promise<void>;
  deciding?: boolean;
}

export function ChatApprovalDetailsDrawer({
  approval,
  open,
  onClose,
  onDecide,
  deciding,
}: Props) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <div
        className={cn(
          "fixed top-0 right-0 h-full w-full sm:w-96 z-50 bg-white shadow-2xl border-l border-slate-100",
          "flex flex-col transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Approval Details</h3>
            <p className="text-[11px] text-slate-500">Review the requested action</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {approval && (
            <>
              <ChatApprovalCard
                approval={approval}
                onDecide={onDecide}
                deciding={deciding}
              />

              {approval.thread_id && (
                <button className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" />
                  View in conversation
                </button>
              )}

              {approval.action_type && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1">Action Type</p>
                  <p className="text-xs text-slate-700 font-mono">{approval.action_type}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
