"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  rectIntersection,
  type CollisionDetection,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Briefcase,
  DollarSign,
  Building2,
  GripVertical,
  Plus,
  AlertCircle,
  Users,
  Calendar,
  TrendingUp,
  X,
  Loader2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import API from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";

interface PipelineStage {
  id: number;
  name: string;
  display_order: number;
  probability: number;
  is_closed_won: boolean;
  is_closed_lost: boolean;
  color?: string;
}

interface Deal {
  id: number;
  name: string;
  amount?: number;
  close_date?: string;
  stage_id: number;
  stage_name: string;
  probability?: number;
  owner?: string;
  primary_contact_id?: number;
  primary_company_id?: number;
  contacts: { id: number; first_name: string; last_name?: string }[];
  companies: { id: number; name: string }[];
  created_at: string;
}

const STAGE_COLORS: Record<string, string> = {
  "On Hold": "text-slate-500",
  "MQL": "text-blue-600",
  "SQL": "text-indigo-600",
  "Solutioning": "text-violet-600",
  "POC": "text-purple-600",
  "Proposal": "text-yellow-600",
  "Contracting": "text-orange-600",
  "Won": "text-emerald-600",
  "Lost": "text-red-500",
};

const STAGE_BG: Record<string, string> = {
  "On Hold": "bg-slate-50",
  "MQL": "bg-blue-50",
  "SQL": "bg-indigo-50",
  "Solutioning": "bg-violet-50",
  "POC": "bg-purple-50",
  "Proposal": "bg-yellow-50",
  "Contracting": "bg-orange-50",
  "Won": "bg-emerald-50",
  "Lost": "bg-red-50",
};

const AVATAR_GRADIENTS = [
  "from-indigo-500 to-indigo-600",
  "from-violet-500 to-violet-600",
  "from-emerald-500 to-emerald-600",
  "from-orange-500 to-orange-600",
  "from-pink-500 to-pink-600",
];

function avatarGradient(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length];
}

