import { useEffect, useState } from "react";

/**
 * Reads `prompt` query param from URL on mount for deep link support.
 * Cleans URL immediately to prevent re-trigger on refresh.
 */
export const useDeepLinkPrompt = (currentChatId: string | null) => {
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  useEffect(() => {
    // Only trigger on new chat (no currentChatId)
    if (currentChatId) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const prompt = params.get("prompt");

    if (prompt?.trim()) {
      setPendingPrompt(prompt.trim());

      // Clean URL params to prevent re-trigger on refresh
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [currentChatId]);

  const clearPrompt = () => setPendingPrompt(null);

  return { pendingPrompt, clearPrompt };
};
