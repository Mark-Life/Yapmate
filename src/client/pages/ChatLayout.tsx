import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { PlusIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Chat } from "@/components/chat/chat";
import { MessagesSkeleton } from "@/components/chat/messages-skeleton";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { ChatProvider, useChatContext } from "@/contexts/chat-context";

type ChatApiResponse = {
  id: string;
  title: string | null;
  updatedAt: string | null;
};

type ChatItem = {
  id: string;
  title: string | null;
  updatedAt: Date | null;
};

/**
 * Header controls - sidebar trigger + new chat button when collapsed
 */
const HeaderControls = () => {
  const { open } = useSidebar();
  const { navigateToNew } = useChatContext();

  return (
    <div className="absolute top-3 left-3 z-10 flex items-center gap-1">
      <SidebarTrigger />
      {!open && (
        <Button onClick={navigateToNew} size="icon" variant="ghost">
          <PlusIcon className="size-4" />
          <span className="sr-only">New Chat</span>
        </Button>
      )}
    </div>
  );
};

/**
 * Fetches user's chats from API and parses dates
 */
const fetchChats = async (): Promise<ChatItem[]> => {
  const res = await fetch("/api/chats");
  if (!res.ok) {
    throw new Error("Failed to fetch chats");
  }
  const data: ChatApiResponse[] = await res.json();
  return data.map((chat) => ({
    ...chat,
    updatedAt: chat.updatedAt ? new Date(chat.updatedAt) : null,
  }));
};

/**
 * Fetches messages for a chat
 */
const fetchMessages = async (chatId: string): Promise<UIMessage[]> => {
  const res = await fetch(`/api/chats/${chatId}/messages`);
  if (!res.ok) {
    throw new Error("Failed to fetch messages");
  }
  return res.json();
};

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
