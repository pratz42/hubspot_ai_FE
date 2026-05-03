"use client";

import { useEffect } from "react";
import { Search, Plus, MessagesSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChat } from "@/lib/chat/context";
import { useChatThreads } from "@/hooks/useChatThreads";
import { ChatThreadItem } from "./ChatThreadItem";
import { ChatThreadSkeleton } from "./ChatLoadingState";
import { ChatErrorState } from "./ChatErrorState";

interface Props {
  compact?: boolean;
  refreshKey?: number;
  onThreadSelect?: () => void;
}

export function ChatThreadList({ compact, refreshKey, onThreadSelect }: Props) {
  const { activeThreadId, setActiveThreadId, clearMessages } = useChat();
  const { state, load, search, setSearch, filteredThreads, hasMore, loadMore } = useChatThreads();

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const handleSelect = (threadId: string) => {
    clearMessages();
    setActiveThreadId(threadId);
    onThreadSelect?.();
  };

  const handleNewThread = () => {
    clearMessages();
    setActiveThreadId(null);
    onThreadSelect?.();
  };

  return (
    <div className="flex flex-col h-full">
      <div className={cn("flex items-center gap-2 p-2", compact ? "pb-1.5" : "pb-2")}>
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-300 placeholder:text-slate-400 transition-colors"
          />
        </div>
        <button
          onClick={handleNewThread}
          aria-label="New conversation"
          title="New conversation"
          className="w-7 h-7 rounded-lg bg-violet-600 hover:bg-violet-700 flex items-center justify-center flex-shrink-0 transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5 text-white" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-1 space-y-0.5">
        {state.phase === "loading" && <ChatThreadSkeleton />}

        {state.phase === "error" && (
          <ChatErrorState message={state.message} onRetry={load} />
        )}

        {state.phase === "done" && filteredThreads.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-10 px-4 text-center">
            <div className="w-10 h-10 rounded-full bg-violet-50 flex items-center justify-center">
              <MessagesSquare className="w-5 h-5 text-violet-400" />
            </div>
            <p className="text-xs font-medium text-slate-600">
              {search ? "No conversations match your search" : "No conversations yet"}
            </p>
            {!search && (
              <p className="text-[11px] text-slate-400">
                Start chatting to create your first thread
              </p>
            )}
          </div>
        )}

        {filteredThreads.map((thread) => (
          <ChatThreadItem
            key={thread.thread_id}
            thread={thread}
            isActive={activeThreadId === thread.thread_id}
            onClick={() => handleSelect(thread.thread_id)}
          />
        ))}

        {hasMore && (
          <button
            onClick={loadMore}
            className="w-full py-2 text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors mt-1"
          >
            Load more
          </button>
        )}
      </div>
    </div>
  );
}
