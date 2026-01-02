import { LegendList } from "@legendapp/list";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { ScrollView, View } from "react-native";
import { ChatListItem } from "@/components/chat/chat-list-item";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useChatContext } from "@/contexts/chat-context";
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

/**
 * Chats list screen
 * Displays all user's chats with loading and empty states
 */
export default function ChatsScreen() {
  const { colorScheme } = useColorScheme();
  const { currentChatId, navigateToChat, navigateToNew } = useChatContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const {
    data: chats = [],
    isPending,
    error,
  } = useQuery({
    queryKey: ["chats"],
    queryFn: fetchChats,
  });

  /**
   * Prefetch messages when hovering/pressing a chat
   */
  const handleChatPress = (chatId: string) => {
    navigateToChat(chatId);
    // Prefetch messages for better UX
    queryClient.prefetchQuery({
      queryKey: ["chat-messages", chatId],
      queryFn: () => rpcClient.messages.list({ chatId }),
      staleTime: 60 * 1000,
    });
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
      <ScrollView
        className={`flex-1 bg-background ${colorScheme === "dark" ? "dark" : ""}`}
      >
        <ChatListSkeleton />
      </ScrollView>
    );
  }

  if (error) {
    return (
      <View
        className={`flex-1 items-center justify-center bg-background p-8 ${colorScheme === "dark" ? "dark" : ""}`}
      >
        <Text className="mb-4" variant="h3">
          Error loading chats
        </Text>
        <Text className="text-center" variant="muted">
          {error instanceof Error ? error.message : "Unknown error occurred"}
        </Text>
      </View>
    );
  }

  return (
    <View
      className={`flex-1 bg-background ${colorScheme === "dark" ? "dark" : ""}`}
    >
      <View className="border-border border-b p-4">
        <Button className="w-full" onPress={navigateToNew} variant="default">
          <Text>New Chat</Text>
        </Button>
      </View>
      {chats.length === 0 ? (
        <View className="flex-1 items-center justify-center p-8">
          <Text className="mb-2" variant="h3">
            No chats yet
          </Text>
          <Text className="mb-4 text-center" variant="muted">
            Start a new conversation to get started
          </Text>
          <Button onPress={navigateToNew} variant="outline">
            <Text>Create Chat</Text>
          </Button>
        </View>
      ) : (
        <LegendList
          contentContainerStyle={{ padding: 8 }}
          data={chats}
          keyExtractor={(item) => item.id}
          recycleItems
          renderItem={({ item }) => (
            <ChatListItem
              id={item.id}
              isActive={item.id === currentChatId}
              onDelete={() => handleDeleteClick(item.id)}
              onPress={() => handleChatPress(item.id)}
              onRename={() => handleRenameClick(item.id, item.title)}
              title={item.title}
              updatedAt={item.updatedAt}
            />
          )}
        />
      )}
    </View>
  );
}
