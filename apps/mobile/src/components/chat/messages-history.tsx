import { LegendList, type LegendListRef } from "@legendapp/list";
import type { ChatStatus, UIMessage } from "ai";
import * as Clipboard from "expo-clipboard";
import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, Platform, View } from "react-native";
import { Text } from "@/components/ui/text";
import { lightTap } from "@/lib/haptics";
import { MessageItem } from "./message-item";

type ChatUIMessage = UIMessage;

type MessagesHistoryProps = {
  messages: ChatUIMessage[];
  status: ChatStatus;
  onScrollStateChange?: (isAtBottom: boolean) => void;
  scrollToBottomRef?: React.MutableRefObject<(() => void) | null>;
  onEdit?: (messageId: string, editedText: string) => void;
  onRegenerate?: (messageId: string, role: "user" | "assistant") => void;
  onRequestModelForRegeneration?: (
    messageId: string,
    role: "user" | "assistant"
  ) => void;
};

/**
 * Messages history component for React Native
 * Displays chat messages in a LegendList
 * Content scrolls behind safe areas with padding applied
 */
export const MessagesHistory = ({
  messages,
  status,
  onScrollStateChange,
  scrollToBottomRef,
  onEdit,
  onRegenerate,
  onRequestModelForRegeneration,
}: MessagesHistoryProps) => {
  const listRef = useRef<LegendListRef>(null);
  const layoutHeightRef = useRef(0);
  const contentHeightRef = useRef(0);
  const scrollOffsetRef = useRef(0);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [copiedPartId, setCopiedPartId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

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
    <LegendList
      className="flex-1"
      contentContainerStyle={{
        paddingTop: 20,
        paddingBottom: 100,
      }}
      contentInsetAdjustmentBehavior="automatic"
      data={messages}
      estimatedItemSize={120}
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
        // Skip auto-scroll if user is editing a message to prevent interrupting their typing
        // Use scrollToOffset for precise positioning during streaming
        if (
          messages.length > 0 &&
          layoutHeightRef.current > 0 &&
          editingMessageId === null
        ) {
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
      recycleItems
      ref={listRef}
      renderItem={({ item }) => (
        <MessageItem
          copiedPartId={copiedPartId}
          isEditing={editingMessageId === item.id}
          message={item}
          onCancelEdit={() => setEditingMessageId(null)}
          onCopy={handleCopy}
          onEdit={onEdit}
          onRegenerate={onRegenerate}
          onRequestModelForRegeneration={onRequestModelForRegeneration}
          onStartEdit={setEditingMessageId}
          status={status}
        />
      )}
      scrollEventThrottle={16}
    />
  );
};
