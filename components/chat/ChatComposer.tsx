"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Send, MapPin, X, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PageContext } from "@/lib/chat/types";

interface Props {
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  isSending?: boolean;
  placeholder?: string;
  prefill?: string;
  onPrefillClear?: () => void;
  pageContext?: PageContext | null;
}

const ENTITY_LABELS: Record<string, string> = {
  lead: "Lead",
  contact: "Contact",
  deal: "Deal",
  campaign: "Campaign",
  report: "Report",
};

export function ChatComposer({
  onSend,
  onStop,
  disabled,
  isSending,
  placeholder,
  prefill,
  onPrefillClear,
  pageContext,
}: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (prefill) {
      setValue(prefill);
      onPrefillClear?.();
      textareaRef.current?.focus();
    }
  }, [prefill, onPrefillClear]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  }, [value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled || isSending) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleStop = () => {
    onStop?.();
  };

  const contextLabel = pageContext
    ? pageContext.entity_name
      ? `${ENTITY_LABELS[pageContext.entity_type ?? ""] ?? pageContext.page}: ${pageContext.entity_name}`
      : ENTITY_LABELS[pageContext.entity_type ?? ""] ?? pageContext.page
    : null;

  return (
    <div className="border-t border-slate-100 bg-white">
      {contextLabel && (
        <div className="px-3 pt-2.5">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-violet-50 border border-violet-100 text-xs text-violet-600">
            <MapPin className="w-3 h-3" />
            <span>Context: {contextLabel}</span>
          </div>
        </div>
      )}

      <div className="flex items-end gap-2 px-3 py-2.5">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || isSending}
            placeholder={isSending ? "AI is thinking…" : (placeholder ?? "Ask anything about your CRM…")}
            rows={1}
            className={cn(
              "w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900",
              "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-300",
              "transition-colors leading-relaxed min-h-[40px] max-h-[140px]",
              (disabled || isSending) && "opacity-50 cursor-not-allowed"
            )}
          />
          {value && !disabled && !isSending && (
            <button
              onClick={() => setValue("")}
              aria-label="Clear message"
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {isSending ? (
          <button
            onClick={handleStop}
            aria-label="Stop generation"
            title="Stop"
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-50 hover:bg-red-100 border border-red-200 text-red-500 transition-all duration-150 active:scale-95"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!value.trim() || disabled}
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-150",
              value.trim() && !disabled
                ? "bg-violet-600 text-white shadow-sm hover:bg-violet-700 active:scale-95"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>

      <p className="px-4 pb-2 text-[10px] text-slate-400">
        {isSending ? "Generating response…" : "Enter to send · Shift+Enter for new line"}
      </p>
    </div>
  );
}
