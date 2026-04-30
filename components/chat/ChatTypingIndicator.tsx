"use client";

import { Sparkles } from "lucide-react";

export function ChatTypingIndicator() {
  return (
    <div className="flex items-start gap-2.5 px-4 py-2">
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
        <Sparkles className="w-3 h-3 text-white" />
      </div>
      <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-3 py-2.5 shadow-sm">
        <div className="flex items-center gap-1">
          <span
            className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce"
            style={{ animationDelay: "0ms", animationDuration: "1.2s" }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce"
            style={{ animationDelay: "160ms", animationDuration: "1.2s" }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce"
            style={{ animationDelay: "320ms", animationDuration: "1.2s" }}
          />
        </div>
      </div>
    </div>
  );
}