function formatAmount(value?: number) {
  if (!value) return null;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

// ── Deal Card ────────────────────────────────────────────────────────────────

function DealCard({ deal, overlay = false }: { deal: Deal; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id });
  const grad = avatarGradient(deal.name);
  const primaryCompany = deal.companies?.[0];
  const primaryContact = deal.contacts?.[0];

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // When actively dragging, show a dashed placeholder in the source column
  // instead of a semi-transparent ghost — the DragOverlay is the only full card.
  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={{ ...style, height: "120px", opacity: 0.4 }}
        className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-150 overflow-hidden ${
        overlay ? "rotate-2 shadow-lg scale-105" : ""
      } cursor-grab`}
    >
      <div className={`h-0.5 bg-gradient-to-r ${grad}`} />
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <a href={`/deals/${deal.id}`} onClick={(e) => e.stopPropagation()} className="text-sm font-semibold text-slate-900 hover:text-orange-600 leading-tight line-clamp-2 flex-1 transition-colors">{deal.name}</a>
          <button
            {...attributes}
            {...listeners}
            className="p-1 text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
        </div>

        {deal.amount ? (
          <div className="flex items-center gap-1 text-xs text-slate-600 mb-2">
            <DollarSign className="w-3 h-3 text-emerald-500" />
            <span className="font-bold text-emerald-700">{formatAmount(deal.amount)}</span>
          </div>
        ) : null}

        <div className="space-y-1 text-xs text-slate-500">
          {primaryCompany && (
            <div className="flex items-center gap-1">
              <Building2 className="w-3 h-3 text-slate-300 flex-shrink-0" />
              <span className="truncate">{primaryCompany.name}</span>
            </div>
          )}
          {primaryContact && (
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3 text-slate-300 flex-shrink-0" />
              <span className="truncate">{primaryContact.first_name} {primaryContact.last_name ?? ""}</span>
            </div>
          )}
          {deal.close_date && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-300 flex-shrink-0" />
              <span>{new Date(deal.close_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
          )}
        </div>

        {deal.probability !== undefined && deal.probability !== null && (
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2">
            <TrendingUp className="w-3 h-3 text-slate-300" />
            <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-400 rounded-full"
                style={{ width: `${deal.probability}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold text-slate-500">{deal.probability}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

const COLUMN_PAGE_SIZE = 10;

// ── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  deals,
  limit,
  onShowMore,
}: {
  stage: PipelineStage;
  deals: Deal[];
  limit: number;
  onShowMore: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `stage-${stage.id}` });
  const stageColor = STAGE_COLORS[stage.name] ?? "text-slate-600";
  const stageBg = STAGE_BG[stage.name] ?? "bg-slate-50";
  const totalValue = deals.reduce((s, d) => s + (d.amount ?? 0), 0);
  const isClosed = stage.is_closed_won || stage.is_closed_lost;
  const visibleDeals = deals.slice(0, limit);
  const hiddenCount = deals.length - visibleDeals.length;

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[240px] max-w-[260px] rounded-xl border border-slate-200 ${stageBg} flex-shrink-0 transition-all duration-150 ${
        isOver ? "ring-2 ring-orange-300 shadow-lg border-orange-200" : ""
      }`}
    >
      <div className="px-3 py-2.5 border-b border-slate-200/80 bg-white/60 rounded-t-xl">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-bold uppercase tracking-wider ${stageColor}`}>{stage.name}</span>
            <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
              {deals.length}
            </span>
            {isClosed && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${stage.is_closed_won ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                {stage.is_closed_won ? "WON" : "LOST"}
              </span>
            )}
          </div>
        </div>
        {totalValue > 0 && (
          <p className="text-xs text-slate-400 font-medium">{formatAmount(totalValue)}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px] max-h-[calc(100vh-240px)]">
        <SortableContext items={visibleDeals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          {visibleDeals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="w-5 h-5 text-slate-300 mb-1" />
              <p className="text-xs text-slate-400">No deals</p>
            </div>
          ) : (
            visibleDeals.map((deal) => <DealCard key={deal.id} deal={deal} />)
          )}
        </SortableContext>
        {hiddenCount > 0 && (
          <button
            onClick={onShowMore}
            className="w-full py-2 text-xs font-semibold text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg border border-dashed border-orange-200 transition-colors"
          >
            Show {Math.min(COLUMN_PAGE_SIZE, hiddenCount)} more · {hiddenCount} remaining
          </button>
        )}
      </div>
    </div>
  );
}

// ── Add Deal Form ────────────────────────────────────────────────────────────

interface AssocItem { id: number; label: string; sub: string; company_id?: number; }

