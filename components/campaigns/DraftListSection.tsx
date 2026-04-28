"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown, ChevronUp, Loader2, Mail, Pencil, X,
  CheckCircle2, AlertTriangle, Save, RotateCcw,
} from "lucide-react";
import { useCampaignAssets, type CampaignAsset } from "@/hooks/useCampaignAssets";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function approvalBadge(status: string) {
  if (status === "approved")
    return <span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Approved</span>;
  if (status === "rejected")
    return <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-full px-1.5 py-0.5">Rejected</span>;
  return null;
}

// ─── Inline editor for a single asset ────────────────────────────────────────

function DraftEditor({
  asset,
  onSave,
  onCancel,
}: {
  asset: CampaignAsset;
  onSave: (patch: { subject: string; body: string; cta?: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [subject, setSubject] = useState(asset.subject);
  const [body, setBody] = useState(asset.body);
  const [cta, setCta] = useState(asset.cta ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isDirty = subject !== asset.subject || body !== asset.body || cta !== (asset.cta ?? "");

  // Auto-grow textarea
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [body]);

  async function handleSave() {
    const trimmedSubject = subject.trim();
    const trimmedBody = body.trim();
    if (!trimmedSubject) { setSaveError("Subject cannot be empty."); return; }
    if (!trimmedBody) { setSaveError("Body cannot be empty."); return; }

    setSaving(true);
    setSaveError(null);
    try {
      await onSave({
        subject: trimmedSubject,
        body: trimmedBody,
        ...(cta.trim() ? { cta: cta.trim() } : {}),
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setSubject(asset.subject);
    setBody(asset.body);
    setCta(asset.cta ?? "");
    setSaveError(null);
  }

  return (
    <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-3">
      {/* Approval-reset warning */}
      {asset.approval_status === "approved" && (
        <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            This draft was approved. Saving will reset its approval status back to <strong>pending</strong>.
          </p>
        </div>
      )}

      {/* Subject */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Subject</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={500}
          className="w-full text-sm text-slate-800 bg-white border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
          placeholder="Email subject…"
        />
        <p className="text-right text-xs text-slate-300 tabular-nums">{subject.length}/500</p>
      </div>

      {/* Body */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Body</label>
        <textarea
          ref={bodyRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          className="w-full text-sm text-slate-800 bg-white border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all resize-none leading-relaxed"
          placeholder="Email body…"
          style={{ minHeight: "160px" }}
        />
      </div>

      {/* CTA (optional) */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          CTA <span className="text-slate-300 font-normal normal-case">(optional)</span>
        </label>
        <input
          type="text"
          value={cta}
          onChange={(e) => setCta(e.target.value)}
          maxLength={300}
          className="w-full text-sm text-slate-800 bg-white border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
          placeholder="Call-to-action text…"
        />
      </div>

      {/* Error */}
      {saveError && (
        <p className="text-xs text-red-600 flex items-center gap-1.5">
          <X className="w-3.5 h-3.5" />{saveError}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        {isDirty && (
          <button
            onClick={handleReset}
            disabled={saving}
            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onCancel}
            disabled={saving}
            className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-md border border-slate-200 bg-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Single asset row ─────────────────────────────────────────────────────────

function AssetRow({
  asset,
  onPatch,
  editingId,
  onEditStart,
  onEditEnd,
}: {
  asset: CampaignAsset;
  onPatch: (assetId: number, patch: { subject: string; body: string; cta?: string }) => Promise<void>;
  editingId: number | null;
  onEditStart: (id: number) => void;
  onEditEnd: () => void;
}) {
  const isEditing = editingId === asset.id;
  const [justSaved, setJustSaved] = useState(false);

  async function handleSave(patch: { subject: string; body: string; cta?: string }) {
    await onPatch(asset.id, patch);
    setJustSaved(true);
    onEditEnd();
    setTimeout(() => setJustSaved(false), 3000);
  }

  const displayName = asset.recipient_name || asset.recipient_email || `Asset ${asset.id}`;

  return (
    <div className="border-b border-slate-100 last:border-0">
      {/* Row header */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-600 flex-shrink-0">
          {displayName.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("")}
        </div>

        {/* Name + subject */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{displayName}</p>
          <p className="text-xs text-slate-400 truncate mt-0.5">{asset.subject}</p>
        </div>

        {/* Right side: badges + edit button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {justSaved && (
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Saved
            </span>
          )}
          {asset.updated_at && !justSaved && (
            <span className="text-xs text-slate-300">Edited</span>
          )}
          {approvalBadge(asset.approval_status)}
          {!isEditing && (
            <button
              onClick={() => onEditStart(asset.id)}
              className="flex items-center gap-1 text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200 hover:bg-orange-100 rounded-md px-2 py-1 transition-colors"
            >
              <Pencil className="w-3 h-3" /> Edit
            </button>
          )}
          {isEditing && (
            <button
              onClick={onEditEnd}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 rounded-md px-2 py-1 transition-colors"
            >
              <X className="w-3 h-3" /> Close
            </button>
          )}
        </div>
      </div>

      {/* Inline editor */}
      {isEditing && (
        <div className="px-4 pb-4">
          <DraftEditor
            asset={asset}
            onSave={handleSave}
            onCancel={onEditEnd}
          />
        </div>
      )}
    </div>
  );
}

// ─── DraftListSection (public) ────────────────────────────────────────────────

interface DraftListSectionProps {
  campaignId: number;
  sequenceStep: number;
  /** When true the entire section is hidden (step already sent or active). */
  hidden?: boolean;
  /** Called after any draft is successfully saved, with the edited asset's id. */
  onDraftEdited?: (assetId: number) => void;
}

export function DraftListSection({ campaignId, sequenceStep, hidden, onDraftEdited }: DraftListSectionProps) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { assets, isLoading, error, patchAsset } = useCampaignAssets(
    open ? campaignId : null,
    open ? sequenceStep : null,
  );

  if (hidden) return null;

  async function handlePatch(
    assetId: number,
    patch: { subject: string; body: string; cta?: string },
  ) {
    await patchAsset(assetId, patch);
    onDraftEdited?.(assetId);
  }

  return (
    <div className="border-t border-slate-100">
      {/* Toggle row */}
      <button
        onClick={() => { setOpen((v) => !v); setEditingId(null); }}
        className="w-full flex items-center justify-between px-4 py-2 text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          {open
            ? <ChevronUp className="w-3 h-3" />
            : <ChevronDown className="w-3 h-3" />}
          <Mail className="w-3 h-3" />
          Preview &amp; edit drafts
        </span>
        <span className="text-slate-300 text-xs">click to {open ? "close" : "expand"}</span>
      </button>

      {open && (
        <div className="border-t border-slate-100">
          {isLoading && (
            <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading drafts…</span>
            </div>
          )}

          {error && (
            <p className="px-4 py-4 text-sm text-red-500">{error}</p>
          )}

          {!isLoading && !error && assets.length === 0 && (
            <div className="px-4 py-6 text-center">
              <Mail className="w-5 h-5 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No drafts generated yet</p>
              <p className="text-xs text-slate-300 mt-1">Generate emails first from the campaign detail page</p>
            </div>
          )}

          {assets.length > 0 && (
            <div>
              {assets.map((asset) => (
                <AssetRow
                  key={asset.id}
                  asset={asset}
                  onPatch={handlePatch}
                  editingId={editingId}
                  onEditStart={(id) => setEditingId(id)}
                  onEditEnd={() => setEditingId(null)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
