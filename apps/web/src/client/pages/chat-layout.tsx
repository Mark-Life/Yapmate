import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { rpcClient } from "../lib/rpc-client";

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
 * Fetches user's chats from API and parses dates
 * Return type is inferred from the router and transformation
 */
const fetchChats = async () => {
  const chats = await rpcClient.chats.list();
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
