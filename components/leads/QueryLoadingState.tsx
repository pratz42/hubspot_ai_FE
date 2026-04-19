"use client";

import { Brain } from "lucide-react";

const STEPS = ["Parsing intent", "Applying filters", "Ranking results"];

export function QueryLoadingState() {
  return (
    <div className="flex flex-col items-center gap-4 py-10 border-b border-violet-100/70 bg-gradient-to-b from-violet-50/50 to-transparent">
      {/* Animated icon */}
      <div className="relative">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-200">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div className="absolute inset-0 rounded-2xl bg-violet-400/25 animate-ping" />
      </div>

      {/* Text */}
      <div className="text-center space-y-1.5">
        <p className="text-sm font-semibold text-violet-800">AI is analyzing your query</p>
        <div className="flex items-center gap-2 justify-center text-xs text-slate-400 flex-wrap">
          {STEPS.map((step, i) => (
            <span key={step} className="flex items-center gap-2">
              {i > 0 && <span className="text-slate-200">·</span>}
              <span
                className="animate-pulse"
                style={{ animationDelay: `${i * 350}ms`, animationDuration: "1.4s" }}
              >
                {step}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Bouncing dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce"
            style={{ animationDelay: `${i * 110}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
