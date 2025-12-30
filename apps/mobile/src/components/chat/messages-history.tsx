import type { ChatStatus, FileUIPart, UIMessage } from "ai";
import * as Clipboard from "expo-clipboard";
import { CheckIcon, CopyIcon, FileIcon } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Keyboard,
  Linking,
  Platform,
  Pressable,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/icon";
import { StreamingMarkdown } from "@/components/ui/markdown";
import { Text } from "@/components/ui/text";
import { lightTap } from "@/lib/haptics";
import { cn } from "@/lib/utils";

type ChatUIMessage = UIMessage;

type MessagesHistoryProps = {
  messages: ChatUIMessage[];
  status: ChatStatus;
  onScrollStateChange?: (isAtBottom: boolean) => void;
  scrollToBottomRef?: React.MutableRefObject<(() => void) | null>;
};

type MessageItemProps = {
  message: ChatUIMessage;
  copiedPartId: string | null;
  onCopy: (text: string, partId: string) => void;
};

/**
 * Renders a file attachment part in a message
 */
const FilePart = ({
  part,
  isUser,
  useAutoMargin = true,
}: {
  part: FileUIPart;
  isUser: boolean;
  useAutoMargin?: boolean;
}) => {
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
        useAutoMargin && (isUser ? "ml-auto" : "mr-auto")
      )}
      onPress={handlePress}
    >
      {isImage ? (
        <Image
          className="size-full bg-accent"
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
 * Renders a copy button for messages
 */
const CopyButton = ({
  isCopied,
  onPress,
  alignRight = false,
}: {
  isCopied: boolean;
  onPress: () => void;
  alignRight?: boolean;
}) => {
  const { colorScheme } = useColorScheme();
  const IconComponent = isCopied ? CheckIcon : CopyIcon;
  const iconColor = colorScheme === "dark" ? "#a1a1aa" : "#71717a";

  return (
    <Pressable
      className={cn("rounded p-1", alignRight && "self-end")}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      onPress={onPress}
    >
      <IconComponent color={iconColor} size={14} />
    </Pressable>
  );
};

/**
 * Renders a single message item
 * Iterates through all parts in order, matching web app behavior
 */
const MessageItem = ({ message, copiedPartId, onCopy }: MessageItemProps) => {
  const isUser = message.role === "user";
  const parts = message.parts ?? [];

  return (
    <View
      className={cn(
        "mx-4 my-2 flex-col gap-2",
        isUser ? "items-end" : "items-start"
      )}
    >
      {parts.map((part, i) => {
        const partId = `${message.id}-${i}`;

        switch (part.type) {
          case "file": {
            // Render file parts as separate items (like web app)
            return (
              <FilePart
                isUser={isUser}
                key={partId}
                part={part as FileUIPart}
                useAutoMargin={true}
              />
            );
          }
          case "text": {
            // Render text parts in a bubble
            const textContent = part.text?.trim();
            if (!textContent) {
              return null;
            }
            const isCopied = copiedPartId === partId;
            return (
              <View className="flex-col gap-0" key={partId}>
                <View
                  className={cn(
                    "py-1",
                    isUser
                      ? "mb-1 max-w-[80%] rounded-lg bg-primary px-4"
                      : "max-w-[95%] pb-0"
                  )}
                >
                  {isUser ? (
                    <Text className="text-primary-foreground text-sm">
                      {textContent}
                    </Text>
                  ) : (
                    <StreamingMarkdown
                      content={textContent}
                      textClassName="text-foreground text-sm "
                    />
                  )}
                </View>
                <CopyButton
                  alignRight={isUser}
                  isCopied={isCopied}
                  onPress={() => onCopy(textContent, partId)}
                />
              </View>
            );
          }
          default:
            return null;
        }
      })}
    </View>
  );
};

/**
 * Messages history component for React Native
 * Displays chat messages in a FlatList
 * Content scrolls behind safe areas with padding applied
 */
export const MessagesHistory = ({
  messages,
  status,
  onScrollStateChange,
  scrollToBottomRef,
}: MessagesHistoryProps) => {
  const listRef = useRef<FlatList<ChatUIMessage>>(null);
  const layoutHeightRef = useRef(0);
  const contentHeightRef = useRef(0);
  const scrollOffsetRef = useRef(0);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [copiedPartId, setCopiedPartId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  /**
   * Copies text to clipboard with haptic feedback
   */
  const handleCopy = useCallback(async (text: string, partId: string) => {
    await Clipboard.setStringAsync(text);
    lightTap();
    setCopiedPartId(partId);
    setTimeout(() => setCopiedPartId(null), 1000);
  }, []);

  /**
   * Scrolls to the bottom of the messages list
   */
  const scrollToBottom = useCallback(() => {
    if (contentHeightRef.current > 0 && layoutHeightRef.current > 0) {
      const maxOffset = Math.max(
        0,
        contentHeightRef.current - layoutHeightRef.current
      );
      listRef.current?.scrollToOffset({
        offset: maxOffset,
        animated: true,
      });
    }
  }, []);

  // Expose scrollToBottom function via ref
  useEffect(() => {
    if (scrollToBottomRef) {
      scrollToBottomRef.current = scrollToBottom;
    }
  }, [scrollToBottom, scrollToBottomRef]);

  /**
   * Checks if user is at the bottom of the scroll view
   */
  const checkIfAtBottom = useCallback(
    (offset: number, contentHeight: number, layoutHeight: number) => {
      const threshold = 50; // Consider "at bottom" if within 50px
      const maxOffset = Math.max(0, contentHeight - layoutHeight);
      const isNearBottom = offset >= maxOffset - threshold;
      return isNearBottom;
    },
    []
  );

  /**
   * Handles scroll events to track if user is at bottom
   */
  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      const offset = event.nativeEvent.contentOffset.y;
      scrollOffsetRef.current = offset;

      if (contentHeightRef.current > 0 && layoutHeightRef.current > 0) {
        const atBottom = checkIfAtBottom(
          offset,
          contentHeightRef.current,
          layoutHeightRef.current
        );
        if (atBottom !== isAtBottom) {
          setIsAtBottom(atBottom);
          onScrollStateChange?.(atBottom);
        }
      }
    },
    [checkIfAtBottom, isAtBottom, onScrollStateChange]
  );

  return (
    <FlatList
      className="flex-1"
      contentContainerStyle={{
        paddingTop: insets.top + 24,
        paddingBottom: 140,
      }}
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
      onContentSizeChange={(_width, contentHeight) => {
        contentHeightRef.current = contentHeight;
        // Auto-scroll to bottom when content changes
        // Use scrollToOffset for precise positioning during streaming
        if (messages.length > 0 && layoutHeightRef.current > 0) {
          const maxOffset = Math.max(
            0,
            contentHeight - layoutHeightRef.current
          );
          listRef.current?.scrollToOffset({
            offset: maxOffset,
            animated: true,
          });
          // Update isAtBottom state after auto-scroll
          setIsAtBottom(true);
          onScrollStateChange?.(true);
        }
      }}
      onLayout={(e) => {
        layoutHeightRef.current = e.nativeEvent.layout.height;
      }}
      onScroll={handleScroll}
      onScrollBeginDrag={() => {
        // Dismiss keyboard when user starts scrolling
        if (Platform.OS !== "web") {
          Keyboard.dismiss();
        }
      }}
      ref={listRef}
      renderItem={({ item }) => (
        <MessageItem
          copiedPartId={copiedPartId}
          message={item}
          onCopy={handleCopy}
        />
      )}
      scrollEventThrottle={16}
    />
  );
};
