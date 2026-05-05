"use client";

import { useState } from "react";
import { Sparkles, Bell } from "lucide-react";
import { useChat } from "@/lib/chat/context";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatConversationView } from "@/components/chat/ChatConversationView";
import { ChatContextPanel } from "@/components/chat/ChatContextPanel";

export default function ChatPage() {
  const { pendingApprovalsCount } = useChat();
  const [threadRefreshKey, setThreadRefreshKey] = useState(0);

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Page header (top bar on mobile, hidden on desktop since sidebar provides branding) */}
      <div className="flex-col h-full hidden sm:flex w-full">
        {/* Top header bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-sm shadow-violet-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900">AI Assistant Workspace</h1>
              <p className="text-[11px] text-slate-500">
                Chat, browse threads, and manage approvals
              </p>
            </div>
          </div>

          {pendingApprovalsCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-xs font-medium text-amber-700">
              <Bell className="w-3.5 h-3.5" />
              {pendingApprovalsCount} pending approval{pendingApprovalsCount !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* Three-column workspace */}
        <div className="flex flex-1 overflow-hidden">
          <ChatSidebar refreshKey={threadRefreshKey} />

          <div className="flex-1 overflow-hidden">
            <ChatConversationView
              onThreadsRefresh={() => setThreadRefreshKey((k) => k + 1)}
            />
          </div>

          <ChatContextPanel />
        </div>
      </div>

      {/* Mobile: single-column layout */}
      <div className="flex sm:hidden flex-col h-full w-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-800">AI Assistant</span>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <ChatConversationView />
        </div>
      </div>
    </div>
  );
}
