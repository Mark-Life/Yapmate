import { notFound } from "next/navigation";
import { Chat } from "@/components/chat";
import { getChat, loadChatMessages } from "@/lib/chat-store";
import { getCurrentUserId } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ChatPage({ params }: PageProps) {
  const userId = await getCurrentUserId();
  if (!userId) {
    notFound();
  }

  const { id } = await params;

  // Verify chat exists and belongs to user
  const chat = await getChat(id);
  if (!chat || chat.userId !== userId) {
    notFound();
  }

  // Load messages from database
  const messages = await loadChatMessages(id);

  return <Chat id={id} initialMessages={messages} key={id} />;
}
