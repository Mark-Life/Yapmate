/**
 * Chat API route handlers
 * Handles GET, POST, DELETE for /api/chats
 */
import {
  createChat,
  deleteChat,
  getChat,
  getUserChats,
} from "@/lib/chat-store";
import { getCurrentUserId } from "../../lib/supabase";

type CreateChatBody = {
  id: string;
  title?: string;
};

export const chatsHandler = {
  async GET(req: Request) {
    try {
      const userId = await getCurrentUserId(req);
      if (!userId) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const chats = await getUserChats(userId);
      return Response.json(chats);
    } catch (error) {
      console.error("Error in GET /api/chats:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  },

  async POST(req: Request) {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, title }: CreateChatBody = await req.json();

    if (!id) {
      return Response.json({ error: "id is required" }, { status: 400 });
    }

    const chatId = await createChat(userId, title, id);
    return Response.json({ id: chatId });
  },

  async DELETE(req: Request) {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const chatId = url.searchParams.get("id");

    if (!chatId) {
      return Response.json({ error: "id is required" }, { status: 400 });
    }

    // Verify chat exists and belongs to user
    const chat = await getChat(chatId);
    if (!chat) {
      return Response.json({ error: "Chat not found" }, { status: 404 });
    }
    if (chat.userId !== userId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    await deleteChat(chatId);
    return Response.json({ success: true });
  },
};
