import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FlatList, ScrollView, View } from "react-native";
import { ChatListItem } from "@/components/chat/chat-list-item";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useChatContext } from "@/contexts/chat-context";
import { useDrawer } from "@/contexts/drawer-context";
import { rpcClient } from "@/lib/rpc-client";

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
  const {
    data: chats = [],
    isPending,
    error,
  } = useQuery({
    queryKey: ["chats"],
    queryFn: fetchChats,
  });

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
      <FlatList
        contentContainerStyle={{ padding: 8, paddingBottom: 120 }}
        data={filteredChats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChatListItem
            id={item.id}
            isActive={item.id === currentChatId}
            onPress={() => handleChatPress(item.id)}
            title={item.title}
            updatedAt={item.updatedAt}
          />
        )}
      />
    </View>
  );
};
