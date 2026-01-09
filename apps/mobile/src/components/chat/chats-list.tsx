import { LegendList } from "@legendapp/list";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import type { ViewToken } from "react-native";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatListItem } from "@/components/chat/chat-list-item";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useChatContext } from "@/contexts/chat-context";
import { useDrawer } from "@/contexts/drawer-context";
import { syncWithServer } from "@/hooks/use-user-preferences";
import { rpcClient } from "@/lib/rpc-client";

/** Number of chats to batch prefetch on initial load */
const INITIAL_PREFETCH_COUNT = 15;

type ChatItem = {
  id: string;
  title: string | null;
  updatedAt: Date | null;
};

/**
 * Fetches user's chats from API, parses dates, and syncs last used model
 * Return type is inferred from the router and transformation
 */
const fetchChats = async () => {
  const chats = await rpcClient.chats.list();

  // Sync last used model from most recent chat to storage
  // (first chat is most recent due to updatedAt ordering)
  const mostRecentModel = chats[0]?.lastUsedModel ?? null;
  await syncWithServer(mostRecentModel);

  return chats.map((chat) => ({
    ...chat,
    updatedAt: chat.updatedAt ? new Date(chat.updatedAt) : null,
  }));
};

/**
 * Skeleton loader for chat list items
 */
const ChatListSkeleton = () => (
  <View className="gap-2 p-4">
    {[1, 2, 3, 4].map((i) => (
      <Skeleton className="h-16 w-full rounded-lg" key={i} />
    ))}
  </View>
);

type ChatsListProps = {
  searchQuery?: string;
};

/**
 * Reusable chats list component
 * Can be used in drawer or standalone screen
 */
export const ChatsList = ({ searchQuery = "" }: ChatsListProps) => {
  const { currentChatId, navigateToChat, navigateToNew } = useChatContext();
  const { closeDrawer } = useDrawer();
  const queryClient = useQueryClient();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    data: chats = [],
    isPending,
    error,
  } = useQuery({
    queryKey: ["chats"],
    queryFn: fetchChats,
  });

  // Track if initial prefetch was done
  const initialPrefetchedRef = useRef(false);
  // Track which chat IDs have been prefetched via visibility
  const prefetchedIdsRef = useRef(new Set<string>());

  /**
   * Batch prefetch messages for first N chats on initial load
   */
  useEffect(() => {
    if (chats.length === 0 || initialPrefetchedRef.current) {
      return;
    }
    initialPrefetchedRef.current = true;

    const chatIds = chats.slice(0, INITIAL_PREFETCH_COUNT).map((c) => c.id);
    if (chatIds.length === 0) {
      return;
    }

    // Mark initial batch as prefetched
    for (const id of chatIds) {
      prefetchedIdsRef.current.add(id);
    }

    // Batch fetch and populate individual query caches
    rpcClient.messages
      .listBatch({ chatIds })
      .then((results) => {
        for (const [chatId, messages] of Object.entries(results)) {
          queryClient.setQueryData(["chat-messages", chatId], messages);
        }
      })
      .catch((err) => {
        console.error("Batch prefetch failed:", err);
      });
  }, [chats, queryClient]);

  /**
   * Prefetch messages for visible items beyond initial batch
   */
  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<ChatItem>[] }) => {
      for (const token of viewableItems) {
        const chatId = token.item?.id;
        if (!chatId || prefetchedIdsRef.current.has(chatId)) {
          continue;
        }

        // Skip if already in cache
        const cached = queryClient.getQueryData(["chat-messages", chatId]);
        if (cached) {
          prefetchedIdsRef.current.add(chatId);
          continue;
        }

        prefetchedIdsRef.current.add(chatId);
        queryClient.prefetchQuery({
          queryKey: ["chat-messages", chatId],
          queryFn: () => rpcClient.messages.list({ chatId }),
          staleTime: 60 * 1000,
        });
      }
    },
    [queryClient]
  );

  /**
   * Filter chats by title based on search query
   */
  const filteredChats = chats.filter((chat) => {
    if (!searchQuery.trim()) {
      return true;
    }
    const query = searchQuery.toLowerCase().trim();
    return chat.title?.toLowerCase().includes(query) ?? false;
  });

  /**
   * Prefetch messages when pressing a chat and close drawer
   */
  const handleChatPress = (chatId: string) => {
    navigateToChat(chatId);
    closeDrawer();
    // Prefetch messages for better UX
    queryClient.prefetchQuery({
      queryKey: ["chat-messages", chatId],
      queryFn: () => rpcClient.messages.list({ chatId }),
      staleTime: 60 * 1000,
    });
  };

  /**
   * Handle new chat creation and close drawer
   */
  const handleNewChat = () => {
    navigateToNew();
    closeDrawer();
  };

  /**
   * Handle rename dialog open - navigates to rename-chat route
   */
  const handleRenameClick = (chatId: string, currentTitle: string | null) => {
    router.push({
      pathname: "/(app)/rename-chat",
      params: {
        chatId,
        currentTitle: currentTitle ?? "",
      },
    });
  };

  /**
   * Handle delete dialog open - navigates to delete-chat route
   */
  const handleDeleteClick = (chatId: string) => {
    router.push({
      pathname: "/(app)/delete-chat",
      params: {
        chatId,
      },
    });
  };

  if (isPending) {
    return (
      <ScrollView className="flex-1">
        <ChatListSkeleton />
      </ScrollView>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <Text className="mb-4" variant="h3">
          Error loading chats
        </Text>
        <Text className="text-center" variant="muted">
          {error instanceof Error ? error.message : "Unknown error occurred"}
        </Text>
      </View>
    );
  }

  if (chats.length === 0) {
    return (
      <View className="flex-1">
        <View className="flex-1 items-center justify-center p-8">
          <Text className="mb-2" variant="h3">
            No chats yet
          </Text>
          <Text className="mb-4 text-center" variant="muted">
            Start a new conversation to get started
          </Text>
          <Button onPress={handleNewChat} variant="outline">
            <Text>Create Chat</Text>
          </Button>
        </View>
      </View>
    );
  }

  if (filteredChats.length === 0) {
    return (
      <View className="flex-1">
        <View className="flex-1 items-center justify-center p-8">
          <Text className="mb-2" variant="h3">
            No chats found
          </Text>
          <Text className="mb-4 text-center" variant="muted">
            Try adjusting your search query
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <LegendList
        contentContainerStyle={{
          padding: 8,
          paddingBottom: 80,
          marginTop: insets.top + 48,
        }}
        data={filteredChats}
        estimatedItemSize={72}
        extraData={currentChatId}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={handleViewableItemsChanged}
        recycleItems
        renderItem={({ item }) => (
          <ChatListItem
            isActive={item.id === currentChatId}
            onDelete={() => handleDeleteClick(item.id)}
            onPress={() => handleChatPress(item.id)}
            onRename={() => handleRenameClick(item.id, item.title)}
            title={item.title}
            updatedAt={item.updatedAt}
          />
        )}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50,
        }}
      />
    </View>
  );
};
