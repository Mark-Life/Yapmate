import { router, usePathname } from "expo-router";
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
 * Provides chat navigation context with Expo Router integration
 * Tracks current chat ID from route and provides navigation functions
 */
export const ChatProvider = ({ children }: ChatProviderProps) => {
  const pathname = usePathname();
  const [currentChatId, setCurrentChatId] = useState<string | null>(() =>
    getChatIdFromPath(pathname)
  );
  const [newChatKey, setNewChatKey] = useState(0);

  /**
   * Syncs chatId from current pathname
   */
  useEffect(() => {
    const chatId = getChatIdFromPath(pathname);
    setCurrentChatId(chatId);
  }, [pathname]);

  /**
   * Navigates to a specific chat
   */
  const navigateToChat = useCallback((id: string) => {
    router.push(`/chat/${id}`);
  }, []);

  /**
   * Navigates to new chat
   */
  const navigateToNew = useCallback(() => {
    router.push("/chats");
    setNewChatKey((prev) => prev + 1);
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
