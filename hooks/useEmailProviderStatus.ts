"use client";

import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/config";

const API_BASE = API_BASE_URL;

export interface EmailProviderConnection {
  id: string;
  provider: string;
  account_email: string;
  status: string;
  auth_type: string;
  token_expires_at: string | null;
  scopes: string[] | null;
  created_at: string;
  updated_at: string;
}

interface UseEmailProviderStatusResult {
  connections: EmailProviderConnection[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  disconnect: (connectionId: string) => Promise<void>;
  reconnect: () => void;
}

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useEmailProviderStatus(): UseEmailProviderStatusResult {
  const [connections, setConnections] = useState<EmailProviderConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/integrations/email/status`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as EmailProviderConnection[];
      setConnections(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load email providers");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(async (connectionId: string) => {
    const res = await fetch(`${API_BASE}/integrations/email/${connectionId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`Disconnect failed: HTTP ${res.status}`);
    await fetch_();
  }, [fetch_]);

  const reconnect = useCallback(() => {
    if (typeof window === "undefined") return;
    const returnUrl = encodeURIComponent(window.location.href);
    fetch(`${API_BASE}/integrations/email/start?provider=microsoft&return_url=${returnUrl}`, {
      headers: authHeaders(),
    })
      .then((r) => r.json())
      .then((data: unknown) => {
        const url = (data as { redirect_url?: string }).redirect_url;
        if (url) window.location.href = url;
      })
      .catch(() => {});
  }, []);

  useEffect(() => { void fetch_(); }, [fetch_]);

  return { connections, isLoading, error, refetch: fetch_, disconnect, reconnect };
}
