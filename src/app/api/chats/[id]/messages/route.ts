import { NextResponse } from "next/server";
import { getChat, loadChatMessages } from "@/lib/chat-store";
import { getCurrentUserId } from "@/lib/supabase/server";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/chats/:id/messages - Returns all messages for a chat
 */
export async function GET(_req: Request, { params }: RouteParams) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify chat exists and belongs to user
  const chat = await getChat(id);
  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }
  if (chat.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Load messages
  const messages = await loadChatMessages(id);
  return NextResponse.json(messages);
}
