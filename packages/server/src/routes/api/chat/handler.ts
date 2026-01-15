/**
 * Main chat API handler
 * Orchestrates message processing, file handling, and streaming
 */

import {
  canAccessChat,
  checkGenerationLimit,
  getUserRulesByIds,
  saveMessage as saveMessageService,
  updateActiveStreamId,
  uploadFilesInBackground,
} from "@yapmate/db/service";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { setChatToolSelections } from "../../../lib/mcp";
import { registerStream } from "../../../lib/redis/controller";
import { setStreamStatus } from "../../../lib/redis/stream";
import { getCurrentUserId } from "../../../lib/supabase";
import { publishChatEvent, publishUserEvent } from "../../../lib/websocket";
import type { ReasoningEffort } from "./ai-response";
import { processMessageFiles } from "./files";
import { handleEdit, handleRegeneration } from "./messages";
import { getChat, loadChatMessages } from "./store";
import {
  executeAiResponseWithOrchestration,
  handleStreamError,
  handleStreamFinish,
} from "./stream";

export const chatHandler = {
  // TODO: fix me later - complex function
  async POST(req: Request) {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const {
      message,
      model,
      searchEnabled,
      memoryEnabled,
      reasoningEffort,
      selectedMcpTools,
      selectedRuleIds,
      id,
      regenerateMessageId,
      regenerateRole,
      editMessageId,
      editedText,
    }: {
      message: UIMessage;
      model: string;
      searchEnabled?: boolean;
      memoryEnabled?: boolean;
      reasoningEffort?: ReasoningEffort;
      selectedMcpTools?: Array<{ mcpServerId: string; toolName: string }>;
      selectedRuleIds?: string[];
      id: string;
      regenerateMessageId?: string;
      regenerateRole?: "user" | "assistant";
      editMessageId?: string;
      editedText?: string;
    } = await req.json();

    if (!id) {
      return new Response("Chat ID is required", { status: 400 });
    }

    // Verify chat exists and user has access (owner or member)
    const chat = await getChat(id);
    if (!chat) {
      return new Response("Chat not found", { status: 404 });
    }
    const hasAccess = await canAccessChat(id, userId);
    if (!hasAccess) {
      return new Response("Forbidden", { status: 403 });
    }

    // Check generation limit - applies to all operations (new messages, regeneration, edit)
    // All operations consume LLM tokens and should be rate-limited
    const { allowed, count, limit } = await checkGenerationLimit(userId);
    if (!allowed) {
      // Rate limit exceeded - return 402 and stop processing
      return new Response(
        JSON.stringify({
          error: "generation_limit_exceeded",
          count,
          limit,
        }),
        {
          status: 402,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    let fileRecords: Awaited<
      ReturnType<typeof processMessageFiles>
    >["fileRecords"] = [];
    let isFirstMessage = false;

    // Check if this is a follow-up request for tool approval (not a new user message)
    // This happens when useChat's sendAutomaticallyWhen triggers after approval
    // The message could be:
    // 1. An assistant message with tool parts containing approval info
    // 2. A message with tool-approval-response type parts
    const isAssistantMessage = message.role === "assistant";
    const hasToolApprovalResponse =
      Array.isArray(message.parts) &&
      message.parts.some((part) => {
        // Direct tool-approval-response type
        if (part.type === "tool-approval-response") {
          return true;
        }
        // Tool part with approval response (approval.approved is set)
        if (
          typeof part === "object" &&
          part !== null &&
          "approval" in part &&
          part.approval &&
          typeof part.approval === "object" &&
          "approved" in part.approval
        ) {
          return true;
        }
        return false;
      });

    // Skip saving if this is a tool approval follow-up (assistant message with approval)
    const isToolApprovalFollowUp =
      isAssistantMessage || hasToolApprovalResponse;

    // Handle edit: update message text and delete stale messages
    if (editMessageId && editedText) {
      await handleEdit(req, id, editMessageId, editedText);
    } else if (!isToolApprovalFollowUp) {
      // Process file parts and create file records (only if not editing and not tool approval)
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

      // Save message with file IDs, model, and userId (for multi-user chat attribution)
      await saveMessageService(id, message, messageOrder, {
        fileIdMap: fileIdByPartIndex,
        model,
        userId,
      });

      // Save MCP tool selections on first message (syncs client state to DB)
      if (isFirstMessage && selectedMcpTools && selectedMcpTools.length > 0) {
        await setChatToolSelections(
          id,
          selectedMcpTools.map((t) => ({
            mcpServerId: t.mcpServerId,
            toolName: t.toolName,
            enabled: true,
          }))
        );
      }

      // Trigger background upload (non-blocking)
      if (fileRecords.length > 0) {
        uploadFilesInBackground(req, fileRecords, id);
      }
    }

    // Load all messages from DB
    const dbMessages = await loadChatMessages(req, id);

    // For tool approval follow-ups, replace the matching assistant message with the one containing approval
    // This ensures the approval response is included when calling the LLM
    let allMessages: UIMessage[] = dbMessages;
    if (isToolApprovalFollowUp && message.id) {
      // Find and replace the message with matching ID (to include approval info)
      const messageIndex = dbMessages.findIndex((m) => m.id === message.id);
      if (messageIndex !== -1) {
        allMessages = [...dbMessages];
        allMessages[messageIndex] = message as UIMessage;
      } else {
        // If not found, append it (might be a tool message not in DB)
        allMessages = [...dbMessages, message as UIMessage];
      }
    }

    const modelWithSearch = searchEnabled ? `${model}:online` : model;

    // Generate stream ID and assistant message ID upfront
    // Assistant message ID is used as Langfuse trace ID for feedback linking
    const streamId = Bun.randomUUIDv7();
    const assistantMessageId = Bun.randomUUIDv7();
    const abortController = registerStream(streamId);

    // Mark stream as active in DB and Redis
    await updateActiveStreamId(id, streamId);
    await setStreamStatus(streamId, "streaming");

    // Publish stream_started event for real-time sync
    await publishUserEvent(userId, {
      type: "stream_started",
      chatId: id,
      hasActiveStream: true,
    });

    // Also publish to chat channel for multi-user chats
    // This allows other members viewing the chat to see the stream in real-time
    if (chat.isMultiUser) {
      await publishChatEvent(id, {
        type: "stream_started",
        chatId: id,
        hasActiveStream: true,
      });
    }

    const chunkIndex = { current: 0 };
    const userMessage =
      message.parts.find((p) => p.type === "text")?.text || "";

    // Fetch user rules if selected
    const userRules =
      selectedRuleIds && selectedRuleIds.length > 0
        ? await getUserRulesByIds(userId, selectedRuleIds)
        : [];

    // Store usage data to pass to onFinish
    let streamUsage: Awaited<
      ReturnType<typeof executeAiResponseWithOrchestration>
    > = null;

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        try {
          streamUsage = await executeAiResponseWithOrchestration({
            modelWithSearch,
            memoryEnabled,
            reasoningEffort,
            selectedMcpTools,
            userRules: userRules.map((r) => ({
              title: r.title,
              content: r.content,
            })),
            messages: allMessages,
            abortSignal: abortController.signal,
            chatId: id,
            streamId,
            assistantMessageId,
            userId,
            isFirstMessage,
            editMessageId,
            userMessage,
            writer,
            chunkIndex,
            isMultiUser: chat.isMultiUser,
          });
        } catch (err) {
          await handleStreamError(streamId, id, err);
        }
      },
      originalMessages: allMessages,
      // Use pre-generated assistantMessageId for the assistant message
      // This ensures message.id === Langfuse traceId for feedback linking
      generateId: () => assistantMessageId,
      onFinish: async ({ messages: finalMessages }) => {
        await handleStreamFinish({
          streamId,
          chatId: id,
          model,
          finalMessages,
          usage: streamUsage,
          userId,
        });
      },
    });

    return createUIMessageStreamResponse({ stream });
  },
};
