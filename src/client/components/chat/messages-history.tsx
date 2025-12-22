"use client";

import type { ChatStatus } from "ai";
import {
  CheckIcon,
  CopyIcon,
  PencilIcon,
  RefreshCcwIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/client/components/ai-elements/conversation";
import { Loader } from "@/client/components/ai-elements/loader";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageAttachment,
  MessageContent,
  MessageResponse,
} from "@/client/components/ai-elements/message";
import {
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  type ModelSelectorLogoProps,
  ModelSelectorName,
} from "@/client/components/ai-elements/model-selector";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/client/components/ai-elements/reasoning";
import { Command } from "@/client/components/ui/command";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/client/components/ui/context-menu";
import { Textarea } from "@/client/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";
import { useModels } from "@/client/hooks/use-models";
import { cn } from "@/client/lib/utils";
import type { ChatUIMessage } from "@/server/routes/api/chat/types";

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

type RenderTextPartProps = {
  disabled?: boolean;
  isCopied: boolean;
  isEditing: boolean;
  message: ChatUIMessage;
  onCancelEdit: () => void;
  onCopy: (text: string, partId: string) => void;
  onEdit?: (messageId: string, editedText: string) => void;
  onRegenerate: (
    messageId?: string,
    role?: "user" | "assistant",
    model?: string
  ) => void;
  onStartEdit: (messageId: string) => void;
  part: Extract<ChatUIMessage["parts"][number], { type: "text" }>;
  partId: string;
  status: ChatStatus;
  groupedModels: Array<{
    provider: string;
    items: Array<{ name: string; value: string }>;
  }>;
};

/**
 * Groups models by provider
 */
const groupModelsByProvider = (
  modelsList: Array<{ name: string; value: string; provider: string }>
) => {
  const grouped = new Map<string, Array<{ name: string; value: string }>>();
  for (const model of modelsList) {
    const existing = grouped.get(model.provider) ?? [];
    grouped.set(model.provider, [
      ...existing,
      { name: model.name, value: model.value },
    ]);
  }
  return Array.from(grouped.entries()).map(([provider, items]) => ({
    provider,
    items,
  }));
};

/**
 * Formats provider name for display
 */
const getProviderDisplayName = (provider: string): string => {
  if (provider === "google") {
    return "Google";
  }
  if (provider === "openai") {
    return "OpenAI";
  }
  return provider.charAt(0).toUpperCase() + provider.slice(1);
};

/**
 * Renders a text message part with actions
 */
const TextPart = ({
  disabled = false,
  isCopied,
  isEditing,
  message,
  onCancelEdit,
  onCopy,
  onEdit,
  onRegenerate,
  onStartEdit,
  part,
  partId,
  status,
  groupedModels,
}: RenderTextPartProps) => {
  const [editedText, setEditedText] = useState(part.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) {
      setEditedText(part.text);
    }
  }, [isEditing, part.text]);

  const handleRetry = () => {
    onRegenerate(message.id, message.role as "user" | "assistant");
  };

  const handleModelSelect = (modelValue: string) => {
    onRegenerate(message.id, message.role as "user" | "assistant", modelValue);
  };

  const handleEdit = () => {
    if (message.role === "user" && onEdit) {
      onEdit(message.id, editedText.trim());
      onCancelEdit();
    }
  };

  const handleCancel = () => {
    setEditedText(part.text);
    onCancelEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const isUser = message.role === "user";
  const canEdit = isUser && onEdit && !disabled;

  const hasChanges = editedText.trim() !== part.text.trim();

  return (
    <Message from={message.role}>
      <MessageContent>
        {isEditing ? (
          <Textarea
            className={cn(
              "field-sizing-content min-h-5 w-full resize-none rounded-none border-0 bg-transparent p-0 shadow-none outline-none focus-visible:ring-0",
              isUser ? "text-primary-foreground" : "text-foreground"
            )}
            onChange={(e) => setEditedText(e.target.value)}
            onKeyDown={handleKeyDown}
            ref={textareaRef}
            value={editedText}
          />
        ) : (
          <MessageResponse>{part.text}</MessageResponse>
        )}
      </MessageContent>
      {(message.role === "user" || message.role === "assistant") && (
        <MessageActions
          className={message.role === "user" ? "ml-auto" : undefined}
        >
          {isEditing ? (
            <>
              <MessageAction
                label="Cancel"
                onClick={handleCancel}
                tooltip="Cancel editing"
              >
                <XIcon className="size-3" />
              </MessageAction>
              <MessageAction
                disabled={!hasChanges}
                label="Save"
                onClick={handleEdit}
                tooltip="Save changes"
              >
                <CheckIcon className="size-3" />
              </MessageAction>
            </>
          ) : (
            <>
              <MessageAction
                label={isCopied ? "Copied" : "Copy"}
                onClick={() => onCopy(part.text, partId)}
                tooltip="Copy"
              >
                {isCopied ? (
                  <CheckIcon className="size-3" />
                ) : (
                  <CopyIcon className="size-3" />
                )}
              </MessageAction>
              <ContextMenu>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ContextMenuTrigger asChild>
                        <MessageAction label="Retry" onClick={handleRetry}>
                          <RefreshCcwIcon className="size-3" />
                        </MessageAction>
                      </ContextMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent hideArrow side="bottom">
                      <p>Right click to select another model</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <ContextMenuContent className="w-64 p-0">
                  <ContextMenuLabel className="px-3 py-2">
                    Regenerate with model
                  </ContextMenuLabel>
                  <ContextMenuSeparator />
                  <Command className="max-h-[300px]">
                    <ModelSelectorInput
                      className="rounded-none border-0"
                      placeholder="Search models..."
                    />
                    <ModelSelectorList className="max-h-[250px]">
                      <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                      {groupedModels.map((group) => (
                        <ModelSelectorGroup key={group.provider}>
                          <div className="cmdk-group-heading pb-1 pl-2">
                            {getProviderDisplayName(group.provider)}
                          </div>
                          {group.items.map((item) => (
                            <ModelSelectorItem
                              key={item.value}
                              onSelect={() => handleModelSelect(item.value)}
                              value={`${item.name} ${group.provider} ${item.value}`}
                            >
                              <ModelSelectorLogo
                                provider={
                                  group.provider as ModelSelectorLogoProps["provider"]
                                }
                              />
                              <ModelSelectorName>{item.name}</ModelSelectorName>
                            </ModelSelectorItem>
                          ))}
                        </ModelSelectorGroup>
                      ))}
                    </ModelSelectorList>
                  </Command>
                </ContextMenuContent>
              </ContextMenu>
              {canEdit ? (
                <MessageAction
                  disabled={status === "streaming" || status === "submitted"}
                  label="Edit"
                  onClick={() => onStartEdit(message.id)}
                  tooltip="Edit message"
                >
                  <PencilIcon className="size-3" />
                </MessageAction>
              ) : null}
            </>
          )}
        </MessageActions>
      )}
    </Message>
  );
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

  return (
    <Conversation className="h-full">
      <ConversationContent>
        <div className="mx-auto w-full max-w-4xl px-6 pb-34">
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
                        groupedModels={groupedModels}
                        isCopied={isCopied}
                        isEditing={editingMessageId === message.id}
                        key={partId}
                        message={message}
                        onCancelEdit={() => setEditingMessageId(null)}
                        onCopy={handleCopy}
                        onEdit={onEdit}
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
