/**
 * Stream processing utilities for chat responses
 */

import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { updateActiveStreamId } from "@/server/lib/db/service/chats";
import { savePartialAssistantMessage } from "@/server/lib/db/service/messages";
import { saveUsageRecord } from "@/server/lib/db/service/usage";
import { openrouter } from "@/server/lib/openrouter";
import { unregisterStream } from "@/server/lib/redis/controller";
import {
  getBufferedChunks,
  publishStreamChunk,
  setStreamStatus,
} from "@/server/lib/redis/stream";
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
 * Creates and executes the LLM stream
 */
export const executeStream = async (
  options: ExecuteStreamOptions
): Promise<void> => {
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

  // Save usage record for billing/analytics
  try {
    const openrouterUsage =
      providerMetadata &&
      typeof providerMetadata === "object" &&
      "openrouter" in providerMetadata &&
      providerMetadata.openrouter &&
      typeof providerMetadata.openrouter === "object" &&
      "usage" in providerMetadata.openrouter
        ? (providerMetadata.openrouter.usage as { cost?: number })
        : undefined;
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

  // Stream completed successfully - onFinish callback will save messages
  // No need to save here to avoid duplicates
};

/**
 * Handles onFinish callback for stream
 */
export const handleStreamFinish = async (
  streamId: string,
  chatId: string,
  model: string,
  finalMessages: UIMessage[]
): Promise<void> => {
  // Save complete messages with proper IDs from AI SDK
  // This is the single source of truth for successful stream completion
  try {
    // Save all messages (upsert handles both new and updated)
    const lastMessageId = finalMessages.at(-1)?.id;
    await saveChatMessages(chatId, finalMessages, {
      // Add model info to the last assistant message
      ...(lastMessageId ? { [lastMessageId]: { model } } : {}),
    });
    await updateActiveStreamId(chatId, null);
    await setStreamStatus(streamId, "complete");
    unregisterStream(streamId);
  } catch (error) {
    console.error(`[Stream ${streamId}] Error in onFinish:`, error);
    await setStreamStatus(streamId, "error");
    // Don't throw - this is a callback
  }
};
