import type { QueryClient } from "@tanstack/react-query";
import type { ChatUIMessage } from "@yapmate/server/routes/api/chat/types";
import { rpcClient } from "../../lib/rpc-client";

type Model = { value: string };

/**
 * Creates a new chat via API
 * Return type is inferred from the router
 */
export const createChat = async (id: string, title: string) =>
  await rpcClient.chats.create({ id, title });

/**
 * Fetches the last message model for an existing chat
 * Return type is inferred from the router
 */
export const fetchLastMessageModel = async (targetChatId: string) => {
  try {
    const { model } = await rpcClient.messages.getLastModel({
      chatId: targetChatId,
    });
    return model;
  } catch {
    return null;
  }
};

/**
 * Fetches the last assistant message model from the most recent chat
 * Return type is inferred from the router
 */
export const fetchLastAssistantMessageModel = async () => {
  try {
    const { model } = await rpcClient.chats.getLastAssistantModel();
    return model;
  } catch {
    return null;
  }
};

/**
 * Checks if a model exists in the available models list
 */
export const isModelAvailable = (
  modelValue: string | null,
  models: Model[]
): boolean => {
  if (!modelValue) {
    return false;
  }
  return models.some((m) => m.value === modelValue);
};

/**
 * Gets the default model for existing chats
 */
export const getDefaultModelForExistingChat = async (
  targetChatId: string,
  models: Model[]
): Promise<string | null> => {
  const lastModelId = await fetchLastMessageModel(targetChatId);
  if (lastModelId && isModelAvailable(lastModelId, models)) {
    return lastModelId;
  }
  return null;
};

/**
 * Gets the default model for new chats
 */
export const getDefaultModelForNewChat = async (
  models: Model[]
): Promise<string | null> => {
  const lastAssistantModelId = await fetchLastAssistantMessageModel();
  if (lastAssistantModelId && isModelAvailable(lastAssistantModelId, models)) {
    return lastAssistantModelId;
  }
  return null;
};

/**
 * Determines the default model based on chat context
 */
export const determineDefaultModel = async (
  initialId: string | undefined,
  models: Model[],
  fallbackModel: string
): Promise<string> => {
  let defaultModelId: string | null = null;

  if (initialId) {
    defaultModelId = await getDefaultModelForExistingChat(initialId, models);
  } else {
    defaultModelId = await getDefaultModelForNewChat(models);
  }

  if (defaultModelId) {
    return defaultModelId;
  }

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
    const newMessageId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      {
        id: newMessageId,
        role: "assistant",
        parts: [{ type: "text", text: "" }],
      } as ChatUIMessage,
    ]);
    return { messageId: newMessageId, text: "" };
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
