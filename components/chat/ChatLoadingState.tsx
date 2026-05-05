"use client";

export function ChatThreadSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex flex-col gap-1.5 px-3 py-2.5 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="h-3 bg-slate-200 rounded animate-pulse flex-1" />
            <div className="h-2.5 bg-slate-100 rounded animate-pulse w-10 flex-shrink-0" />
          </div>
          <div className="h-2.5 bg-slate-100 rounded animate-pulse w-3/4" />
        </div>
      ))}
    </div>
  );
}

export function ChatMessageSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex justify-end">
        <div className="h-8 bg-violet-100 rounded-2xl rounded-br-sm animate-pulse w-48" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-4 bg-slate-200 rounded animate-pulse w-full" />
        <div className="h-4 bg-slate-200 rounded animate-pulse w-5/6" />
        <div className="h-4 bg-slate-200 rounded animate-pulse w-4/6" />
      </div>
      <div className="flex justify-end">
        <div className="h-8 bg-violet-100 rounded-2xl rounded-br-sm animate-pulse w-32" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-4 bg-slate-200 rounded animate-pulse w-full" />
        <div className="h-4 bg-slate-200 rounded animate-pulse w-2/3" />
      </div>
    </div>
  );
}
