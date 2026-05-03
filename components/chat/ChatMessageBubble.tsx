"use client";

import { useState, useEffect, useRef } from "react";
import {
  AlertCircle, RotateCcw, ChevronDown, ChevronUp, Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { renderMarkdown } from "@/lib/chat/markdown";
import { useChat } from "@/lib/chat/context";
import { decideChatApproval, fetchChatApproval } from "@/lib/chat/api";
import { ChatApprovalCard } from "./ChatApprovalCard";
import type { ChatMessage, ChatApproval, TraceStep } from "@/lib/chat/types";

/* ─── helpers ─────────────────────────────────────────────────────────────── */

function formatDateTime(iso: string) {
  try {
    const d = new Date(iso);
    const date = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit", month: "2-digit", year: "numeric",
    }).format(d).replaceAll("/", "/");
    const time = new Intl.DateTimeFormat("en", {
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(d);
    return `${date}, ${time}`;
  } catch { return ""; }
}

/* ─── sub-components ───────────────────────────────────────────────────────── */

function Avatar({ initials, variant }: { initials: string; variant: "ai" | "user" }) {
  return (
    <div
      className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold select-none shadow-sm",
        variant === "ai"
          ? "bg-gradient-to-br from-violet-500 to-violet-700 text-white"
          : "bg-slate-200 text-slate-600"
      )}
    >
      {initials}
    </div>
  );
}

function useTypewriter(content: string, isStreaming: boolean) {
  const [displayed, setDisplayed] = useState(content);
  const prevRef = useRef(content);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayed(content);
      prevRef.current = content;
      return;
    }
    if (!content.startsWith(prevRef.current)) {
      setDisplayed(content);
      prevRef.current = content;
      return;
    }
    const newChars = content.slice(prevRef.current.length);
    if (!newChars) return;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(prevRef.current + newChars.slice(0, i));
      if (i >= newChars.length) { clearInterval(iv); prevRef.current = content; }
    }, 10);
    return () => clearInterval(iv);
  }, [content, isStreaming]);

  return displayed;
}

function LiveTrace({ steps }: { steps: TraceStep[] }) {
  if (!steps.length) return null;
  const latest = steps[steps.length - 1];
  const labels: Record<string, string> = {
    guardrail: "Validating request",
    workflow_router: "Routing workflow",
    planner: "Planning tools",
    argument_extractor: "Extracting parameters",
    tool_executor: `Running ${latest.tool ?? "tool"}`,
    result_interpreter: "Interpreting result",
    response_generator: "Generating response",
  };
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-violet-400 mt-1.5 animate-pulse">
      <Cpu className="w-3 h-3" />
      <span>{labels[latest.node] ?? latest.node.replace(/_/g, " ")}…</span>
    </div>
  );
}

