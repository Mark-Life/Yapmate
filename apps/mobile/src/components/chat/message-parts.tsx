import type { ChatStatus, FileUIPart, UIMessage } from "ai";
import { FileIcon } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useEffect, useRef, useState } from "react";
import { Image, Linking, Pressable, TextInput, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { StreamingMarkdown } from "@/components/ui/markdown";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { EditActions, NormalActions } from "./message-actions";

type ChatUIMessage = UIMessage;

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
 * Renders a text message part with actions
 */
export const TextPart = ({
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
    <View
      className={cn(
        "flex-col gap-0",
        isUser ? "max-w-[80%] items-end" : "max-w-[95%] items-start"
      )}
    >
      <View
        className={cn(
          "w-full py-1.5",
          isUser ? "mb-2 rounded-lg bg-primary px-4" : "pb-0"
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
          "w-full flex-row gap-3",
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
