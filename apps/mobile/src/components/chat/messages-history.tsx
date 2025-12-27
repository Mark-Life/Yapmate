import type { ChatStatus, UIMessage } from "ai";
import { useRef } from "react";
import { FlatList, View } from "react-native";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

type ChatUIMessage = UIMessage;

type MessagesHistoryProps = {
  messages: ChatUIMessage[];
  status: ChatStatus;
};

type MessageItemProps = {
  message: ChatUIMessage;
};

/**
 * Renders a single message item
 */
const MessageItem = ({ message }: MessageItemProps) => {
  const isUser = message.role === "user";

  return (
    <View
      className={cn(
        "mx-4 my-2 flex-row",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <View
        className={cn(
          "py-2",
          isUser ? "max-w-[80%] rounded-lg bg-primary px-4" : ""
        )}
      >
        {message.parts.map(
          (part: { type: string; text?: string }, i: number) => {
            if (part.type === "text") {
              return (
                <Text
                  className={cn(
                    "text-sm",
                    isUser ? "text-primary-foreground" : "text-foreground"
                  )}
                  key={`${message.id}-${i}`}
                >
                  {part.text ?? ""}
                </Text>
              );
            }
            return null;
          }
        )}
      </View>
    </View>
  );
};

/**
 * Messages history component for React Native
 * Displays chat messages in a FlatList
 */
export const MessagesHistory = ({ messages, status }: MessagesHistoryProps) => {
  const listRef = useRef<FlatList<ChatUIMessage>>(null);

  return (
    <FlatList
      className="flex-1"
      contentContainerStyle={{ paddingVertical: 8 }}
      data={messages}
      keyExtractor={(item) => item.id}
      ListFooterComponent={
        status === "submitted" ? (
          <View className="mx-4 my-2">
            <Text className="text-muted-foreground text-sm">Thinking...</Text>
          </View>
        ) : null
      }
      onContentSizeChange={() => {
        // Auto-scroll to bottom when content changes
        if (messages.length > 0) {
          listRef.current?.scrollToEnd({ animated: true });
        }
      }}
      ref={listRef}
      renderItem={({ item }) => <MessageItem message={item} />}
    />
  );
};
