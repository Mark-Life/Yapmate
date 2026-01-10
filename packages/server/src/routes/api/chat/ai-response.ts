/**
 * Core AI response streaming logic
 * Handles LLM streaming, Langfuse tracing, and usage extraction
 */

import { saveUsageRecord } from "@yapmate/db/service";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { langfuse } from "../../../lib/instrumentation";
import { openrouter } from "../../../lib/openrouter";

/** Reasoning effort level for models that support extended thinking */
export type ReasoningEffort = "high" | "medium" | "low";

/**
 * Usage data from AI response (matches MessageMetadata format)
 * Note: cost is excluded from this type as it's only stored in usage_records table,
 * not sent to client for privacy/security reasons
 */
export type AiResponseUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cachedTokens?: number;
  reasoningTokens?: number;
};

/**
 * Options for executing AI response
 */
type ExecuteAiResponseOptions = {
  modelWithSearch: string;
  memoryEnabled?: boolean;
  reasoningEffort?: ReasoningEffort;
  messages: UIMessage[];
  abortSignal: AbortSignal;
  chatId: string;
  streamId: string;
  assistantMessageId: string;
  userId: string;
  mcpTools?: Record<string, unknown>;
};

/**
 * Result of executing AI response
 */
export type AiResponseResult = {
  uiStream: ReturnType<
    typeof streamText
  >["toUIMessageStream"] extends () => infer R
    ? R
    : never;
  getUsage: () => Promise<AiResponseUsage | null>;
};

/**
 * Extracts text content from UIMessage parts
 */
const getMessageText = (msg: UIMessage): string => {
  const textParts = msg.parts.filter(
    (p): p is { type: "text"; text: string } => p.type === "text" && "text" in p
  );
  return textParts.map((p) => p.text).join("\n\n");
};

// Get Supermemory API key (only needed when memory is enabled)
// if (!process.env.SUPERMEMORY_API_KEY) {
//   throw new Error("SUPERMEMORY_API_KEY is not set");
// }
// const supermemoryApiKey = process.env.SUPERMEMORY_API_KEY;

/**
 * Creates and executes the LLM stream with Langfuse tracing
 * @returns UI stream and function to get usage data (after stream is consumed)
 */
