import { useQuery } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { Chat } from "@/components/chat/chat";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { rpcClient } from "@/lib/rpc-client";

type ChatUIMessage = UIMessage;

/**
 * Fetches messages for a chat
 * Return type is inferred from the router
 */
const fetchMessages = async (chatId: string): Promise<ChatUIMessage[]> =>
  rpcClient.messages.list({ chatId });

/**
 * Skeleton loader for chat messages
 */
const ChatSkeleton = () => (
  <View className="flex-1 gap-2 p-4 pt-32">
    {[1, 2, 3].map((i) => (
      <Skeleton className="h-16 w-full rounded-lg" key={i} />
    ))}
  </View>
);

/**
 * Individual chat screen
 * Displays chat messages and input for a specific chat
 */
export default function ChatScreen() {
  const { colorScheme } = useColorScheme();
  const { id, new: isNew } = useLocalSearchParams<{
    id: string;
    new?: string;
  }>();

  // Track chat created in this session to avoid refetching after creation
  const [createdChatId, setCreatedChatId] = useState<string | null>(
    isNew === "true" ? id : null
  );

  const handleChatCreated = useCallback((chatId: string) => {
    setCreatedChatId(chatId);
  }, []);

  // Skip fetch for new chats or chats we just created
  const isOwnChat = createdChatId === id;
  const shouldFetch = Boolean(id) && !isOwnChat;

  const {
    data: messages,
    isPending,
    error,
  } = useQuery({
    queryKey: ["chat-messages", id],
    queryFn: () => fetchMessages(id),
    enabled: shouldFetch,
  });

  // Show skeleton only when actually fetching existing chat
  if (shouldFetch && isPending) {
    return (
      <View
        className={`flex-1 bg-background ${colorScheme === "dark" ? "dark" : ""}`}
      >
        <ChatSkeleton />
      </View>
    );
  }

  if (error) {
    return (
      <View
        className={`flex-1 bg-background ${colorScheme === "dark" ? "dark" : ""}`}
      >
        <View className="flex-1 items-center justify-center p-8">
          <Text className="mb-4" variant="h3">
            Error loading chat
          </Text>
          <Text className="text-center" variant="muted">
            {error instanceof Error ? error.message : "Unknown error occurred"}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <Chat
        id={id}
        initialMessages={isOwnChat ? [] : messages}
        isNew={isNew === "true"}
        onChatCreated={handleChatCreated}
      />
    </View>
  );
}
