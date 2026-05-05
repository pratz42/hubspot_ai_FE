export const PIPELINE_STAGE_ORDER = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;

export type PipelineStageId = (typeof PIPELINE_STAGE_ORDER)[number];

type PipelineStageMeta = {
  label: string;
  description: string;
  color: string;
  bg: string;
  border: string;
  badge: string;
  bar: string;
  isClosed: boolean;
};

export const PIPELINE_STAGE_META: Record<PipelineStageId, PipelineStageMeta> = {
  new: {
    label: "New",
    description: "Freshly captured leads",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-700",
    bar: "bg-blue-500",
    isClosed: false,
  },
  contacted: {
    label: "Contacted",
    description: "Initial outreach in progress",
    color: "text-cyan-700",
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    badge: "bg-cyan-100 text-cyan-700",
    bar: "bg-cyan-500",
    isClosed: false,
  },
  qualified: {
    label: "Qualified",
    description: "Verified fit leads",
    color: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-200",
    badge: "bg-purple-100 text-purple-700",
    bar: "bg-purple-500",
    isClosed: false,
  },
  proposal: {
    label: "Proposal",
    description: "Solution or proposal shared",
    color: "text-yellow-700",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    badge: "bg-yellow-100 text-yellow-700",
    bar: "bg-yellow-500",
    isClosed: false,
  },
  negotiation: {
    label: "Negotiation",
    description: "Commercial terms in motion",
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
    badge: "bg-orange-100 text-orange-700",
    bar: "bg-orange-500",
    isClosed: false,
  },
  won: {
    label: "Won",
    description: "Closed won deals",
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-200",
    badge: "bg-green-100 text-green-700",
    bar: "bg-green-500",
    isClosed: true,
  },
  lost: {
    label: "Lost",
    description: "Closed lost deals",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    badge: "bg-red-100 text-red-700",
    bar: "bg-red-500",
    isClosed: true,
  },
};

export const PIPELINE_STAGE_ALIASES: Record<string, PipelineStageId> = {
  active: "contacted",
  attempting: "contacted",
  connected: "contacted",
  interested: "proposal",
  closed: "won",
  invalid: "lost",
  disqualified: "lost",
  unqualified: "lost",
};

export function normalizePipelineStage(status?: string | null): PipelineStageId {
  const normalized = status?.trim().toLowerCase();

  if (!normalized) {
    return "new";
  }

  if ((PIPELINE_STAGE_ORDER as readonly string[]).includes(normalized)) {
    return normalized as PipelineStageId;
  }

  return PIPELINE_STAGE_ALIASES[normalized] ?? "new";
}

export function getPipelineStage(status?: string | null): PipelineStageMeta {
  return PIPELINE_STAGE_META[normalizePipelineStage(status)];
}
