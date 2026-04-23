import { Brain, Clock, CheckCircle2, XCircle } from "lucide-react";
import type { ScoringStatus } from "@/hooks/useScoreStream";

interface ScoreStatusBadgeProps {
  status: ScoringStatus | string;
  size?: "sm" | "md";
}

const CONFIG: Record<string, { label: string; bg: string; color: string; Icon: React.ElementType; animate?: boolean }> = {
  pending: { label: "Queued", bg: "bg-slate-100", color: "text-slate-500", Icon: Clock },
  scoring: { label: "Scoring…", bg: "bg-blue-50", color: "text-blue-600", Icon: Brain, animate: true },
  scored: { label: "Scored", bg: "bg-emerald-100", color: "text-emerald-700", Icon: CheckCircle2 },
  failed: { label: "Failed", bg: "bg-red-100", color: "text-red-600", Icon: XCircle },
};

export function ScoreStatusBadge({ status, size = "sm" }: ScoreStatusBadgeProps) {
  const cfg = CONFIG[status] ?? CONFIG.pending;
  const Icon = cfg.Icon;
  const padding = size === "md" ? "px-2.5 py-1" : "px-1.5 py-0.5";
  const text = size === "md" ? "text-xs" : "text-[10px]";

  return (
    <span className={`inline-flex items-center gap-1 ${padding} rounded-full font-semibold ${text} ${cfg.bg} ${cfg.color}`}>
      <Icon className={`w-3 h-3 flex-shrink-0 ${cfg.animate ? "animate-pulse" : ""}`} />
      {cfg.label}
    </span>
  );
}
