"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCircle2 } from "lucide-react";
import { useChatApprovals } from "@/hooks/useChatApprovals";
import { useToast } from "@/components/ui/use-toast";
import { ChatApprovalCard } from "./ChatApprovalCard";
import { ChatApprovalDetailsDrawer } from "./ChatApprovalDetailsDrawer";
import { ChatErrorState } from "./ChatErrorState";
import type { ChatApproval } from "@/lib/chat/types";

interface Props {
  autoLoad?: boolean;
  compact?: boolean;
}

export function ChatApprovalsInbox({ autoLoad = true, compact }: Props) {
  const { state, load, decide, decidingId } = useChatApprovals();
  const { toast } = useToast();
  const [drawerApproval, setDrawerApproval] = useState<ChatApproval | null>(null);

  useEffect(() => {
    if (autoLoad) load();
  }, [autoLoad, load]);

  const handleDecide = async (
    approvalId: string,
    action: "approve" | "reject",
    reason?: string
  ) => {
    try {
      await decide(approvalId, action, reason);
      toast({
        title: action === "approve" ? "Action approved" : "Action rejected",
        description:
          action === "approve"
            ? "The assistant will proceed with the action."
            : "The action has been cancelled.",
        duration: 3000,
      });
      if (drawerApproval?.approval_id === approvalId) {
        setDrawerApproval(null);
      }
    } catch (err) {
      toast({
        title: "Decision failed",
        description: err instanceof Error ? err.message : "Please try again.",
        duration: 4000,
      });
    }
  };

  if (state.phase === "loading") {
    return (
      <div className="space-y-2 p-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (state.phase === "error") {
    return <ChatErrorState message={state.message} onRetry={load} />;
  }

  if (state.phase === "done" && state.approvals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-center">
        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        </div>
        <p className="text-xs font-medium text-slate-600">All caught up</p>
        <p className="text-[11px] text-slate-400">No pending approvals at this time</p>
      </div>
    );
  }

  if (state.phase !== "done") return null;

  const shown = compact ? state.approvals.slice(0, 3) : state.approvals;

  return (
    <>
      <div className="space-y-2">
        {!compact && (
          <div className="flex items-center gap-2 px-1 mb-1">
            <Bell className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-semibold text-slate-700">
              {state.approvals.length} pending approval{state.approvals.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {shown.map((approval) => (
          <ChatApprovalCard
            key={approval.approval_id}
            approval={approval}
            onDecide={handleDecide}
            deciding={decidingId === approval.approval_id}
          />
        ))}

        {compact && state.approvals.length > 3 && (
          <p className="text-[11px] text-slate-500 text-center py-1">
            +{state.approvals.length - 3} more in Approvals tab
          </p>
        )}
      </div>

      <ChatApprovalDetailsDrawer
        approval={drawerApproval}
        open={!!drawerApproval}
        onClose={() => setDrawerApproval(null)}
        onDecide={handleDecide}
        deciding={drawerApproval ? decidingId === drawerApproval.approval_id : false}
      />
    </>
  );
}
