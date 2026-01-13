import { ORPCError } from "@orpc/server";
import { abortStreamAtomic, getChat } from "@yapmate/db/service";
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
   *
   * IMPORTANT: This handler uses an atomic transaction to save partial message
   * and clear stream state together. This prevents data corruption if any step fails:
   * - Either partial message is saved AND stream is cleared
   * - Or the entire operation is rolled back
   *
   * Redis status is updated AFTER the DB transaction commits to ensure consistency.
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
        // Get buffered chunks before they expire
        const chunks = await getBufferedChunks(streamId);

        // ATOMIC: Save partial message + clear activeStreamId in single transaction
        // This prevents partial state where message is saved but stream ID isn't cleared
        await abortStreamAtomic(input.chatId, chunks);

        // Only update Redis status AFTER DB transaction commits successfully
        // This ensures Redis reflects the true DB state
        await setStreamStatus(streamId, "aborted");
      }

      return { stopped: wasAborted };
    }),
};
