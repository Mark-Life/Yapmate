import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type ChatContextValue = {
  currentChatId: string | null;
  newChatKey: number;
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
  const [currentChatId, setCurrentChatId] = useState<string | null>(() =>
    getChatIdFromPath(window.location.pathname)
  );
  const [newChatKey, setNewChatKey] = useState(0);

  /**
   * Syncs chatId from URL pathname
   * Handles browser back/forward and custom events from manual URL changes
   */
  useEffect(() => {
    const syncFromUrl = () => {
      const chatId = getChatIdFromPath(window.location.pathname);
      setCurrentChatId(chatId);
    };

    // Initial sync
    syncFromUrl();

    // Handle browser back/forward
    window.addEventListener("popstate", syncFromUrl);

    // Listen for custom event when Chat component calls replaceState
    window.addEventListener("chatUrlChange", syncFromUrl);

    return () => {
      window.removeEventListener("popstate", syncFromUrl);
      window.removeEventListener("chatUrlChange", syncFromUrl);
    };
  }, []);

  /**
   * Navigates to a specific chat
   * Updates URL and triggers popstate event for router sync
   */
  const navigateToChat = useCallback((id: string) => {
    const newPath = `/chat/${id}`;
    window.history.pushState(null, "", newPath);
    setCurrentChatId(id);
    // Trigger popstate event for router sync
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  /**
   * Navigates to new chat
   */
  const navigateToNew = useCallback(() => {
    window.history.pushState(null, "", "/");
    setCurrentChatId(null);
    setNewChatKey((prev) => prev + 1);
    // Trigger popstate event for router sync
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  return (
    <ChatContext.Provider
      value={{
        currentChatId,
        newChatKey,
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
