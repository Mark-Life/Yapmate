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
}: NativeMarkdownMessageProps) => {
  const [height, setHeight] = useState(20);
  const [width, setWidth] = useState<number | undefined>(undefined);

  const handleContentSizeChange = useCallback(
    (event: ContentSizeEvent) => {
      const { height: newHeight, width: newWidth } = event.nativeEvent;
      if (newHeight > 0) {
        setHeight(newHeight);
      }
      // For user messages, use native-calculated width
      if (isUser && newWidth > 0) {
        setWidth(newWidth);
      }
    },
    [isUser]
  );

  return (
    <NativeMarkdownView
      backgroundColor={backgroundColor}
      borderRadius={bubbleRadius}
      content={content}
      contextMenuActions={contextMenuActions}
      isUser={isUser}
      onContentSizeChange={handleContentSizeChange}
      onContextMenuAction={onContextMenuAction}
      paddingHorizontal={paddingHorizontal}
      paddingVertical={paddingVertical}
      style={{
        height,
        alignSelf: isUser ? "flex-end" : "stretch",
        maxWidth: "95%",
        // For user messages, use native-calculated width (shrink to fit)
        // For assistant, let it stretch to fill available width
        width: isUser ? width : undefined,
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
  isUser: boolean;
  isEditing: boolean;
  messageId: string;
  modelName?: string;
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
  editedText,
  textContent,
  textInputRef,
  onTextChange,
  theme,
}: {
  isEditing: boolean;
  isUser: boolean;
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
  isEditing,
  editedText,
  textContent,
  textInputRef,
  onTextChange,
  theme,
}: {
  isUser: boolean;
  isEditing: boolean;
  editedText: string;
  textContent: string;
  textInputRef: React.RefObject<TextInput>;
  onTextChange: (text: string) => void;
  theme: ThemeColors;
}) => {
  const bubbleStyle = isUser
    ? [styles.userBubble, { backgroundColor: theme.primary }]
    : [styles.assistantBubble, { backgroundColor: theme.background }];

  return (
    <View style={bubbleStyle}>
      <MessageContent
        editedText={editedText}
        isEditing={isEditing}
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
    <Text className="text-muted-foreground text-xs mt-1">{formattedName}</Text>
  );
};

/**
 * Renders a text message part with inline styles
 */
export const TextPart = ({
  part,
  isUser,
  isEditing,
  messageId,
  modelName,
  onCancelEdit,
  onEdit,
  contextMenuActions,
  contextMenuKey,
  onContextMenuPress,
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
    if (isUser) {
      // User message: bubble styling handled natively
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

  const wrapperStyle = isUser ? styles.userWrapper : styles.assistantWrapper;

  const bubbleContent = (
    <MessageBubble
      editedText={editedText}
      isEditing={isEditing}
      isUser={isUser}
      onTextChange={setEditedText}
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
              isUser={isUser}
              onTextChange={setEditedText}
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
            isUser ? styles.justifyEnd : styles.justifyStart,
          ]}
        >
          <EditActions
            hasChanges={hasChanges}
            iconColor={iconColor}
            isUser={isUser}
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

  // Track if we've already auto-collapsed
  const hasAutoCollapsed = useRef(false);

  // Track content height for NativeMarkdownView auto-sizing
  const [contentHeight, setContentHeight] = useState(20);

  const handleContentSizeChange = useCallback((event: ContentSizeEvent) => {
    const { height } = event.nativeEvent;
    if (height > 0) {
      setContentHeight(height);
    }
  }, []);

  // Handle streaming end - record duration and auto-collapse after delay
  useEffect(() => {
    if (!isStreaming && startTime && duration === null) {
      const elapsed = Math.ceil((Date.now() - startTime) / 1000);
      setDuration(elapsed);

      // Auto-collapse after 1 second delay
      if (!hasAutoCollapsed.current) {
        hasAutoCollapsed.current = true;
        const timer = setTimeout(() => {
          setAccordionValue("");
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [isStreaming, startTime, duration]);

  // Don't render if there's no content
  if (!(part.text || isStreaming)) {
    return null;
  }

  const headerText = isStreaming
    ? "Thinking..."
    : `Thought for ${duration ?? 0} seconds`;

  return (
    <View style={[styles.reasoningContainer, { borderColor: theme.border }]}>
      <Accordion
        collapsible
        onValueChange={(value) =>
          setAccordionValue((value as string | undefined) ?? "")
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
