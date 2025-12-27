import { useQuery } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
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
  <View className="flex-1 gap-2 p-4">
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
  const { id } = useLocalSearchParams<{ id: string }>();

  const {
    data: messages,
    isPending,
    error,
  } = useQuery({
    queryKey: ["chat-messages", id],
    queryFn: () => fetchMessages(id),
    enabled: Boolean(id),
  });

  if (isPending) {
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
        className={`flex-1 items-center justify-center bg-background p-8 ${colorScheme === "dark" ? "dark" : ""}`}
      >
        <Text className="mb-4" variant="h3">
          Error loading chat
        </Text>
        <Text className="text-center" variant="muted">
          {error instanceof Error ? error.message : "Unknown error occurred"}
        </Text>
      </View>
    );
  }

  // Handle new chat (no id) or existing chat
  if (!id) {
    return <Chat initialMessages={[]} />;
  }

  return <Chat id={id} initialMessages={messages} />;
}
