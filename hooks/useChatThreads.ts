"use client";

import { useState, useCallback, useMemo } from "react";
import { fetchChatThreads } from "@/lib/chat/api";
import { getErrorMessage } from "@/lib/errors";
import type { ChatThread } from "@/lib/chat/types";

const PAGE_SIZE = 10;

type Phase =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "done"; threads: ChatThread[] }
  | { phase: "error"; message: string };

export function useChatThreads() {
  const [state, setState] = useState<Phase>({ phase: "idle" });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setState({ phase: "loading" });
    try {
      const threads = await fetchChatThreads();
      setState({ phase: "done", threads });
      setPage(1);
    } catch (err) {
      setState({
        phase: "error",
        message: getErrorMessage(err, "Could not load conversations."),
      });
    }
  }, []);

  const allThreads = state.phase === "done" ? state.threads : [];

  const filteredThreads = useMemo(
    () =>
      !search
        ? allThreads
        : allThreads.filter(
            (t) =>
              t.title?.toLowerCase().includes(search.toLowerCase()) ||
              t.last_message?.toLowerCase().includes(search.toLowerCase())
          ),
    [allThreads, search]
  );

  const totalPages = Math.max(1, Math.ceil(filteredThreads.length / PAGE_SIZE));
  const pagedThreads = filteredThreads.slice(0, page * PAGE_SIZE);
  const hasMore = page * PAGE_SIZE < filteredThreads.length;

  const loadMore = useCallback(() => {
    setPage((p) => Math.min(p + 1, totalPages));
  }, [totalPages]);

  return { state, load, search, setSearch, filteredThreads: pagedThreads, hasMore, loadMore };
}
