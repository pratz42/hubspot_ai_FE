"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Sparkles, ShieldCheck } from "lucide-react";
import { useChat } from "@/lib/chat/context";
import { useChatThread } from "@/hooks/useChatThread";
import { useChatSend } from "@/hooks/useChatSend";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { ChatTypingIndicator } from "./ChatTypingIndicator";
import { ChatComposer } from "./ChatComposer";
import { ChatQuickActions } from "./ChatQuickActions";
import { ChatMessageSkeleton } from "./ChatLoadingState";
import type { ChatMessage } from "@/lib/chat/types";

function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <div className="flex-1 h-px bg-slate-100" />
      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{date}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

function getDateLabel(iso: string) {
  try {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(d);
  } catch { return ""; }
}

function groupByDate(messages: ChatMessage[]) {
  const groups: { dateLabel: string; messages: ChatMessage[] }[] = [];
  let lastLabel = "";
  for (const msg of messages) {
    const label = getDateLabel(msg.timestamp);
    if (label !== lastLabel) {
      groups.push({ dateLabel: label, messages: [msg] });
      lastLabel = label;
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }
  return groups;
}

const ONBOARDING_PROMPTS = [
  { label: "Show leads needing attention", prompt: "Show leads needing attention." },
  { label: "Pipeline summary", prompt: "Give me a summary of my current pipeline." },
  { label: "Top deals this month", prompt: "List my top open deals this month." },
  { label: "Recent campaign status", prompt: "List my most recent campaigns." },
  { label: "Score a lead", prompt: "Refresh the AI score for my latest lead." },
];

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
    abortSend,
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

  const handleSend = (content: string) => send(content);
  const handleQuickAction = (prompt: string) => send(prompt);
  const handleNewThread = () => { clearMessages(); setActiveThreadId(null); };
  const handleRetry = (content: string) => send(content);
  const handleChoice = (content: string) => send(content);

  const isEmpty = messages.length === 0 && !isSending && !isLoadingThread;

  return (
    <div className="flex flex-col h-full bg-slate-50/40">
      {activeThreadId && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-100">
          <p className="text-xs text-slate-500">Conversation thread</p>
          <button
            type="button"
            onClick={handleNewThread}
            className="flex items-center gap-1 text-[11px] text-violet-600 hover:text-violet-700 transition-colors"
          >
            <Plus className="w-3 h-3" />
            New chat
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-3">
        {isLoadingThread ? (
          <ChatMessageSkeleton />
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-5 px-6 text-center min-h-[200px]">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">AI Assistant</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Ask me anything about your CRM — leads, deals, campaigns, or reports.
              </p>
            </div>
            {pageContext?.entity_name && (
              <p className="text-xs text-violet-600 bg-violet-50 px-3 py-1.5 rounded-full border border-violet-100">
                Discussing: {pageContext.entity_name}
              </p>
            )}
            {/* Onboarding starter prompts */}
            {!pageContext?.entity_name && (
              <div className="flex flex-wrap justify-center gap-2 max-w-sm">
                {ONBOARDING_PROMPTS.map((p) => (
                  <button
                    key={p.prompt}
                    type="button"
                    disabled={isSending}
                    onClick={() => send(p.prompt)}
                    className="px-3 py-1.5 rounded-full text-xs border border-violet-100 bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {groupByDate(messages).map(({ dateLabel, messages: group }) => (
              <div key={dateLabel}>
                <DateSeparator date={dateLabel} />
                {group.map((msg) => (
                  <ChatMessageBubble
                    key={msg.id}
                    message={msg}
                    onRetry={msg.role === "user" ? handleRetry : undefined}
                    onChoice={msg.role === "assistant" ? handleChoice : undefined}
                  />
                ))}
              </div>
            ))}
            {isSending && !messages.some((m) => m.isStreaming) && <ChatTypingIndicator />}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {!hideQuickActions && isEmpty && (
        <ChatQuickActions pageContext={pageContext} onAction={handleQuickAction} />
      )}

      {/* Encrypted channel label — matches workspace channel style */}
      {!isEmpty && (
        <div className="flex items-center justify-center gap-1.5 py-1.5 text-[9px] font-medium tracking-widest uppercase text-slate-300 select-none border-t border-slate-100/80">
          <ShieldCheck className="w-2.5 h-2.5" />
          End-to-end encrypted workspace channel
        </div>
      )}

      <ChatComposer
        onSend={handleSend}
        onStop={abortSend}
        disabled={false}
        isSending={isSending}
        prefill={composerPrefill}
        onPrefillClear={() => setComposerPrefill("")}
        pageContext={pageContext}
      />
    </div>
  );
}
