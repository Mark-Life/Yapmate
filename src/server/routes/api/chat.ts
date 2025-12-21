/**
 * Streaming chat API route handler
 * Handles POST for /api/chat
 */
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "ai";
import type { FileSelect } from "@/db/schema/files";
import { updateActiveStreamId } from "@/db/service/chats";
import { createPendingFile } from "@/db/service/files";
import {
  deleteMessagesFromOrder,
  getMessageOrder,
  saveMessage as saveMessageService,
  savePartialAssistantMessage,
} from "@/db/service/messages";
import {
  getChat,
  loadChatMessages,
  saveChatMessages,
  updateChatTitle,
} from "@/lib/chat-store";
import { uploadFilesInBackground } from "@/lib/file-upload";
import { openrouter } from "@/lib/openrouter";
import {
  getBufferedChunks,
  publishStreamChunk,
  setStreamStatus,
} from "@/lib/redis-stream";
import { registerStream, unregisterStream } from "@/lib/stream-controller";
import { getCurrentUserId } from "../../lib/supabase";

const TITLE_GENERATION_MODEL = "google/gemma-3n-e4b-it:free";
const MAX_TITLE_LENGTH = 50;

/**
 * Truncates text to max length with ellipsis
 */
const truncateTitle = (text: string): string => {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_TITLE_LENGTH) {
    return trimmed;
  }
  return `${trimmed.slice(0, MAX_TITLE_LENGTH)}...`;
};

/**
 * Generates a chat title from the first user message
 */
const generateChatTitle = async (userMessage: string): Promise<string> => {
  try {
    const result = await streamText({
      model: openrouter.chat(TITLE_GENERATION_MODEL),
      messages: [
        {
          role: "user",
          content: `Generate a short, descriptive title (max 50 chars) for a chat starting with: "${userMessage}"\n\nReturn ONLY the title, no quotes or explanation.\n\nThese are chat titles from user to LLM, so they should be short and descriptive. Use more model perspective titles, not specific to the user's message. So if user says "tell me about SSR", the best Title would be "SSR Explanation" or if user asks whats the capital of France, simply name it "Capital of France"`,
        },
      ],
      maxOutputTokens: 30,
    });

    const title = await result.text;
    const trimmed = title.trim().slice(0, MAX_TITLE_LENGTH);
    return trimmed || truncateTitle(userMessage);
  } catch {
    return truncateTitle(userMessage);
  }
};

/**
 * Processes file parts from a message and creates file records
 */
const processFileParts = async (
  fileParts: UIMessage["parts"],
  userId: string
): Promise<FileSelect[]> => {
  const fileRecords: FileSelect[] = [];

  for (const filePart of fileParts) {
    if (filePart.type !== "file") {
      continue;
    }

    const fileData = filePart as {
      url?: string;
      mediaType?: string;
      filename?: string;
    };

    if (!fileData.url?.startsWith("data:")) {
      continue;
    }

    const base64Data = fileData.url.split(",")[1];
    const size = base64Data ? Math.ceil((base64Data.length * 3) / 4) : 0;

    const fileRecord = await createPendingFile({
      userId,
      dataUrl: fileData.url,
      filename: fileData.filename || "file",
      mimeType: fileData.mediaType || "application/octet-stream",
      size,
    });

    fileRecords.push(fileRecord);
  }

  return fileRecords;
};

/**
 * Handles regeneration by deleting stale messages after the regeneration point
 */
const handleRegeneration = async (
  chatId: string,
  regenerateMessageId: string,
  regenerateRole?: "user" | "assistant"
): Promise<void> => {
  const regenerateOrder = await getMessageOrder(regenerateMessageId);
  if (regenerateOrder !== null) {
    const fromOrder =
      regenerateRole === "assistant" ? regenerateOrder : regenerateOrder + 1;
    await deleteMessagesFromOrder(chatId, fromOrder);
  }
};

/**
 * Handles editing a user message by updating its text and deleting stale messages
 */
