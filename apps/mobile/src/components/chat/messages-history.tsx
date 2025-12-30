import type { ChatStatus, FileUIPart, UIMessage } from "ai";
import * as Clipboard from "expo-clipboard";
import {
  CheckIcon,
  CopyIcon,
  FileIcon,
  PencilIcon,
  RefreshCcwIcon,
  XIcon,
} from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Keyboard,
  Linking,
  Platform,
  Pressable,
  TextInput,
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
  onEdit?: (messageId: string, editedText: string) => void;
  onRegenerate?: (messageId: string, role: "user" | "assistant") => void;
  onRequestModelForRegeneration?: (
    messageId: string,
    role: "user" | "assistant"
  ) => void;
};

type MessageItemProps = {
  message: ChatUIMessage;
  copiedPartId: string | null;
  isEditing: boolean;
  onCopy: (text: string, partId: string) => void;
  onCancelEdit: () => void;
  onEdit?: (messageId: string, editedText: string) => void;
  onRegenerate?: (messageId: string, role: "user" | "assistant") => void;
  onRequestModelForRegeneration?: (
    messageId: string,
    role: "user" | "assistant"
  ) => void;
  onStartEdit: (messageId: string) => void;
  status: ChatStatus;
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
 * Renders a retry button for messages
 */
const RetryButton = ({
  onPress,
  onLongPress,
  alignRight = false,
}: {
  onPress: () => void;
  onLongPress: () => void;
  alignRight?: boolean;
}) => {
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === "dark" ? "#a1a1aa" : "#71717a";
  const longPressedRef = useRef(false);

  /**
   * Handle press - skip if long press was triggered
   */
  const handlePress = () => {
    if (longPressedRef.current) {
      longPressedRef.current = false;
      return;
    }
    lightTap();
    onPress();
  };

  /**
   * Handle long press - set flag to prevent onPress from firing
   */
  const handleLongPress = () => {
    longPressedRef.current = true;
    lightTap();
    onLongPress();
  };

  /**
   * Reset long press flag after touch ends
   */
  const handlePressOut = () => {
    setTimeout(() => {
      longPressedRef.current = false;
    }, 100);
  };

  return (
    <Pressable
      className={cn("rounded p-1", alignRight && "self-end")}
      delayLongPress={300}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      onLongPress={handleLongPress}
      onPress={handlePress}
      onPressOut={handlePressOut}
    >
      <RefreshCcwIcon color={iconColor} size={14} />
    </Pressable>
  );
};

/**
 * Renders an edit button for user messages
 */
const EditButton = ({
  disabled = false,
  onPress,
  alignRight = false,
}: {
  disabled?: boolean;
  onPress: () => void;
  alignRight?: boolean;
}) => {
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === "dark" ? "#a1a1aa" : "#71717a";

  return (
    <Pressable
      className={cn(
        "rounded p-1",
        alignRight && "self-end",
        disabled && "opacity-50"
      )}
      disabled={disabled}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      onPress={() => {
        lightTap();
        onPress();
      }}
    >
      <PencilIcon color={iconColor} size={14} />
    </Pressable>
  );
};

type TextPartProps = {
  part: Extract<ChatUIMessage["parts"][number], { type: "text" }>;
  partId: string;
  isUser: boolean;
  isCopied: boolean;
  isEditing: boolean;
  messageId: string;
  messageRole: "user" | "assistant";
  onCopy: (text: string, partId: string) => void;
  onCancelEdit: () => void;
  onEdit?: (messageId: string, editedText: string) => void;
  onRegenerate?: (messageId: string, role: "user" | "assistant") => void;
  onRequestModelForRegeneration?: (
    messageId: string,
    role: "user" | "assistant"
  ) => void;
  onStartEdit: (messageId: string) => void;
  status: ChatStatus;
};

/**
 * Renders message content (text input when editing, text/markdown when not)
 */
const MessageContent = ({
  isEditing,
  isUser,
  editedText,
  textContent,
  textInputRef,
  onTextChange,
}: {
  isEditing: boolean;
  isUser: boolean;
  editedText: string;
  textContent: string;
  textInputRef: React.RefObject<TextInput>;
  onTextChange: (text: string) => void;
}) => {
  if (isEditing) {
    return (
      <TextInput
        className="py-1 text-primary-foreground text-sm"
        multiline
        onChangeText={onTextChange}
        ref={textInputRef}
        value={editedText}
      />
    );
  }

  if (isUser) {
    return (
      <Text className="text-primary-foreground text-sm">{textContent}</Text>
    );
  }

  return (
    <StreamingMarkdown
      content={textContent}
      textClassName="text-foreground text-sm "
    />
  );
};

/**
 * Renders edit action buttons (Cancel and Save)
 */
const EditActions = ({
  isUser,
  hasChanges,
  iconColor,
  onCancel,
  onSave,
}: {
  isUser: boolean;
  hasChanges: boolean;
  iconColor: string;
  onCancel: () => void;
  onSave: () => void;
}) => (
  <>
    <Pressable
      className={cn("rounded p-1", isUser && "self-end")}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      onPress={() => {
        lightTap();
        onCancel();
      }}
    >
      <XIcon color={iconColor} size={16} />
    </Pressable>
    <Pressable
      className={cn(
        "rounded p-1",
        isUser && "self-end",
        !hasChanges && "opacity-50"
      )}
      disabled={!hasChanges}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      onPress={() => {
        lightTap();
        onSave();
      }}
    >
      <CheckIcon color={iconColor} size={16} />
    </Pressable>
  </>
);

/**
 * Renders normal action buttons (Copy, Retry, Edit)
 */
const NormalActions = ({
  isUser,
  isCopied,
  canRegenerate,
  canEdit,
  isStreaming,
  textContent,
  partId,
  messageId,
  messageRole,
  onCopy,
  onRegenerate,
  onRequestModelForRegeneration,
  onStartEdit,
}: {
  isUser: boolean;
  isCopied: boolean;
  canRegenerate: boolean;
  canEdit: boolean;
  isStreaming: boolean;
  textContent: string;
  partId: string;
  messageId: string;
  messageRole: "user" | "assistant";
  onCopy: (text: string, partId: string) => void;
  onRegenerate?: (messageId: string, role: "user" | "assistant") => void;
  onRequestModelForRegeneration?: (
    messageId: string,
    role: "user" | "assistant"
  ) => void;
  onStartEdit: (messageId: string) => void;
}) => (
  <>
    <CopyButton
      alignRight={isUser}
      isCopied={isCopied}
      onPress={() => onCopy(textContent, partId)}
    />
    {canRegenerate ? (
      <RetryButton
        alignRight={isUser}
        onLongPress={() =>
          onRequestModelForRegeneration?.(messageId, messageRole)
        }
        onPress={() => onRegenerate?.(messageId, messageRole)}
      />
    ) : null}
    {canEdit ? (
      <EditButton
        alignRight={isUser}
        disabled={isStreaming}
        onPress={() => onStartEdit(messageId)}
      />
    ) : null}
  </>
);

/**
 * Renders a text message part with actions
 */
const TextPart = ({
  part,
  partId,
  isUser,
  isCopied,
  isEditing,
  messageId,
  messageRole,
  onCopy,
  onCancelEdit,
  onEdit,
  onRegenerate,
  onRequestModelForRegeneration,
  onStartEdit,
  status,
}: TextPartProps) => {
  const { colorScheme } = useColorScheme();
  const textContent = part.text?.trim();
  const [editedText, setEditedText] = useState(part.text);
  const textInputRef = useRef<TextInput>(null);
  const iconColor = colorScheme === "dark" ? "#a1a1aa" : "#71717a";

  useEffect(() => {
    if (isEditing && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) {
      setEditedText(part.text);
    }
  }, [isEditing, part.text]);

  if (!(textContent || isEditing)) {
    return null;
  }

  const canRegenerate = Boolean(onRegenerate && onRequestModelForRegeneration);
  const canEdit = Boolean(isUser && onEdit);
  const hasChanges = editedText.trim() !== part.text.trim();
  const isStreaming = status === "streaming" || status === "submitted";

  const handleEdit = () => {
    if (isUser && onEdit) {
      onEdit(messageId, editedText.trim());
      onCancelEdit();
    }
  };

  const handleCancel = () => {
    setEditedText(part.text);
    onCancelEdit();
  };

  return (
    <View className="flex-col gap-0">
      <View
        className={cn(
          "py-1.5",
          isUser
            ? "mb-2 max-w-[80%] rounded-lg bg-primary px-4"
            : "max-w-[95%] pb-0"
        )}
      >
        <MessageContent
          editedText={editedText}
          isEditing={isEditing}
          isUser={isUser}
          onTextChange={setEditedText}
          textContent={textContent}
          textInputRef={textInputRef as React.RefObject<TextInput>}
        />
      </View>
      <View
        className={cn(
          "flex-row gap-3",
          isUser ? "justify-end" : "justify-start"
        )}
      >
        {isEditing ? (
          <EditActions
            hasChanges={hasChanges}
            iconColor={iconColor}
            isUser={isUser}
            onCancel={handleCancel}
            onSave={handleEdit}
          />
        ) : (
          <NormalActions
            canEdit={canEdit}
            canRegenerate={canRegenerate}
            isCopied={isCopied}
            isStreaming={isStreaming}
            isUser={isUser}
            messageId={messageId}
            messageRole={messageRole}
            onCopy={onCopy}
            onRegenerate={onRegenerate}
            onRequestModelForRegeneration={onRequestModelForRegeneration}
            onStartEdit={onStartEdit}
            partId={partId}
            textContent={textContent}
          />
        )}
      </View>
    </View>
  );
};

/**
 * Renders a single message item
 * Iterates through all parts in order, matching web app behavior
 */
const MessageItem = ({
  message,
  copiedPartId,
  isEditing,
  onCopy,
  onCancelEdit,
  onEdit,
  onRegenerate,
  onRequestModelForRegeneration,
  onStartEdit,
  status,
}: MessageItemProps) => {
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
            return (
              <TextPart
                isCopied={copiedPartId === partId}
                isEditing={isEditing}
                isUser={isUser}
                key={partId}
                messageId={message.id}
                messageRole={message.role as "user" | "assistant"}
                onCancelEdit={onCancelEdit}
                onCopy={onCopy}
                onEdit={onEdit}
                onRegenerate={onRegenerate}
                onRequestModelForRegeneration={onRequestModelForRegeneration}
                onStartEdit={onStartEdit}
                part={part}
                partId={partId}
                status={status}
              />
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
  onEdit,
  onRegenerate,
  onRequestModelForRegeneration,
}: MessagesHistoryProps) => {
  const listRef = useRef<FlatList<ChatUIMessage>>(null);
  const layoutHeightRef = useRef(0);
  const contentHeightRef = useRef(0);
  const scrollOffsetRef = useRef(0);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [copiedPartId, setCopiedPartId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
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
