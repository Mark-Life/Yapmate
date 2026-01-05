import { ORPCError } from "@orpc/server";
import {
  getChat,
  loadChatMessages,
} from "@yapmate/server/routes/api/chat/store";
import { protectedProcedure } from "../middleware";
import {
  listBatchMessagesInputSchema,
  listMessagesInputSchema,
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
      // Verify chat exists and belongs to user
      const chat = await getChat(input.chatId);
      if (!chat) {
        throw new ORPCError("NOT_FOUND", {
          message: "Chat not found",
        });
      }
      if (chat.userId !== context.userId) {
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
          // Verify chat exists and belongs to user
          const chat = await getChat(chatId);
          if (!chat || chat.userId !== context.userId) {
            // Skip chats that don't exist or don't belong to user
            return;
          }

          // Load messages
          const messageList = await loadChatMessages(context.req, chatId);
          results[chatId] = messageList;
        })
      );

      return results;
    }),
};
