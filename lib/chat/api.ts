import API from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";
import type {
  ChatThread,
  ChatThreadDetail,
  ChatApproval,
  ChatPreferences,
  SupervisorRequest,
  SupervisorResponse,
  TraceStep,
} from "./types";

export async function sendChatMessage(payload: SupervisorRequest): Promise<SupervisorResponse> {
  const { data } = await API.post<SupervisorResponse>("/chat/supervisor", payload);
  return normalizeSupervisorResponse(data);
}

/**
 * Streams a chat message via SSE. Calls `onTrace` for each intermediate trace
 * event, then resolves with the final SupervisorResponse.
 */
export async function streamChatMessage(
  payload: SupervisorRequest,
  onTrace: (step: TraceStep) => void,
  signal?: AbortSignal,
): Promise<SupervisorResponse> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const url = `${API_BASE_URL}/chat/supervisor/stream`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok) {
    if (res.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        window.location.href = "/";
      }
    }
    throw new Error(`Chat request failed: ${res.status}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResponse: SupervisorResponse | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (raw === "[DONE]") break;
        try {
          const event = JSON.parse(raw) as { type: string } & Record<string, unknown>;
          if (event.type === "trace") {
            onTrace({ node: String(event.node ?? ""), summary: String(event.summary ?? ""), tool: event.tool as string | null });
          } else if (event.type === "response") {
            finalResponse = normalizeSupervisorResponse(event as unknown as SupervisorResponse);
          } else if (event.type === "error") {
            throw new Error(String(event.message ?? "Stream error"));
          }
        } catch (parseErr) {
          // Ignore malformed lines
        }
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }

  if (!finalResponse) {
    throw new Error("Stream ended without a response event.");
  }
  return finalResponse;
}

export async function fetchChatThreads(): Promise<ChatThread[]> {
  const { data } = await API.get("/chat/threads");
  if (Array.isArray(data)) return data;
  if (data?.threads && Array.isArray(data.threads)) return data.threads;
  return [];
}

export async function fetchChatThread(threadId: string): Promise<ChatThreadDetail> {
  const { data } = await API.get<ChatThreadDetail>(`/chat/threads/${threadId}`);
  return data;
}

export async function fetchChatApprovals(status: "pending" | "all" = "pending"): Promise<ChatApproval[]> {
  const params = status === "all" ? {} : { status };
  const { data } = await API.get("/chat/approvals", { params });
  if (Array.isArray(data)) return data.map(normalizeChatApproval);
  if (data?.approvals && Array.isArray(data.approvals)) {
    return data.approvals.map(normalizeChatApproval);
  }
  return [];
}

export async function fetchChatApproval(approvalId: string): Promise<ChatApproval> {
  const { data } = await API.get<ChatApproval>(`/chat/approvals/${approvalId}`);
  return normalizeChatApproval(data);
}

export async function decideChatApproval(
  approvalId: string,
  action: "approve" | "reject",
  reason?: string
): Promise<ChatApproval> {
  const { data } = await API.post<ChatApproval>(`/chat/approvals/${approvalId}/decision`, {
    decision: action === "approve" ? "approved" : "rejected",
    ...(reason ? { notes: reason } : {}),
  });
  return normalizeChatApproval(data);
}

export async function fetchChatPreferences(): Promise<ChatPreferences> {
  const { data } = await API.get<ChatPreferences>("/chat/preferences");
  return data;
}

export async function saveChatPreferences(
  prefs: Partial<ChatPreferences>
): Promise<ChatPreferences> {
  const { data } = await API.post<ChatPreferences>("/chat/preferences", prefs);
  return data;
}

function normalizeSupervisorResponse(data: SupervisorResponse): SupervisorResponse {
  const message = data.message ?? data.reply ?? "";
  const approvalId = data.approval_id ?? data.approval_request_id ?? undefined;
  return {
    ...data,
    message,
    approval_id: approvalId,
    approval_required: data.approval_required ?? data.status === "awaiting_approval",
    timestamp: data.timestamp ?? new Date().toISOString(),
  };
}

function normalizeChatApproval(raw: ChatApproval): ChatApproval {
  const context = raw.context ?? raw.arguments ?? {};
  const tool = raw.action_type ?? raw.tool ?? "approval";
  return {
    ...raw,
    title: raw.title ?? `${tool.replaceAll(".", " ")} approval`,
    description: raw.description ?? raw.reason ?? "This action needs approval before it can run.",
    action_type: tool,
    context,
    created_at: raw.created_at ?? raw.requested_at ?? new Date().toISOString(),
    resolved_at: raw.resolved_at ?? raw.decided_at,
    resolved_by: raw.resolved_by ?? raw.decided_by,
  };
}
