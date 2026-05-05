"use client";

import { useCallback, useEffect, useRef } from "react";
import { fetchChatThread } from "@/lib/chat/api";
import { getErrorMessage } from "@/lib/errors";
import { useChat } from "@/lib/chat/context";

export function useChatThread() {
  const { activeThreadId, setMessages, setIsLoadingThread, messages } = useChat();

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

  // Keep a ref to the latest messages length so we can read it inside the effect
  // without adding `messages` to the dependency array (which would cause infinite loops).
  const messagesLenRef = useRef(messages.length);
  useEffect(() => {
    messagesLenRef.current = messages.length;
  }, [messages]);

  // Track the last thread ID we actually fetched to avoid duplicate fetches.
  const fetchedThreadIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeThreadId) {
      fetchedThreadIdRef.current = null;
      return;
    }

    // Already fetched this thread AND messages are still in memory — skip.
    // This prevents a re-fetch flash when returning to a thread still in state.
    if (fetchedThreadIdRef.current === activeThreadId && messagesLenRef.current > 0) return;

    fetchedThreadIdRef.current = activeThreadId;
    loadThread(activeThreadId);
  }, [activeThreadId, loadThread]);

  return { loadThread };
}
