import { ORPCError } from "@orpc/server";
import {
  getChat,
  savePartialAssistantMessage,
  updateActiveStreamId,
} from "@yapmate/db/service";
import { abortStream } from "@yapmate/server/lib/redis/controller";
import {
  getBufferedChunks,
  setStreamStatus,
} from "@yapmate/server/lib/redis/stream";
import { protectedProcedure } from "../middleware";
import { stopChatInputSchema, stopChatResponseSchema } from "../schemas/chat";

/**
 * Chat router - operations for chat streaming and control
 */
export const chat = {
  /**
   * Stop an active stream for a chat
   */
  stop: protectedProcedure
    .input(stopChatInputSchema)
    .output(stopChatResponseSchema)
    .handler(async ({ input, context }) => {
      const chatRecord = await getChat(input.chatId);
      if (!chatRecord || chatRecord.userId !== context.userId) {
        throw new ORPCError("FORBIDDEN", {
          message: "Forbidden",
        });
      }

      if (!chatRecord.activeStreamId) {
        return { stopped: false, reason: "no_active_stream" };
      }

      const streamId = chatRecord.activeStreamId;
      const wasAborted = abortStream(streamId);

      if (wasAborted) {
        await setStreamStatus(streamId, "aborted");
        await updateActiveStreamId(input.chatId, null);

        // Save partial message to DB
        const chunks = await getBufferedChunks(streamId);
        if (chunks.length > 0) {
          await savePartialAssistantMessage(input.chatId, chunks);
        }
      }

      return { stopped: wasAborted };
    }),
};
