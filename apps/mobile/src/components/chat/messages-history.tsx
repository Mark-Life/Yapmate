import type { ChatStatus, FileUIPart, UIMessage } from "ai";
import { FileIcon } from "lucide-react-native";
import { useRef } from "react";
import {
  FlatList,
  Image,
  Keyboard,
  Linking,
  Platform,
  Pressable,
  View,
} from "react-native";
import { Icon } from "@/components/ui/icon";
import { StreamingMarkdown } from "@/components/ui/markdown";
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
 * Renders a file attachment part in a message
 */
const FilePart = ({ part, isUser }: { part: FileUIPart; isUser: boolean }) => {
  const isImage = part.mediaType?.startsWith("image/") && part.url;

  const handlePress = async () => {
    if (part.url && (isImage || part.url.startsWith("http"))) {
      try {
        await Linking.openURL(part.url);
      } catch (error) {
        console.error("Failed to open URL:", error);
      }
    }
  };

  return (
    <Pressable
      className={cn(
        "my-1 overflow-hidden rounded-lg",
        isImage ? "h-48 w-48" : "h-20 w-32",
        isUser ? "ml-auto" : "mr-auto"
      )}
      onPress={handlePress}
    >
      {isImage ? (
        <Image
          className="size-full"
          resizeMode="cover"
          source={{ uri: part.url }}
        />
      ) : (
        <View className="flex size-full items-center justify-center rounded-lg bg-muted">
          <Icon as={FileIcon} className="size-8 text-muted-foreground" />
          {part.filename ? (
            <Text
              className="mt-1 max-w-32 truncate text-muted-foreground text-xs"
              numberOfLines={1}
            >
              {part.filename}
            </Text>
          ) : null}
        </View>
      )}
    </Pressable>
  );
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
          isUser ? "max-w-[80%] rounded-lg bg-primary px-4" : "max-w-[95%]"
        )}
      >
        {message.parts.map((part, i) => {
          const partId = `${message.id}-${i}`;

          if (part.type === "text") {
            // User messages: plain text, Assistant messages: markdown
            if (isUser) {
              return (
                <Text className="text-primary-foreground text-sm" key={partId}>
                  {part.text ?? ""}
                </Text>
              );
            }
            return (
              <StreamingMarkdown
                content={part.text ?? ""}
                key={partId}
                textClassName="text-foreground text-sm "
              />
            );
          }

          if (part.type === "file") {
            return (
              <FilePart
                isUser={isUser}
                key={partId}
                part={part as FileUIPart}
              />
            );
          }

          return null;
        })}
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
      contentContainerStyle={{ paddingVertical: 8, paddingBottom: 120 }}
      data={messages}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
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
      onScrollBeginDrag={() => {
        // Dismiss keyboard when user starts scrolling
        if (Platform.OS !== "web") {
          Keyboard.dismiss();
        }
      }}
      ref={listRef}
      renderItem={({ item }) => <MessageItem message={item} />}
    />
  );
};
