import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWebSocketSync } from "@yapmate/components/hooks/use-websocket-sync";
import { Button } from "@yapmate/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@yapmate/components/ui/sidebar";
import { PlusIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AppSidebar } from "../components/app-sidebar";
import { Chat } from "../components/chat/chat";
import { MessagesSkeleton } from "../components/chat/messages-skeleton";
import { ChatProvider, useChatContext } from "../contexts/chat-context";
import { syncWithServer } from "../hooks/use-user-preferences";
import { rpcClient } from "../lib/rpc-client";
import { createClient } from "../lib/supabase/client";

/**
 * Header controls - sidebar trigger + new chat button when collapsed
 */
const HeaderControls = () => {
  const { navigateToNew } = useChatContext();

  return (
    <div className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-lg bg-background/60 p-1 backdrop-blur-md supports-backdrop-filter:bg-background/60">
      <SidebarTrigger />
      {/* {!open && ( */}
      <Button className="size-7" onClick={navigateToNew} variant="ghost">
        <PlusIcon className="size-4" />
        <span className="sr-only">New Chat</span>
      </Button>
      {/* )} */}
    </div>
  );
};

/**
 * Fetches user's chats from API, parses dates, and syncs last used model
 * Return type is inferred from the router and transformation
 */
const fetchChats = async () => {
  const chats = await rpcClient.chats.list();

  // Sync last used model from most recent chat to localStorage
  // (first chat is most recent due to updatedAt ordering)
  const mostRecentModel = chats[0]?.lastUsedModel ?? null;
  syncWithServer(mostRecentModel);

  return chats.map((chat) => ({
    ...chat,
    updatedAt: chat.updatedAt ? new Date(chat.updatedAt) : null,
  }));
};

/**
 * Fetches messages for a chat
 * Return type is inferred from the router
 */
const fetchMessages = async (chatId: string) =>
  await rpcClient.messages.list({ chatId });

/**
 * Container that renders Chat based on currentChatId from context
 * Tracks locally created chats to avoid remounting when new chat gets saved
 */
const ChatContainer = () => {
  const { currentChatId, newChatKey } = useChatContext();

  // Track which chat was created by this session
  const [createdChatId, setCreatedChatId] = useState<string | null>(null);

  // Reset when navigating away from own chat
  useEffect(() => {
    if (currentChatId !== createdChatId) {
      setCreatedChatId(null);
    }
  }, [currentChatId, createdChatId]);

  const handleChatCreated = useCallback((id: string) => {
    setCreatedChatId(id);
  }, []);

  const isOwnChat = createdChatId !== null && currentChatId === createdChatId;

  // Keep stable key for own chats to prevent remount when new chat gets saved
  const chatKey =
    isOwnChat || !currentChatId ? `new-${newChatKey}` : currentChatId;

  const { data: messages, isLoading } = useQuery({
    queryKey: ["chat-messages", currentChatId],
    queryFn: () =>
      currentChatId ? fetchMessages(currentChatId) : Promise.resolve([]),
    enabled: Boolean(currentChatId) && !isOwnChat,
  });

  if (currentChatId && !isOwnChat && isLoading) {
    return <MessagesSkeleton />;
  }

  return (
    <Chat
      id={currentChatId ?? undefined}
      initialMessages={isOwnChat ? undefined : messages}
      key={chatKey}
      onChatCreated={handleChatCreated}
    />
  );
};

/**
 * WebSocket sync component - must be inside ChatProvider
 */
const WebSocketSync = () => {
  const queryClient = useQueryClient();
  const { currentChatId } = useChatContext();
  const supabase = createClient();

  /**
   * Handles stream started event - dispatches custom event for Chat component
   */
  const handleStreamStarted = useCallback((chatId: string) => {
    // Dispatch custom event that Chat component can listen to
    window.dispatchEvent(
      new CustomEvent("stream-started", { detail: { chatId } })
    );
  }, []);

  // WebSocket real-time sync
  useWebSocketSync({
    wsUrl: `${
      window.location.protocol === "https:" ? "wss:" : "ws:"
    }//${window.location.host}/ws`,
    getToken: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session?.access_token ?? null;
    },
    queryClient,
    currentChatId: currentChatId ?? undefined,
    onStreamStarted: handleStreamStarted,
  });

  return null;
};

/**
 * Layout for chat pages - includes sidebar with chat history
 */
export const ChatLayout = () => {
  const queryClient = useQueryClient();
  const { data: chats = [], isPending } = useQuery({
    queryKey: ["chats"],
    queryFn: fetchChats,
  });

  const prefetchMessages = useCallback(
    (chatId: string) => {
      queryClient.prefetchQuery({
        queryKey: ["chat-messages", chatId],
        queryFn: () => fetchMessages(chatId),
        staleTime: 60 * 1000,
      });
    },
    [queryClient]
  );

  return (
    <ChatProvider>
      <WebSocketSync />
      <SidebarProvider>
        <AppSidebar
          chats={chats}
          isLoading={isPending}
          onPrefetch={prefetchMessages}
        />
        <SidebarInset>
          <HeaderControls />
          <main className="flex-1">
            <ChatContainer />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ChatProvider>
  );
};
