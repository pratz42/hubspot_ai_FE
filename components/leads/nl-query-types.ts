export interface NLHardFilters {
  industry: string | null;
  source: string | null;
  company: string | null;
  status: string | null;
  min_deal_size: number | null;
  max_deal_size: number | null;
  min_ai_score: number | null;
  max_ai_score: number | null;
}

export interface NLSemanticIntent {
  query: string | null;
  text_terms: string[];
  use_semantic_ranking: boolean;
  apply_keyword_prefilter: boolean;
}

export interface NLSortIntent {
  field: string | null;
  order: "asc" | "desc";
}

export interface NLQueryPlan {
  hard_filters: NLHardFilters;
  semantic_intent: NLSemanticIntent;
  sort_intent: NLSortIntent;
  limit: number;
}

export type NLResultMode = "filter" | "semantic" | "sort";

export interface NLQueryResponse<T = Record<string, unknown>> {
  query_plan: NLQueryPlan;
  result_mode: NLResultMode;
  count: number;
  results: T[];
}
