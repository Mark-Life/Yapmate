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
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@yapmate/components/ai-elements/tool";
import type { ChatUIMessage } from "@yapmate/server/routes/api/chat/types";
import type { ChatStatus, ToolUIPart } from "ai";
import { useEffect, useMemo, useState } from "react";
import { useModels } from "../../hooks/use-models";
import { sendFeedback } from "../../lib/langfuse";
import type { FeedbackState } from "./feedback-buttons";
import { groupModelsByProvider } from "./model-utils";
import { TextPart } from "./text-part";

type MessagesHistoryProps = {
  addToolApprovalResponse?: (response: {
    id: string;
    approved: boolean;
  }) => void;
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

/** Dynamic tool part from DB (has toolName property) */
type DynamicToolPart = {
  type: "dynamic-tool";
  toolCallId: string;
  toolName: string;
  state: ToolUIPart["state"];
  input: unknown;
  output?: unknown;
  errorText?: string;
  approval?: { id: string };
};

type RenderToolPartProps = {
  addToolApprovalResponse?: (response: {
    id: string;
    approved: boolean;
  }) => void;
  part: ToolUIPart | DynamicToolPart;
  partId: string;
};

/**
 * Renders a tool invocation part
 */
const renderToolPart = ({
  addToolApprovalResponse,
  part,
  partId,
}: RenderToolPartProps) => {
  const isDynamic = part.type === "dynamic-tool";
  const dynamicPart = part as DynamicToolPart;
  // For dynamic tools, construct type from toolName; typed tools use their type directly
  const toolType: ToolUIPart["type"] = isDynamic
    ? (`tool-${dynamicPart.toolName}` as ToolUIPart["type"])
    : part.type;

  const needsApproval = part.state === "approval-requested";

  // Get approval ID from part (works for both ToolUIPart and DynamicToolPart)
  // Tool parts with approval-requested state have an approval property with id
  let approvalId: string | undefined;
  if (
    needsApproval &&
    "approval" in part &&
    part.approval &&
    typeof part.approval === "object" &&
    "id" in part.approval
  ) {
    approvalId = (part.approval as { id: string }).id;
  }

  return (
    <Tool defaultOpen={needsApproval} key={partId}>
      <ToolHeader state={part.state} type={toolType} />
      <ToolContent>
        <ToolInput input={part.input} />
        {needsApproval &&
          addToolApprovalResponse !== undefined &&
          approvalId !== undefined && (
            <div className="space-y-2 border-t p-4">
              <p className="text-muted-foreground text-sm">
                This tool requires your approval to execute.
              </p>
              <div className="flex gap-2">
                <button
                  className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90"
                  onClick={() =>
                    addToolApprovalResponse({
                      id: approvalId,
                      approved: true,
                    })
                  }
                  type="button"
                >
                  Approve
                </button>
                <button
                  className="rounded-md border border-input bg-background px-4 py-2 font-medium text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                  onClick={() =>
                    addToolApprovalResponse({
                      id: approvalId,
                      approved: false,
                    })
                  }
                  type="button"
                >
                  Deny
                </button>
              </div>
            </div>
          )}
        {(part.state === "output-available" ||
          part.state === "output-error" ||
          part.state === "output-denied") && (
          <ToolOutput
            errorText={
              part.state === "output-error" ? part.errorText : undefined
            }
            output={part.state === "output-available" ? part.output : undefined}
          />
        )}
      </ToolContent>
    </Tool>
  );
};

/**
 * Checks if a message has visible text content (text or reasoning with actual content)
 */
const hasVisibleContent = (message: ChatUIMessage): boolean =>
  message.parts.some(
    (p) =>
      (p.type === "text" && p.text.trim()) ||
      (p.type === "reasoning" && p.text.trim())
  );

/**
 * Renders the conversation history with messages, reasoning, and file attachments
 */
export const MessagesHistory = ({
  addToolApprovalResponse,
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

  // Show loader when waiting for response OR streaming without visible content yet
  const lastMessage = messages.at(-1);
  const isStreamingWithoutContent =
    status === "streaming" &&
    lastMessage?.role === "assistant" &&
    !hasVisibleContent(lastMessage);
  const showLoader = status === "submitted" || isStreamingWithoutContent;

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
        <div className="mx-auto w-full max-w-4xl px-4 pt-12 pb-34">
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
                    // Handle tool parts (type starts with "tool-" or "dynamic-tool")
                    if (
                      part.type.startsWith("tool-") ||
                      part.type === "dynamic-tool"
                    ) {
                      return renderToolPart({
                        addToolApprovalResponse,
                        part: part as ToolUIPart | DynamicToolPart,
                        partId,
                      });
                    }
                    return null;
                }
              })}
            </div>
          ))}
          {showLoader ? <Loader /> : null}
        </div>
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
};
