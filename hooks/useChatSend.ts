"use client";

import { useCallback } from "react";
import { sendChatMessage } from "@/lib/chat/api";
import { getErrorMessage } from "@/lib/errors";
import { useChat } from "@/lib/chat/context";
import type { ChatMessage, PageContext } from "@/lib/chat/types";

function generateId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function useChatSend(onThreadsRefresh?: () => void) {
  const {
    activeThreadId,
    setActiveThreadId,
    addMessage,
    updateMessage,
    isSending,
    setIsSending,
    pageContext,
  } = useChat();

  const send = useCallback(
    async (content: string, contextOverride?: Partial<PageContext>) => {
      if (!content.trim() || isSending) return;

      const userMsgId = generateId();
      const userMsg: ChatMessage = {
        id: userMsgId,
        role: "user",
        content: content.trim(),
        timestamp: new Date().toISOString(),
        status: "sending",
      };

      addMessage(userMsg);
      setIsSending(true);

      try {
        const ctx = contextOverride ?? (pageContext
          ? {
              page: pageContext.page,
              entity_type: pageContext.entity_type,
              entity_id: pageContext.entity_id,
            }
          : undefined);

        const response = await sendChatMessage({
          message: content.trim(),
          ...(activeThreadId ? { thread_id: activeThreadId } : {}),
          ...(ctx ? { context: ctx } : {}),
        });

        updateMessage(userMsgId, { status: "sent" });

        if (response.thread_id && response.thread_id !== activeThreadId) {
          setActiveThreadId(response.thread_id);
        }

        addMessage({
          id: generateId(),
          role: "assistant",
          content: response.message,
          timestamp: response.timestamp ?? new Date().toISOString(),
          status: "sent",
          metadata: {
            approval_required: response.approval_required,
            approval_id: response.approval_id,
            actions: response.actions,
          },
        });

        onThreadsRefresh?.();
      } catch (err) {
        updateMessage(userMsgId, { status: "error" });
        addMessage({
          id: generateId(),
          role: "assistant",
          content: getErrorMessage(err, "Something went wrong. Please try again."),
          timestamp: new Date().toISOString(),
          status: "error",
        });
      } finally {
        setIsSending(false);
      }
    },
    [
      activeThreadId,
      setActiveThreadId,
      addMessage,
      updateMessage,
      isSending,
      setIsSending,
      pageContext,
      onThreadsRefresh,
    ]
  );

  return { send, isSending };
}
