/**
 * Stream orchestration utilities for chat responses
 * Coordinates AI response, chunk processing, error handling, and completion
 */

import {
  getChat,
  savePartialAssistantMessage,
  updateActiveStreamId,
} from "@yapmate/db/service";
import type { UIMessage } from "ai";
import { unregisterStream } from "../../../lib/redis/controller";
import {
  getBufferedChunks,
  publishStreamChunk,
  setStreamStatus,
} from "../../../lib/redis/stream";
import { publishUserEvent } from "../../../lib/websocket";
import { type AiResponseUsage, executeAiResponse } from "./ai-response";
import { saveChatMessages } from "./store";
import { generateAndPublishTitle } from "./title";

/**
 * Processes stream chunks: publishes to Redis and writes to client
 */
export const processStreamChunks = async (
  uiStream: Awaited<ReturnType<typeof executeAiResponse>>["uiStream"],
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
 * Options for executing AI response with orchestration
 */
type ExecuteAiResponseWithOrchestrationOptions = {
  modelWithSearch: string;
  memoryEnabled?: boolean;
  messages: UIMessage[];
  abortSignal: AbortSignal;
  chatId: string;
  streamId: string;
  assistantMessageId: string;
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
 * Executes AI response and orchestrates chunk processing and title generation
 * @returns Usage data for the stream
 */
export const executeAiResponseWithOrchestration = async (
  options: ExecuteAiResponseWithOrchestrationOptions
): Promise<AiResponseUsage | null> => {
  const {
    modelWithSearch,
    memoryEnabled,
    messages,
    abortSignal,
    chatId,
    streamId,
    assistantMessageId,
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
          userId,
          writer,
          chunkIndex,
        })
      : Promise.resolve();

  // Execute AI response (creates stream)
  const { uiStream, getUsage } = executeAiResponse({
    modelWithSearch,
    memoryEnabled,
    messages,
    abortSignal,
    chatId,
    streamId,
    assistantMessageId,
    userId,
  });

  // Process chunks: publish to Redis and write to client
  // This MUST complete for onFinish to fire
  // We iterate over the stream ourselves, which ensures it completes
  // even if the client disconnects (writer.write will fail silently)
  await processStreamChunks(uiStream, writer, streamId, chunkIndex);

  // Get usage after stream is consumed (usage promise resolves when stream finishes)
  const usage = await getUsage();

  // Wait for title generation - keeps stream open until title is written
  await titlePromise;

  return usage;
};

/**
 * Options for handling stream finish
 */
type HandleStreamFinishOptions = {
  streamId: string;
  chatId: string;
  model: string;
  finalMessages: UIMessage[];
  usage: AiResponseUsage | null;
  userId?: string;
};

/**
 * Handles onFinish callback for stream
 */
export const handleStreamFinish = async (
  options: HandleStreamFinishOptions
): Promise<void> => {
  const { streamId, chatId, model, finalMessages, usage, userId } = options;
  // Save complete messages with proper IDs from AI SDK
  // This is the single source of truth for successful stream completion
  try {
    // Save all messages (upsert handles both new and updated)
    const lastMessageId = finalMessages.at(-1)?.id;
    const lastMessage = finalMessages.at(-1);
    const isAssistant = lastMessage?.role === "assistant";

    // Build metadata with usage if available
    const metadata: AiResponseUsage | undefined =
      usage && isAssistant ? usage : undefined;

    const messageOptions: Record<
      string,
      { model: string; metadata?: AiResponseUsage }
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

    // Publish message_created event for real-time sync
    // Get userId from chat if not provided
    const finalUserId = userId ?? (await getChat(chatId))?.userId;
    if (finalUserId) {
      await publishUserEvent(finalUserId, {
        type: "message_created",
        chatId,
      });
    }
  } catch (error) {
    console.error(`[Stream ${streamId}] Error in onFinish:`, error);
    await setStreamStatus(streamId, "error");
    // Don't throw - this is a callback
  }
};