const handleEdit = async (
  req: Request,
  chatId: string,
  editMessageId: string,
  editedText: string
): Promise<void> => {
  const allMessages = await loadChatMessages(req, chatId);
  const messageToEdit = allMessages.find((msg) => msg.id === editMessageId);

  if (messageToEdit && messageToEdit.role === "user") {
    const updatedParts = messageToEdit.parts.map((part) =>
      part.type === "text" ? { type: "text" as const, text: editedText } : part
    );

    const updatedMessage: UIMessage = {
      ...messageToEdit,
      parts: updatedParts,
    };

    const editOrder = await getMessageOrder(editMessageId);
    if (editOrder !== null) {
      await deleteMessagesFromOrder(chatId, editOrder + 1);
      await saveMessageService(chatId, updatedMessage, editOrder, {});
    }
  }
};

/**
 * Processes file parts and maps them to part indices
 */
const processMessageFiles = async (
  message: UIMessage,
  userId: string
): Promise<{
  fileRecords: FileSelect[];
  fileIdByPartIndex: Map<number, string>;
}> => {
  const fileParts = message.parts.filter((p) => p.type === "file");
  let fileRecords: FileSelect[] = [];
  const fileIdByPartIndex = new Map<number, string>();

  if (fileParts.length > 0) {
    fileRecords = await processFileParts(fileParts, userId);

    let fileIndex = 0;
    for (let i = 0; i < message.parts.length; i++) {
      if (message.parts[i].type === "file" && fileIndex < fileRecords.length) {
        fileIdByPartIndex.set(i, fileRecords[fileIndex].id);
        fileIndex += 1;
      }
    }
  }

  return { fileRecords, fileIdByPartIndex };
};

