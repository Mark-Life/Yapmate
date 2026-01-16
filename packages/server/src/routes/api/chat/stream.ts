/**
 * Stream orchestration utilities for chat responses
 * Coordinates AI response, chunk processing, error handling, and completion
 */

import type { MCPClient } from "@ai-sdk/mcp";
import type { ChunkEmitter, GenerativeUIStreamChunk } from "@yapmate/server/lib/generative-ui";
import {
  abortStreamAtomic,
  completeStreamAtomic,
  getChat,
  updateActiveStreamId,
} from "@yapmate/db/service";
import type { UIMessage } from "ai";
import { resolveChatMcpTools } from "../../../lib/mcp";
import { unregisterStream } from "../../../lib/redis/controller";
import {
  getBufferedChunks,
  publishStreamChunk,
  setStreamStatus,
} from "../../../lib/redis/stream";
import { publishChatEvent, publishUserEvent } from "../../../lib/websocket";
import {
  type AiResponseUsage,
  executeAiResponse,
  type ReasoningEffort,
} from "./ai-response";
import { generateAndPublishTitle } from "./title";

/**
 * Options for processing stream chunks
 */
type ProcessStreamChunksOptions = {
  uiStream: Awaited<ReturnType<typeof executeAiResponse>>["uiStream"];
  writer: Parameters<
    Parameters<typeof import("ai").createUIMessageStream>[0]["execute"]
  >[0]["writer"];
  streamId: string;
  chatId: string;
  chunkIndex: { current: number };
};

/**
 * Processes stream chunks: publishes to Redis, broadcasts to chat channel, and writes to client
 */
