"use client";

import { MessagesSquare } from "lucide-react";
import { ChatThreadList } from "./ChatThreadList";

interface Props {
  refreshKey?: number;
}

export function ChatSidebar({ refreshKey }: Props) {
  return (
    <div className="w-72 flex-shrink-0 h-full flex flex-col border-r border-slate-100 bg-slate-50/60">
      <div className="flex items-center gap-2 px-4 py-3.5 border-b border-slate-100">
        <div className="w-6 h-6 rounded-md bg-violet-100 flex items-center justify-center">
          <MessagesSquare className="w-3.5 h-3.5 text-violet-600" />
        </div>
        <h2 className="text-sm font-semibold text-slate-800">Conversations</h2>
      </div>

      <div className="flex-1 overflow-hidden">
        <ChatThreadList refreshKey={refreshKey} />
      </div>
    </div>
  );
}
