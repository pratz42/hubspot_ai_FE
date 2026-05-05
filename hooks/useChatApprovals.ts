"use client";

import { useState, useCallback } from "react";
import { fetchChatApprovals, decideChatApproval } from "@/lib/chat/api";
import { getErrorMessage } from "@/lib/errors";
import { useChat } from "@/lib/chat/context";
import type { ChatApproval } from "@/lib/chat/types";

type Phase =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "done"; approvals: ChatApproval[] }
  | { phase: "error"; message: string };

export function useChatApprovals() {
  const [state, setState] = useState<Phase>({ phase: "idle" });
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const { setPendingApprovalsCount } = useChat();

  const load = useCallback(async () => {
    setState({ phase: "loading" });
    try {
      const approvals = await fetchChatApprovals("pending");
      setState({ phase: "done", approvals });
      setPendingApprovalsCount(approvals.length);
    } catch (err) {
      setState({
        phase: "error",
        message: getErrorMessage(err, "Could not load approvals."),
      });
    }
  }, [setPendingApprovalsCount]);

  const decide = useCallback(
    async (approvalId: string, action: "approve" | "reject", reason?: string) => {
      setDecidingId(approvalId);
      try {
        await decideChatApproval(approvalId, action, reason);
        setState((prev) => {
          if (prev.phase !== "done") return prev;
          const approvals = prev.approvals.filter((a) => a.approval_id !== approvalId);
          setPendingApprovalsCount(approvals.length);
          return { phase: "done", approvals };
        });
      } catch (err) {
        throw new Error(getErrorMessage(err, "Decision failed."));
      } finally {
        setDecidingId(null);
      }
    },
    [setPendingApprovalsCount]
  );

  return { state, load, decide, decidingId };
}
