"use client";

import { useState, useCallback } from "react";
import { fetchChatPreferences, saveChatPreferences } from "@/lib/chat/api";
import { getErrorMessage } from "@/lib/errors";
import type { ChatPreferences } from "@/lib/chat/types";

type Phase =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "done"; preferences: ChatPreferences }
  | { phase: "saving" }
  | { phase: "saved"; preferences: ChatPreferences }
  | { phase: "error"; message: string };

export function useChatPreferences() {
  const [state, setState] = useState<Phase>({ phase: "idle" });

  const load = useCallback(async () => {
    setState({ phase: "loading" });
    try {
      const preferences = await fetchChatPreferences();
      setState({ phase: "done", preferences });
    } catch (err) {
      setState({
        phase: "error",
        message: getErrorMessage(err, "Could not load preferences."),
      });
    }
  }, []);

  const save = useCallback(async (prefs: Partial<ChatPreferences>) => {
    setState({ phase: "saving" });
    try {
      const preferences = await saveChatPreferences(prefs);
      setState({ phase: "saved", preferences });
    } catch (err) {
      setState({
        phase: "error",
        message: getErrorMessage(err, "Could not save preferences."),
      });
    }
  }, []);

  return { state, load, save };
}
