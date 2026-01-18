import type { FileUIPart, ReasoningUIPart, UIMessage } from "ai";
import { FileIcon } from "lucide-react-native";
import type {
  ContentSizeEvent,
  ContextMenuActionEvent,
  ContextMenuAction as NativeContextMenuAction,
} from "modules/native-markdown";
import { NativeMarkdownView } from "modules/native-markdown";
import { useColorScheme } from "nativewind";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type ViewStyle,
} from "react-native";
import ContextMenu from "react-native-context-menu-view";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Icon } from "@/components/ui/icon";
import { StreamingMarkdown } from "@/components/ui/markdown";
import { Text } from "@/components/ui/text";
import { getThemeColors, radius, type ThemeColors } from "@/lib/colors";
import { parseModel } from "@/lib/parse-model";
import { EditActions } from "./message-actions";

type ChatUIMessage = UIMessage;

type NativeMarkdownMessageProps = {
  content: string;
  contextMenuActions?: NativeContextMenuAction[];
  onContextMenuAction?: (event: ContextMenuActionEvent) => void;
  textColor?: string;
  /** Bubble styling - all handled natively */
  backgroundColor?: string;
  paddingHorizontal?: number;
  paddingVertical?: number;
  borderRadius?: number;
  isUser?: boolean;
  /** For other users: shrink-to-fit width like user, but left-aligned */
  isOtherUser?: boolean;
};

/**
 * Wrapper for native markdown view with auto-sizing and native context menu
 */
const NativeMarkdownMessage = ({
  content,
  contextMenuActions,
  onContextMenuAction,
  textColor,
  backgroundColor,
  paddingHorizontal,
  paddingVertical,
  borderRadius: bubbleRadius,
  isUser = false,
  isOtherUser = false,
}: NativeMarkdownMessageProps) => {
  const [height, setHeight] = useState(20);
  const [width, setWidth] = useState<number | undefined>(undefined);

  // Other user messages need shrink-to-fit width like user messages
  const useShrinkToFit = isUser || isOtherUser;

  const handleContentSizeChange = useCallback(
    (event: ContentSizeEvent) => {
      const { height: newHeight, width: newWidth } = event.nativeEvent;
      if (newHeight > 0) {
        setHeight(newHeight);
      }
      // For user/other user messages, use native-calculated width
      if (useShrinkToFit && newWidth > 0) {
        setWidth(newWidth);
      }
    },
    [useShrinkToFit]
  );

  // Determine alignment: user = right, other user = left, assistant = stretch
  let alignSelf: "flex-end" | "flex-start" | "stretch" = "stretch";
  if (isUser) {
    alignSelf = "flex-end";
  } else if (isOtherUser) {
    alignSelf = "flex-start";
  }

  return (
    <NativeMarkdownView
      backgroundColor={backgroundColor}
      borderRadius={bubbleRadius}
      content={content}
      contextMenuActions={contextMenuActions}
      isUser={useShrinkToFit}
      onContentSizeChange={handleContentSizeChange}
      onContextMenuAction={onContextMenuAction}
      paddingHorizontal={paddingHorizontal}
      paddingVertical={paddingVertical}
      style={{
        height,
        alignSelf,
        maxWidth: isOtherUser ? "80%" : "95%",
        // For user/other user messages, use native-calculated width (shrink to fit)
        // For assistant, let it stretch to fill available width
        width: useShrinkToFit ? width : undefined,
      }}
      textColor={textColor}
    />
  );
};

type ContextMenuAction = {
  title: string;
  systemIcon: string;
};

/**
 * Renders a file attachment part in a message
 */
export const FilePart = ({
  part,
  isUser,
  useAutoMargin = true,
}: {
  part: FileUIPart;
  isUser: boolean;
  useAutoMargin?: boolean;
}) => {
  const { colorScheme } = useColorScheme();
  const theme = getThemeColors(colorScheme);
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
      onPress={handlePress}
      style={[
        styles.filePart,
        isImage ? styles.filePartImage : styles.filePartFile,
        { borderColor: theme.border },
        useAutoMargin &&
          (isUser ? styles.marginLeftAuto : styles.marginRightAuto),
      ]}
    >
      {isImage ? (
        <Image
          resizeMode="cover"
          source={{ uri: part.url }}
          style={[styles.fullSize, { backgroundColor: theme.accent }]}
        />
      ) : (
        <View style={[styles.fileContainer, { backgroundColor: theme.muted }]}>
          <Icon as={FileIcon} color={theme.mutedForeground} size={32} />
          {part.filename ? (
            <Text
              numberOfLines={1}
              style={[styles.fileName, { color: theme.mutedForeground }]}
            >
              {part.filename}
            </Text>
          ) : null}
        </View>
      )}
    </Pressable>
  );
};

