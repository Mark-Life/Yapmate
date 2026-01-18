import { ORPCError } from "@orpc/server";
import { canAccessChat, saveMessages } from "@yapmate/db/service";
import {
  getChat,
  loadChatMessages,
} from "@yapmate/server/routes/api/chat/store";
import type { UIMessage } from "ai";
import { protectedProcedure } from "../middleware";
import {
  listBatchMessagesInputSchema,
  listMessagesInputSchema,
  syncMessagesInputSchema,
} from "../schemas/messages";

/**
 * Messages router - operations for chat messages
 */
export const messages = {
  /**
   * List all messages for a chat
   */
  list: protectedProcedure
    .input(listMessagesInputSchema)
    .handler(async ({ input, context }) => {
      // Verify chat exists and user has access (owner or member)
      const chat = await getChat(input.chatId);
      if (!chat) {
        throw new ORPCError("NOT_FOUND", {
          message: "Chat not found",
        });
      }
      const hasAccess = await canAccessChat(input.chatId, context.userId);
      if (!hasAccess) {
        throw new ORPCError("FORBIDDEN", {
          message: "Forbidden",
        });
      }

      // Load messages (requires Request for file URL generation)
      // Note: We need to pass context.req for cookie access
      const messageList = await loadChatMessages(context.req, input.chatId);
      return messageList;
    }),

  /**
   * List messages for multiple chats in one request
   * Returns a map of chatId -> messages array
   */
  listBatch: protectedProcedure
    .input(listBatchMessagesInputSchema)
    .handler(async ({ input, context }) => {
      const results: Record<
        string,
        Awaited<ReturnType<typeof loadChatMessages>>
      > = {};

      // Fetch messages for each chat in parallel
      await Promise.all(
        input.chatIds.map(async (chatId: string) => {
          // Verify chat exists and user has access (owner or member)
          const chat = await getChat(chatId);
          const hasAccess = chat
            ? await canAccessChat(chatId, context.userId)
            : false;
          if (!(chat && hasAccess)) {
            // Skip chats that don't exist or user doesn't have access to
            return;
          }

          // Load messages
          const messageList = await loadChatMessages(context.req, chatId);
          results[chatId] = messageList;
        })
      );

      return results;
    }),

  /**
   * Sync local (on-device) model messages to the database
   * Used when authenticated users use Apple Foundation Model locally
   */
  sync: protectedProcedure
    .input(syncMessagesInputSchema)
    .handler(async ({ input, context }) => {
      // Verify chat exists and user has access
      const chat = await getChat(input.chatId);
      if (!chat) {
        throw new ORPCError("NOT_FOUND", {
          message: "Chat not found",
        });
      }
      const hasAccess = await canAccessChat(input.chatId, context.userId);
      if (!hasAccess) {
        throw new ORPCError("FORBIDDEN", {
          message: "Forbidden",
        });
      }

      // Build options map with model for each message
      const options: Record<string, { model?: string; userId?: string }> = {};
      for (const msg of input.messages as UIMessage[]) {
        options[msg.id] = {
          model: input.model,
          // Set userId for user messages (for multi-user chat attribution)
          userId: msg.role === "user" ? context.userId : undefined,
        };
      }

      // Save messages with model metadata
      await saveMessages(input.chatId, input.messages as UIMessage[], options);

      return { success: true };
    }),
};
