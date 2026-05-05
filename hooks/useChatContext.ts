"use client";

import { useEffect } from "react";
import { useChat } from "@/lib/chat/context";
import type { PageContext } from "@/lib/chat/types";

export function useChatPageContext(ctx: PageContext | null) {
  const { setPageContext } = useChat();

  useEffect(() => {
    setPageContext(ctx);
    return () => setPageContext(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.page, ctx?.entity_id]);
}