function TraceDrawer({ steps }: { steps: TraceStep[] }) {
  const [open, setOpen] = useState(false);
  if (!steps.length) return null;
  const icons: Record<string, string> = {
    guardrail: "🛡️", workflow_router: "🔀", planner: "📋",
    tool_executor: "⚙️", result_interpreter: "🔍", response_generator: "✍️",
  };
  return (
    <div className="mt-2.5 pt-2.5 border-t border-slate-100">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-violet-500 transition-colors"
      >
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        <Cpu className="w-3 h-3" />
        <span>{open ? "Hide" : "Show"} thinking ({steps.length} steps)</span>
      </button>
      {open && (
        <div className="mt-2 space-y-1.5 pl-1">
          {steps.map((s, i) => (
            <div key={i} className="flex gap-2 text-[11px] text-slate-500 leading-snug">
              <span className="w-4 text-center flex-shrink-0">{icons[s.node] ?? "•"}</span>
              <span>
                {s.tool && <span className="font-semibold text-slate-700">[{s.tool}] </span>}
                {s.summary}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InlineApproval({ approvalId }: { approvalId: string }) {
  const [approval, setApproval] = useState<ChatApproval | null>(null);
  const [deciding, setDeciding] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => { fetchChatApproval(approvalId).then(setApproval).catch(() => {}); }, [approvalId]);

  const handleDecide = async (id: string, action: "approve" | "reject", reason?: string) => {
    setDeciding(true);
    try {
      const updated = await decideChatApproval(id, action, reason);
      setApproval(updated);
      setDone(true);
    } finally { setDeciding(false); }
  };

  if (!approval) return null;
  if (done && approval.status !== "pending") {
    const ok = approval.status === "approved" || approval.status === "executed";
    return (
      <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
        Approval {ok ? "✅ approved and executed" : "❌ rejected"}.
      </div>
    );
  }
  return (
    <div className="mt-3 pt-3 border-t border-amber-100">
      <ChatApprovalCard approval={approval} onDecide={handleDecide} deciding={deciding} />
    </div>
  );
}

/* ─── main component ───────────────────────────────────────────────────────── */

interface Props {
  message: ChatMessage;
  onRetry?: (content: string) => void;
}

export function ChatMessageBubble({ message, onRetry }: Props) {
  const isUser = message.role === "user";
  const isError = message.status === "error";
  const isStreaming = message.isStreaming === true;
  const { setActiveView } = useChat();

  const trace = message.metadata?.trace ?? [];
  const approvalId = message.metadata?.approval_id;
  const approvalRequired = message.metadata?.approval_required;
  const displayed = useTypewriter(message.content, isStreaming);

  const senderLabel = isUser ? "You" : "AI Assistant";
  const avatarInitials = isUser ? "You" : "AI";
  const datetime = formatDateTime(message.timestamp);

  return (
    <div className={cn("flex gap-2.5 px-4 py-2", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
        <Avatar initials={avatarInitials} variant={isUser ? "user" : "ai"} />
      </div>

      {/* Content column */}
      <div className={cn("flex flex-col gap-1 min-w-0 max-w-[82%]", isUser && "items-end")}>

        {/* Sender + timestamp row — always visible */}
        <div className={cn("flex items-baseline gap-2", isUser && "flex-row-reverse")}>
          <span className={cn(
            "text-[11px] font-semibold tracking-wide uppercase",
            isUser ? "text-violet-600" : "text-slate-500"
          )}>
            {senderLabel}
          </span>
          <span className="text-[10px] text-slate-400">{datetime}</span>
          {isError && (
            <span className="text-[10px] text-red-400 flex items-center gap-0.5">
              <AlertCircle className="w-2.5 h-2.5" /> failed
            </span>
          )}
        </div>

        {/* Bubble */}
        <div
          className={cn(
            "rounded-2xl text-sm leading-relaxed shadow-sm",
            isUser
              ? cn(
                  "rounded-tr-sm px-3.5 py-2.5",
                  isError
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : "bg-violet-600 text-white"
                )
              : cn(
                  "rounded-tl-sm px-3.5 py-3 bg-white border",
                  isError ? "border-red-200" : "border-slate-100"
                )
          )}
        >
          {isUser ? (
            <p>{message.content}</p>
          ) : isError ? (
            <p className="text-red-600">{message.content ?? "An error occurred."}</p>
          ) : isStreaming && !displayed ? (
            /* dots + live trace while content hasn't started yet */
            <div>
              <div className="flex gap-1 items-center py-1">
                {[0, 150, 300].map(d => (
                  <span
                    key={d}
                    className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce"
                    style={{ animationDelay: `${d}ms`, animationDuration: "1.2s" }}
                  />
                ))}
              </div>
              <LiveTrace steps={trace} />
            </div>
          ) : (
            <div>
              <div className="prose-sm space-y-0.5">
                {renderMarkdown(displayed) ?? (
                  isStreaming
                    ? <LiveTrace steps={trace} />
                    : <p className="text-slate-400 italic text-sm">Empty response</p>
                )}
              </div>

              {/* live trace while typing */}
              {isStreaming && displayed && <LiveTrace steps={trace} />}

              {/* inline approval */}
              {!isStreaming && approvalRequired && approvalId && (
                <InlineApproval approvalId={approvalId} />
              )}
              {!isStreaming && approvalRequired && !approvalId && (
                <div className="mt-3 pt-3 border-t border-amber-100 flex items-center gap-2 text-xs text-amber-700">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="flex-1">This action needs your approval.</span>
                  <button
                    onClick={() => setActiveView("approvals")}
                    className="underline underline-offset-2 hover:text-amber-900 whitespace-nowrap"
                  >
                    View
                  </button>
                </div>
              )}

              {/* collapsible trace */}
              {!isStreaming && trace.length > 0 && <TraceDrawer steps={trace} />}
            </div>
          )}
        </div>

        {/* Retry button for failed user messages */}
        {isUser && isError && onRetry && (
          <button
            onClick={() => onRetry(message.content)}
            className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-600 transition-colors mt-0.5"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
