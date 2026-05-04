"use client";

import { useCallback, useRef, useEffect } from "react";
import { streamChatMessage } from "@/lib/chat/api";
import { getErrorMessage } from "@/lib/errors";
import { useChat } from "@/lib/chat/context";
import { useChatPreferences } from "@/hooks/useChatPreferences";
import type { ChatMessage, PageContext, TraceStep } from "@/lib/chat/types";

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
    abortControllerRef,
  } = useChat();

  const { state: prefState, load: loadPrefs } = useChatPreferences();
  const prefs = prefState.phase === "done" || prefState.phase === "saved" ? prefState.preferences : null;

  // Auto-load preferences once on mount so deep_analysis is respected
  useEffect(() => {
    if (prefState.phase === "idle") loadPrefs();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Accumulate trace steps during streaming without triggering re-renders on every step
  const traceRef = useRef<TraceStep[]>([]);

  const send = useCallback(
    async (content: string, contextOverride?: Partial<PageContext>) => {
      if (!content.trim() || isSending) return;

      const controller = new AbortController();
      abortControllerRef.current = controller;
      traceRef.current = [];

      const userMsgId = generateId();
      const assistantMsgId = generateId();

      const userMsg: ChatMessage = {
        id: userMsgId,
        role: "user",
        content: content.trim(),
        timestamp: new Date().toISOString(),
        status: "sending",
      };

      addMessage(userMsg);
      setIsSending(true);

      // Placeholder assistant bubble — shows trace steps as they arrive
      addMessage({
        id: assistantMsgId,
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
        status: "sending",
        isStreaming: true,
        metadata: { trace: [] },
      });

      try {
        const ctx = contextOverride ?? (pageContext
          ? {
              page: pageContext.page,
              entity_type: pageContext.entity_type,
              entity_id: pageContext.entity_id,
            }
          : undefined);

        const maxSteps = prefs?.deep_analysis ? 6 : 3;

        const response = await streamChatMessage(
          {
            message: content.trim(),
            ...(activeThreadId ? { thread_id: activeThreadId } : {}),
            ...(ctx ? { context: ctx } : {}),
            max_steps: maxSteps,
          },
          (step: TraceStep) => {
            traceRef.current = [...traceRef.current, step];
            // Update the streaming bubble with the latest trace steps
            updateMessage(assistantMsgId, {
              metadata: { trace: traceRef.current },
            });
          },
          controller.signal,
        );

        updateMessage(userMsgId, { status: "sent" });

        if (response.thread_id && response.thread_id !== activeThreadId) {
          setActiveThreadId(response.thread_id, { skipClear: true });
        }

        // Replace the streaming placeholder with the final response
        updateMessage(assistantMsgId, {
          content: response.message,
          timestamp: response.timestamp ?? new Date().toISOString(),
          status: "sent",
          isStreaming: false,
          metadata: {
            approval_required: response.approval_required,
            approval_id: response.approval_id,
            actions: response.actions,
            trace: response.trace ?? traceRef.current,
            selected_tools: response.selected_tools,
          },
        });

        onThreadsRefresh?.();
      } catch (err: unknown) {
        if ((err as Error)?.name === "AbortError") {
          updateMessage(userMsgId, { status: "error" });
          updateMessage(assistantMsgId, {
            content: "Request cancelled.",
            status: "error",
            isStreaming: false,
          });
        } else {
          updateMessage(userMsgId, { status: "error" });
          updateMessage(assistantMsgId, {
            content: getErrorMessage(err, "Something went wrong. Please try again."),
            status: "error",
            isStreaming: false,
          });
        }
      } finally {
        abortControllerRef.current = null;
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
      abortControllerRef,
      prefs,
      onThreadsRefresh,
    ]
  );

  return { send, isSending };
}
