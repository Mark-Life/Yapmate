import { NextResponse } from "next/server";
import { createChat, getUserChats } from "@/lib/chat-store";
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