export const processStreamChunks = async (
  options: ProcessStreamChunksOptions
): Promise<void> => {
  const { uiStream, writer, streamId, chatId, chunkIndex } = options;
  let writerActive = true;

  for await (const chunk of uiStream) {
    const currentIndex = chunkIndex.current;

    // Always publish to Redis (for other clients/resume)
    await publishStreamChunk(streamId, {
      type: (chunk as { type?: string }).type ?? "unknown",
      data: chunk,
      index: currentIndex,
    });

    // Broadcast to chat channel for multi-user sync
    // Other users watching this chat will receive the chunk via WebSocket
    await publishChatEvent(chatId, {
      type: "stream_chunk",
      chatId,
      chunk,
      chunkIndex: currentIndex,
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

/** Writer type for stream writing */
type WriterType = Parameters<
  Parameters<typeof import("ai").createUIMessageStream>[0]["execute"]
>[0]["writer"];

/**
 * Creates a ChunkEmitter for streaming generative UI chunks.
 * Handles Redis publish, WebSocket broadcast, and client writer write.
 * Wraps chunks in AI SDK data part format for compatibility.
 * @param writer - Stream writer for client connection
 * @param streamId - Stream ID for Redis publishing
 * @param chatId - Chat ID for WebSocket broadcasting
 * @param chunkIndex - Mutable reference to chunk index counter
 */
export const createChunkEmitter = (
  writer: WriterType,
  streamId: string,
  chatId: string,
  chunkIndex: { current: number }
): ChunkEmitter => ({
  emit: async (chunk: GenerativeUIStreamChunk) => {
    const currentIndex = chunkIndex.current;

    // Wrap in AI SDK data part format: { type: "data-<name>", data: <payload> }
    // The type must start with "data-" for the AI SDK to recognize it
    const dataChunk = {
      type: `data-${chunk.type}` as const,
      data: chunk,
    };

    // Publish to Redis for stream recovery/other clients
    await publishStreamChunk(streamId, {
      type: dataChunk.type,
      data: dataChunk,
      index: currentIndex,
    });

    // Broadcast to chat channel for multi-user sync
    await publishChatEvent(chatId, {
      type: "stream_chunk",
      chatId,
      chunk: dataChunk,
      chunkIndex: currentIndex,
    });

    chunkIndex.current += 1;

    // Write to current client (may fail if disconnected)
    try {
      writer.write(dataChunk as Parameters<WriterType["write"]>[0]);
    } catch {
      // Client disconnected, continue - chunks still go to Redis/WebSocket
    }
  },
});

/**
 * Handles stream errors
 * Saves partial message for non-abort errors, cleans up stream state
 *
 * IMPORTANT: For non-abort errors, this function uses an atomic transaction
 * to save partial message and clear stream state together. This prevents
 * data corruption if any step fails.
 *
 * Redis status is updated AFTER the DB transaction commits to ensure consistency.
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
      // ATOMIC: Save partial message + clear activeStreamId in single transaction
      await abortStreamAtomic(chatId, chunks);
    } catch (saveError) {
      console.error(
        `[Stream ${streamId}] Error saving partial message:`,
        saveError
      );
      // Even if save fails, try to clear stream state
      try {
        await updateActiveStreamId(chatId, null);
      } catch {
        // Ignore - best effort cleanup
      }
    }
    // Only update Redis status AFTER DB operations
    await setStreamStatus(streamId, "error");
    unregisterStream(streamId);
    throw err;
  }
};

/** MCP tool selection from client */
type McpToolSelection = {
  mcpServerId: string;
  toolName: string;
};

/**
 * Options for executing AI response with orchestration
 */
type ExecuteAiResponseWithOrchestrationOptions = {
  modelWithSearch: string;
  memoryEnabled?: boolean;
  reasoningEffort?: ReasoningEffort;
  selectedMcpTools?: McpToolSelection[];
  userRules?: Array<{ title: string; content: string }>;
  messages: UIMessage[];
  abortSignal: AbortSignal;
  chatId: string;
  streamId: string;
  assistantMessageId: string;
  userId: string;
  isFirstMessage: boolean;
  editMessageId: string | undefined;
  userMessage: string;
  writer: WriterType;
  chunkIndex: { current: number };
  /** Whether this is a multi-user chat (enables username prefixing) */
  isMultiUser?: boolean;
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
    reasoningEffort,
    selectedMcpTools,
    userRules,
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
    isMultiUser,
  } = options;

  // Resolve MCP tools for this chat
  let mcpClients: MCPClient[] = [];
  let mcpTools: Record<string, unknown> = {};
  let mcpErrors: Array<{
    serverId: string;
    serverName: string;
    error: string;
  }> = [];

  try {
    const mcpResult = await resolveChatMcpTools(
      userId,
      chatId,
      selectedMcpTools
    );
    mcpTools = mcpResult.tools;
    mcpClients = mcpResult.clients;
    mcpErrors = mcpResult.errors;

    // Send MCP errors as custom chunks if any
    if (mcpErrors.length > 0) {
      const currentIndex = chunkIndex.current;
      const errorChunk = {
        type: "data-mcp-error" as const,
        data: {
          errors: mcpErrors,
        },
      };
      await publishStreamChunk(streamId, {
        type: errorChunk.type,
        data: errorChunk.data,
        index: currentIndex,
      });

      // Broadcast to chat channel for multi-user sync
      await publishChatEvent(chatId, {
        type: "stream_chunk",
        chatId,
        chunk: errorChunk,
        chunkIndex: currentIndex,
      });

      chunkIndex.current += 1;
      try {
        writer.write(errorChunk);
      } catch {
        // Client disconnected, continue
      }
    }
  } catch (mcpResolveError) {
    console.error(
      `[Stream ${streamId}] Error resolving MCP tools:`,
      mcpResolveError
    );
    // Continue without MCP tools
  }

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

  try {
    // Create chunk emitter for streaming generative UI
    const chunkEmitter = createChunkEmitter(writer, streamId, chatId, chunkIndex);

    // Execute AI response (creates stream)
    const { uiStream, getUsage } = await executeAiResponse({
      modelWithSearch,
      memoryEnabled,
      reasoningEffort,
      userRules,
      messages,
      abortSignal,
      chatId,
      streamId,
      assistantMessageId,
      userId,
      mcpTools: Object.keys(mcpTools).length > 0 ? mcpTools : undefined,
      isMultiUser,
      chunkEmitter,
    });

    // Process chunks: publish to Redis, broadcast to chat, and write to client
    // This MUST complete for onFinish to fire
    // We iterate over the stream ourselves, which ensures it completes
    // even if the client disconnects (writer.write will fail silently)
    await processStreamChunks({
      uiStream,
      writer,
      streamId,
      chatId,
      chunkIndex,
    });

    // Get usage after stream is consumed (usage promise resolves when stream finishes)
    const usage = await getUsage();

    // Wait for title generation - keeps stream open until title is written
    await titlePromise;

    return usage;
  } finally {
    // Close MCP clients after stream finishes
    await Promise.all(
      mcpClients.map((client) =>
        client.close().catch((err) => {
          console.error(`[Stream ${streamId}] Error closing MCP client:`, err);
        })
      )
    );
  }
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
 *
 * IMPORTANT: This function uses an atomic transaction to save messages and clear
 * stream state together. This prevents data corruption if any step fails:
 * - Either all messages are saved AND stream is cleared
 * - Or the entire operation is rolled back
 *
 * Redis status is updated AFTER the DB transaction commits to ensure consistency.
 */
export const handleStreamFinish = async (
  options: HandleStreamFinishOptions
): Promise<void> => {
  const { streamId, chatId, model, finalMessages, usage, userId } = options;
  // Save complete messages with proper IDs from AI SDK
  // This is the single source of truth for successful stream completion
  try {
    // Save all messages (upsert handles both new and updated)
    // Include model for ALL assistant messages (for provider logo display when switching models mid-conversation)
    // Only include usage metadata on the last assistant message (current generation's token counts)
    const lastAssistantMessage = [...finalMessages]
      .reverse()
      .find((m) => m.role === "assistant");

    const messageOptions: Record<
      string,
      { model: string; metadata?: AiResponseUsage }
    > = {};

    for (const message of finalMessages) {
      if (message.role === "assistant") {
        const isLastAssistant = message.id === lastAssistantMessage?.id;
        // For the new message (last assistant), use the current model from request
        // For existing messages, preserve their stored model from DB (via metadata)
        const existingModel = (
          message.metadata as { model?: string } | undefined
        )?.model;
        const messageModel = isLastAssistant ? model : (existingModel ?? model);
        messageOptions[message.id] = {
          model: messageModel,
          ...(isLastAssistant && usage ? { metadata: usage } : {}),
        };
      }
    }

    // ATOMIC: Save messages + clear activeStreamId in single transaction
    // This prevents partial state where messages are saved but stream ID isn't cleared
    await completeStreamAtomic(chatId, finalMessages, messageOptions);

    // Only update Redis status AFTER DB transaction commits successfully
    // This ensures Redis reflects the true DB state
    await setStreamStatus(streamId, "complete");
    unregisterStream(streamId);

    // Publish message_created event for real-time sync
    // 1. Publish to user channel (for backward compatibility / single-user)
    const finalUserId = userId ?? (await getChat(chatId))?.userId;
    if (finalUserId) {
      await publishUserEvent(finalUserId, {
        type: "message_created",
        chatId,
      });
    }

    // 2. Publish to chat channel (for multi-user sync)
    // Other users watching this chat will be notified to refresh messages
    await publishChatEvent(chatId, {
      type: "message_created",
      chatId,
    });
  } catch (error) {
    console.error(`[Stream ${streamId}] Error in onFinish:`, error);
    await setStreamStatus(streamId, "error");
    // Don't throw - this is a callback
  }
};
