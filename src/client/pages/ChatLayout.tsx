import { useQuery } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { PlusIcon } from "lucide-react";
import { useEffect, useRef } from "react";
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
  const { currentChatId } = useChatContext();
  const prevChatIdRef = useRef<string | null | undefined>(undefined);
  const locallyCreatedIdRef = useRef<string | null>(null);

  // Detect synchronously during render when chat transitions from new to saved
  // This must happen BEFORE using isLocallyCreated in render logic
  const prevId = prevChatIdRef.current;
  if (prevId === null && currentChatId !== null) {
    // Chat was just created locally (transitioned from new → saved)
    locallyCreatedIdRef.current = currentChatId;
  } else if (currentChatId === null) {
    // Going to new chat, reset
    locallyCreatedIdRef.current = null;
  } else if (
    prevId !== undefined &&
    prevId !== null &&
    prevId !== currentChatId
  ) {
    // Navigating from one existing chat to another, reset
    locallyCreatedIdRef.current = null;
  }

  // Update prevChatIdRef after render to track for next render
  useEffect(() => {
    prevChatIdRef.current = currentChatId;
  }, [currentChatId]);

  const isLocallyCreated =
    locallyCreatedIdRef.current === currentChatId && currentChatId !== null;

  const { data: messages, isLoading } = useQuery({
    queryKey: ["chat-messages", currentChatId],
    queryFn: () =>
      currentChatId ? fetchMessages(currentChatId) : Promise.resolve([]),
    // Don't fetch for locally created chats - they already have state
    enabled: Boolean(currentChatId) && !isLocallyCreated,
  });

  // Use stable key for new chat and locally created chat to prevent remount
  const chatKey = isLocallyCreated || !currentChatId ? "local" : currentChatId;

  if (currentChatId && !isLocallyCreated && isLoading) {
    return <MessagesSkeleton />;
  }

  return (
    <Chat
      id={currentChatId ?? undefined}
      initialMessages={isLocallyCreated ? undefined : messages}
      key={chatKey}
    />
  );
};

/**
 * Layout for chat pages - includes sidebar with chat history
 */
export const ChatLayout = () => {
  const { data: chats = [] } = useQuery({
    queryKey: ["chats"],
    queryFn: fetchChats,
  });

  return (
    <ChatProvider>
      <SidebarProvider>
        <AppSidebar chats={chats} />
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

