/**
 * Main chat API handler
 * Orchestrates message processing, file handling, and streaming
 */

import {
  saveMessage as saveMessageService,
  updateActiveStreamId,
  uploadFilesInBackground,
} from "@yapmate/db/service";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { registerStream } from "../../../lib/redis/controller";
import { setStreamStatus } from "../../../lib/redis/stream";
import { getCurrentUserId } from "../../../lib/supabase";
import { processMessageFiles } from "./files";
import { handleEdit, handleRegeneration } from "./messages";
import { getChat, loadChatMessages } from "./store";
import { executeStream, handleStreamError, handleStreamFinish } from "./stream";

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

    let fileRecords: Awaited<
      ReturnType<typeof processMessageFiles>
    >["fileRecords"] = [];
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

      // Save message with file IDs and model (model selected when user sent the message)
      await saveMessageService(id, message, messageOrder, {
        fileIdMap: fileIdByPartIndex,
        model,
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

    const chunkIndex = { current: 0 };
    const userMessage =
      message.parts.find((p) => p.type === "text")?.text || "";

    // Store usage data to pass to onFinish
    let streamUsage: Awaited<ReturnType<typeof executeStream>> = null;

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        try {
          streamUsage = await executeStream({
            modelWithSearch,
            allMessages,
            abortSignal: abortController.signal,
            chatId: id,
            streamId,
            userId,
            isFirstMessage,
            editMessageId,
            userMessage,
            writer,
            chunkIndex,
          });
        } catch (err) {
          await handleStreamError(streamId, id, err);
        }
      },
      originalMessages: allMessages,
      generateId: () => Bun.randomUUIDv7(),
      onFinish: async ({ messages: finalMessages }) => {
        await handleStreamFinish({
          streamId,
          chatId: id,
          model,
          finalMessages,
          usage: streamUsage,
        });
      },
    });

    return createUIMessageStreamResponse({ stream });
  },
};
