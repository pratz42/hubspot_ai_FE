"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { useChat } from "@/lib/chat/context";
import { useChatThread } from "@/hooks/useChatThread";
import { useChatSend } from "@/hooks/useChatSend";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { ChatTypingIndicator } from "./ChatTypingIndicator";
import { ChatComposer } from "./ChatComposer";
import { ChatQuickActions } from "./ChatQuickActions";
import { ChatMessageSkeleton } from "./ChatLoadingState";

interface Props {
  onThreadsRefresh?: () => void;
  hideQuickActions?: boolean;
}

export function ChatConversationView({ onThreadsRefresh, hideQuickActions }: Props) {
  const {
    messages,
    isSending,
    isLoadingThread,
    pageContext,
    activeThreadId,
    setActiveThreadId,
    clearMessages,
    prefillMessage,
    clearPrefill,
  } = useChat();

  useChatThread();
  const { send } = useChatSend(onThreadsRefresh);

  const bottomRef = useRef<HTMLDivElement>(null);
  const [composerPrefill, setComposerPrefill] = useState("");

  useEffect(() => {
    if (prefillMessage) {
      setComposerPrefill(prefillMessage);
      clearPrefill();
    }
  }, [prefillMessage, clearPrefill]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const handleSend = (content: string) => {
    send(content);
  };

  const handleQuickAction = (prompt: string) => {
    setComposerPrefill(prompt);
  };

  const handleNewThread = () => {
    clearMessages();
    setActiveThreadId(null);
  };

  const isEmpty = messages.length === 0 && !isSending && !isLoadingThread;

  return (
    <div className="flex flex-col h-full bg-slate-50/40">
      {/* Thread header */}
      {activeThreadId && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-100">
          <p className="text-xs text-slate-500">Conversation thread</p>
          <button
            onClick={handleNewThread}
            className="flex items-center gap-1 text-[11px] text-violet-600 hover:text-violet-700 transition-colors"
          >
            <Plus className="w-3 h-3" />
            New chat
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-3">
        {isLoadingThread ? (
          <ChatMessageSkeleton />
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center min-h-[200px]">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">AI Assistant</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Ask me anything about your CRM — leads, deals, campaigns, or reports.
                I can summarize, explain, draft, and take actions for you.
              </p>
            </div>
            {pageContext?.entity_name && (
              <p className="text-xs text-violet-600 bg-violet-50 px-3 py-1.5 rounded-full border border-violet-100">
                Discussing: {pageContext.entity_name}
              </p>
            )}
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessageBubble key={msg.id} message={msg} />
            ))}
            {isSending && <ChatTypingIndicator />}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick actions */}
      {!hideQuickActions && isEmpty && (
        <ChatQuickActions pageContext={pageContext} onAction={handleQuickAction} />
      )}

      {/* Composer */}
      <ChatComposer
        onSend={handleSend}
        disabled={isSending}
        prefill={composerPrefill}
        onPrefillClear={() => setComposerPrefill("")}
        pageContext={pageContext}
      />
    </div>
  );
}
