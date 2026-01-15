import type { QueryClient } from "@tanstack/react-query";
import type { ChatUIMessage } from "@yapmate/server/routes/api/chat/types";
import { getLastUsedModel } from "../../hooks/use-user-preferences";
import { rpcClient } from "../../lib/rpc-client";

/**
 * Fetches fresh messages from DB and updates both state and cache
 * Used when resuming a stream to ensure we have the correct baseline
 */
const refreshMessagesFromDb = async (
  chatId: string,
  setMessages: React.Dispatch<React.SetStateAction<ChatUIMessage[]>>,
  queryClient: QueryClient
): Promise<void> => {
  try {
    const freshMessages = await rpcClient.messages.list({ chatId });
    // Update local state with fresh messages
    setMessages(freshMessages);
    // Update cache so future reads are consistent
    queryClient.setQueryData(["chat-messages", chatId], freshMessages);
  } catch (error) {
    console.error("Failed to refresh messages from DB:", error);
    // Continue anyway - stream will still work, just might have stale baseline
  }
};

type Model = { value: string };

/**
 * Creates a new chat via API
 * Return type is inferred from the router
 */
export const createChat = async (id: string, title: string) =>
  await rpcClient.chats.create({ id, title });

/**
 * Checks if a model exists in the available models list
 */
export const isModelAvailable = (
  modelValue: string | null | undefined,
  models: Model[]
): boolean => {
  if (!modelValue) {
    return false;
  }
  return models.some((m) => m.value === modelValue);
};

/**
 * Extracts model from a message's metadata
 */
const getModelFromMessage = (message: ChatUIMessage): string | null =>
  message.metadata?.model ?? null;

/**
 * Gets the model from the last assistant message in messages array
 */
const getLastAssistantModel = (messages: ChatUIMessage[]): string | null => {
  // Find last assistant message with model
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === "assistant") {
      const model = getModelFromMessage(msg);
      if (model) {
        return model;
      }
    }
  }
  return null;
};

/**
 * Gets the model from the last chat's messages in React Query cache
 */
const getLastChatModelFromCache = (
  queryClient: QueryClient,
  models: Model[]
): string | null => {
  // Get all chat queries from cache
  const cache = queryClient.getQueryCache();
  const chatQueries = cache.findAll({ queryKey: ["chat-messages"] });

  // Find the most recent chat with messages
  for (const query of chatQueries) {
    const messages = query.state.data as ChatUIMessage[] | undefined;
    if (messages && messages.length > 0) {
      const model = getLastAssistantModel(messages);
      if (model && isModelAvailable(model, models)) {
        return model;
      }
    }
  }

  return null;
};

type DetermineDefaultModelOptions = {
  initialId?: string;
  initialMessages?: ChatUIMessage[];
  models: Model[];
  fallbackModel: string;
  queryClient?: QueryClient;
};

/**
 * Determines the default model based on chat context
 * Priority: initial messages → localStorage → query cache → fallback
 */
export const determineDefaultModel = (
  options: DetermineDefaultModelOptions
): string => {
  const { initialId, initialMessages, models, fallbackModel, queryClient } =
    options;

  let defaultModelId: string | null = null;

  // Check if this is an existing chat with messages
  const hasExistingMessages = initialMessages && initialMessages.length > 0;

  if (initialId && hasExistingMessages) {
    // Existing chat: find last assistant message model
    defaultModelId = getLastAssistantModel(initialMessages);
  }

  // For new chats or if no model found from messages, check localStorage
  if (!defaultModelId) {
    const localModel = getLastUsedModel();
    if (localModel && isModelAvailable(localModel, models)) {
      return localModel;
    }

    // Then try query cache
    if (queryClient) {
      defaultModelId = getLastChatModelFromCache(queryClient, models);
    }
  }

  // Validate model is available
  if (defaultModelId && isModelAvailable(defaultModelId, models)) {
    return defaultModelId;
  }

  // Fallback to provided fallback model or first available model
  if (isModelAvailable(fallbackModel, models)) {
    return fallbackModel;
  }

  return models[0]?.value ?? fallbackModel;
};

type ResumeChunkState = { messageId: string | null; text: string };

/**
 * Handles text-start chunk: creates new assistant message
 */
