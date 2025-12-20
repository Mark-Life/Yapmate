import { NextResponse } from "next/server";
import {
  createChat,
  deleteChat,
  getChat,
  getUserChats,
} from "@/lib/chat-store";
import { getCurrentUserId } from "@/lib/supabase/server";

/**
 * GET /api/chats - Returns all chats for current user
 */
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chats = await getUserChats(userId);
  return NextResponse.json(chats);
}

type CreateChatBody = {
  id: string;
  title: string;
};

/**
 * POST /api/chats - Creates a new chat
 */
export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, title }: CreateChatBody = await req.json();

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const chatId = await createChat(userId, title, id);
  return NextResponse.json({ id: chatId });
}

/**
 * DELETE /api/chats - Deletes a chat
 */
export async function DELETE(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const chatId = searchParams.get("id");

  if (!chatId) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  // Verify chat exists and belongs to user
  const chat = await getChat(chatId);
  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }
  if (chat.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await deleteChat(chatId);
  return NextResponse.json({ success: true });
}
