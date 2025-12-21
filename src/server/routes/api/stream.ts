/**
 * Stream resume API route handler
 * Handles GET for /api/chat/:id/stream
 */
import { getChat } from "@/server/lib/db/service/chats";
import {
  getBufferedChunks,
  getStreamStatus,
  subscribeToStream,
} from "@/server/lib/redis/stream";
import { getCurrentUserId } from "@/server/lib/supabase";

export const streamResumeHandler = {
  async GET(req: Request & { params: { id: string } }) {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id } = req.params;

    const chat = await getChat(id);
    if (!chat || chat.userId !== userId) {
      return new Response("Forbidden", { status: 403 });
    }

    if (!chat.activeStreamId) {
      return new Response(null, { status: 204 }); // No active stream
    }

    const streamId = chat.activeStreamId;
    const status = await getStreamStatus(streamId);

    if (status !== "streaming") {
      return new Response(null, { status: 204 });
    }

    // Use async generator for SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        let isClosed = false;
        let unsubscribe: (() => Promise<void>) | null = null;

        const safeEnqueue = (data: string) => {
          if (!isClosed) {
            try {
              controller.enqueue(new TextEncoder().encode(data));
            } catch {
              // Controller might be closed by client disconnect
              isClosed = true;
              if (unsubscribe) {
                unsubscribe().catch(console.error);
              }
            }
          }
        };

        try {
          // 1. Send buffered chunks
          const buffered = await getBufferedChunks(streamId);
          for (const chunk of buffered) {
            const data = `data: ${JSON.stringify(chunk.data)}\n\n`;
            safeEnqueue(data);
          }

          // 2. Subscribe to new chunks
          let lastIndex = buffered.length;
          unsubscribe = await subscribeToStream(streamId, (chunk) => {
            if (!isClosed && chunk.index >= lastIndex) {
              const data = `data: ${JSON.stringify(chunk.data)}\n\n`;
              safeEnqueue(data);
              lastIndex = chunk.index + 1;
            }
          });

          // 3. Poll for completion
          const checkComplete = async () => {
            while (!isClosed) {
              const currentStatus = await getStreamStatus(streamId);
              if (currentStatus !== "streaming") {
                isClosed = true;
                if (unsubscribe) {
                  await unsubscribe();
                }
                controller.close();
                return;
              }
              await Bun.sleep(500);
            }
          };

          await checkComplete();
        } catch (error) {
          isClosed = true;
          if (unsubscribe) {
            await unsubscribe().catch(console.error);
          }
          try {
            controller.error(error);
          } catch {
            // Controller already closed
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  },
};
