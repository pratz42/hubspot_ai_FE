"use client";

import { AlertCircle, RefreshCw, X } from "lucide-react";

interface Props {
  error: string;
  onRetry: () => void;
  onDismiss: () => void;
}

export function QueryErrorState({ error, onRetry, onDismiss }: Props) {
  return (
    <div className="mx-4 my-3 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 flex items-start gap-3">
      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-red-700 mb-0.5">AI query failed</p>
        <p className="text-xs text-red-600 leading-relaxed">{error}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onRetry}
          className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800 border border-red-200 hover:border-red-300 px-2 py-1 rounded-lg hover:bg-red-100 transition-all duration-150"
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
        <button
          onClick={onDismiss}
          className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-100 transition-colors"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
