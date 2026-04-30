export type MessageRole = "user" | "assistant";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type ChatPanelView = "chat" | "threads" | "approvals";

export interface ChatAction {
  label: string;
  action: string;
  variant?: "default" | "destructive" | "outline";
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  status?: "sending" | "sent" | "error";
  metadata?: {
    approval_required?: boolean;
    approval_id?: string;
    actions?: ChatAction[];
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
  action_type?: string;
  context?: Record<string, unknown>;
  status: ApprovalStatus;
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
}

export interface ChatPreferences {
  tone: "professional" | "casual" | "concise";
  response_length: "brief" | "detailed" | "balanced";
  approval_strictness: "always_ask" | "smart" | "auto_approve";
  show_contextual_suggestions: boolean;
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
}

export interface SupervisorResponse {
  thread_id: string;
  message: string;
  role?: MessageRole;
  timestamp?: string;
  approval_required?: boolean;
  approval_id?: string;
  actions?: ChatAction[];
}
