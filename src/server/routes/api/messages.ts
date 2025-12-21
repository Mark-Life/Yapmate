/**
 * Messages API route handler
 * Handles GET for /api/chats/:id/messages
 */
import { getChat, loadChatMessages } from "@/lib/chat-store";
import { getCurrentUserId } from "../../lib/supabase";

export const messagesHandler = {
  async GET(req: Request & { params: { id: string } }) {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = req.params;

    // Verify chat exists and belongs to user
    const chat = await getChat(id);
    if (!chat) {
      return Response.json({ error: "Chat not found" }, { status: 404 });
    }
    if (chat.userId !== userId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Load messages
    const messages = await loadChatMessages(req, id);
    return Response.json(messages);
  },
};
