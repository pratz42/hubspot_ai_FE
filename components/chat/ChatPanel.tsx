"use client";

import { useEffect, useCallback, useState, type ElementType } from "react";
import { usePathname } from "next/navigation";
import { X, Maximize2, MessageSquare, MessagesSquare, Bell } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useChat } from "@/lib/chat/context";
import { useChatApprovals } from "@/hooks/useChatApprovals";
import { ChatConversationView } from "./ChatConversationView";
import { ChatThreadList } from "./ChatThreadList";
import { ChatApprovalsInbox } from "./ChatApprovalsInbox";

const HIDDEN_PATHS = ["/", "/chat"];

type Tab = "chat" | "threads" | "approvals";

const TABS: { id: Tab; label: string; Icon: ElementType }[] = [
  { id: "chat", label: "Chat", Icon: MessageSquare },
  { id: "threads", label: "Threads", Icon: MessagesSquare },
  { id: "approvals", label: "Approvals", Icon: Bell },
];

export function ChatPanel() {
  const pathname = usePathname();
  const { isPanelOpen, closePanel, activeView, setActiveView, pendingApprovalsCount } = useChat();
  const { load: loadApprovals } = useChatApprovals();
  const [threadRefreshKey, setThreadRefreshKey] = useState(0);

  useEffect(() => {
    if (isPanelOpen) {
      loadApprovals();
    }
  }, [isPanelOpen, loadApprovals]);

  useEffect(() => {
    if (!isPanelOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isPanelOpen, closePanel]);

  const handleBackdropClick = useCallback(() => closePanel(), [closePanel]);

  if (HIDDEN_PATHS.includes(pathname)) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm sm:hidden transition-opacity duration-300",
          isPanelOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={handleBackdropClick}
      />

      {/* Panel — uses 100dvh on mobile so the panel doesn't overlap the keyboard */}
      <div
        className={cn(
          "fixed top-0 right-0 w-full sm:w-[420px] z-40",
          "h-[100dvh] sm:h-full",
          "bg-white shadow-2xl border-l border-slate-100 flex flex-col",
          "transition-transform duration-300 ease-in-out",
          isPanelOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center">
              <span className="text-white text-[10px]">✦</span>
            </div>
            <span className="text-sm font-semibold text-slate-800">AI Assistant</span>
          </div>

          <div className="flex items-center gap-1">
            <Link
              href="/chat"
              onClick={closePanel}
              aria-label="Open full workspace"
              title="Open full workspace"
              className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
            </Link>
            <button
              type="button"
              onClick={closePanel}
              aria-label="Close AI Assistant panel"
              className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
            >
              <X className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 flex-shrink-0">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveView(id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors relative",
                activeView === id
                  ? "text-violet-700"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {id === "approvals" && pendingApprovalsCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {pendingApprovalsCount > 9 ? "9+" : pendingApprovalsCount}
                </span>
              )}
              {activeView === id && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-violet-600 rounded-t" />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeView === "chat" && (
            <ChatConversationView
              onThreadsRefresh={() => setThreadRefreshKey((k) => k + 1)}
            />
          )}

          {activeView === "threads" && (
            <div className="flex-1 overflow-hidden">
              <ChatThreadList
                compact
                refreshKey={threadRefreshKey}
                onThreadSelect={() => setActiveView("chat")}
              />
            </div>
          )}

          {activeView === "approvals" && (
            <div className="flex-1 overflow-y-auto p-3">
              <ChatApprovalsInbox />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
