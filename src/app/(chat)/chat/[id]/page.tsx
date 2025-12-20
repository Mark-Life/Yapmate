import { notFound } from "next/navigation";
import { Chat } from "@/components/chat";
import { getChat, loadChatMessages } from "@/lib/chat-store";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ChatPage({ params }: PageProps) {
  const { id } = await params;

  // Verify chat exists
  const chat = await getChat(id);
  if (!chat) {
    notFound();
  }

  // Load messages from database
  const messages = await loadChatMessages(id);

  return <Chat id={id} initialMessages={messages} key={id} />;
}
