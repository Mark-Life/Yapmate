/**
 * Stop stream API route handler
 * Handles POST for /api/chat/stop
 */

import { getChat, updateActiveStreamId } from "@/server/lib/db/service/chats";
import { savePartialAssistantMessage } from "@/server/lib/db/service/messages";
import { abortStream } from "@/server/lib/redis/controller";
import { getBufferedChunks, setStreamStatus } from "@/server/lib/redis/stream";
import { getCurrentUserId } from "@/server/lib/supabase";

export const stopHandler = {
  async POST(req: Request) {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { chatId }: { chatId: string } = await req.json();

    const chat = await getChat(chatId);
    if (!chat || chat.userId !== userId) {
      return new Response("Forbidden", { status: 403 });
    }

    if (!chat.activeStreamId) {
      return Response.json({ stopped: false, reason: "no_active_stream" });
    }

    const streamId = chat.activeStreamId;
    const wasAborted = abortStream(streamId);

    if (wasAborted) {
      await setStreamStatus(streamId, "aborted");
      await updateActiveStreamId(chatId, null);

      // Save partial message to DB
      const chunks = await getBufferedChunks(streamId);
      if (chunks.length > 0) {
        await savePartialAssistantMessage(chatId, chunks);
      }
    }

    return Response.json({ stopped: wasAborted });
  },
};
