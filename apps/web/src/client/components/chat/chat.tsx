import { useChat } from "@ai-sdk/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PromptInputMessage } from "@yapmate/components/ai-elements/prompt-input";
import { PromptInputProvider } from "@yapmate/components/ai-elements/prompt-input";
import { cn } from "@yapmate/components/lib/utils";
import type { ChatUIMessage } from "@yapmate/server/routes/api/chat/types";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
} from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import { YapIconAnimated } from "../../assets/yap-icon-animated";
import { HOTKEYS } from "../../hooks/use-hotkeys-config";
import { useModels } from "../../hooks/use-models";
import { usePostHog } from "../../hooks/use-posthog";
import {
  getMemoryEnabled,
  getReasoningEffort,
  getSearchEnabled,
  getSelectedMcpTools,
  type McpToolSelection,
  setMemoryEnabled as persistMemoryEnabled,
  setReasoningEffort as persistReasoningEffort,
  setSearchEnabled as persistSearchEnabled,
  setSelectedMcpTools as persistSelectedMcpTools,
  type ReasoningEffort,
  setLastUsedModel,
} from "../../hooks/use-user-preferences";
import { rpcClient } from "../../lib/rpc-client";
import { generateUUID } from "../../lib/uuid";
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
  initialMessages?: ChatUIMessage[];
  onChatCreated?: (id: string) => void;
};

