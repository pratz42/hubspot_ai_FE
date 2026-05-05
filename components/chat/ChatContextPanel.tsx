"use client";

import { MapPin, Bell, Settings } from "lucide-react";
import Link from "next/link";
import { useChat } from "@/lib/chat/context";
import { ChatApprovalsInbox } from "./ChatApprovalsInbox";

const PAGE_LABELS: Record<string, string> = {
  leads: "Leads",
  contacts: "Contacts",
  deals: "Deals",
  campaign: "Campaigns",
  reports: "Reports",
  dashboard: "Dashboard",
};

const ENTITY_LABELS: Record<string, string> = {
  lead: "Lead",
  contact: "Contact",
  deal: "Deal",
  campaign: "Campaign",
  report: "Report",
};

export function ChatContextPanel() {
  const { pageContext, pendingApprovalsCount } = useChat();

  return (
    <div className="w-80 flex-shrink-0 h-full flex flex-col border-l border-slate-100 bg-white overflow-y-auto">
      {/* Context section */}
      <div className="px-4 py-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-3.5 h-3.5 text-violet-500" />
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Current Context
          </h3>
        </div>

        {pageContext ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Page</span>
              <span className="text-[11px] font-medium text-slate-700">
                {PAGE_LABELS[pageContext.page] ?? pageContext.page}
              </span>
            </div>
            {pageContext.entity_type && (
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Type</span>
                <span className="text-[11px] font-medium text-slate-700">
                  {ENTITY_LABELS[pageContext.entity_type] ?? pageContext.entity_type}
                </span>
              </div>
            )}
            {pageContext.entity_name && (
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] text-slate-500 flex-shrink-0">Name</span>
                <span className="text-[11px] font-medium text-slate-700 text-right truncate">
                  {pageContext.entity_name}
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            Navigate to a leads, contact, deal, or campaign page for contextual suggestions.
          </p>
        )}
      </div>

      {/* Approvals section */}
      <div className="flex-1 px-4 py-3.5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-3.5 h-3.5 text-amber-500" />
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Approvals
            </h3>
          </div>
          {pendingApprovalsCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold">
              {pendingApprovalsCount}
            </span>
          )}
        </div>

        <ChatApprovalsInbox autoLoad compact />
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-100">
        <Link
          href="/admin"
          className="flex items-center gap-2 text-[11px] text-slate-500 hover:text-violet-600 transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          AI Assistant settings
        </Link>
      </div>
    </div>
  );
}
