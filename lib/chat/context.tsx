"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import type { ChatMessage, PageContext, ChatPanelView } from "./types";

interface ChatStore {
  isPanelOpen: boolean;
  activeView: ChatPanelView;
  activeThreadId: string | null;
  messages: ChatMessage[];
  pageContext: PageContext | null;
  pendingApprovalsCount: number;
  isSending: boolean;
  isLoadingThread: boolean;
  prefillMessage: string;

  openPanel: (prefill?: string) => void;
  closePanel: () => void;
  togglePanel: () => void;
  setActiveView: (view: ChatPanelView) => void;
  setActiveThreadId: (id: string | null) => void;
  addMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  setMessages: (msgs: ChatMessage[]) => void;
  clearMessages: () => void;
  setPageContext: (ctx: PageContext | null) => void;
  setPendingApprovalsCount: (count: number) => void;
  setIsSending: (v: boolean) => void;
  setIsLoadingThread: (v: boolean) => void;
  clearPrefill: () => void;
}

const ChatContext = createContext<ChatStore | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeView, setActiveView] = useState<ChatPanelView>("chat");
  const [activeThreadId, setActiveThreadIdState] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pageContext, setPageContext] = useState<PageContext | null>(null);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [prefillMessage, setPrefillMessage] = useState("");

  const openPanel = useCallback((prefill?: string) => {
    setIsPanelOpen(true);
    setActiveView("chat");
    if (prefill) setPrefillMessage(prefill);
  }, []);

  const closePanel = useCallback(() => setIsPanelOpen(false), []);
  const togglePanel = useCallback(() => setIsPanelOpen((v) => !v), []);

  // Always clear messages when switching threads to prevent flicker
  const setActiveThreadId = useCallback((id: string | null) => {
    setActiveThreadIdState(id);
    setMessages([]);
    setIsLoadingThread(false);
  }, []);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  }, []);

  const clearMessages = useCallback(() => setMessages([]), []);
  const clearPrefill = useCallback(() => setPrefillMessage(""), []);

  return (
    <ChatContext.Provider
      value={{
        isPanelOpen,
        activeView,
        activeThreadId,
        messages,
        pageContext,
        pendingApprovalsCount,
        isSending,
        isLoadingThread,
        prefillMessage,
        openPanel,
        closePanel,
        togglePanel,
        setActiveView,
        setActiveThreadId,
        addMessage,
        updateMessage,
        setMessages,
        clearMessages,
        setPageContext,
        setPendingApprovalsCount,
        setIsSending,
        setIsLoadingThread,
        clearPrefill,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): ChatStore {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
