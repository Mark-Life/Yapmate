import type { FileUIPart, UIMessage } from "ai";
import { FileIcon } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useEffect, useRef, useState } from "react";
import { Image, Linking, Pressable, TextInput, View } from "react-native";
import ContextMenu from "react-native-context-menu-view";
import { Icon } from "@/components/ui/icon";
import { StreamingMarkdown } from "@/components/ui/markdown";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { EditActions } from "./message-actions";

type ChatUIMessage = UIMessage;

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

type TextPartProps = {
  part: Extract<ChatUIMessage["parts"][number], { type: "text" }>;
  isUser: boolean;
  isEditing: boolean;
  messageId: string;
  onCancelEdit: () => void;
  onEdit?: (messageId: string, editedText: string) => void;
  // Context menu props
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
}: {
  isUser: boolean;
  isEditing: boolean;
  editedText: string;
  textContent: string;
  textInputRef: React.RefObject<TextInput>;
  onTextChange: (text: string) => void;
}) => (
  <View
    className={cn(
      "w-full bg-background py-1.5",
      isUser ? "rounded-lg bg-primary px-4 text-primary-foreground" : "pb-0"
    )}
  >
    <MessageContent
      editedText={editedText}
      isEditing={isEditing}
      isUser={isUser}
      onTextChange={onTextChange}
      textContent={textContent}
      textInputRef={textInputRef}
    />
  </View>
);

/**
 * Renders a text message part
 * Context menu wraps just the message bubble for proper styling
 * Only shows inline edit actions (Cancel/Save) when editing
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

  return (
    <View
      className={cn(
        "flex-col gap-0",
        isUser ? "max-w-[80%] items-end" : "max-w-[95%] items-start"
      )}
    >
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
            />
          }
          previewBackgroundColor="transparent"
        >
          <MessageBubble
            editedText={editedText}
            isEditing={isEditing}
            isUser={isUser}
            onTextChange={setEditedText}
            textContent={textContent}
            textInputRef={textInputRef as React.RefObject<TextInput>}
          />
        </ContextMenu>
      ) : (
        <MessageBubble
          editedText={editedText}
          isEditing={isEditing}
          isUser={isUser}
          onTextChange={setEditedText}
          textContent={textContent}
          textInputRef={textInputRef as React.RefObject<TextInput>}
        />
      )}
      {isEditing ? (
        <View
          className={cn(
            "mt-2 w-full flex-row gap-2",
            isUser ? "justify-end" : "justify-start"
          )}
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
