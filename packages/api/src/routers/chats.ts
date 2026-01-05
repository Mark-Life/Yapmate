import { ORPCError } from "@orpc/server";
import { publishUserEvent } from "@yapmate/server/lib/websocket";
import {
  createChat,
  deleteChat,
  getChat,
  getUserChatsWithLastModel,
  updateChatTitle,
} from "@yapmate/server/routes/api/chat/store";
import { protectedProcedure } from "../middleware";
import {
  createChatInputSchema,
  deleteChatInputSchema,
  updateChatInputSchema,
} from "../schemas/chats";

/**
 * Chats router - CRUD operations for chat sessions
 */
export const chats = {
  /**
   * List all chats for the current user (includes lastUsedModel)
   */
  list: protectedProcedure.handler(
    async ({ context }) => await getUserChatsWithLastModel(context.userId)
  ),

  /**
   * Create a new chat
   */
  create: protectedProcedure
    .input(createChatInputSchema)
    .handler(async ({ input, context }) => {
      const chatId = await createChat(
        context.userId,
        input.title ?? undefined,
        input.id
      );

      // Publish chat_created event for real-time sync
      await publishUserEvent(context.userId, {
        type: "chat_created",
        chatId,
      });

      return { id: chatId };
    }),

  /**
   * Update chat title
   */
  update: protectedProcedure
    .input(updateChatInputSchema)
    .handler(async ({ input, context }) => {
      // Verify chat exists and belongs to user
      const chat = await getChat(input.id);
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

      await updateChatTitle(input.id, input.title);
      return { success: true };
    }),

  /**
   * Delete a chat
   */
  delete: protectedProcedure
    .input(deleteChatInputSchema)
    .handler(async ({ input, context }) => {
      // Verify chat exists and belongs to user
      const chat = await getChat(input.id);
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

      await deleteChat(input.id);
      return { success: true };
    }),
};
