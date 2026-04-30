"use client";

import { useState, useEffect } from "react";
import { X, Loader2, CheckCircle2, BarChart2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import API from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

export interface AssetStats {
  impressions?: number | null;
  reactions?: number | null;
  comments?: number | null;
  reposts?: number | null;
  clicks?: number | null;
  followers_gained?: number | null;
  notes?: string;
}

interface Props {
  campaignId: number;
  assetId: number | null;
  existingStats?: AssetStats;
  onClose: () => void;
  onSaved: (assetId: number, stats: AssetStats) => void;
}

const STAT_FIELDS: Array<{ key: keyof AssetStats; label: string; placeholder: string }> = [
  { key: "impressions", label: "Impressions", placeholder: "e.g. 1200" },
  { key: "reactions", label: "Reactions", placeholder: "e.g. 48" },
  { key: "comments", label: "Comments", placeholder: "e.g. 12" },
  { key: "reposts", label: "Reposts", placeholder: "e.g. 5" },
  { key: "clicks", label: "Clicks", placeholder: "e.g. 34" },
  { key: "followers_gained", label: "Followers Gained", placeholder: "e.g. 3" },
];

export function LinkedInSocialStatsDrawer({ campaignId, assetId, existingStats, onClose, onSaved }: Props) {
  const [stats, setStats] = useState<AssetStats>(existingStats || {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setStats(existingStats || {});
    setError(null);
    setSaved(false);
  }, [assetId]);

  if (assetId === null) return null;

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const { key } of STAT_FIELDS) {
        const v = stats[key];
        payload[key] = v != null && v !== "" ? Number(v) : null;
      }
      if (stats.notes?.trim()) payload.notes = stats.notes.trim();

      await API.post(`/campaigns/${campaignId}/linkedin-social/assets/${assetId}/manual-stats`, payload);
      setSaved(true);
      if (assetId !== null) onSaved(assetId, { ...stats });
      setTimeout(onClose, 1200);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save stats. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-50 w-full max-w-md bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Post Performance Stats</p>
              <p className="text-xs text-slate-400">Manually enter engagement data</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {saved ? (
            <div className="flex flex-col items-center justify-center h-32 gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-sm font-semibold text-emerald-700">Stats saved successfully</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-500 leading-relaxed">
                Enter the performance metrics for this post. These will be used for AI analysis and campaign reporting.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {STAT_FIELDS.map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">{label}</label>
                    <Input
                      type="number"
                      min={0}
                      placeholder={placeholder}
                      value={stats[key] != null ? String(stats[key]) : ""}
                      onChange={(e) => setStats((prev) => ({ ...prev, [key]: e.target.value === "" ? undefined : Number(e.target.value) }))}
                      className="border-slate-200 focus:ring-blue-500/30 focus:border-blue-400"
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Notes <span className="text-slate-300 font-normal normal-case">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Any additional observations about this post's performance…"
                  value={stats.notes || ""}
                  onChange={(e) => setStats((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full rounded-md border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!saved && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-3">
            <Button variant="outline" onClick={onClose} disabled={saving} className="flex-1 border-slate-200 text-slate-600">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Save Stats
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