export const executeAiResponse = async (
  options: ExecuteAiResponseOptions
): Promise<AiResponseResult> => {
  const {
    modelWithSearch,
    // memoryEnabled,
    reasoningEffort = "low",
    messages,
    abortSignal,
    chatId,
    streamId,
    assistantMessageId,
    userId,
    mcpTools,
  } = options;

  // Create Langfuse trace with assistantMessageId as trace ID for feedback linking
  // sessionId groups all traces in the same chat conversation
  const trace = langfuse.trace({
    id: assistantMessageId,
    name: "chat-message",
    sessionId: chatId,
    userId,
    tags: ["chat"],
    input: {
      messageCount: messages.length,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: getMessageText(msg),
      })),
    },
  });

  // Create generation span for the LLM call
  const generation = trace.generation({
    name: "llm-response",
    model: modelWithSearch.replace(":online", ""),
    input: messages.map((msg) => ({
      role: msg.role,
      content: getMessageText(msg),
    })),
  });

  // Create base model with reasoning support
  const baseModel = openrouter.chat(modelWithSearch, {
    usage: { include: true },
    reasoning: { effort: reasoningEffort },
  });

  // Wrap model with Supermemory when memory is enabled
  // mode: "full" = profile retrieval + query-based search
  // addMemory: "always" = auto-save important info from conversations
  // const model =
  //   memoryEnabled && supermemoryApiKey
  //     ? withSupermemory(baseModel, userId, {
  //         mode: "full",
  //         apiKey: supermemoryApiKey,
  //         verbose: true,
  //         conversationId: chatId,
  //       })
  //     : baseModel;

  // Add individual memory tools when enabled
  // const memoryTools =
  //   memoryEnabled && supermemoryApiKey
  //     ? {
  //         searchMemories: searchMemoriesTool(supermemoryApiKey, {
  //           containerTags: [userId],
  //         }),
  //         addMemory: addMemoryTool(supermemoryApiKey, {
  //           containerTags: [userId],
  //         }),
  //       }
  //     : undefined;

  const baseSystemPrompt =
    "You are a helpful assistant that can answer questions and help with tasks.";
  // const memorySystemPrompt =
  //   "When users share information about themselves, remember it using the addMemory tool. When they ask questions, search your memories to provide personalized responses. Always be proactive about remembering important details.";

  // const finalPrompt = memoryEnabled
  //   ? `${baseSystemPrompt} ${memorySystemPrompt}`
  //   : baseSystemPrompt;

  const result = streamText({
    model: baseModel,
    messages: await convertToModelMessages(messages),
    // Type cast needed - MCP tools from @ai-sdk/mcp are compatible but need type assertion
    ...(mcpTools &&
      Object.keys(mcpTools).length > 0 && {
        tools: mcpTools as Parameters<typeof streamText>[0]["tools"],
      }),
    system: baseSystemPrompt,
    maxOutputTokens: 8192,
    abortSignal,
    stopWhen: stepCountIs(5),
  });

  // Get UI stream
  const uiStream = result.toUIMessageStream({
    sendSources: true,
    sendReasoning: true,
  });

  // Return stream and function to get usage (usage resolves after stream is consumed)
  const getUsage = async (): Promise<AiResponseUsage | null> => {
    const [text, usage, finishReason, response, providerMetadata] =
      await Promise.all([
        result.text,
        result.usage,
        result.finishReason,
        result.response,
        result.providerMetadata,
      ]);

    // Extract cost from provider metadata
    const openrouterUsage =
      providerMetadata &&
      typeof providerMetadata === "object" &&
      "openrouter" in providerMetadata &&
      providerMetadata.openrouter &&
      typeof providerMetadata.openrouter === "object" &&
      "usage" in providerMetadata.openrouter
        ? (providerMetadata.openrouter.usage as { cost?: number })
        : undefined;

    // Update Langfuse generation with output and usage
    generation.end({
      output: text,
      usage: {
        input: usage.inputTokens,
        output: usage.outputTokens,
        total: usage.totalTokens,
      },
      metadata: {
        finishReason,
        cachedTokens: usage.inputTokenDetails.cacheReadTokens,
        reasoningTokens: usage.outputTokenDetails.reasoningTokens,
        cost: openrouterUsage?.cost,
      },
    });

    // Update trace with final output
    trace.update({
      output: {
        text,
        finishReason,
        usage: {
          promptTokens: usage.inputTokens,
          completionTokens: usage.outputTokens,
          totalTokens: usage.totalTokens,
        },
      },
    });

    // Save usage record for billing/analytics
    try {
      await saveUsageRecord({
        userId,
        chatId,
        messageId: undefined, // Set later if needed
        type: "chat",
        provider: "openrouter",
        model: modelWithSearch.replace(":online", ""),
        inputTokens: usage.inputTokens ?? null,
        outputTokens: usage.outputTokens ?? null,
        totalTokens: usage.totalTokens ?? null,
        cachedTokens: usage.inputTokenDetails.cacheReadTokens ?? 0,
        reasoningTokens: usage.outputTokenDetails.reasoningTokens ?? 0,
        costUsd: openrouterUsage?.cost?.toString() ?? null,
        generationId: response.id,
        finishReason: finishReason ?? null,
      });
    } catch (usageError) {
      // Log but don't fail the stream if usage saving fails
      console.error(
        `[Stream ${streamId}] Error saving usage record:`,
        usageError
      );
    }

    // Return usage data for message metadata (excluding cost - only sent to client)
    // Cost is still saved to usage_records table for billing/analytics
    return {
      promptTokens: usage.inputTokens,
      completionTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      cachedTokens: usage.inputTokenDetails.cacheReadTokens,
      reasoningTokens: usage.outputTokenDetails.reasoningTokens,
    };
  };

  return {
    uiStream,
    getUsage,
  };
};
