"use client";

import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChat } from "@/lib/chat/context";

const HIDDEN_PATHS = ["/", "/chat"];

export function ChatLauncherButton() {
  const pathname = usePathname();
  const { togglePanel, isPanelOpen, pendingApprovalsCount } = useChat();

  if (HIDDEN_PATHS.includes(pathname)) return null;

  return (
    <button
      onClick={togglePanel}
      aria-label="Open AI Assistant"
      className={cn(
        "fixed bottom-6 right-6 z-30 w-12 h-12 rounded-2xl shadow-lg",
        "flex items-center justify-center transition-all duration-200",
        "hover:scale-105 active:scale-95",
        isPanelOpen
          ? "bg-slate-700 shadow-slate-700/30"
          : "bg-gradient-to-br from-violet-500 to-violet-600 shadow-violet-500/30 ai-ask-idle"
      )}
    >
      <span className="ai-shimmer-strip absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
        <span className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-15deg]" />
      </span>

      <Sparkles
        className={cn(
          "w-5 h-5 text-white",
          !isPanelOpen && "ai-icon-breathe"
        )}
      />

      {pendingApprovalsCount > 0 && !isPanelOpen && (
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center shadow-sm border-2 border-white">
          {pendingApprovalsCount > 9 ? "9+" : pendingApprovalsCount}
        </span>
      )}
    </button>
  );
}
