"use client";

import { useEffect, useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import {
  Brain,
  DollarSign,
  Building2,
  Mail,
  Phone,
  Plus,
  GripVertical,
  Zap,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Kanban,
} from "lucide-react";
import Link from "next/link";
import API, { extractArray } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import {
  getPipelineStage,
  normalizePipelineStage,
  PIPELINE_STAGE_ORDER,
  type PipelineStageId,
} from "@/lib/pipeline";

interface Lead {
  id: number;
  name: string;
  company: string;
  email?: string;
  phone?: string;
  industry?: string;
  deal_size?: number;
  source?: string;
  ai_score?: number;
  ai_reason?: string;
  recommended_offerings?: string[];
  status: string;
  created_at: string;
}

const STAGE_ICONS: Record<PipelineStageId, React.ElementType> = {
  new: Clock,
  contacted: Phone,
  qualified: CheckCircle2,
  proposal: Zap,
  negotiation: TrendingUp,
  won: CheckCircle2,
  lost: XCircle,
};

const PIPELINE_STAGES = PIPELINE_STAGE_ORDER.map((id) => ({
  id,
  ...getPipelineStage(id),
  icon: STAGE_ICONS[id],
}));

function formatDeal(value?: number) {
  if (!value) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

const AVATAR_GRADIENTS = [
  "from-indigo-500 to-indigo-600",
  "from-violet-500 to-violet-600",
  "from-emerald-500 to-emerald-600",
  "from-orange-500 to-orange-600",
  "from-pink-500 to-pink-600",
  "from-teal-500 to-teal-600",
  "from-blue-500 to-blue-600",
];

function avatarGradient(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length];
}

function getScorePill(score?: number) {
  if (score === undefined) return null;
  if (score >= 80) return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  if (score >= 60) return "bg-amber-50 text-amber-700 border border-amber-200";
  return "bg-red-50 text-red-600 border border-red-200";
}

// ── Sortable Lead Card ──────────────────────────────────────────────────────

function LeadCard({ lead, overlay = false }: { lead: Lead; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id });
  const grad = avatarGradient(lead.name);
  const scorePill = getScorePill(lead.ai_score);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-150 overflow-hidden ${
        overlay ? "rotate-2 shadow-lg scale-105" : ""
      } ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
    >
      {/* Top accent */}
      <div className={`h-0.5 bg-gradient-to-r ${grad}`} />

      <div className="p-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
              {getInitials(lead.name)}
            </div>
            <div className="min-w-0">
              <Link
                href={`/leads/${lead.id}`}
                className="text-sm font-semibold text-slate-900 hover:text-orange-600 truncate block transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {lead.name}
              </Link>
              {lead.company && (
                <div className="flex items-center gap-1 text-xs text-slate-400 truncate">
                  <Building2 className="w-3 h-3 flex-shrink-0" />
                  {lead.company}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {lead.ai_score !== undefined && scorePill && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5 ${scorePill}`}>
                <Brain className="w-2.5 h-2.5" />
                {lead.ai_score}
              </span>
            )}
            <button
              {...attributes}
              {...listeners}
              className="p-1 text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Deal size */}
        {lead.deal_size ? (
          <div className="flex items-center gap-1 text-xs text-slate-600 mb-2">
            <DollarSign className="w-3 h-3 text-emerald-500" />
            <span className="font-semibold">{formatDeal(lead.deal_size)}</span>
          </div>
        ) : null}

        {/* AI insight snippet */}
        {lead.ai_reason && (
          <div className="flex items-start gap-1.5 bg-violet-50 border border-violet-100 rounded-lg px-2 py-1.5 mb-2">
            <Brain className="w-3 h-3 text-violet-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-violet-700 line-clamp-2">{lead.ai_reason}</p>
          </div>
        )}

        {/* Contact icons + industry */}
        <div className="flex items-center gap-2 mt-1">
          {lead.email && <Mail className="w-3 h-3 text-slate-300" />}
          {lead.phone && <Phone className="w-3 h-3 text-slate-300" />}
          {lead.industry && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold">
              {lead.industry}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Column ──────────────────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  leads,
}: {
  stage: (typeof PIPELINE_STAGES)[number];
  leads: Lead[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const StageIcon = stage.icon;
  const totalValue = leads.reduce((s, l) => s + (l.deal_size ?? 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[260px] max-w-[280px] rounded-xl border border-slate-200 bg-slate-50/70 flex-shrink-0 transition-all duration-150 ${
        isOver ? "ring-2 ring-orange-300 shadow-lg border-orange-200" : ""
      }`}
    >
      {/* Column header */}
      <div className="px-3 py-2.5 border-b border-slate-200/80 bg-white/60 rounded-t-xl">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5">
            <StageIcon className={`w-3.5 h-3.5 ${stage.color}`} />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{stage.label}</span>
            <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
              {leads.length}
            </span>
          </div>
        </div>
        {totalValue > 0 && (
          <p className="text-xs text-slate-400 font-medium pl-5">
            {formatDeal(totalValue)}
          </p>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px] max-h-[calc(100vh-230px)]">
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="w-5 h-5 text-slate-300 mb-1" />
              <p className="text-xs text-slate-400">{stage.description}</p>
            </div>
          ) : (
            leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)
          )}
        </SortableContext>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<number | null>(null);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    API.get("/leads")
      .then((res) => setLeads(extractArray(res.data)))
      .catch(() => toast({ title: "Failed to load leads", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [toast]);

  const grouped = useCallback(() => {
    const map: Record<string, Lead[]> = {};
    PIPELINE_STAGES.forEach((s) => (map[s.id] = []));
    leads.forEach((lead) => {
      const stage = normalizePipelineStage(lead.status);
      if (map[stage]) map[stage].push(lead);
      else map["new"].push(lead);
    });
    return map;
  }, [leads]);

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  function findStageForLead(id: number): PipelineStageId | null {
    const groups = grouped();
    for (const stageId of Object.keys(groups)) {
      if (groups[stageId].some((l) => l.id === id)) return stageId as PipelineStageId;
    }
    return null;
  }

  function getStageFromDropTarget(targetId: string | number): PipelineStageId | null {
    if (typeof targetId === "string" && (PIPELINE_STAGE_ORDER as readonly string[]).includes(targetId)) {
      return targetId as PipelineStageId;
    }
    if (typeof targetId === "number") {
      return findStageForLead(targetId);
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
    const leadId = active.id as number;
    const previousStage = findStageForLead(leadId);
    const nextStage = getStageFromDropTarget(over.id);
    if (!previousStage || !nextStage || previousStage === nextStage) return;

    setLeads((prev) =>
      prev.map((lead) => lead.id === leadId ? { ...lead, status: nextStage } : lead)
    );

    try {
      await API.patch(`/leads/${leadId}/status`, { status: nextStage });
      toast({ title: "Lead moved", description: `Moved to ${getPipelineStage(nextStage).label}`, variant: "success" });
    } catch {
      setLeads((prev) =>
        prev.map((lead) => lead.id === leadId ? { ...lead, status: previousStage } : lead)
      );
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  }

  const groups = grouped();
  const wonDeals = groups["won"].reduce((s, l) => s + (l.deal_size ?? 0), 0);
  const winRate = leads.length ? Math.round((groups["won"].length / leads.length) * 100) : 0;

  if (loading) {
    return (
      <div className="p-6 space-y-5">
        <div className="h-7 bg-slate-200 rounded-lg w-36 animate-pulse" />
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((s) => (
            <div key={s.id} className="min-w-[260px] rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
              <div className="h-5 bg-slate-200 rounded w-24 animate-pulse" />
              {[...Array(3)].map((_, i) => <div key={i} className="h-24 w-full rounded-xl bg-slate-200 animate-pulse" />)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-sm">
                <Kanban className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Pipeline</h1>
            </div>
            <p className="text-sm text-slate-500 mt-0.5 ml-9">Drag cards to update deal stage</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3">
              <div className="flex flex-col items-center px-4 py-2 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-base font-bold text-slate-900">{leads.length}</p>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total</p>
              </div>
              <div className="flex flex-col items-center px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
                <p className="text-base font-bold text-emerald-700">{formatDeal(wonDeals) ?? "$0"}</p>
                <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider">Won</p>
              </div>
              <div className="flex flex-col items-center px-4 py-2 rounded-xl bg-orange-50 border border-orange-200">
                <p className="text-base font-bold text-orange-600">{winRate}%</p>
                <p className="text-[10px] font-semibold text-orange-400 uppercase tracking-wider">Win Rate</p>
              </div>
            </div>
            <Link href="/leads">
              <Button size="sm" className="bg-orange-600 hover:bg-orange-700 h-8 text-xs font-semibold">
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Lead
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 h-full">
            {PIPELINE_STAGES.map((stage) => (
              <KanbanColumn key={stage.id} stage={stage} leads={groups[stage.id] ?? []} />
            ))}
          </div>

          <DragOverlay>
            {activeLead ? <LeadCard lead={activeLead} overlay /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
