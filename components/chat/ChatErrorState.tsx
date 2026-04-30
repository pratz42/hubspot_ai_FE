"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  message: string;
  onRetry?: () => void;
}

export function ChatErrorState({ message, onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 px-4 text-center">
      <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
        <AlertCircle className="w-5 h-5 text-red-500" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-800">Something went wrong</p>
        <p className="text-xs text-slate-500 mt-0.5">{message}</p>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="gap-1.5 text-xs h-7"
        >
          <RefreshCw className="w-3 h-3" />
          Try again
        </Button>
      )}
    </div>
  );
}
