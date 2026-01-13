import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWebSocketSync } from "@yapmate/components/hooks/use-websocket-sync";
import { Button } from "@yapmate/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@yapmate/components/ui/sidebar";
import {
  MessageCircleQuestionIcon,
  PlusIcon,
  UserPlusIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { AppSidebar } from "../components/app-sidebar";
import { Chat } from "../components/chat/chat";
import { InviteModal } from "../components/chat/invite-modal";
import { MemberList } from "../components/chat/member-list";
import { MessagesSkeleton } from "../components/chat/messages-skeleton";
import { FeedbackDialog } from "../components/feedback-dialog";
import { HotkeysCheatsheet } from "../components/hotkeys-cheatsheet";
import { ChatProvider, useChatContext } from "../contexts/chat-context";
import { HOTKEYS } from "../hooks/use-hotkeys-config";
import { useMultiUserChat } from "../hooks/use-multi-user-chat";
import { syncWithServer } from "../hooks/use-user-preferences";
import { rpcClient } from "../lib/rpc-client";
import { createClient } from "../lib/supabase/client";
import { navigate } from "../router";

/**
 * Checks URL params for upgrade intent and triggers upgrade sheet
 */
const useUpgradeFromUrl = () => {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const upgrade = urlParams.get("upgrade");
    const tier = urlParams.get("tier");

    if (upgrade === "true") {
      // Dispatch event to open upgrade sheet
      // AppSidebar listens to this event
      window.dispatchEvent(
        new CustomEvent("open-upgrade-sheet", { detail: { tier } })
      );

      // Clean up URL params
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
  }, []);
};

/**
 * Global hotkeys handler component
 */
const GlobalHotkeys = () => {
  const { navigateToNew } = useChatContext();
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);

  /**
   * Focus the prompt input textarea
   */
  const focusPrompt = useCallback(() => {
    const textarea = document.querySelector(
      'textarea[name="message"]'
    ) as HTMLTextAreaElement | null;
    if (textarea) {
      textarea.focus();
    }
  }, []);

  // New chat hotkey
  useHotkeys(
    HOTKEYS.newChat,
    () => {
      navigateToNew();
    },
    { enableOnFormTags: true }
  );

  // Focus prompt hotkey
  useHotkeys(
    HOTKEYS.focusPrompt,
    (e) => {
      e.preventDefault();
      focusPrompt();
    },
    { enableOnFormTags: true }
  );

  // Settings hotkey (toggles between settings and root)
  useHotkeys(
    HOTKEYS.settings,
    (e) => {
      e.preventDefault();
      const isOnSettings = window.location.pathname.startsWith("/settings");
      navigate(isOnSettings ? "/" : "/settings");
    },
    { enableOnFormTags: true }
  );

  // Help/cheatsheet hotkey
  useHotkeys(
    HOTKEYS.help,
    (e) => {
      e.preventDefault();
      setCheatsheetOpen((open) => !open);
    },
    { enableOnFormTags: true }
  );

  // Listen for open-hotkeys-cheatsheet events
  useEffect(() => {
    const handleOpenCheatsheet = () => {
      setCheatsheetOpen(true);
    };
    window.addEventListener("open-hotkeys-cheatsheet", handleOpenCheatsheet);
    return () => {
      window.removeEventListener(
        "open-hotkeys-cheatsheet",
        handleOpenCheatsheet
      );
    };
  }, []);

  return (
    <HotkeysCheatsheet onOpenChange={setCheatsheetOpen} open={cheatsheetOpen} />
  );
};

/**
 * Header controls - sidebar trigger + feedback button + new chat button + multi-user controls
 */
const HeaderControls = () => {
  const { navigateToNew, currentChatId } = useChatContext();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const { members, typingMembers, isMultiUser } = useMultiUserChat({
    chatId: currentChatId,
    enabled: Boolean(currentChatId),
  });

  return (
    <>
      {/* Left controls */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-lg bg-background/60 p-1 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
        <SidebarTrigger />
        <Button
          className="size-7"
          onClick={() => setFeedbackOpen(true)}
          variant="ghost"
        >
          <MessageCircleQuestionIcon className="size-4" />
          <span className="sr-only">Send Feedback</span>
        </Button>
        <Button className="size-7" onClick={navigateToNew} variant="ghost">
          <PlusIcon className="size-4" />
          <span className="sr-only">New Chat</span>
        </Button>
      </div>

      {/* Right controls - multi-user */}
      {currentChatId ? (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-2 rounded-lg bg-background/60 p-1 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
          {isMultiUser ? (
            <MemberList
              compact
              members={members}
              typingMembers={typingMembers}
            />
          ) : null}
          <Button
            className="size-7"
            onClick={() => setInviteOpen(true)}
            title="Invite people"
            variant="ghost"
          >
            <UserPlusIcon className="size-4" />
            <span className="sr-only">Invite People</span>
          </Button>
        </div>
      ) : null}

      <FeedbackDialog onOpenChange={setFeedbackOpen} open={feedbackOpen} />
      {currentChatId ? (
        <InviteModal
          chatId={currentChatId}
          onOpenChange={setInviteOpen}
          open={inviteOpen}
        />
      ) : null}
    </>
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

  // Check for upgrade URL param and trigger upgrade sheet
  useUpgradeFromUrl();

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
      <GlobalHotkeys />
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
