"use client";

import { useChat } from "@ai-sdk/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { PromptInputProvider } from "@/components/ai-elements/prompt-input";
import { ChatInput } from "@/components/chat/chat-input";
import { MessagesHistory } from "@/components/chat/messages-history";
import { DragDropZone } from "@/components/drag-drop-zone";
import { useModels } from "@/hooks/use-models";
import type { ChatUIMessage } from "@/lib/chat-types";
import { cn } from "@/lib/utils";

type ChatProps = {
  id?: string;
  initialMessages?: UIMessage[];
  onChatCreated?: (id: string) => void;
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

  /**
   * Fetches the last message model for an existing chat
   */
  const fetchLastMessageModel = useCallback(
    async (targetChatId: string): Promise<string | null> => {
      try {
        const res = await fetch(`/api/chats/${targetChatId}/last-model`);
        if (!res.ok) {
          return null;
        }
        const data = await res.json();
        return data.model;
      } catch {
        return null;
      }
    },
    []
  );

  /**
   * Fetches the last assistant message model from the most recent chat
   */
  const fetchLastAssistantMessageModel = useCallback(async (): Promise<
    string | null
  > => {
    try {
      const res = await fetch("/api/chats/last-model");
      if (!res.ok) {
        return null;
      }
      const data = await res.json();
      return data.model;
    } catch {
      return null;
    }
  }, []);

  /**
   * Checks if a model exists in the available models list
   */
  const isModelAvailable = useCallback(
    (modelValue: string | null): boolean => {
      if (!modelValue) {
        return false;
      }
      return models.some((m) => m.value === modelValue);
    },
    [models]
  );

  /**
   * Gets the default model for existing chats
   */
  const getDefaultModelForExistingChat = useCallback(
    async (targetChatId: string): Promise<string | null> => {
      const lastModelId = await fetchLastMessageModel(targetChatId);
      if (lastModelId && isModelAvailable(lastModelId)) {
        return lastModelId;
      }
      return null;
    },
    [fetchLastMessageModel, isModelAvailable]
  );

  /**
   * Gets the default model for new chats
   */
  const getDefaultModelForNewChat = useCallback(async (): Promise<
    string | null
  > => {
    const lastAssistantModelId = await fetchLastAssistantMessageModel();
    if (lastAssistantModelId && isModelAvailable(lastAssistantModelId)) {
      return lastAssistantModelId;
    }
    return null;
  }, [fetchLastAssistantMessageModel, isModelAvailable]);

  // Set default model on mount when models are loaded
  useEffect(() => {
    if (models.length === 0 || model) {
      return;
    }

    const determineDefaultModel = async (): Promise<string> => {
      let defaultModelId: string | null = null;

      if (initialId) {
        defaultModelId = await getDefaultModelForExistingChat(initialId);
      } else {
        defaultModelId = await getDefaultModelForNewChat();
      }

      if (defaultModelId) {
        return defaultModelId;
      }

      if (isModelAvailable(FALLBACK_MODEL)) {
        return FALLBACK_MODEL;
      }

      return models[0]?.value ?? FALLBACK_MODEL;
    };

    determineDefaultModel().then(setModel);
  }, [
    models,
    model,
    initialId,
    getDefaultModelForExistingChat,
    getDefaultModelForNewChat,
    isModelAvailable,
  ]);

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
      },
      onError: (error) => {
        console.error("useChat error:", error);
      },
    });

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
      // Update model state if provided (before regenerate to ensure transport uses correct model)
      if (selectedModel) {
        setModel(selectedModel);
      }

      if (!messageId) {
        // Default behavior: regenerate last assistant message
        regenerate();
        return;
      }

      // Find the message index
      const messageIndex = messages.findIndex((msg) => msg.id === messageId);
      if (messageIndex === -1) {
        return;
      }

      // Truncate messages based on role
      // For user message: keep 0..N (including the user message)
      // For assistant message: keep 0..N-1 (excluding the assistant message)
      const truncateTo = role === "user" ? messageIndex + 1 : messageIndex;
      const truncatedMessages = messages.slice(0, truncateTo);

      // Update local state
      setMessages(truncatedMessages);

      // Store regenerateMessageId and role for transport to pass to API
      // This tells the API which message we're regenerating from to delete stale messages
      regenerateMessageIdRef.current = messageId;
      regenerateRoleRef.current = role;

      // Trigger regeneration
      // For assistant messages: regenerate() without messageId (message already removed from array)
      // For user messages: regenerate({ messageId }) with the user message ID (still in array)
      if (role === "assistant") {
        regenerate();
      } else {
        regenerate({ messageId });
      }
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
      // Find the message index
      const messageIndex = messages.findIndex((msg) => msg.id === messageId);
      if (messageIndex === -1) {
        return;
      }

      const message = messages[messageIndex];
      if (message.role !== "user") {
        return;
      }

      // Update the message text in local state
      const updatedMessages = [...messages];
      const textPartIndex = updatedMessages[messageIndex].parts.findIndex(
        (p) => p.type === "text"
      );

      if (textPartIndex !== -1) {
        updatedMessages[messageIndex] = {
          ...updatedMessages[messageIndex],
          parts: [
            ...updatedMessages[messageIndex].parts.slice(0, textPartIndex),
            { type: "text", text: editedText },
            ...updatedMessages[messageIndex].parts.slice(textPartIndex + 1),
          ],
        };
      }

      // Truncate messages after the edited message
      const truncatedMessages = updatedMessages.slice(0, messageIndex + 1);

      // Update local state
      setMessages(truncatedMessages);

      // Store editMessageId and editedText for transport to pass to API
      editMessageIdRef.current = messageId;
      editedTextRef.current = editedText;

      // Trigger regeneration from the edited message
      regenerate({ messageId });
    },
    [messages, regenerate, setMessages]
  );

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
            <MessagesHistory
              messages={messages}
              onEdit={handleEdit}
              onRegenerate={handleRegenerate}
              status={status}
            />

            <ChatInput
              input={input}
              model={model}
              onInputChange={setInput}
              onModelChange={setModel}
              onSearchEnabledChange={setSearchEnabled}
              onSubmit={handleSubmit}
              searchEnabled={searchEnabled}
              status={status}
            />
          </div>
        </DragDropZone>
      </div>
    </PromptInputProvider>
  );
};
