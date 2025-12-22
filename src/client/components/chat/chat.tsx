"use client";

import { useChat } from "@ai-sdk/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import { YapIconAnimated } from "@/client/assets/yap-icon-animated";
import { useModels } from "@/client/hooks/use-models";
import { cn } from "@/client/lib/utils";
import type { ChatUIMessage } from "@/server/routes/api/chat/types";
import type { PromptInputMessage } from "../ai-elements/prompt-input";
import { PromptInputProvider } from "../ai-elements/prompt-input";
import { DragDropZone } from "../drag-drop-zone";
import {
  createChat,
  determineDefaultModel,
  handleEdit as handleEditHelper,
  handleRegenerate as handleRegenerateHelper,
  resumeStream,
} from "./chat-helpers";
import { ChatInput } from "./chat-input";
import { MessagesHistory } from "./messages-history";

type ChatProps = {
  id?: string;
  initialMessages?: UIMessage[];
  onChatCreated?: (id: string) => void;
};

export const Chat = ({
  id: initialId,
  initialMessages = [],
  onChatCreated,
}: ChatProps) => {
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>("");
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { models } = useModels();
  const FALLBACK_MODEL = "google/gemini-2.5-flash-lite";

  // Set default model on mount when models are loaded
  useEffect(() => {
    if (models.length === 0 || model) {
      return;
    }

    determineDefaultModel(initialId, models, FALLBACK_MODEL).then(setModel);
  }, [models, model, initialId]);

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

  // Use refs to always have latest values for transport closure
  const modelRef = useRef(model);
  const searchEnabledRef = useRef(searchEnabled);
  const regenerateMessageIdRef = useRef<string | undefined>(undefined);
  const regenerateRoleRef = useRef<"user" | "assistant" | undefined>(undefined);
  const editMessageIdRef = useRef<string | undefined>(undefined);
  const editedTextRef = useRef<string | undefined>(undefined);
  modelRef.current = model;
  searchEnabledRef.current = searchEnabled;

  // Create transport once with refs to avoid stale closures
  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest({
          messages: allMessages,
          id: transportChatId,
        }) {
          // Use refs to get latest values
          const regenerateMessageId = regenerateMessageIdRef.current;
          const regenerateRole = regenerateRoleRef.current;
          const editMessageId = editMessageIdRef.current;
          const editedText = editedTextRef.current;
          // Clear after use
          regenerateMessageIdRef.current = undefined;
          regenerateRoleRef.current = undefined;
          editMessageIdRef.current = undefined;
          editedTextRef.current = undefined;
          return {
            body: {
              message: allMessages.at(-1),
              id: transportChatId,
              model: modelRef.current,
              searchEnabled: searchEnabledRef.current,
              ...(regenerateMessageId
                ? { regenerateMessageId, regenerateRole }
                : {}),
              ...(editMessageId && editedText
                ? { editMessageId, editedText }
                : {}),
            },
          };
        },
      })
  );

  const { messages, sendMessage, status, regenerate, setMessages } =
    useChat<ChatUIMessage>({
      id: chatId,
      messages: initialMessages as ChatUIMessage[],
      transport,
      generateId: () => crypto.randomUUID(),
      onData: (dataPart) => {
        // Handle streamed title updates
        if (dataPart.type === "data-chat-title") {
          // Refresh sidebar to show new title
          queryClient.invalidateQueries({ queryKey: ["chats"] });
        }
      },
      onFinish: ({ messages: finishedMessages }) => {
        // Manually update messages state to ensure UI reflects completed stream
        setMessages(finishedMessages);
        // Invalidate cache so navigation back to this chat fetches fresh DB data
        queryClient.invalidateQueries({ queryKey: ["chat-messages", chatId] });
      },
      onError: (error) => {
        console.error("useChat error:", error);
      },
    });

  /**
   * Handles stopping the current stream
   */
  const handleStop = useCallback(async () => {
    if (!chatId) {
      return;
    }

    try {
      const res = await fetch("/api/chat/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId }),
      });

      if (!res.ok) {
        console.error("Failed to stop stream");
      }
    } catch (error) {
      console.error("Stop request failed:", error);
    }
  }, [chatId]);

  /**
   * Resumes an active stream on mount
   */
  useEffect(() => {
    if (!chatId || isNewChat) {
      return;
    }

    const isCancelled = { current: false };

    resumeStream(chatId, setMessages, queryClient, isCancelled);

    return () => {
      isCancelled.current = true;
    };
  }, [chatId, isNewChat, setMessages, queryClient]);

  /**
   * Creates chat in DB on first message, updates URL and sidebar
   * Uses placeholder title - real title comes via stream
   */
  const ensureChatExists = useCallback(async () => {
    if (!isNewChat) {
      return;
    }
    // Create with placeholder - real title comes via stream
    await createChatMutation.mutateAsync({ id: chatId, title: "New chat" });
    setIsNewChat(false);

    // Notify parent BEFORE URL update
    onChatCreated?.(chatId);

    // Update URL without navigation (avoids unmounting this component)
    window.history.replaceState(null, "", `/chat/${chatId}`);
    // Notify context about URL change
    window.dispatchEvent(new CustomEvent("chatUrlChange"));
  }, [isNewChat, chatId, createChatMutation, onChatCreated]);

  const handleSubmit = async (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);
    if (!(hasText || hasAttachments)) {
      return;
    }

    // Create chat in DB on first message
    await ensureChatExists();

    // Transport's prepareSendMessagesRequest handles the body
    sendMessage({
      text: message.text || "Sent with attachments",
      files: message.files,
    });

    setInput("");
  };

  /**
   * Handles regeneration from a specific message
   * @param messageId - ID of the message to regenerate from (optional, defaults to last assistant message)
   * @param role - Role of the message being regenerated
   * @param selectedModel - Optional model to use for regeneration (updates model state if provided)
   */
  const handleRegenerate = useCallback(
    (
      messageId?: string,
      role?: "user" | "assistant",
      selectedModel?: string
    ) => {
      handleRegenerateHelper({
        messageId,
        role,
        selectedModel,
        messages,
        setModel,
        setMessages,
        regenerate,
        regenerateMessageIdRef,
        regenerateRoleRef,
      });
    },
    [messages, regenerate, setMessages]
  );

  /**
   * Handles editing a user message
   * Updates the message text in local state and triggers regeneration
   * @param messageId - ID of the message to edit
   * @param editedText - New text content for the message
   */
  const handleEdit = useCallback(
    (messageId: string, editedText: string) => {
      handleEditHelper({
        messageId,
        editedText,
        messages,
        setMessages,
        regenerate,
        editMessageIdRef,
        editedTextRef,
      });
    },
    [messages, regenerate, setMessages]
  );

  return (
    <PromptInputProvider initialInput={input}>
      <div
        className={cn(
          "relative size-full h-screen transition-all",
          isDragging && "rounded-lg border-2 border-primary border-dashed"
        )}
        ref={containerRef}
      >
        <DragDropZone containerRef={containerRef} setIsDragging={setIsDragging}>
          {messages.length === 0 ? (
            <div className="flex size-full items-center justify-center pb-32">
              <div className="flex items-center justify-center opacity-60">
                <YapIconAnimated className="size-72 text-primary" />
              </div>
            </div>
          ) : (
            <MessagesHistory
              messages={messages}
              onEdit={handleEdit}
              onRegenerate={handleRegenerate}
              status={status}
            />
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 mx-auto w-full max-w-4xl px-2 pb-2">
            <div className="pointer-events-auto rounded-lg backdrop-blur-md supports-backdrop-filter:bg-background/80">
              <ChatInput
                input={input}
                model={model}
                onInputChange={setInput}
                onModelChange={setModel}
                onSearchEnabledChange={setSearchEnabled}
                onStop={handleStop}
                onSubmit={handleSubmit}
                searchEnabled={searchEnabled}
                status={status}
              />
            </div>
          </div>
        </DragDropZone>
      </div>
    </PromptInputProvider>
  );
};
