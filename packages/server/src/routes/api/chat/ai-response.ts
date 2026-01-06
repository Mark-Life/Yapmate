/**
 * Core AI response streaming logic
 * Handles LLM streaming and usage extraction
 */

import { saveUsageRecord } from "@yapmate/db/service";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { openrouter } from "../../../lib/openrouter";

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
  messages: UIMessage[];
  abortSignal: AbortSignal;
  chatId: string;
  streamId: string;
  userId: string;
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
 * Creates and executes the LLM stream
 * @returns UI stream and function to get usage data (after stream is consumed)
 */
export const executeAiResponse = async (
  options: ExecuteAiResponseOptions
): Promise<AiResponseResult> => {
  const { modelWithSearch, messages, abortSignal, chatId, streamId, userId } =
    options;

  const result = streamText({
    model: openrouter.chat(modelWithSearch, { usage: { include: true } }),
    messages: convertToModelMessages(messages),
    system:
      "You are a helpful assistant that can answer questions and help with tasks",
    abortSignal,
  });

  // Get UI stream
  const uiStream = result.toUIMessageStream({
    sendSources: true,
    sendReasoning: true,
  });

  // Return stream and function to get usage (usage resolves after stream is consumed)
  const getUsage = async (): Promise<AiResponseUsage | null> => {
    const [usage, finishReason, response, providerMetadata] = await Promise.all(
      [
        result.usage,
        result.finishReason,
        result.response,
        result.providerMetadata,
      ]
    );

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
        cachedTokens: usage.cachedInputTokens ?? 0,
        reasoningTokens: usage.reasoningTokens ?? 0,
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
      cachedTokens: usage.cachedInputTokens,
      reasoningTokens: usage.reasoningTokens,
      // cost is intentionally excluded - only stored in usage_records, not sent to client
    };
  };

  return {
    uiStream,
    getUsage,
  };
};
