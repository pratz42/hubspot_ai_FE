import API from "@/lib/api";
import type {
  ChatThread,
  ChatThreadDetail,
  ChatApproval,
  ChatPreferences,
  SupervisorRequest,
  SupervisorResponse,
} from "./types";

export async function sendChatMessage(payload: SupervisorRequest): Promise<SupervisorResponse> {
  const { data } = await API.post<SupervisorResponse>("/chat/supervisor", payload);
  return data;
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
  const { data } = await API.get("/chat/approvals", { params: { status } });
  if (Array.isArray(data)) return data;
  if (data?.approvals && Array.isArray(data.approvals)) return data.approvals;
  return [];
}

export async function fetchChatApproval(approvalId: string): Promise<ChatApproval> {
  const { data } = await API.get<ChatApproval>(`/chat/approvals/${approvalId}`);
  return data;
}

export async function decideChatApproval(
  approvalId: string,
  action: "approve" | "reject",
  reason?: string
): Promise<ChatApproval> {
  const { data } = await API.post<ChatApproval>(`/chat/approvals/${approvalId}/decision`, {
    action,
    ...(reason ? { reason } : {}),
  });
  return data;
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
