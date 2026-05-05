"use client";

import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatThread } from "@/lib/chat/types";

function formatRelative(iso: string) {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(iso));
  } catch {
    return "";
  }
}

interface Props {
  thread: ChatThread;
  isActive: boolean;
  onClick: () => void;
}

export function ChatThreadItem({ thread, isActive, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left flex items-start gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-100 group",
        isActive
          ? "bg-violet-50 border border-violet-100"
          : "hover:bg-slate-50 border border-transparent"
      )}
    >
      <div
        className={cn(
          "w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5",
          isActive ? "bg-violet-100" : "bg-slate-100 group-hover:bg-slate-200"
        )}
      >
        <MessageSquare
          className={cn(
            "w-3 h-3",
            isActive ? "text-violet-600" : "text-slate-400"
          )}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "text-xs font-semibold truncate",
              isActive ? "text-violet-800" : "text-slate-700"
            )}
          >
            {thread.title || "Untitled conversation"}
          </p>
          <span className="text-[10px] text-slate-400 flex-shrink-0 tabular-nums">
            {formatRelative(thread.last_message_at)}
          </span>
        </div>

        {thread.last_message && (
          <p className="text-[11px] text-slate-400 truncate mt-0.5 leading-snug">
            {thread.last_message}
          </p>
        )}
      </div>
    </button>
  );
}
