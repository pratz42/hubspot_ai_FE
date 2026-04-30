"use client";

import { useEffect, useState } from "react";
import { X, Loader2, ChevronDown, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import API from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

interface PipelineStage {
  id: number;
  name: string;
  display_order: number;
  probability: number;
}

interface UserRecord {
  user_id: string;
  email: string;
}

export interface EditableDeal {
  id: number;
  name: string;
  amount?: number;
  close_date?: string;
  stage_id?: number;
  stage_name?: string;
  probability?: number;
  owner?: string;
  description?: string;
}

interface EditDealDrawerProps {
  deal: EditableDeal;
  onClose: () => void;
  onSaved: (updated: EditableDeal) => void;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function resolveOwnerToEmail(owner: string | undefined, users: UserRecord[]): string {
  if (!owner) return "";
  if (isUuid(owner)) {
    return users.find((u) => u.user_id === owner)?.email ?? "";
  }
  return owner;
}

export function EditDealDrawer({ deal, onClose, onSaved }: EditDealDrawerProps) {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadingMeta, setLoadingMeta] = useState(true);

  const [form, setForm] = useState({
    amount: deal.amount?.toString() ?? "",
    close_date: deal.close_date?.slice(0, 10) ?? "",
    stage_id: deal.stage_id ?? 0,
    probability: deal.probability?.toString() ?? "",
    owner: "",
    description: deal.description ?? "",
  });

  useEffect(() => {
    Promise.all([
      API.get("/pipelines/default"),
      API.get("/auth/users"),
    ]).then(([pRes, uRes]) => {
      const sortedStages = ((pRes.data.stages ?? []) as PipelineStage[]).sort(
        (a, b) => a.display_order - b.display_order
      );
      setStages(sortedStages);
      const userList: UserRecord[] = Array.isArray(uRes.data) ? uRes.data : [];
      setUsers(userList);
      setForm((f) => ({
        ...f,
        stage_id: deal.stage_id ?? sortedStages[0]?.id ?? 0,
        owner: resolveOwnerToEmail(deal.owner, userList),
      }));
    }).catch(() => {}).finally(() => setLoadingMeta(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleStageChange(stageId: number) {
    const stage = stages.find((s) => s.id === stageId);
    setForm((f) => ({
      ...f,
      stage_id: stageId,
      probability: stage?.probability?.toString() ?? f.probability,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const selectedStage = stages.find((s) => s.id === Number(form.stage_id));
      const payload: Record<string, unknown> = {};

      if (form.amount !== "") payload.amount = Number(form.amount);
      if (form.close_date) payload.close_date = form.close_date;
      if (form.stage_id) {
        payload.stage_id = form.stage_id;
        payload.stage_name = selectedStage?.name ?? deal.stage_name;
      }
      if (form.probability !== "") payload.probability = Number(form.probability);
      if (form.owner) payload.owner = form.owner;
      if (form.description) payload.description = form.description;

      const res = await API.patch(`/deals/${deal.id}`, payload);
      onSaved(res.data);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save changes."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={() => { if (!saving) onClose(); }} />
      <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Edit Deal</h2>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[260px]">{deal.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loadingMeta ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2.5">
                {error}
              </div>
            )}

            {/* Read-only name */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 px-4 py-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Deal Name</p>
              <p className="text-sm font-semibold text-slate-700">{deal.name}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Amount (₹)</label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="h-9 text-sm"
                  placeholder="500000"
                  min={0}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Close Date</label>
                <Input
                  type="date"
                  value={form.close_date}
                  onChange={(e) => setForm((f) => ({ ...f, close_date: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Stage</label>
                <div className="relative">
                  <select
                    value={form.stage_id}
                    onChange={(e) => handleStageChange(Number(e.target.value))}
                    className="w-full h-9 border border-slate-200 rounded-lg px-3 text-sm text-slate-900 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Probability (%)</label>
                <Input
                  type="number"
                  value={form.probability}
                  onChange={(e) => setForm((f) => ({ ...f, probability: e.target.value }))}
                  className="h-9 text-sm"
                  placeholder="50"
                  min={0}
                  max={100}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Deal Owner</label>
              <div className="relative">
                <select
                  value={form.owner}
                  onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
                  className="w-full h-9 border border-slate-200 rounded-lg px-3 text-sm text-slate-900 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">— Select owner —</option>
                  {users.map((u) => (
                    <option key={u.user_id} value={u.email}>{u.email}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Description / Notes</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={4}
                placeholder="Additional context, goals, or notes…"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={saving}
                className="flex-1 h-9 text-sm border-slate-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="flex-1 h-9 text-sm bg-orange-600 hover:bg-orange-700 font-semibold"
              >
                {saving
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
                  : "Save Changes"
                }
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