type TextPartProps = {
  part: Extract<ChatUIMessage["parts"][number], { type: "text" }>;
  isOtherUser?: boolean;
  isUser: boolean;
  isEditing: boolean;
  messageId: string;
  modelName?: string;
  senderName?: string;
  onCancelEdit: () => void;
  onEdit?: (messageId: string, editedText: string) => void;
  contextMenuActions?: ContextMenuAction[];
  contextMenuKey?: string;
  onContextMenuPress?: (event: {
    nativeEvent: { index: number; name: string };
  }) => void;
};

/**
 * Renders message content (text input when editing, text/markdown when not)
 */
const MessageContent = ({
  isEditing,
  isUser,
  isOtherUser = false,
  editedText,
  textContent,
  textInputRef,
  onTextChange,
  theme,
}: {
  isEditing: boolean;
  isUser: boolean;
  isOtherUser?: boolean;
  editedText: string;
  textContent: string;
  textInputRef: React.RefObject<TextInput>;
  onTextChange: (text: string) => void;
  theme: ThemeColors;
}) => {
  if (isEditing) {
    return (
      <TextInput
        multiline
        onChangeText={onTextChange}
        ref={textInputRef}
        style={[styles.editInput, { color: theme.primaryForeground }]}
        value={editedText}
      />
    );
  }

  // Other user's message: use foreground color (not primary foreground)
  if (isOtherUser) {
    return (
      <Text style={[styles.userText, { color: theme.foreground }]}>
        {textContent}
      </Text>
    );
  }

  if (isUser) {
    return (
      <Text style={[styles.userText, { color: theme.primaryForeground }]}>
        {textContent}
      </Text>
    );
  }

  // Native iOS markdown view
  if (Platform.OS === "ios") {
    return (
      <NativeMarkdownView content={textContent} style={{ minHeight: 20 }} />
    );
  }

  return (
    <StreamingMarkdown
      content={textContent}
      textClassName="text-foreground text-sm"
    />
  );
};

/**
 * Renders the message bubble content
 */
const MessageBubble = ({
  isUser,
  isOtherUser = false,
  isEditing,
  editedText,
  textContent,
  textInputRef,
  onTextChange,
  theme,
  senderName,
}: {
  isUser: boolean;
  isOtherUser?: boolean;
  isEditing: boolean;
  editedText: string;
  textContent: string;
  textInputRef: React.RefObject<TextInput>;
  onTextChange: (text: string) => void;
  theme: ThemeColors;
  senderName?: string;
}) => {
  // Other user's message: muted bubble, left-aligned
  // Current user's message: primary bubble, right-aligned
  // Assistant message: no bubble
  let bubbleStyle: ViewStyle[] = [
    styles.assistantBubble,
    { backgroundColor: theme.background },
  ];
  if (isOtherUser) {
    bubbleStyle = [styles.userBubble, { backgroundColor: theme.muted }];
  } else if (isUser) {
    bubbleStyle = [styles.userBubble, { backgroundColor: theme.primary }];
  }

  return (
    <View style={bubbleStyle}>
      {isOtherUser && senderName ? (
        <Text style={[styles.senderNameInBubble, { color: theme.primary }]}>
          {senderName}
        </Text>
      ) : null}
      <MessageContent
        editedText={editedText}
        isEditing={isEditing}
        isOtherUser={isOtherUser}
        isUser={isUser}
        onTextChange={onTextChange}
        textContent={textContent}
        textInputRef={textInputRef}
        theme={theme}
      />
    </View>
  );
};

/**
 * Renders a formatted model name label below assistant messages
 */
const ModelLabel = ({ modelName }: { modelName: string }) => {
  const { modelName: formattedName } = parseModel(modelName);
  return (
    <Text className="mt-1 text-muted-foreground text-xs">{formattedName}</Text>
  );
};

/**
 * Renders a text message part with inline styles
 */