export const Chat = ({
  id: initialId,
  initialMessages = [],
  onChatCreated,
}: ChatProps) => {
  const queryClient = useQueryClient();
  const { capture } = usePostHog();
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>("");
  const [searchEnabled, setSearchEnabled] = useState(() => getSearchEnabled());
  const [memoryEnabled, setMemoryEnabled] = useState(() => getMemoryEnabled());
  const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort>(() =>
    getReasoningEffort()
  );
  const [selectedMcpTools, setSelectedMcpTools] = useState<McpToolSelection[]>(
    () => getSelectedMcpTools()
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { models } = useModels();
  const FALLBACK_MODEL = "google/gemini-2.5-flash";

  // For new chats, generate ID client-side; track if chat exists in DB
  const [chatId] = useState(() => initialId ?? generateUUID());

  // Set default model on mount when models are loaded
  useEffect(() => {
    if (models.length === 0 || model) {
      return;
    }

    const defaultModel = determineDefaultModel({
      initialId,
      initialMessages,
      models,
      fallbackModel: FALLBACK_MODEL,
      queryClient,
    });
    setModel(defaultModel);
  }, [models, model, initialId, initialMessages, queryClient]);

  /**
   * Handles model change with localStorage persistence
   */
  const handleModelChange = useCallback(
    (newModel: string) => {
      capture("model_changed", {
        previous_model: model,
        new_model: newModel,
        chat_id: chatId,
      });
      setModel(newModel);
      setLastUsedModel(newModel);
    },
    [model, chatId, capture]
  );

  /**
   * Handles search enabled change with localStorage persistence
   */
  const handleSearchEnabledChange = useCallback(
    (enabled: boolean) => {
      capture("search_toggled", {
        enabled,
        chat_id: chatId,
      });
      setSearchEnabled(enabled);
      persistSearchEnabled(enabled);
    },
    [chatId, capture]
  );

  /**
   * Handles memory enabled change with localStorage persistence
   */
  const handleMemoryEnabledChange = useCallback(
    (enabled: boolean) => {
      capture("memory_toggled", {
        enabled,
        chat_id: chatId,
      });
      setMemoryEnabled(enabled);
      persistMemoryEnabled(enabled);
    },
    [chatId, capture]
  );

  /**
   * Handles reasoning effort change with localStorage persistence
   */
  const handleReasoningEffortChange = useCallback(
    (effort: ReasoningEffort) => {
      capture("reasoning_effort_changed", {
        effort,
        chat_id: chatId,
      });
      setReasoningEffort(effort);
      persistReasoningEffort(effort);
    },
    [chatId, capture]
  );

  /**
   * Handles MCP tools selection change with localStorage persistence
   */
  const handleSelectedMcpToolsChange = useCallback(
    (tools: McpToolSelection[]) => {
      capture("mcp_tools_changed", {
        tool_count: tools.length,
        chat_id: chatId,
      });
      setSelectedMcpTools(tools);
      persistSelectedMcpTools(tools);
    },
    [chatId, capture]
  );

  /** Check if current model supports reasoning */
  const supportsReasoning =
    models.find((m) => m.value === model)?.supportsReasoning ?? false;

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
  const memoryEnabledRef = useRef(memoryEnabled);
  const reasoningEffortRef = useRef(reasoningEffort);
  const supportsReasoningRef = useRef(supportsReasoning);
  const selectedMcpToolsRef = useRef(selectedMcpTools);
  const regenerateMessageIdRef = useRef<string | undefined>(undefined);
  const regenerateRoleRef = useRef<"user" | "assistant" | undefined>(undefined);
  const editMessageIdRef = useRef<string | undefined>(undefined);
  const editedTextRef = useRef<string | undefined>(undefined);
  const isResumingStreamRef = useRef(false);
  modelRef.current = model;
  searchEnabledRef.current = searchEnabled;
  memoryEnabledRef.current = memoryEnabled;
  reasoningEffortRef.current = reasoningEffort;
  supportsReasoningRef.current = supportsReasoning;
  selectedMcpToolsRef.current = selectedMcpTools;

  // Create transport once with refs to avoid stale closures
  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        fetch: (async (url, init) => {
          const response = await fetch(url, init);
          // Handle 402 Payment Required (rate limit exceeded)
          if (response.status === 402) {
            const errorData = await response.json().catch(() => ({}));
            const error = new Error(
              errorData.error || "Message limit exceeded"
            );
            (error as Error & { status: number; data: unknown }).status = 402;
            (error as Error & { status: number; data: unknown }).data =
              errorData;
            throw error;
          }
          return response;
        }) as typeof fetch,
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
              memoryEnabled: memoryEnabledRef.current,
              ...(supportsReasoningRef.current
                ? { reasoningEffort: reasoningEffortRef.current }
                : {}),
              ...(selectedMcpToolsRef.current.length > 0
                ? { selectedMcpTools: selectedMcpToolsRef.current }
                : {}),
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

  const {
    messages,
    sendMessage,
    status,
    regenerate,
    setMessages,
    addToolApprovalResponse,
  } = useChat<ChatUIMessage>({
    id: chatId,
    messages: initialMessages,
    transport,
    generateId: () => crypto.randomUUID(),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    onData: (dataPart) => {
      // Handle streamed title updates
      if (dataPart.type === "data-chat-title") {
        // Refresh sidebar to show new title
        queryClient.invalidateQueries({ queryKey: ["chats"] });
      }
      // TODO: fix typecasting
      // Handle MCP connection errors (custom data type)
      const part = dataPart as { type: string; data?: unknown };
      if (part.type === "data-mcp-error" && part.data) {
        const { errors } = part.data as {
          errors: Array<{
            serverId: string;
            serverName: string;
            error: string;
          }>;
        };
        for (const err of errors) {
          toast.error(`MCP Error: ${err.serverName}`, {
            description: err.error,
            duration: 8000,
          });
        }
      }
    },
    onFinish: ({ messages: finishedMessages }) => {
      // Manually update messages state to ensure UI reflects completed stream
      setMessages(finishedMessages);
      // Track message completion
      const assistantMessage = finishedMessages.find(
        (msg) => msg.role === "assistant"
      );
      capture("message_completed", {
        chat_id: chatId,
        model,
        search_enabled: searchEnabled,
        memory_enabled: memoryEnabled,
        message_count: finishedMessages.length,
        has_response: !!assistantMessage,
      });
      // Invalidate cache so navigation back to this chat fetches fresh DB data
      queryClient.invalidateQueries({ queryKey: ["chat-messages", chatId] });
      // Update subscription usage count (message was saved before streaming)
      // Invalidate to ensure accuracy after stream completes
      // React Query deduplicates rapid invalidations automatically
      queryClient.invalidateQueries({
        queryKey: ["subscription", "usage"],
      });
    },
    onError: (error) => {
      // Handle 402 Payment Required (rate limit exceeded)
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        error.status === 402
      ) {
        capture("rate_limit_exceeded", {
          chat_id: chatId,
          model,
        });
        toast.error("Message limit reached", {
          description: "You've used all your free messages this month.",
          duration: 8000,
          action: {
            label: "Upgrade",
            onClick: () => {
              window.dispatchEvent(new CustomEvent("open-upgrade-sheet"));
            },
          },
        });
        return;
      }
      capture("message_error", {
        chat_id: chatId,
        model,
        error_type: error?.constructor?.name ?? "unknown",
      });
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

    capture("stream_stopped", { chat_id: chatId });
    try {
      await rpcClient.chat.stop({ chatId });
    } catch (error) {
      console.error("Stop request failed:", error);
    }
  }, [chatId, capture]);

  /**
   * Resumes an active stream on mount
   */
  useEffect(() => {
    if (!chatId || isNewChat) {
      return;
    }

    // Don't resume if useChat is already handling a stream or if we're already resuming
    if (
      status === "streaming" ||
      status === "submitted" ||
      isResumingStreamRef.current
    ) {
      return;
    }

    const isCancelled = { current: false };
    isResumingStreamRef.current = true;

    resumeStream(chatId, setMessages, queryClient, isCancelled).finally(() => {
      isResumingStreamRef.current = false;
    });

    return () => {
      isCancelled.current = true;
      isResumingStreamRef.current = false;
    };
  }, [chatId, isNewChat, setMessages, queryClient, status]);

  /**
   * Listens for stream-started events from WebSocket sync
   * Resumes stream when another device starts streaming to this chat
   */
  useEffect(() => {
    if (!chatId || isNewChat) {
      return;
    }

    const handleStreamStarted = (event: CustomEvent<{ chatId: string }>) => {
      if (event.detail.chatId === chatId) {
        // Don't resume if useChat is already handling a stream or if we're already resuming
        if (
          status === "streaming" ||
          status === "submitted" ||
          isResumingStreamRef.current
        ) {
          return;
        }
        const isCancelled = { current: false };
        isResumingStreamRef.current = true;
        resumeStream(chatId, setMessages, queryClient, isCancelled).finally(
          () => {
            isResumingStreamRef.current = false;
          }
        );
      }
    };

    window.addEventListener(
      "stream-started",
      handleStreamStarted as EventListener
    );

    return () => {
      window.removeEventListener(
        "stream-started",
        handleStreamStarted as EventListener
      );
    };
  }, [chatId, isNewChat, setMessages, queryClient, status]);

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
    capture("chat_created", { chat_id: chatId });

    // Notify parent BEFORE URL update
    onChatCreated?.(chatId);

    // Update URL without navigation (avoids unmounting this component)
    window.history.replaceState(null, "", `/chat/${chatId}`);
    // Notify context about URL change
    window.dispatchEvent(new CustomEvent("chatUrlChange"));
  }, [isNewChat, chatId, createChatMutation, onChatCreated, capture]);

  const handleSubmit = async (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);
    if (!(hasText || hasAttachments)) {
      return;
    }

    // Create chat in DB on first message
    await ensureChatExists();

    // Track message sent event
    capture("message_sent", {
      chat_id: chatId,
      model,
      search_enabled: searchEnabled,
      memory_enabled: memoryEnabled,
      has_text: hasText,
      has_attachments: hasAttachments,
      attachment_count: message.files?.length ?? 0,
      is_new_chat: isNewChat,
    });

    // Transport's prepareSendMessagesRequest handles the body
    sendMessage({
      text: message.text || "Sent with attachments",
      files: message.files,
    });

    // Optimistically update subscription usage count
    // The message is saved server-side before streaming starts
    // Invalidate to trigger refetch (React Query deduplicates rapid invalidations)
    queryClient.invalidateQueries({
      queryKey: ["subscription", "usage"],
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
      capture("message_regenerated", {
        chat_id: chatId,
        message_id: messageId,
        role,
        model: selectedModel ?? model,
      });
      handleRegenerateHelper({
        messageId,
        role,
        selectedModel,
        messages,
        setModel: handleModelChange,
        setMessages,
        regenerate,
        regenerateMessageIdRef,
        regenerateRoleRef,
      });
    },
    [
      messages,
      regenerate,
      setMessages,
      handleModelChange,
      chatId,
      model,
      capture,
    ]
  );

  /**
   * Handles editing a user message
   * Updates the message text in local state and triggers regeneration
   * @param messageId - ID of the message to edit
   * @param editedText - New text content for the message
   */
  const handleEdit = useCallback(
    (messageId: string, editedText: string) => {
      capture("message_edited", {
        chat_id: chatId,
        message_id: messageId,
        model,
      });
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
    [messages, regenerate, setMessages, chatId, model, capture]
  );

  // Chat hotkeys
  useHotkeys(
    HOTKEYS.stop,
    (e) => {
      if (status === "streaming" || status === "submitted") {
        e.preventDefault();
        handleStop();
      }
    },
    { enableOnFormTags: true }
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
                <YapIconAnimated
                  className="text-primary"
                  height={200}
                  isInputFocused={isInputFocused}
                  width={200}
                />
              </div>
            </div>
          ) : (
            <MessagesHistory
              addToolApprovalResponse={addToolApprovalResponse}
              messages={messages}
              onEdit={handleEdit}
              onRegenerate={handleRegenerate}
              status={status}
            />
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-5 mx-auto w-full max-w-4xl px-2 pb-2">
            <div className="pointer-events-auto rounded-lg backdrop-blur-md supports-backdrop-filter:bg-background/80">
              <ChatInput
                chatId={chatId}
                input={input}
                memoryEnabled={memoryEnabled}
                messages={messages}
                model={model}
                onFocusChange={setIsInputFocused}
                onInputChange={setInput}
                onMemoryEnabledChange={handleMemoryEnabledChange}
                onModelChange={handleModelChange}
                onReasoningEffortChange={handleReasoningEffortChange}
                onSearchEnabledChange={handleSearchEnabledChange}
                onSelectedMcpToolsChange={handleSelectedMcpToolsChange}
                onStop={handleStop}
                onSubmit={handleSubmit}
                reasoningEffort={reasoningEffort}
                searchEnabled={searchEnabled}
                selectedMcpTools={selectedMcpTools}
                status={status}
                supportsReasoning={supportsReasoning}
              />
            </div>
          </div>
        </DragDropZone>
      </div>
    </PromptInputProvider>
  );
};
