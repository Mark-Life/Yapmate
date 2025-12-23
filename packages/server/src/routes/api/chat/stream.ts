/**
 * Stream processing utilities for chat responses
 */

import {
  savePartialAssistantMessage,
  saveUsageRecord,
  updateActiveStreamId,
} from "@yapmate/db/service";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { openrouter } from "../../../lib/openrouter";
import { unregisterStream } from "../../../lib/redis/controller";
import {
  getBufferedChunks,
  publishStreamChunk,
  setStreamStatus,
} from "../../../lib/redis/stream";
import { saveChatMessages } from "./store";
import { generateAndPublishTitle } from "./title";

/**
 * Processes stream chunks: publishes to Redis and writes to client
 */
export const processStreamChunks = async (
  uiStream: ReturnType<
    typeof streamText
  >["toUIMessageStream"] extends () => infer R
    ? R
    : never,
  writer: Parameters<
    Parameters<typeof import("ai").createUIMessageStream>[0]["execute"]
  >[0]["writer"],
  streamId: string,
  chunkIndex: { current: number }
): Promise<void> => {
  let writerActive = true;

  for await (const chunk of uiStream) {
    // Always publish to Redis (for other clients/resume)
    await publishStreamChunk(streamId, {
      type: (chunk as { type?: string }).type ?? "unknown",
      data: chunk,
      index: chunkIndex.current,
    });
    chunkIndex.current += 1;

    // Write to current client (may fail if client disconnected)
    if (writerActive) {
      try {
        writer.write(chunk as Parameters<typeof writer.write>[0]);
      } catch {
        // Client disconnected, continue consuming stream but don't write
        console.log(
          `[Stream ${streamId}] Client disconnected, continuing stream processing`
        );
        writerActive = false;
      }
    }
  }
};

/**
 * Handles stream errors
 * Saves partial message for non-abort errors, cleans up stream state
 */
export const handleStreamError = async (
  streamId: string,
  chatId: string,
  err: unknown
): Promise<void> => {
  if (err instanceof Error && err.name === "AbortError") {
    // User stopped the stream - status already set to "aborted" by stop handler
    // Partial message will be saved by stop handler
    await setStreamStatus(streamId, "aborted");
    await updateActiveStreamId(chatId, null);
    unregisterStream(streamId);
  } else {
    // Other error - save partial content before marking error
    try {
      const chunks = await getBufferedChunks(streamId);
      if (chunks.length > 0) {
        await savePartialAssistantMessage(chatId, chunks);
      }
    } catch (saveError) {
      console.error(
        `[Stream ${streamId}] Error saving partial message:`,
        saveError
      );
    }
    await setStreamStatus(streamId, "error");
    await updateActiveStreamId(chatId, null);
    unregisterStream(streamId);
    throw err;
  }
};

/**
 * Options for executing a stream
 */
type ExecuteStreamOptions = {
  modelWithSearch: string;
  allMessages: UIMessage[];
  abortSignal: AbortSignal;
  chatId: string;
  streamId: string;
  userId: string;
  isFirstMessage: boolean;
  editMessageId: string | undefined;
  userMessage: string;
  writer: Parameters<
    Parameters<typeof import("ai").createUIMessageStream>[0]["execute"]
  >[0]["writer"];
  chunkIndex: { current: number };
};

/**
 * Usage data from stream execution (matches MessageMetadata format)
 * Note: cost is excluded from this type as it's only stored in usage_records table,
 * not sent to client for privacy/security reasons
 */
type StreamUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cachedTokens?: number;
  reasoningTokens?: number;
};

/**
 * Creates and executes the LLM stream
 * @returns Usage data for the stream
 */
export const executeStream = async (
  options: ExecuteStreamOptions
): Promise<StreamUsage | null> => {
  const {
    modelWithSearch,
    allMessages,
    abortSignal,
    chatId,
    streamId,
    userId,
    isFirstMessage,
    editMessageId,
    userMessage,
    writer,
    chunkIndex,
  } = options;

  // Start title generation in parallel (if first message, skip if editing)
  const titlePromise =
    isFirstMessage && !editMessageId
      ? generateAndPublishTitle({
          chatId,
          streamId,
          userMessage,
          writer,
          chunkIndex,
        })
      : Promise.resolve();

  const result = streamText({
    model: openrouter.chat(modelWithSearch, { usage: { include: true } }),
    messages: convertToModelMessages(allMessages),
    system:
      "You are a helpful assistant that can answer questions and help with tasks",
    abortSignal,
  });

  // Get UI stream and process chunks
  // We iterate over the stream ourselves, which ensures it completes
  // even if the client disconnects (writer.write will fail silently)
  const uiStream = result.toUIMessageStream({
    sendSources: true,
    sendReasoning: true,
  });

  // Process chunks: publish to Redis and write to client
  // This MUST complete for onFinish to fire
  await processStreamChunks(uiStream, writer, streamId, chunkIndex);

  // Log provider metadata (usage, pricing, etc.)
  const [usage, finishReason, response, providerMetadata] = await Promise.all([
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

  // Wait for title generation - keeps stream open until title is written
  await titlePromise;

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

/**
 * Options for handling stream finish
 */
type HandleStreamFinishOptions = {
  streamId: string;
  chatId: string;
  model: string;
  finalMessages: UIMessage[];
  usage: StreamUsage | null;
};

/**
 * Handles onFinish callback for stream
 */
export const handleStreamFinish = async (
  options: HandleStreamFinishOptions
): Promise<void> => {
  const { streamId, chatId, model, finalMessages, usage } = options;
  // Save complete messages with proper IDs from AI SDK
  // This is the single source of truth for successful stream completion
  try {
    // Save all messages (upsert handles both new and updated)
    const lastMessageId = finalMessages.at(-1)?.id;
    const lastMessage = finalMessages.at(-1);
    const isAssistant = lastMessage?.role === "assistant";

    // Build metadata with usage if available
    const metadata: StreamUsage | undefined =
      usage && isAssistant ? usage : undefined;

    const messageOptions: Record<
      string,
      { model: string; metadata?: StreamUsage }
    > = {};
    if (lastMessageId) {
      if (isAssistant && metadata) {
        messageOptions[lastMessageId] = { model, metadata };
      } else {
        messageOptions[lastMessageId] = { model };
      }
    }

    await saveChatMessages(chatId, finalMessages, messageOptions);
    await updateActiveStreamId(chatId, null);
    await setStreamStatus(streamId, "complete");
    unregisterStream(streamId);
  } catch (error) {
    console.error(`[Stream ${streamId}] Error in onFinish:`, error);
    await setStreamStatus(streamId, "error");
    // Don't throw - this is a callback
  }
};
