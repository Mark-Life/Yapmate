import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@yapmate/components/ai-elements/conversation";
import { Loader } from "@yapmate/components/ai-elements/loader";
import {
  Message,
  MessageAttachment,
} from "@yapmate/components/ai-elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@yapmate/components/ai-elements/reasoning";
import type { ChatUIMessage } from "@yapmate/server/routes/api/chat/types";
import type { ChatStatus } from "ai";
import { useEffect, useMemo, useState } from "react";
import { useModels } from "../../hooks/use-models";
import { sendFeedback } from "../../lib/langfuse";
import type { FeedbackState } from "./feedback-buttons";
import { groupModelsByProvider } from "./model-utils";
import { TextPart } from "./text-part";

type MessagesHistoryProps = {
  disabled?: boolean;
  messages: ChatUIMessage[];
  onEdit?: (messageId: string, editedText: string) => void;
  onRegenerate: (
    messageId?: string,
    role?: "user" | "assistant",
    model?: string
  ) => void;
  status: ChatStatus;
};

type RenderReasoningPartProps = {
  message: ChatUIMessage;
  part: Extract<ChatUIMessage["parts"][number], { type: "reasoning" }>;
  partId: string;
  partIndex: number;
  isLastPart: boolean;
  isLastMessage: boolean;
  status: ChatStatus;
};

/**
 * Renders a reasoning part
 */
const renderReasoningPart = ({
  part,
  partId,
  isLastPart,
  isLastMessage,
  status,
}: RenderReasoningPartProps) => (
  <Reasoning
    className="w-full"
    isStreaming={status === "streaming" && isLastPart && isLastMessage}
    key={partId}
  >
    <ReasoningTrigger />
    <ReasoningContent>{part.text}</ReasoningContent>
  </Reasoning>
);

type RenderFilePartProps = {
  message: ChatUIMessage;
  part: Extract<ChatUIMessage["parts"][number], { type: "file" }>;
  partId: string;
};

/**
 * Renders a file attachment part
 */
const renderFilePart = ({ message, part, partId }: RenderFilePartProps) => (
  <Message from={message.role} key={partId}>
    <MessageAttachment
      data={{
        type: "file",
        url: part.url,
        mediaType: part.mediaType,
        filename: part.filename,
      }}
      from={message.role}
    />
  </Message>
);

/**
 * Renders the conversation history with messages, reasoning, and file attachments
 */
export const MessagesHistory = ({
  disabled = false,
  messages,
  onEdit,
  onRegenerate,
  status,
}: MessagesHistoryProps) => {
  const [copiedPartId, setCopiedPartId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [feedbackByMessage, setFeedbackByMessage] = useState<
    Record<string, FeedbackState>
  >({});
  const { models } = useModels();

  const groupedModels = useMemo(() => groupModelsByProvider(models), [models]);

  useEffect(() => {
    if (copiedPartId === null) {
      return;
    }

    const timer = setTimeout(() => {
      setCopiedPartId(null);
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [copiedPartId]);

  const handleCopy = async (text: string, partId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedPartId(partId);
  };

  const handleFeedback = async (
    messageId: string,
    value: 0 | 1,
    comment?: string
  ) => {
    try {
      // messageId is used as traceId since server creates Langfuse trace per message
      await sendFeedback({
        traceId: messageId,
        value,
        comment,
      });
      setFeedbackByMessage((prev) => ({ ...prev, [messageId]: value }));
    } catch (error) {
      console.error("Failed to send feedback:", error);
    }
  };

  return (
    <Conversation className="h-full">
      <ConversationContent>
        <div className="mx-auto w-full max-w-4xl px-4 pb-34">
          {messages.map((message, messageIndex) => (
            <div className="flex flex-col gap-2" key={message.id}>
              {message.parts.map((part, i) => {
                const partId = `${message.id}-${i}`;
                const isCopied = copiedPartId === partId;
                const isLastPart = i === message.parts.length - 1;
                const isLastMessage = messageIndex === messages.length - 1;

                switch (part.type) {
                  case "text":
                    return (
                      <TextPart
                        disabled={disabled}
                        feedback={feedbackByMessage[message.id] ?? null}
                        groupedModels={groupedModels}
                        isCopied={isCopied}
                        isEditing={editingMessageId === message.id}
                        key={partId}
                        message={message}
                        onCancelEdit={() => setEditingMessageId(null)}
                        onCopy={handleCopy}
                        onEdit={onEdit}
                        onFeedback={handleFeedback}
                        onRegenerate={onRegenerate}
                        onStartEdit={setEditingMessageId}
                        part={part}
                        partId={partId}
                        status={status}
                      />
                    );
                  case "reasoning":
                    return renderReasoningPart({
                      message,
                      part,
                      partId,
                      partIndex: i,
                      isLastPart,
                      isLastMessage,
                      status,
                    });
                  case "file":
                    return renderFilePart({ message, part, partId });
                  default:
                    return null;
                }
              })}
            </div>
          ))}
          {status === "submitted" && <Loader />}
        </div>
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
};
