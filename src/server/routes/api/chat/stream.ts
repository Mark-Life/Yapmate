/**
 * Stream processing utilities for chat responses
 */

import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { updateActiveStreamId } from "@/server/lib/db/service/chats";
import { savePartialAssistantMessage } from "@/server/lib/db/service/messages";
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
  console.log(
    `[Stream ${streamId}] Finished processing ${chunkIndex.current} chunks`
  );
};

/**
 * Completes stream processing and saves messages
 */
export const completeStream = async (
  streamId: string,
  chatId: string
): Promise<void> => {
  console.log(
    `[Stream ${streamId}] Stream completed, saving messages manually`
  );
  try {
    // Reconstruct assistant message from Redis chunks
    const chunks = await getBufferedChunks(streamId);
    if (chunks.length > 0) {
      // Use the same function we use for partial saves
      await savePartialAssistantMessage(chatId, chunks);
      console.log(
        `[Stream ${streamId}] Messages saved to DB from Redis chunks`
      );
    } else {
      console.warn(`[Stream ${streamId}] No chunks found in Redis to save`);
    }
    await updateActiveStreamId(chatId, null);
    await setStreamStatus(streamId, "complete");
    unregisterStream(streamId);
    console.log(`[Stream ${streamId}] Stream marked as complete`);
  } catch (saveError) {
    console.error(`[Stream ${streamId}] Error saving messages:`, saveError);
    await setStreamStatus(streamId, "error");
    // Don't throw - stream already completed, just log the error
  }
};

/**
 * Handles stream errors
 */
export const handleStreamError = async (
  streamId: string,
  err: unknown
): Promise<void> => {
  if (err instanceof Error && err.name === "AbortError") {
    // User stopped the stream - status already set to "aborted" by stop handler
    // Partial message will be saved by stop handler
    await setStreamStatus(streamId, "aborted");
  } else {
    // Other error
    await setStreamStatus(streamId, "error");
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
    model: openrouter.chat(modelWithSearch),
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

  // Wait for title generation - keeps stream open until title is written
  await titlePromise;

  // Stream completed successfully - manually save messages
  // (onFinish may not fire if client disconnected)
  await completeStream(streamId, chatId);
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
  // This may not fire if client disconnected, so we also save manually in execute
  console.log(
    `[Stream ${streamId}] onFinish called with ${finalMessages.length} messages`
  );
  try {
    // Save all messages (upsert handles both new and updated)
    const lastMessageId = finalMessages.at(-1)?.id;
    await saveChatMessages(chatId, finalMessages, {
      // Add model info to the last assistant message
      ...(lastMessageId ? { [lastMessageId]: { model } } : {}),
    });
    console.log(`[Stream ${streamId}] Messages saved to DB via onFinish`);
    await updateActiveStreamId(chatId, null);
    await setStreamStatus(streamId, "complete");
    unregisterStream(streamId);
  } catch (error) {
    console.error(`[Stream ${streamId}] Error in onFinish:`, error);
    await setStreamStatus(streamId, "error");
    // Don't throw - this is a callback
  }
};
