"use client";

import { Sparkles, User, AlertCircle, Clock, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { renderMarkdown } from "@/lib/chat/markdown";
import { useChat } from "@/lib/chat/context";
import type { ChatMessage } from "@/lib/chat/types";

function formatTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("en", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function StatusIcon({ status }: { status?: ChatMessage["status"] }) {
  if (status === "sending")
    return <Clock className="w-3 h-3 text-slate-400 animate-pulse" />;
  if (status === "error")
    return <AlertCircle className="w-3 h-3 text-red-400" />;
  return <CheckCircle className="w-3 h-3 text-slate-300" />;
}

interface Props {
  message: ChatMessage;
}

export function ChatMessageBubble({ message }: Props) {
  const isUser = message.role === "user";
  const isError = message.status === "error";
  const { setActiveView } = useChat();

  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-1 group">
        <div className="flex flex-col items-end gap-1 max-w-[85%]">
          <div
            className={cn(
              "px-3.5 py-2.5 rounded-2xl rounded-br-sm text-sm leading-relaxed",
              isError
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-violet-600 text-white shadow-sm"
            )}
          >
            {message.content}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] text-slate-400">{formatTime(message.timestamp)}</span>
            <StatusIcon status={message.status} />
          </div>
        </div>
        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 ml-2 mt-0.5">
          <User className="w-3 h-3 text-slate-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 px-4 py-1 group">
      <div
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm",
          isError
            ? "bg-red-100"
            : "bg-gradient-to-br from-violet-500 to-violet-600"
        )}
      >
        {isError ? (
          <AlertCircle className="w-3 h-3 text-red-500" />
        ) : (
          <Sparkles className="w-3 h-3 text-white" />
        )}
      </div>

      <div className="flex flex-col gap-1.5 max-w-[90%] min-w-0">
        <div
          className={cn(
            "rounded-2xl rounded-tl-sm shadow-sm border",
            isError
              ? "bg-red-50 border-red-200 px-3.5 py-2.5"
              : "bg-white border-slate-100 px-3.5 py-3"
          )}
        >
          {isError ? (
            <p className="text-sm text-red-600">{message.content ?? "An error occurred."}</p>
          ) : (
            <div className="prose-sm space-y-0.5">
              {renderMarkdown(message.content) ?? (
                <p className="text-sm text-slate-400 italic">Empty response</p>
              )}
            </div>
          )}

          {message.metadata?.approval_required && (
            <div className="mt-3 pt-3 border-t border-amber-100 bg-amber-50 -mx-3.5 -mb-3 px-3.5 pb-2.5 rounded-b-2xl">
              <div className="flex items-center gap-2 text-xs text-amber-700">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="flex-1">This action requires your approval.</span>
                <button
                  onClick={() => setActiveView("approvals")}
                  className="text-amber-700 underline underline-offset-2 hover:text-amber-900 transition-colors whitespace-nowrap"
                >
                  View Approvals
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[10px] text-slate-400">{formatTime(message.timestamp)}</span>
        </div>
      </div>
    </div>
  );
}