export const TextPart = ({
  part,
  isOtherUser = false,
  isUser,
  isEditing,
  messageId,
  modelName,
  senderName,
  onCancelEdit,
  onEdit,
  contextMenuActions,
  contextMenuKey,
  onContextMenuPress,
  // todo: fix this linter error
}: TextPartProps) => {
  const { colorScheme } = useColorScheme();
  const theme = getThemeColors(colorScheme);
  const textContent = part.text?.trim();
  const [editedText, setEditedText] = useState(part.text);
  const textInputRef = useRef<TextInput>(null);
  const iconColor = theme.mutedForeground;

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

  const hasChanges = editedText.trim() !== part.text.trim();

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

  const showContextMenu =
    !isEditing && contextMenuActions && onContextMenuPress;

  // iOS messages use native markdown with native context menu (when not editing)
  if (Platform.OS === "ios" && !isEditing) {
    // Other user's message: left-aligned with muted bubble and sender name inside
    if (isOtherUser) {
      return (
        <View
          style={[styles.otherUserBubble, { backgroundColor: theme.muted }]}
        >
          {senderName ? (
            <Text style={[styles.senderNameInBubble, { color: theme.primary }]}>
              {senderName}
            </Text>
          ) : null}
          <NativeMarkdownMessage
            content={textContent ?? ""}
            contextMenuActions={contextMenuActions}
            isOtherUser={true}
            onContextMenuAction={onContextMenuPress}
            textColor={theme.foreground}
          />
        </View>
      );
    }
    if (isUser) {
      // Current user's message: bubble styling handled natively
      return (
        <NativeMarkdownMessage
          backgroundColor={theme.primary}
          borderRadius={radius.md}
          content={textContent ?? ""}
          contextMenuActions={contextMenuActions}
          isUser={true}
          onContextMenuAction={onContextMenuPress}
          paddingHorizontal={12}
          paddingVertical={6}
          textColor={theme.primaryForeground}
        />
      );
    }
    // Assistant message: no bubble styling
    return (
      <>
        <NativeMarkdownMessage
          content={textContent ?? ""}
          contextMenuActions={contextMenuActions}
          onContextMenuAction={onContextMenuPress}
        />
        {modelName ? <ModelLabel modelName={modelName} /> : null}
      </>
    );
  }

  let wrapperStyle: ViewStyle = styles.assistantWrapper;
  if (isOtherUser) {
    wrapperStyle = styles.otherUserWrapper;
  } else if (isUser) {
    wrapperStyle = styles.userWrapper;
  }

  const bubbleContent = (
    <MessageBubble
      editedText={editedText}
      isEditing={isEditing}
      isOtherUser={isOtherUser}
      isUser={isUser}
      onTextChange={setEditedText}
      senderName={senderName}
      textContent={textContent}
      textInputRef={textInputRef as React.RefObject<TextInput>}
      theme={theme}
    />
  );

  return (
    <View style={wrapperStyle}>
      {showContextMenu ? (
        <ContextMenu
          actions={contextMenuActions}
          key={contextMenuKey}
          onPress={onContextMenuPress}
          preview={
            <MessageBubble
              editedText={editedText}
              isEditing={false}
              isOtherUser={isOtherUser}
              isUser={isUser}
              onTextChange={setEditedText}
              senderName={senderName}
              textContent={textContent}
              textInputRef={textInputRef as React.RefObject<TextInput>}
              theme={theme}
            />
          }
          previewBackgroundColor="transparent"
        >
          {bubbleContent}
        </ContextMenu>
      ) : (
        bubbleContent
      )}
      {!isUser && modelName ? <ModelLabel modelName={modelName} /> : null}
      {isEditing ? (
        <View
          style={[
            styles.editActionsRow,
            isUser && !isOtherUser ? styles.justifyEnd : styles.justifyStart,
          ]}
        >
          <EditActions
            hasChanges={hasChanges}
            iconColor={iconColor}
            isUser={isUser && !isOtherUser}
            onCancel={handleCancel}
            onSave={handleEdit}
          />
        </View>
      ) : null}
    </View>
  );
};

type ReasoningPartProps = {
  part: ReasoningUIPart;
  isStreaming: boolean;
};

/**
 * Renders the shimmer text for "Thinking..." with pulsing opacity animation
 */
const ShimmerText = ({ children }: { children: string }) => {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Text className="font-medium text-muted-foreground text-sm">
        {children}
      </Text>
    </Animated.View>
  );
};

/**
 * Renders a reasoning/thinking part in a collapsible accordion
 * - Shows "Thinking..." with shimmer animation while streaming
 * - Shows "Thought for X seconds" after completion
 * - Auto-collapses after streaming ends
 */