export const chatHandler = {
  async POST(req: Request) {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const {
      message,
      model,
      searchEnabled,
      id,
      regenerateMessageId,
      regenerateRole,
      editMessageId,
      editedText,
    }: {
      message: UIMessage;
      model: string;
      searchEnabled?: boolean;
      id: string;
      regenerateMessageId?: string;
      regenerateRole?: "user" | "assistant";
      editMessageId?: string;
      editedText?: string;
    } = await req.json();

    if (!id) {
      return new Response("Chat ID is required", { status: 400 });
    }

    // Verify chat exists and belongs to user
    const chat = await getChat(id);
    if (!chat) {
      return new Response("Chat not found", { status: 404 });
    }
    if (chat.userId !== userId) {
      return new Response("Forbidden", { status: 403 });
    }

    let fileRecords: FileSelect[] = [];
    let isFirstMessage = false;

    // Handle edit: update message text and delete stale messages
    if (editMessageId && editedText) {
      await handleEdit(req, id, editMessageId, editedText);
    } else {
      // Process file parts and create file records (only if not editing)
      const processedFiles = await processMessageFiles(message, userId);
      fileRecords = processedFiles.fileRecords;
      const fileIdByPartIndex = processedFiles.fileIdByPartIndex;

      // Handle regeneration: delete stale messages after the regeneration point
      if (regenerateMessageId) {
        await handleRegeneration(id, regenerateMessageId, regenerateRole);
      }

      // Save user message before sending to LLM
      const previousMessages = await loadChatMessages(req, id);
      isFirstMessage = previousMessages.length === 0;
      const messageOrder = previousMessages.length;

      // Save message with file IDs
      await saveMessageService(id, message, messageOrder, {
        fileIdMap: fileIdByPartIndex,
      });

      // Trigger background upload (non-blocking)
      if (fileRecords.length > 0) {
        uploadFilesInBackground(req, fileRecords, id);
      }
    }

    // Load all messages (includes the newly saved/updated message)
    const allMessages = await loadChatMessages(req, id);

    const modelWithSearch = searchEnabled ? `${model}:online` : model;

    // Generate stream ID and register abort controller
    const streamId = Bun.randomUUIDv7();
    const abortController = registerStream(streamId);

    // Mark stream as active in DB and Redis
    await updateActiveStreamId(id, streamId);
    await setStreamStatus(streamId, "streaming");

    let chunkIndex = 0;

    /**
     * Generates and publishes chat title
     */
    const generateAndPublishTitle = async (
      writer: Parameters<
        Parameters<typeof createUIMessageStream>[0]["execute"]
      >[0]["writer"]
    ): Promise<void> => {
      const userText =
        message.parts.find((p) => p.type === "text")?.text || "New chat";
      try {
        const title = await generateChatTitle(userText);
        await updateChatTitle(id, title);
        const titleChunk = {
          type: "data-chat-title" as const,
          data: { title },
          transient: true,
        };
        writer.write(titleChunk);
        // Publish title to Redis
        await publishStreamChunk(streamId, {
          type: titleChunk.type,
          data: titleChunk.data,
          index: chunkIndex,
        });
        chunkIndex += 1;
      } catch (error) {
        console.error("Title generation failed:", error);
      }
    };

    /**
     * Processes stream chunks: publishes to Redis and writes to client
     */
    const processStreamChunks = async (
      uiStream: ReturnType<
        typeof streamText
      >["toUIMessageStream"] extends () => infer R
        ? R
        : never,
      writer: Parameters<
        Parameters<typeof createUIMessageStream>[0]["execute"]
      >[0]["writer"]
    ): Promise<void> => {
      let writerActive = true;

      for await (const chunk of uiStream) {
        // Always publish to Redis (for other clients/resume)
        await publishStreamChunk(streamId, {
          type: (chunk as { type?: string }).type ?? "unknown",
          data: chunk,
          index: chunkIndex,
        });
        chunkIndex += 1;

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
        `[Stream ${streamId}] Finished processing ${chunkIndex} chunks`
      );
    };

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        try {
          // Start title generation in parallel (if first message, skip if editing)
          const titlePromise =
            isFirstMessage && !editMessageId
              ? generateAndPublishTitle(writer)
              : Promise.resolve();

          const result = streamText({
            model: openrouter.chat(modelWithSearch),
            messages: convertToModelMessages(allMessages),
            system:
              "You are a helpful assistant that can answer questions and help with tasks",
            abortSignal: abortController.signal, // Our controller, not req.signal
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
          await processStreamChunks(uiStream, writer);

          // Wait for title generation - keeps stream open until title is written
          await titlePromise;

          // Stream completed successfully - manually save messages
          // (onFinish may not fire if client disconnected)
          console.log(
            `[Stream ${streamId}] Stream completed, saving messages manually`
          );
          try {
            // Reconstruct assistant message from Redis chunks
            const chunks = await getBufferedChunks(streamId);
            if (chunks.length > 0) {
              // Use the same function we use for partial saves
              await savePartialAssistantMessage(id, chunks);
              console.log(
                `[Stream ${streamId}] Messages saved to DB from Redis chunks`
              );
            } else {
              console.warn(
                `[Stream ${streamId}] No chunks found in Redis to save`
              );
            }
            await updateActiveStreamId(id, null);
            await setStreamStatus(streamId, "complete");
            unregisterStream(streamId);
            console.log(`[Stream ${streamId}] Stream marked as complete`);
          } catch (saveError) {
            console.error(
              `[Stream ${streamId}] Error saving messages:`,
              saveError
            );
            await setStreamStatus(streamId, "error");
            // Don't throw - stream already completed, just log the error
          }
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") {
            // User stopped the stream - status already set to "aborted" by stop handler
            // Partial message will be saved by stop handler
            await setStreamStatus(streamId, "aborted");
          } else {
            // Other error
            await setStreamStatus(streamId, "error");
            throw err;
          }
        }
      },
      originalMessages: allMessages,
      generateId: () => Bun.randomUUIDv7(),
      onFinish: async ({ messages: finalMessages }) => {
        // This may not fire if client disconnected, so we also save manually in execute
        console.log(
          `[Stream ${streamId}] onFinish called with ${finalMessages.length} messages`
        );
        try {
          // Save all messages (upsert handles both new and updated)
          const lastMessageId = finalMessages.at(-1)?.id;
          await saveChatMessages(id, finalMessages, {
            // Add model info to the last assistant message
            ...(lastMessageId ? { [lastMessageId]: { model } } : {}),
          });
          console.log(`[Stream ${streamId}] Messages saved to DB via onFinish`);
          await updateActiveStreamId(id, null);
          await setStreamStatus(streamId, "complete");
          unregisterStream(streamId);
        } catch (error) {
          console.error(`[Stream ${streamId}] Error in onFinish:`, error);
          await setStreamStatus(streamId, "error");
          // Don't throw - this is a callback
        }
      },
    });

    return createUIMessageStreamResponse({ stream });
  },
};
