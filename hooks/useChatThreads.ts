"use client";

import { useState, useCallback } from "react";
import { fetchChatThreads } from "@/lib/chat/api";
import { getErrorMessage } from "@/lib/errors";
import type { ChatThread } from "@/lib/chat/types";

type Phase =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "done"; threads: ChatThread[] }
  | { phase: "error"; message: string };

export function useChatThreads() {
  const [state, setState] = useState<Phase>({ phase: "idle" });
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setState({ phase: "loading" });
    try {
      const threads = await fetchChatThreads();
      setState({ phase: "done", threads });
    } catch (err) {
      setState({
        phase: "error",
        message: getErrorMessage(err, "Could not load conversations."),
      });
    }
  }, []);

  const filteredThreads =
    state.phase === "done"
      ? state.threads.filter(
          (t) =>
            !search ||
            t.title?.toLowerCase().includes(search.toLowerCase()) ||
            t.last_message?.toLowerCase().includes(search.toLowerCase())
        )
      : [];

  return { state, load, search, setSearch, filteredThreads };
}
