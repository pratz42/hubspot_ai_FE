"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page: number;
  total: number;
  perPage: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, total, perPage, onChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (totalPages <= 1) return null;

  // Build page window: always show first, last, current ±2
  const pages: (number | "…")[] = [];
  const add = (n: number) => { if (n >= 1 && n <= totalPages && !pages.includes(n)) pages.push(n); };
  add(1);
  for (let i = page - 2; i <= page + 2; i++) add(i);
  add(totalPages);

  const withEllipsis: (number | "…")[] = [];
  let prev = 0;
  for (const p of pages as number[]) {
    if (prev && p - prev > 1) withEllipsis.push("…");
    withEllipsis.push(p);
    prev = p;
  }

  return (
    <div className="flex items-center justify-between px-1 py-3 border-t border-slate-100 mt-4">
      <p className="text-xs text-slate-400">
        Showing {Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)} of {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        {withEllipsis.map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-slate-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p as number)}
              className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                p === page
                  ? "bg-orange-600 text-white"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
