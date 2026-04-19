"use client";

import { useRef } from "react";
import { Sparkles, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (q: string) => void;
  loading: boolean;
  onClear: () => void;
  hasResult: boolean;
}

export function LeadsAIQueryBar({ value, onChange, onSubmit, loading, onClear, hasResult }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && value.trim()) onSubmit(value.trim());
    if (e.key === "Escape") { onClear(); inputRef.current?.blur(); }
  };

  return (
    <div className="relative flex items-center">
      {/* Left icon */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
        {loading ? (
          <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
        ) : (
          <Sparkles className={`w-4 h-4 transition-colors duration-200 ${hasResult ? "text-orange-500" : "text-amber-400"}`} />
        )}
      </div>

      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        placeholder='Ask AI: "Contacted leads" · "Top FMCG leads above $10K" · "Best LinkedIn leads sorted by score"'
        className={`pl-9 pr-28 h-10 text-sm transition-all duration-200 rounded-lg ${
          hasResult
            ? "border-orange-300 bg-orange-50/40 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
            : "border-orange-200/70 bg-white/80 focus:border-orange-300 focus:bg-white focus:ring-2 focus:ring-orange-100/60"
        }`}
      />

      {/* Right-side controls */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {value && !loading && (
          <button
            onClick={onClear}
            className="p-1 rounded text-slate-300 hover:text-orange-400 transition-colors"
            title="Clear"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <Button
          size="sm"
          disabled={!value.trim() || loading}
          onClick={() => value.trim() && onSubmit(value.trim())}
          className="h-7 px-3 text-xs font-semibold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border-0 shadow-sm shadow-orange-200/70 disabled:opacity-40 disabled:shadow-none transition-all duration-150 gap-1 hover:shadow-md hover:shadow-orange-200/60 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Sparkles className="w-3 h-3" />
          {loading ? "Thinking…" : "Ask"}
        </Button>
      </div>
    </div>
  );
}
