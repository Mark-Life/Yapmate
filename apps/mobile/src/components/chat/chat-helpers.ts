import type { QueryClient } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { rpcClient } from "@/lib/rpc-client";

type Model = { value: string };

type ChatUIMessage = UIMessage;

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
const getModelFromMessage = (message: ChatUIMessage): string | null => {
  // Check if message has metadata with model property
  if (message.metadata && typeof message.metadata === "object") {
    const metadata = message.metadata as { model?: string };
    return metadata.model ?? null;
  }
  return null;
};

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
 * Uses messages array instead of making API calls
 */
export const determineDefaultModel = (
  options: DetermineDefaultModelOptions
): string => {
  const { initialId, initialMessages, models, fallbackModel, queryClient } =
    options;

  let defaultModelId: string | null = null;

  if (initialId && initialMessages) {
    // Existing chat: find last assistant message model
    defaultModelId = getLastAssistantModel(initialMessages);
  } else if (!initialId && queryClient) {
    // New chat: look at last chat's messages from cache
    defaultModelId = getLastChatModelFromCache(queryClient, models);
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
