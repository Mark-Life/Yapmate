import type { ChatStatus, FileUIPart, UIMessage } from "ai";
import { View } from "react-native";
import { cn } from "@/lib/utils";
import { FilePart, TextPart } from "./message-parts";

type ChatUIMessage = UIMessage;

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
 * Renders a single message item
 * Iterates through all parts in order, matching web app behavior
 */
export const MessageItem = ({
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