function AddDealDrawer({
  stages,
  onClose,
  onCreated,
}: {
  stages: PipelineStage[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({ name: "", amount: "", close_date: "", stage_id: stages[0]?.id ?? 0, owner: "", description: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [userEmails, setUserEmails] = useState<string[]>([]);

  useEffect(() => {
    API.get("/admin/users/emails").then((r) => setUserEmails(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  // Contacts multi-select
  const [contactSearch, setContactSearch] = useState("");
  const [contactResults, setContactResults] = useState<AssocItem[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<AssocItem[]>([]);

  // Companies multi-select
  const [companySearch, setCompanySearch] = useState("");
  const [companyResults, setCompanyResults] = useState<AssocItem[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<AssocItem[]>([]);
  const [primaryCompanyId, setPrimaryCompanyId] = useState<number | null>(null);

  async function searchContacts(q: string) {
    if (q.length < 2) { setContactResults([]); return; }
    const res = await API.get("/contacts", { params: { search: q, limit: 8 } });
    const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
    setContactResults(list.map((c: { id: number; first_name: string; last_name?: string; email: string; company_id?: number }) => ({
      id: c.id, label: `${c.first_name} ${c.last_name ?? ""}`.trim(), sub: c.email, company_id: c.company_id,
    })));
  }

  async function searchCompanies(q: string) {
    if (q.length < 2) { setCompanyResults([]); return; }
    const res = await API.get("/companies", { params: { search: q, limit: 8 } });
    const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
    setCompanyResults(list.map((c: { id: number; name: string; industry?: string }) => ({
      id: c.id, label: c.name, sub: c.industry ?? "",
    })));
  }

  async function addContact(item: AssocItem) {
    if (!selectedContacts.find((c) => c.id === item.id)) {
      setSelectedContacts((p) => [...p, item]);
      // Auto-fetch and set contact's company as primary
      if (item.company_id) {
        setSelectedCompanies((prev) => {
          if (prev.find((c) => c.id === item.company_id)) return prev;
          // Fetch asynchronously then update
          API.get(`/companies/${item.company_id}`).then((res) => {
            const co = res.data;
            const companyItem: AssocItem = { id: co.id, label: co.name, sub: co.industry ?? "" };
            setSelectedCompanies((p) => p.find((c) => c.id === co.id) ? p : [...p, companyItem]);
            setPrimaryCompanyId((curr) => curr ?? co.id);
          }).catch(() => { /* ignore if company fetch fails */ });
          return prev;
        });
      }
    }
    setContactSearch(""); setContactResults([]);
  }

  function addCompany(item: AssocItem) {
    if (!selectedCompanies.find((c) => c.id === item.id)) {
      setSelectedCompanies((p) => {
        const next = [...p, item];
        if (!primaryCompanyId) setPrimaryCompanyId(item.id);
        return next;
      });
    }
    setCompanySearch(""); setCompanyResults([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) { setError("Deal name is required."); return; }
    if (selectedContacts.length === 0 && selectedCompanies.length === 0) {
      setError("Associate at least one contact or company with this deal."); return;
    }
    if (selectedCompanies.length > 0 && !primaryCompanyId) { setError("Mark one company as primary."); return; }
    setSaving(true);
    try {
      const selectedStage = stages.find((s) => s.id === Number(form.stage_id));
      await API.post("/deals", {
        name: form.name.trim(),
        amount: form.amount ? Number(form.amount) : undefined,
        close_date: form.close_date || undefined,
        stage_id: Number(form.stage_id),
        stage_name: selectedStage?.name ?? "",
        pipeline_id: null,
        owner: form.owner.trim() || undefined,
        contact_ids: selectedContacts.map((c) => c.id),
        company_ids: selectedCompanies.map((c) => c.id),
        primary_company_id: primaryCompanyId || undefined,
        primary_contact_id: selectedContacts[0]?.id || undefined,
        description: form.description.trim() || undefined,
      });
      onCreated();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Failed to create deal.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Create Deal</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">{error}</div>}

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">Deal Name *</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-9 text-sm" placeholder="Enterprise Logistics Deal" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Amount (₹)</label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="h-9 text-sm" placeholder="500000" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Close Date</label>
              <Input type="date" value={form.close_date} onChange={(e) => setForm({ ...form, close_date: e.target.value })} className="h-9 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Stage</label>
              <div className="relative">
                <select value={form.stage_id} onChange={(e) => setForm({ ...form, stage_id: Number(e.target.value) })} className="w-full h-9 border border-slate-200 rounded-lg px-3 text-sm text-slate-900 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500">
                  {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Deal Owner</label>
              <div className="relative">
                <select value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} className="w-full h-9 border border-slate-200 rounded-lg px-3 text-sm text-slate-900 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <option value="">— Select owner —</option>
                  {userEmails.map((email) => <option key={email} value={email}>{email}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">Description / Notes</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Additional context, goals, or notes for this deal…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
          </div>

          {/* Companies */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">
              Companies <span className="text-red-500">*</span> <span className="text-slate-400 font-normal">(required if no contact; mark one primary)</span>
            </label>
            <div className="relative">
              <Input value={companySearch} onChange={(e) => { setCompanySearch(e.target.value); searchCompanies(e.target.value); }} className="h-9 text-sm" placeholder="Search companies…" />
              {companyResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                  {companyResults.map((r) => (
                    <button key={r.id} type="button" onClick={() => addCompany(r)} className="w-full px-3 py-2 text-left hover:bg-orange-50 border-b border-slate-100 last:border-0">
                      <p className="text-sm font-semibold text-slate-800">{r.label}</p>
                      {r.sub && <p className="text-xs text-slate-400">{r.sub}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedCompanies.length > 0 && (
              <div className="mt-2 space-y-1">
                {selectedCompanies.map((c) => (
                  <div key={c.id} className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs ${primaryCompanyId === c.id ? "border-orange-300 bg-orange-50" : "border-slate-200 bg-slate-50"}`}>
                    <div>
                      <span className="font-semibold text-slate-800">{c.label}</span>
                      {primaryCompanyId === c.id && <span className="ml-2 text-orange-600 font-bold">Primary</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {primaryCompanyId !== c.id && (
                        <button type="button" onClick={() => setPrimaryCompanyId(c.id)} className="text-orange-500 hover:text-orange-700 font-semibold">Set primary</button>
                      )}
                      <button type="button" onClick={() => { setSelectedCompanies((p) => p.filter((x) => x.id !== c.id)); if (primaryCompanyId === c.id) setPrimaryCompanyId(null); }} className="text-slate-400 hover:text-red-500">×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Contacts */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">
              Contacts <span className="text-red-500">*</span> <span className="text-slate-400 font-normal">(required if no company; auto-links company)</span>
            </label>
            <div className="relative">
              <Input value={contactSearch} onChange={(e) => { setContactSearch(e.target.value); searchContacts(e.target.value); }} className="h-9 text-sm" placeholder="Search contacts by name or email…" />
              {contactResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                  {contactResults.map((r) => (
                    <button key={r.id} type="button" onClick={() => addContact(r)} className="w-full px-3 py-2 text-left hover:bg-orange-50 border-b border-slate-100 last:border-0">
                      <p className="text-sm font-semibold text-slate-800">{r.label}</p>
                      <p className="text-xs text-slate-400">{r.sub}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedContacts.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedContacts.map((c) => (
                  <span key={c.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold rounded-full">
                    {c.label}
                    <button type="button" onClick={() => setSelectedContacts((p) => p.filter((x) => x.id !== c.id))} className="hover:text-red-500 ml-0.5">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2">
            <Button type="submit" disabled={saving} className="w-full bg-orange-600 hover:bg-orange-700 h-9 text-sm font-semibold">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</> : "Create Deal"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Only trigger collision when pointer is physically inside a droppable/sortable.
// closestCorners (the previous algorithm) matches by nearest corner distance,
// which causes a column whose corners happen to be geometrically close to the
// sidebar to fire even when the pointer is nowhere near it.
const kanbanCollision: CollisionDetection = (args) => {
  const intersections = rectIntersection(args);
  if (intersections.length > 0) return intersections;
  return [];
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DealsPage() {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [columnLimits, setColumnLimits] = useState<Record<number, number>>({});
  const { toast } = useToast();

  // CSV import
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; failed: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateScrollButtons() {
    const el = boardRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }

  function scrollBoard(dir: "left" | "right") {
    const el = boardRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -280 : 280, behavior: "smooth" });
  }

  async function handleImport() {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    const fd = new FormData();
    fd.append("file", importFile);
    try {
      const res = await API.post("/deals/import-csv", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setImportResult(res.data);
      fetchData();
    } catch {
      setImportResult({ created: 0, failed: -1 });
    } finally {
      setImporting(false);
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  async function fetchData() {
    try {
      const [pipelineRes, dealsRes] = await Promise.all([
        API.get("/pipelines/default"),
        API.get("/deals", { params: { per_page: 500 } }),
      ]);
      const sortedStages = (pipelineRes.data.stages as PipelineStage[]).sort(
        (a, b) => a.display_order - b.display_order
      );
      setStages(sortedStages);
      const dealsData: Deal[] = Array.isArray(dealsRes.data) ? dealsRes.data : (dealsRes.data?.data ?? []);
      setDeals(dealsData);
    } catch {
      toast({ title: "Failed to load deals", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    updateScrollButtons();
    el.addEventListener("scroll", updateScrollButtons);
    const ro = new ResizeObserver(updateScrollButtons);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", updateScrollButtons); ro.disconnect(); };
  }, [stages]); // re-run when stages load

  const grouped = useCallback((): Record<number, Deal[]> => {
    const map: Record<number, Deal[]> = {};
    stages.forEach((s) => { map[s.id] = []; });
    deals.forEach((deal) => {
      if (map[deal.stage_id] !== undefined) map[deal.stage_id].push(deal);
      else if (stages.length > 0) map[stages[0].id].push(deal);
    });
    return map;
  }, [deals, stages]);

  const activeDeal = activeId ? deals.find((d) => d.id === activeId) : null;

  function findStageForDeal(id: number): number | null {
    const groups = grouped();
    for (const stageId of Object.keys(groups)) {
      if (groups[Number(stageId)].some((d) => d.id === id)) return Number(stageId);
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as number);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const dealId = active.id as number;
    const overIdRaw = over.id as string | number;

    // Stage droppables use "stage-{id}" prefix to avoid colliding with deal IDs.
    const isStage = typeof overIdRaw === "string" && overIdRaw.startsWith("stage-");
    const nextStageId: number | null = isStage
      ? Number((overIdRaw as string).replace("stage-", ""))
      : findStageForDeal(overIdRaw as number);
    const previousStageId = findStageForDeal(dealId);

    if (!previousStageId || !nextStageId || previousStageId === nextStageId) return;

    const nextStage = stages.find((s) => s.id === nextStageId);
    if (!nextStage) return;

    setDeals((prev) =>
      prev.map((d) =>
        d.id === dealId ? { ...d, stage_id: nextStageId!, stage_name: nextStage.name, probability: nextStage.probability } : d
      )
    );

    try {
      await API.patch(`/deals/${dealId}/stage`, { stage_id: nextStageId, stage_name: nextStage.name });
      toast({ title: "Deal moved", description: `Moved to ${nextStage.name}`, variant: "success" });
    } catch {
      setDeals((prev) =>
        prev.map((d) => {
          if (d.id !== dealId) return d;
          const prevStage = stages.find((s) => s.id === previousStageId);
          return { ...d, stage_id: previousStageId!, stage_name: prevStage?.name ?? d.stage_name };
        })
      );
      toast({ title: "Failed to update stage", variant: "destructive" });
    }
  }

  const totalValue = deals.reduce((s, d) => s + (d.amount ?? 0), 0);
  const wonDeals = deals.filter((d) => stages.find((s) => s.id === d.stage_id)?.is_closed_won);
  const wonValue = wonDeals.reduce((s, d) => s + (d.amount ?? 0), 0);
  const groups = grouped();

  if (loading) {
    return (
      <div className="p-6 space-y-5">
        <div className="h-7 bg-slate-200 rounded-lg w-36 animate-pulse" />
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="min-w-[240px] rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
              <div className="h-5 bg-slate-200 rounded w-24 animate-pulse" />
              {[...Array(2)].map((_, j) => <div key={j} className="h-20 w-full rounded-xl bg-slate-200 animate-pulse" />)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={kanbanCollision}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
    <div className="flex flex-col" style={{ height: "100vh", maxWidth: "100%", overflow: "hidden" }}>
      {/* Top bar — sticky so it never scrolls with the board */}
      <div className="flex-none px-6 py-3 border-b border-slate-200 bg-white z-10">
        <div className="flex items-center justify-between gap-4 min-w-0">
          {/* Left: title */}
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-sm flex-shrink-0">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Deals</h1>
              <p className="text-xs text-slate-500 hidden sm:block">Drag cards between stages</p>
            </div>
          </div>

          {/* Right: metrics + actions — always in view */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden lg:flex items-center gap-2">
              <div className="flex flex-col items-center px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-sm font-bold text-slate-900">{deals.length}</p>
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Total</p>
              </div>
              <div className="flex flex-col items-center px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-sm font-bold text-blue-700">{formatAmount(totalValue) ?? "₹0"}</p>
                <p className="text-[9px] font-semibold text-blue-400 uppercase tracking-wider">Pipeline</p>
              </div>
              <div className="flex flex-col items-center px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <p className="text-sm font-bold text-emerald-700">{formatAmount(wonValue) ?? "₹0"}</p>
                <p className="text-[9px] font-semibold text-emerald-500 uppercase tracking-wider">Won</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-semibold border-slate-200 whitespace-nowrap"
              onClick={() => { setImportOpen(true); setImportResult(null); setImportFile(null); }}
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Import CSV
            </Button>
            <Button
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 h-8 text-xs font-semibold whitespace-nowrap"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Deal
            </Button>
          </div>
        </div>
      </div>

      {/* Board — only this scrolls horizontally */}
      <div className="flex-1 min-h-0 flex relative">
        {/* Left scroll button */}
        {canScrollLeft && (
          <button
            onClick={() => scrollBoard("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-9 h-16 flex items-center justify-center bg-white border border-slate-200 rounded-r-xl shadow-md hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 transition-all text-slate-500"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <div ref={boardRef} className="kanban-scroll flex-1 min-h-0 overflow-x-auto overflow-y-hidden p-4">
          <div className="flex gap-3 h-full">
            {stages.map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                deals={groups[stage.id] ?? []}
                limit={columnLimits[stage.id] ?? COLUMN_PAGE_SIZE}
                onShowMore={() => setColumnLimits((prev) => ({ ...prev, [stage.id]: (prev[stage.id] ?? COLUMN_PAGE_SIZE) + COLUMN_PAGE_SIZE }))}
              />
            ))}
          </div>
        </div>

        {/* Right scroll button */}
        {canScrollRight && (
          <button
            onClick={() => scrollBoard("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-9 h-16 flex items-center justify-center bg-white border border-slate-200 rounded-l-xl shadow-md hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 transition-all text-slate-500"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {addOpen && (
        <AddDealDrawer
          stages={stages}
          onClose={() => setAddOpen(false)}
          onCreated={fetchData}
        />
      )}

      {/* CSV Import Modal */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setImportOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Import Deals CSV</h2>
              <button onClick={() => setImportOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Required: <code className="bg-slate-100 px-1 rounded">name</code>. Optional: amount, close_date, stage, company, contact, owner, description.
            </p>
            <div
              className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-orange-400 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              {importFile ? <p className="text-sm font-semibold text-slate-700">{importFile.name}</p> : <p className="text-sm text-slate-400">Click to select CSV file</p>}
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} />
            </div>
            {importResult && (
              <div className={`rounded-lg px-4 py-3 text-sm ${importResult.failed === -1 ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
                {importResult.failed === -1 ? "Import failed. Check your CSV format." : `Created: ${importResult.created} · Failed: ${importResult.failed}`}
              </div>
            )}
            <Button onClick={handleImport} disabled={!importFile || importing} className="w-full bg-orange-600 hover:bg-orange-700 h-9 text-sm font-semibold">
              {importing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing…</> : "Import"}
            </Button>
          </div>
        </div>
      )}
    </div>
    <DragOverlay>
      {activeDeal ? <DealCard deal={activeDeal} overlay /> : null}
    </DragOverlay>
    </DndContext>
  );
}
