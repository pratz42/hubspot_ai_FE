"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChat } from "@/lib/chat/context";
import type { PageContext } from "@/lib/chat/types";

interface Props {
  prompt?: string;
  label?: string;
  context?: PageContext;
  variant?: "button" | "compact" | "icon";
  className?: string;
}

export function ContextualAskAIButton({
  prompt,
  label = "Ask AI",
  context,
  variant = "button",
  className,
}: Props) {
  const { openPanel, setPageContext } = useChat();

  const handleClick = () => {
    if (context) setPageContext(context);
    openPanel(prompt);
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleClick}
        title={label}
        className={cn(
          "w-7 h-7 rounded-lg bg-violet-50 hover:bg-violet-100 border border-violet-200",
          "flex items-center justify-center transition-colors",
          className
        )}
      >
        <Sparkles className="w-3.5 h-3.5 text-violet-600" />
      </button>
    );
  }

  if (variant === "compact") {
    return (
      <button
        onClick={handleClick}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-lg",
          "bg-violet-50 hover:bg-violet-100 border border-violet-200",
          "text-xs font-medium text-violet-700 transition-colors",
          "ai-ask-idle relative overflow-hidden",
          className
        )}
      >
        <span className="ai-shimmer-strip absolute inset-0 overflow-hidden pointer-events-none rounded-lg">
          <span className="absolute inset-y-0 w-6 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-15deg]" />
        </span>
        <Sparkles className="w-3 h-3 ai-icon-breathe" />
        {label}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center gap-2 px-3.5 py-2 rounded-xl",
        "bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600",
        "text-white text-sm font-medium shadow-sm shadow-violet-500/20",
        "transition-all duration-150 active:scale-95 relative overflow-hidden",
        "ai-ask-idle",
        className
      )}
    >
      <span className="ai-shimmer-strip absolute inset-0 overflow-hidden pointer-events-none rounded-xl">
        <span className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-15deg]" />
      </span>
      <Sparkles className="w-4 h-4 ai-icon-breathe" />
      {label}
    </button>
  );
}
