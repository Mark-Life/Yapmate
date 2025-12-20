"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type ChatContextValue = {
  currentChatId: string | null;
  navigateToChat: (id: string) => void;
  navigateToNew: () => void;
};

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

const CHAT_ID_REGEX = /^\/chat\/([^/]+)$/;

/**
 * Extracts chat ID from pathname
 */
const getChatIdFromPath = (pathname: string): string | null => {
  const match = pathname.match(CHAT_ID_REGEX);
  return match ? match[1] : null;
};

type ChatProviderProps = {
  children: React.ReactNode;
};

/**
 * Provides chat navigation context with URL sync
 * Handles browser back/forward via popstate
 */
export const ChatProvider = ({ children }: ChatProviderProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const [currentChatId, setCurrentChatId] = useState<string | null>(() =>
    getChatIdFromPath(pathname)
  );

  /**
   * Syncs chatId from URL pathname
   * Also checks URL periodically to catch manual pushState/replaceState calls
   */
  useEffect(() => {
    const syncFromUrl = () => {
      const chatId = getChatIdFromPath(window.location.pathname);
      setCurrentChatId(chatId);
    };

    // Initial sync
    syncFromUrl();

    // Sync when pathname changes (Next.js navigation)
    const chatId = getChatIdFromPath(pathname);
    setCurrentChatId(chatId);

    // Handle browser back/forward
    window.addEventListener("popstate", syncFromUrl);

    // Poll URL to catch manual pushState/replaceState (e.g., from Chat component)
    // Check every 100ms - fast enough to feel instant, not too frequent
    const interval = setInterval(syncFromUrl, 100);

    return () => {
      window.removeEventListener("popstate", syncFromUrl);
      clearInterval(interval);
    };
  }, [pathname]);

  /**
   * Navigates to a specific chat
   * Updates URL without triggering Next.js navigation
   */
  const navigateToChat = useCallback(
    (id: string) => {
      const newPath = `/chat/${id}`;
      window.history.pushState(null, "", newPath);
      setCurrentChatId(id);
      // Trigger router refresh to sync Next.js state
      router.refresh();
    },
    [router]
  );

  /**
   * Navigates to new chat
   */
  const navigateToNew = useCallback(() => {
    window.history.pushState(null, "", "/");
    setCurrentChatId(null);
    router.refresh();
  }, [router]);

  return (
    <ChatContext.Provider
      value={{
        currentChatId,
        navigateToChat,
        navigateToNew,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

/**
 * Hook to access chat context
 */
export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChatContext must be used within ChatProvider");
  }
  return context;
};
