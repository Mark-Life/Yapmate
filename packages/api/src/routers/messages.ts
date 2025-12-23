import { ORPCError } from "@orpc/server";
import {
  getChat,
  loadChatMessages,
} from "@yapmate/server/routes/api/chat/store";
import { protectedProcedure } from "../middleware";
import { listMessagesInputSchema } from "../schemas/messages";

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
};