const handleTextStartChunk = (
  chunk: Record<string, unknown>,
  setMessages: React.Dispatch<React.SetStateAction<ChatUIMessage[]>>
): ResumeChunkState => {
  if (chunk.type === "text-start" && typeof chunk.id === "string") {
    let messageId: string | null = null;

    setMessages((prev) => {
      // Check if we're already processing this stream (last message is assistant with empty text)
      const lastMessage = prev.at(-1);
      if (
        lastMessage?.role === "assistant" &&
        lastMessage.parts.length === 1 &&
        lastMessage.parts[0]?.type === "text" &&
        lastMessage.parts[0]?.text === ""
      ) {
        // Already have a streaming message, reuse it
        messageId = lastMessage.id;
        return prev;
      }

      // Create new assistant message
      const newMessageId = crypto.randomUUID();
      messageId = newMessageId;
      return [
        ...prev,
        {
          id: newMessageId,
          role: "assistant",
          parts: [{ type: "text", text: "" }],
        } as ChatUIMessage,
      ];
    });

    return { messageId, text: "" };
  }
  return { messageId: null, text: "" };
};

/**
 * Handles text-delta chunk: appends to accumulated text
 */
const handleTextDeltaChunk = (
  chunk: Record<string, unknown>,
  state: ResumeChunkState,
  setMessages: React.Dispatch<React.SetStateAction<ChatUIMessage[]>>
): ResumeChunkState => {
  if (chunk.type === "text-delta" && typeof chunk.delta === "string") {
    const newText = state.text + chunk.delta;
    if (state.messageId) {
      const msgId = state.messageId;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === msgId
            ? { ...msg, parts: [{ type: "text", text: newText }] }
            : msg
        )
      );
    }
    return { ...state, text: newText };
  }
  return state;
};

/**
 * Processes a single SSE chunk and updates state
 */
export const processResumeChunk = (
  chunk: Record<string, unknown>,
  state: ResumeChunkState,
  setMessages: React.Dispatch<React.SetStateAction<ChatUIMessage[]>>
): ResumeChunkState => {
  // Handle text-start: create new assistant message
  if (chunk.type === "text-start") {
    return handleTextStartChunk(chunk, setMessages);
  }

  // Handle text-delta: append to accumulated text
  if (chunk.type === "text-delta") {
    return handleTextDeltaChunk(chunk, state, setMessages);
  }

  return state;
};

/**
 * Parses SSE line and extracts JSON chunk
 */
const parseSSELine = (line: string): Record<string, unknown> | null => {
  if (!line.startsWith("data: ")) {
    return null;
  }
  try {
    return JSON.parse(line.slice(6)) as Record<string, unknown>;
  } catch {
    return null;
  }
};

/**
 * Processes buffered SSE lines
 */
const processSSELines = (
  lines: string[],
  state: ResumeChunkState,
  setMessages: React.Dispatch<React.SetStateAction<ChatUIMessage[]>>
): ResumeChunkState => {
  let currentState = state;
  for (const line of lines) {
    const chunk = parseSSELine(line);
    if (chunk) {
      currentState = processResumeChunk(chunk, currentState, setMessages);
    }
  }
  return currentState;
};

/**
 * Reads and processes stream chunks
 */
const processStreamChunks = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  decoder: TextDecoder,
  isCancelled: { current: boolean },
  setMessages: React.Dispatch<React.SetStateAction<ChatUIMessage[]>>
): Promise<ResumeChunkState> => {
  let buffer = "";
  let state: ResumeChunkState = { messageId: null, text: "" };

  while (!isCancelled.current) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    state = processSSELines(lines, state, setMessages);
  }

  return state;
};

/**
 * Fetches stream response
 */
const fetchStreamResponse = async (
  chatId: string
): Promise<Response | null> => {
  const res = await fetch(`/api/chat/${chatId}/stream`);
  if (res.status === 204) {
    return null;
  }
  return res;
};

/**
 * Resumes an active stream on mount
 *
 * IMPORTANT: This function fetches fresh messages from DB before processing
 * stream chunks. This is critical for scenarios like regeneration where:
 * 1. User clicks regenerate (server deletes old messages)
 * 2. User navigates away (React Query cache still has stale data)
 * 3. User returns (cache returns stale messages)
 * 4. Without refresh, stream chunks append to stale messages = duplicates
 *
 * By fetching fresh messages first, we ensure the correct baseline.
 */
export const resumeStream = async (
  chatId: string,
  setMessages: React.Dispatch<React.SetStateAction<ChatUIMessage[]>>,
  queryClient: QueryClient,
  isCancelled: { current: boolean }
): Promise<void> => {
  try {
    const res = await fetchStreamResponse(chatId);
    if (!res || isCancelled.current) {
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      return;
    }

    // CRITICAL: Refresh messages from DB before processing stream
    // This ensures we have the correct baseline (e.g., after regeneration deleted old messages)
    // Without this, we'd append stream chunks to stale cached messages
    await refreshMessagesFromDb(chatId, setMessages, queryClient);

    if (isCancelled.current) {
      return;
    }

    const decoder = new TextDecoder();
    await processStreamChunks(reader, decoder, isCancelled, setMessages);

    // Stream completed - invalidate query so navigation fetches fresh DB data
    if (!isCancelled.current) {
      queryClient.invalidateQueries({
        queryKey: ["chat-messages", chatId],
      });
    }
  } catch (error) {
    if (!isCancelled.current) {
      console.error("Resume stream failed:", error);
    }
  }
};

