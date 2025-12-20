"use client";

import type { ChatStatus } from "ai";
import { CheckIcon, CopyIcon, RefreshCcwIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Loader } from "@/components/ai-elements/loader";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageAttachment,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  type ModelSelectorLogoProps,
  ModelSelectorName,
} from "@/components/ai-elements/model-selector";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Command } from "@/components/ui/command";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ChatUIMessage } from "@/lib/chat-types";
import { MODELS, parseModel } from "@/lib/models";

type MessagesHistoryProps = {
  messages: ChatUIMessage[];
  status: ChatStatus;
  onRegenerate: (
    messageId?: string,
    role?: "user" | "assistant",
    model?: string
  ) => void;
};

type RenderTextPartProps = {
  message: ChatUIMessage;
  part: Extract<ChatUIMessage["parts"][number], { type: "text" }>;
  partId: string;
  isCopied: boolean;
  onRegenerate: (
    messageId?: string,
    role?: "user" | "assistant",
    model?: string
  ) => void;
  onCopy: (text: string, partId: string) => void;
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
  message,
  part,
  partId,
  isCopied,
  onRegenerate,
  onCopy,
  groupedModels,
}: RenderTextPartProps) => {
  const handleRetry = () => {
    onRegenerate(message.id, message.role as "user" | "assistant");
  };

  const handleModelSelect = (modelValue: string) => {
    onRegenerate(message.id, message.role as "user" | "assistant", modelValue);
  };

  return (
    <Message from={message.role}>
      <MessageContent>
        <MessageResponse>{part.text}</MessageResponse>
      </MessageContent>
      {(message.role === "user" || message.role === "assistant") && (
        <MessageActions
          className={message.role === "user" ? "ml-auto" : undefined}
        >
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
  messages,
  status,
  onRegenerate,
}: MessagesHistoryProps) => {
  const [copiedPartId, setCopiedPartId] = useState<string | null>(null);

  const groupedModels = useMemo(() => {
    const modelsList = MODELS.map((value) => ({
      name: parseModel(value).modelName,
      value,
      provider: parseModel(value).provider,
    }));
    return groupModelsByProvider(modelsList);
  }, []);

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
                      groupedModels={groupedModels}
                      isCopied={isCopied}
                      key={partId}
                      message={message}
                      onCopy={handleCopy}
                      onRegenerate={onRegenerate}
                      part={part}
                      partId={partId}
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
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
};
