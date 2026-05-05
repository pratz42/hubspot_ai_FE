export type MessageRole = "user" | "assistant";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "executed" | "failed";
export type ChatPanelView = "chat" | "threads" | "approvals";

export interface TraceStep {
  node: string;
  summary: string;
  tool?: string | null;
}

export interface ChatAction {
  label: string;
  action: string;
  variant?: "default" | "destructive" | "outline";
}

export interface ChatChoice {
  index: number;
  entity: string;
  field: string;
  id: number | string;
  label: string;
  subtitle?: string | null;
  /** When present, send this full text to the chat instead of the numeric index. */
  action?: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  status?: "sending" | "sent" | "error";
  isStreaming?: boolean;
  metadata?: {
    approval_required?: boolean;
    approval_id?: string;
    actions?: ChatAction[];
    choices?: ChatChoice[];
    trace?: TraceStep[];
    selected_tools?: string[];
  };
}

export interface ChatThread {
  thread_id: string;
  title: string;
  last_message?: string;
  last_message_at: string;
  message_count?: number;
  status?: "active" | "archived";
}

export interface ChatThreadDetail extends ChatThread {
  messages: ChatMessage[];
}

export interface ChatApproval {
  approval_id: string;
  thread_id?: string;
  title: string;
  description: string;
  tool?: string;
  reason?: string;
  arguments?: Record<string, unknown>;
  action_type?: string;
  context?: Record<string, unknown>;
  status: ApprovalStatus;
  created_at: string;
  requested_at?: string;
  decided_at?: string;
  decided_by?: string;
  resolved_at?: string;
  resolved_by?: string;
}

export interface ChatPreferences {
  tone: "professional" | "casual" | "concise";
  response_length: "brief" | "detailed" | "balanced";
  approval_strictness: "always_ask" | "smart" | "auto_approve";
  show_contextual_suggestions: boolean;
  deep_analysis?: boolean;
}

export interface PageContext {
  page: string;
  entity_type?: "lead" | "contact" | "deal" | "campaign" | "report";
  entity_id?: number | string;
  entity_name?: string;
  suggested_prompts?: string[];
}

export interface SupervisorRequest {
  message: string;
  thread_id?: string;
  context?: Partial<PageContext>;
  history?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  max_steps?: number;
}

export interface SupervisorResponse {
  thread_id: string;
  message: string;
  reply?: string;
  status?: "completed" | "needs_input" | "awaiting_approval" | "error";
  workflow?: string | null;
  missing_fields?: string[];
  selected_tools?: string[];
  memory?: Record<string, unknown>;
  role?: MessageRole;
  timestamp?: string;
  approval_required?: boolean;
  approval_id?: string;
  approval_request_id?: string | null;
  actions?: ChatAction[];
  choices?: ChatChoice[];
  trace?: TraceStep[];
}
