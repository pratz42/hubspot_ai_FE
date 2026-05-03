"use client";

export function ChatTypingIndicator() {
  return (
    <div className="flex items-start gap-2.5 px-4 py-2">
      {/* Avatar matching ChatMessageBubble AI avatar */}
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm text-[11px] font-bold text-white select-none">
        AI
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold tracking-wide uppercase text-slate-500">AI Assistant</span>
        <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
          <div className="flex items-center gap-1.5">
            {[0, 160, 320].map((d) => (
              <span
                key={d}
                className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce"
                style={{ animationDelay: `${d}ms`, animationDuration: "1.2s" }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