type HandleRegenerateOptions = {
  messageId?: string;
  role?: "user" | "assistant";
  selectedModel?: string;
  messages: ChatUIMessage[];
  setModel: (model: string) => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatUIMessage[]>>;
  regenerate: (options?: { messageId?: string }) => void;
  regenerateMessageIdRef: React.MutableRefObject<string | undefined>;
  regenerateRoleRef: React.MutableRefObject<"user" | "assistant" | undefined>;
};

/**
 * Handles regeneration from a specific message
 */
export const handleRegenerate = (options: HandleRegenerateOptions): void => {
  const {
    messageId,
    role,
    selectedModel,
    messages,
    setModel,
    setMessages,
    regenerate,
    regenerateMessageIdRef,
    regenerateRoleRef,
  } = options;

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
};

type HandleEditOptions = {
  messageId: string;
  editedText: string;
  messages: ChatUIMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatUIMessage[]>>;
  regenerate: (options?: { messageId?: string }) => void;
  editMessageIdRef: React.MutableRefObject<string | undefined>;
  editedTextRef: React.MutableRefObject<string | undefined>;
};

/**
 * Handles editing a user message
 */
export const handleEdit = (options: HandleEditOptions): void => {
  const {
    messageId,
    editedText,
    messages,
    setMessages,
    regenerate,
    editMessageIdRef,
    editedTextRef,
  } = options;

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
    (p: { type: string }) => p.type === "text"
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
};

type MessageRequestRefs = {
  modelRef: React.MutableRefObject<string>;
  searchEnabledRef: React.MutableRefObject<boolean>;
  memoryEnabledRef: React.MutableRefObject<boolean>;
  reasoningEffortRef: React.MutableRefObject<string>;
  supportsReasoningRef: React.MutableRefObject<boolean>;
  selectedMcpToolsRef: React.MutableRefObject<unknown[]>;
  selectedRuleIdsRef: React.MutableRefObject<string[]>;
  regenerateMessageIdRef: React.MutableRefObject<string | undefined>;
  regenerateRoleRef: React.MutableRefObject<"user" | "assistant" | undefined>;
  editMessageIdRef: React.MutableRefObject<string | undefined>;
  editedTextRef: React.MutableRefObject<string | undefined>;
};

/**
 * Creates the request body for sending messages
 * Extracts and clears ref values for regeneration/edit operations
 */
export const createMessageRequestBody = (
  allMessages: unknown[],
  transportChatId: string,
  refs: MessageRequestRefs
): Record<string, unknown> => {
  const {
    modelRef,
    searchEnabledRef,
    memoryEnabledRef,
    reasoningEffortRef,
    supportsReasoningRef,
    selectedMcpToolsRef,
    selectedRuleIdsRef,
    regenerateMessageIdRef,
    regenerateRoleRef,
    editMessageIdRef,
    editedTextRef,
  } = refs;

  // Extract and clear regeneration/edit refs
  const regenerateMessageId = regenerateMessageIdRef.current;
  const regenerateRole = regenerateRoleRef.current;
  const editMessageId = editMessageIdRef.current;
  const editedText = editedTextRef.current;

  regenerateMessageIdRef.current = undefined;
  regenerateRoleRef.current = undefined;
  editMessageIdRef.current = undefined;
  editedTextRef.current = undefined;

  // Build the request body
  const body: Record<string, unknown> = {
    message: allMessages.at(-1),
    id: transportChatId,
    model: modelRef.current,
    searchEnabled: searchEnabledRef.current,
    memoryEnabled: memoryEnabledRef.current,
  };

  // Add optional fields
  if (supportsReasoningRef.current) {
    body.reasoningEffort = reasoningEffortRef.current;
  }

  if (selectedMcpToolsRef.current.length > 0) {
    body.selectedMcpTools = selectedMcpToolsRef.current;
  }

  if (selectedRuleIdsRef.current.length > 0) {
    body.selectedRuleIds = selectedRuleIdsRef.current;
  }

  if (regenerateMessageId) {
    body.regenerateMessageId = regenerateMessageId;
    body.regenerateRole = regenerateRole;
  }

  if (editMessageId && editedText) {
    body.editMessageId = editMessageId;
    body.editedText = editedText;
  }

  return body;
};