export const ReasoningPart = ({ part, isStreaming }: ReasoningPartProps) => {
  const { colorScheme } = useColorScheme();
  const theme = getThemeColors(colorScheme);

  // Track duration from when we first see this part streaming
  const [startTime] = useState(() => (isStreaming ? Date.now() : null));
  const [duration, setDuration] = useState<number | null>(null);

  // Track accordion open state - expanded while streaming, collapsed after
  const [accordionValue, setAccordionValue] = useState<string>(
    isStreaming ? "reasoning" : ""
  );

  // Track content height for NativeMarkdownView auto-sizing
  const [contentHeight, setContentHeight] = useState(20);

  const handleContentSizeChange = useCallback((event: ContentSizeEvent) => {
    const { height } = event.nativeEvent;
    if (height > 0) {
      setContentHeight(height);
    }
  }, []);

  // Handle streaming end - record duration
  useEffect(() => {
    if (!isStreaming && startTime && duration === null) {
      const elapsed = Math.ceil((Date.now() - startTime) / 1000);
      setDuration(elapsed);
    }
  }, [isStreaming, startTime, duration]);

  // Don't render if there's no content
  if (!(part.text || isStreaming)) {
    return null;
  }

  let headerText = "Thought";
  if (isStreaming) {
    headerText = "Thinking...";
  } else if (duration) {
    headerText = `Thought for ${duration} seconds`;
  }

  return (
    <View style={[styles.reasoningContainer, { borderColor: theme.border }]}>
      <Accordion
        collapsible
        onValueChange={(value: string | undefined) =>
          setAccordionValue(value ?? "")
        }
        type="single"
        value={accordionValue}
      >
        <AccordionItem className="border-b-0" value="reasoning">
          <AccordionTrigger className="py-2">
            <View style={styles.reasoningHeader}>
              {isStreaming ? (
                <ShimmerText>{headerText}</ShimmerText>
              ) : (
                <Text className="font-medium text-muted-foreground text-sm">
                  {headerText}
                </Text>
              )}
            </View>
          </AccordionTrigger>
          <AccordionContent className="pb-2">
            <View style={styles.reasoningContent}>
              {Platform.OS === "ios" ? (
                <NativeMarkdownView
                  content={part.text}
                  onContentSizeChange={handleContentSizeChange}
                  style={{ height: contentHeight }}
                  textColor={theme.mutedForeground}
                />
              ) : (
                <StreamingMarkdown
                  content={part.text}
                  textClassName="text-muted-foreground text-sm"
                />
              )}
            </View>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </View>
  );
};

const styles = StyleSheet.create({
  reasoningContainer: {
    marginVertical: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    paddingHorizontal: 12,
    width: "100%",
  },
  reasoningHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reasoningContent: {
    paddingTop: 4,
  },
  filePart: {
    marginVertical: 4,
    overflow: "hidden",
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  filePartImage: {
    width: 192,
    height: 192,
  },
  filePartFile: {
    width: 128,
    height: 80,
  },
  marginLeftAuto: {
    marginLeft: "auto",
  },
  marginRightAuto: {
    marginRight: "auto",
  },
  fullSize: {
    width: "100%",
    height: "100%",
  },
  fileContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
  },
  fileName: {
    marginTop: 4,
    fontSize: 12,
    maxWidth: 128,
  },
  editInput: {
    paddingVertical: 4,
    fontSize: 14,
  },
  userText: {
    fontSize: 14,
  },
  userBubble: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.lg,
  },
  otherUserBubble: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.lg,
    maxWidth: "80%",
    alignSelf: "flex-start",
  },
  assistantBubble: {
    paddingVertical: 6,
    paddingBottom: 0,
  },
  userWrapper: {
    flexDirection: "column",
    maxWidth: "80%",
    alignItems: "flex-end",
  },
  assistantWrapper: {
    flexDirection: "column",
    maxWidth: "95%",
    alignItems: "flex-start",
  },
  otherUserWrapper: {
    flexDirection: "column",
    maxWidth: "80%",
    alignItems: "flex-start",
  },
  senderName: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 2,
  },
  senderNameInBubble: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 0,
    marginTop: 0,
  },
  editActionsRow: {
    marginTop: 8,
    width: "100%",
    flexDirection: "row",
    gap: 8,
  },
  justifyEnd: {
    justifyContent: "flex-end",
  },
  justifyStart: {
    justifyContent: "flex-start",
  },
});
