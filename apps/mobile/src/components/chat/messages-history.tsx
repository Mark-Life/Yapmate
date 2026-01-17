import { LegendList, type LegendListRef } from "@legendapp/list";
import type { ChatStatus, UIMessage } from "ai";
import * as Clipboard from "expo-clipboard";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { lightTap } from "@/lib/haptics";
import { MessageItem } from "./message-item";
import { TypingIndicator } from "./typing-indicator";

const CONTENT_PADDING_BOTTOM = 140;

type ChatUIMessage = UIMessage;

type MessagesHistoryProps = {
  addToolApprovalResponse?: (response: {
    id: string;
    approved: boolean;
  }) => void;
  currentUserId?: string;
  isMultiUser?: boolean;
  memberNames?: Map<string, string>;
  messages: ChatUIMessage[];
  status: ChatStatus;
  typingMembers?: Map<string, string>;
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
/**
 * Gets sender information for a message in multi-user context
 */
const getMessageSenderInfo = (
  message: ChatUIMessage,
  currentUserId?: string,
  isMultiUser?: boolean,
  memberNames?: Map<string, string>
): { senderName?: string; isOtherUser: boolean } => {
  const userId = (message.metadata as { userId?: string })?.userId;
  const senderName = userId ? memberNames?.get(userId) : undefined;
  // A message is from the current user if no userId (old format) or userId matches currentUserId
  const isCurrentUser = userId === undefined || userId === currentUserId;
  // It's "other user" only if it's a user message and not from current user in multi-user context
  const isOtherUser =
    message.role === "user" && !isCurrentUser && Boolean(isMultiUser);
  return { senderName, isOtherUser };
};

export const MessagesHistory = ({
  addToolApprovalResponse,
  currentUserId,
  isMultiUser,
  memberNames,
  messages,
  status,
  typingMembers,
  onScrollStateChange,
  scrollToBottomRef,
  onEdit,
  onRegenerate,
  onRequestModelForRegeneration,
}: MessagesHistoryProps) => {
  const insets = useSafeAreaInsets();
  const listRef = useRef<LegendListRef>(null);
  const layoutHeightRef = useRef(0);
  const contentHeightRef = useRef(0);
  const scrollOffsetRef = useRef(0);
  const prevMessagesLengthRef = useRef(messages.length);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  /**
   * Copies text to clipboard with haptic feedback
   * Called from MessageItem context menu
   */
  const handleCopy = useCallback(async (text: string, _partId: string) => {
    await Clipboard.setStringAsync(text);
    lightTap();
  }, []);

  /**
   * Scrolls to the bottom of the messages list
   * Includes paddingBottom since contentHeight doesn't account for it
   */
  const scrollToBottom = useCallback(() => {
    if (contentHeightRef.current > 0 && layoutHeightRef.current > 0) {
      const maxOffset = Math.max(
        0,
        contentHeightRef.current +
          CONTENT_PADDING_BOTTOM -
          layoutHeightRef.current
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
   * Uses contentHeight without padding - scroll offset is relative to content bounds
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
        marginTop: insets.top + 38,
        paddingBottom: CONTENT_PADDING_BOTTOM,
        marginBottom: insets.bottom,
      }}
      data={messages}
      estimatedItemSize={120}
      extraData={{ editingMessageId, status }}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      keyExtractor={(item) => item.id}
      ListFooterComponent={useMemo(() => {
        const hasTypingMembers = typingMembers && typingMembers.size > 0;

        // Don't show "Thinking..." if last message already has a reasoning part
        // (the reasoning part will show its own thinking indicator)
        const showThinking = status === "submitted";
        const lastMessage = messages.at(-1);
        const hasReasoningPart = lastMessage?.parts?.some(
          (part) => part.type === "reasoning"
        );

        if (!hasTypingMembers && (!showThinking || hasReasoningPart)) {
          return null;
        }

        return (
          <>
            {hasTypingMembers ? (
              <TypingIndicator typingMembers={typingMembers} />
            ) : null}
            {showThinking && !hasReasoningPart ? (
              <View className="mx-4 my-2">
                <Text className="text-muted-foreground text-sm">
                  Thinking...
                </Text>
              </View>
            ) : null}
          </>
        );
      }, [status, messages, typingMembers])}
      onContentSizeChange={(_width, contentHeight) => {
        contentHeightRef.current = contentHeight;

        // Only auto-scroll when:
        // 1. New messages are added (messages.length changed)
        // 2. Currently streaming content
        // Skip auto-scroll for accordion expand/collapse or other UI changes
        const messagesChanged =
          messages.length !== prevMessagesLengthRef.current;
        const isStreaming = status === "streaming" || status === "submitted";
        const shouldAutoScroll = messagesChanged || isStreaming;

        // Update the ref for next comparison
        prevMessagesLengthRef.current = messages.length;

        if (
          shouldAutoScroll &&
          messages.length > 0 &&
          layoutHeightRef.current > 0 &&
          editingMessageId === null
        ) {
          const maxOffset = Math.max(
            0,
            contentHeight + CONTENT_PADDING_BOTTOM - layoutHeightRef.current
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
      renderItem={({ item }) => {
        const { senderName, isOtherUser } = getMessageSenderInfo(
          item,
          currentUserId,
          isMultiUser,
          memberNames
        );
        return (
          <MessageItem
            addToolApprovalResponse={addToolApprovalResponse}
            isEditing={editingMessageId === item.id}
            isOtherUser={isOtherUser}
            message={item}
            onCancelEdit={() => setEditingMessageId(null)}
            onCopy={handleCopy}
            onEdit={onEdit}
            onRegenerate={onRegenerate}
            onRequestModelForRegeneration={onRequestModelForRegeneration}
            onStartEdit={setEditingMessageId}
            senderName={senderName}
            status={status}
          />
        );
      }}
      scrollEventThrottle={16}
    />
  );
};
