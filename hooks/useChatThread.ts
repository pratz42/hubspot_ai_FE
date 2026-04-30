"use client";

import { useCallback, useEffect } from "react";
import { fetchChatThread } from "@/lib/chat/api";
import { getErrorMessage } from "@/lib/errors";
import { useChat } from "@/lib/chat/context";

export function useChatThread() {
  const { activeThreadId, setMessages, setIsLoadingThread } = useChat();

  const loadThread = useCallback(
    async (threadId: string) => {
      setIsLoadingThread(true);
      try {
        const thread = await fetchChatThread(threadId);
        setMessages(thread.messages ?? []);
      } catch (err) {
        console.error("Failed to load thread:", getErrorMessage(err, "Unknown error"));
      } finally {
        setIsLoadingThread(false);
      }
    },
    [setMessages, setIsLoadingThread]
  );

  useEffect(() => {
    if (activeThreadId) {
      loadThread(activeThreadId);
    }
  }, [activeThreadId, loadThread]);

  return { loadThread };
}
