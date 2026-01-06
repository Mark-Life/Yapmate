import type { FileUIPart, UIMessage } from "ai";
import { FileIcon } from "lucide-react-native";
import {
  type ContentSizeEvent,
  NativeMarkdownView,
} from "modules/native-markdown";
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
import { Icon } from "@/components/ui/icon";
import { StreamingMarkdown } from "@/components/ui/markdown";
import { Text } from "@/components/ui/text";
import { getThemeColors, radius, type ThemeColors } from "@/lib/colors";
import { EditActions } from "./message-actions";

type ChatUIMessage = UIMessage;

/**
 * Wrapper for native markdown view with auto-sizing
 */
const NativeMarkdownMessage = ({ content }: { content: string }) => {
  const [height, setHeight] = useState(20);

  const handleContentSizeChange = useCallback((event: ContentSizeEvent) => {
    const newHeight = event.nativeEvent.height;
    if (newHeight > 0) {
      setHeight(newHeight);
    }
  }, []);

  return (
    <View collapsable={false} style={styles.nativeMarkdownWrapper}>
      <NativeMarkdownView
        content={content}
        onContentSizeChange={handleContentSizeChange}
        style={{ height, alignSelf: "stretch" }}
      />
    </View>
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
 * Renders a text message part with inline styles
 */
export const TextPart = ({
  part,
  isUser,
  isEditing,
  messageId,
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

  // Assistant messages on iOS use native markdown
  if (!isUser && Platform.OS === "ios" && !isEditing) {
    return <NativeMarkdownMessage content={textContent} />;
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

const styles = StyleSheet.create({
  nativeMarkdownWrapper: {
    flexDirection: "column",
    alignSelf: "stretch",
    maxWidth: "95%",
  },
  filePart: {
    marginVertical: 4,
    overflow: "hidden",
    borderRadius: radius.lg,
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
