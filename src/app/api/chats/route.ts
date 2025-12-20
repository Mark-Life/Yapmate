import { NextResponse } from "next/server";
import { getUserChats, createChat } from "@/lib/chat-store";

/**
 * GET /api/chats - Returns all chats for current user
 */
export async function GET() {
  const chats = await getUserChats();
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
  const { id, title }: CreateChatBody = await req.json();

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const chatId = await createChat(title, id);
  return NextResponse.json({ id: chatId });
}
