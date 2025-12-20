"use client";

import { useChat } from "@ai-sdk/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport, type UIMessage } from "ai";
import { CopyIcon, GlobeIcon, RefreshCcwIcon } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
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
  PromptInput,
  PromptInputAddFileButton,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { DragDropZone } from "@/components/drag-drop-zone";
import { ModelSelectorCombobox } from "@/components/model-selector";
import { MODELS } from "@/lib/models";
import { cn } from "@/lib/utils";

type ChatProps = {
  id?: string;
  initialMessages?: UIMessage[];
};

const MAX_TITLE_LENGTH = 50;

/**
 * Truncates text to max length with ellipsis
 */
const truncateTitle = (text: string): string => {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_TITLE_LENGTH) {
    return trimmed;
  }
  return `${trimmed.slice(0, MAX_TITLE_LENGTH)}...`;
};

/**
 * Creates a new chat via API
 */
const createChat = async (
  id: string,
  title: string
): Promise<{ id: string }> => {
  const res = await fetch("/api/chats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, title }),
  });
  if (!res.ok) {
    throw new Error("Failed to create chat");
  }
  return res.json();
};

export const Chat = ({ id: initialId, initialMessages = [] }: ChatProps) => {
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>(MODELS[0]);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // For new chats, generate ID client-side; track if chat exists in DB
  const [chatId] = useState(() => initialId ?? crypto.randomUUID());
  const [isNewChat, setIsNewChat] = useState(!initialId);

  // Mutation to create chat
  const createChatMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      createChat(id, title),
    onSuccess: () => {
      // Invalidate chats query to update sidebar
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });

  // Memoize transport to avoid recreating on every render
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest({
          messages: allMessages,
          id: transportChatId,
        }) {
          // Send only the last message - server loads previous from DB
          return {
            body: {
              message: allMessages.at(-1),
              id: transportChatId,
              model,
              searchEnabled,
            },
          };
        },
      }),
    [model, searchEnabled]
  );

  const { messages, sendMessage, status, regenerate } = useChat({
    id: chatId,
    messages: initialMessages,
    transport,
    // Generate UUID v4 for message IDs (compatible with DB schema)
    generateId: () => crypto.randomUUID(),
  });

  /**
   * Creates chat in DB on first message, updates URL and sidebar
   */
  const ensureChatExists = useCallback(
    async (firstMessageText: string) => {
      if (!isNewChat) {
        return;
      }
      const title = truncateTitle(firstMessageText);
      await createChatMutation.mutateAsync({ id: chatId, title });
      setIsNewChat(false);
      // Update URL without navigation (avoids unmounting this component)
      window.history.replaceState(null, "", `/chat/${chatId}`);
    },
    [isNewChat, chatId, createChatMutation]
  );

  const handleSubmit = async (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);
    if (!(hasText || hasAttachments)) {
      return;
    }

    // Create chat in DB on first message
    await ensureChatExists(message.text || "New chat");

    // Transport's prepareSendMessagesRequest handles the body
    sendMessage({
      text: message.text || "Sent with attachments",
      files: message.files,
    });
    setInput("");
  };

  return (
    <PromptInputProvider initialInput={input}>
      <div
        className={cn(
          "relative mx-auto size-full h-screen max-w-4xl p-6 transition-all",
          isDragging && "rounded-lg border-2 border-primary border-dashed"
        )}
        ref={containerRef}
      >
        <DragDropZone containerRef={containerRef} setIsDragging={setIsDragging}>
          <div className="flex h-full flex-col">
            <Conversation className="h-full">
              <ConversationContent>
                {messages.map((message) => (
                  <div className="flex flex-col gap-2" key={message.id}>
                    {message.parts.map((part, i) => {
                      switch (part.type) {
                        case "text":
                          return (
                            <Message
                              from={message.role}
                              key={`${message.id}-${i}`}
                            >
                              <MessageContent>
                                <MessageResponse>{part.text}</MessageResponse>
                              </MessageContent>
                              {message.role === "assistant" &&
                                i === messages.length - 1 && (
                                  <MessageActions>
                                    <MessageAction
                                      label="Retry"
                                      onClick={() => regenerate()}
                                    >
                                      <RefreshCcwIcon className="size-3" />
                                    </MessageAction>
                                    <MessageAction
                                      label="Copy"
                                      onClick={() =>
                                        navigator.clipboard.writeText(part.text)
                                      }
                                    >
                                      <CopyIcon className="size-3" />
                                    </MessageAction>
                                  </MessageActions>
                                )}
                            </Message>
                          );
                        case "reasoning":
                          return (
                            <Reasoning
                              className="w-full"
                              isStreaming={
                                status === "streaming" &&
                                i === message.parts.length - 1 &&
                                message.id === messages.at(-1)?.id
                              }
                              key={`${message.id}-${i}`}
                            >
                              <ReasoningTrigger />
                              <ReasoningContent>{part.text}</ReasoningContent>
                            </Reasoning>
                          );
                        case "file":
                          return (
                            <Message
                              from={message.role}
                              key={`${message.id}-${i}`}
                            >
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

            <PromptInput
              className="mt-4 rounded-md border border-primary/10 bg-primary/5"
              multiple
              onSubmit={handleSubmit}
            >
              <PromptInputHeader>
                <PromptInputAttachments>
                  {(attachment) => <PromptInputAttachment data={attachment} />}
                </PromptInputAttachments>
              </PromptInputHeader>
              <PromptInputBody>
                <PromptInputTextarea
                  onChange={(e) => setInput(e.target.value)}
                  value={input}
                />
              </PromptInputBody>
              <PromptInputFooter>
                <PromptInputTools>
                  <ModelSelectorCombobox
                    model={model}
                    onModelChange={setModel}
                  />
                  <PromptInputAddFileButton />
                  <PromptInputButton
                    aria-label="Toggle search"
                    onClick={() => setSearchEnabled((prev) => !prev)}
                    variant={searchEnabled ? "default" : "ghost"}
                  >
                    <GlobeIcon className="size-4" />
                  </PromptInputButton>
                </PromptInputTools>
                <PromptInputSubmit
                  disabled={!(input || status)}
                  status={status}
                />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </DragDropZone>
      </div>
    </PromptInputProvider>
  );
};
