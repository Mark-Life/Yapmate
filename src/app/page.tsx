import { redirect } from "next/navigation";
import { createChat } from "@/lib/chat-store";
import { Chat } from "@/components/chat";

type PageProps = {
  searchParams: Promise<{ chatId?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { chatId } = await searchParams;
  
  if (!chatId) {
    const id = await createChat();
    redirect(`/?chatId=${id}`);
  }
  
  // TODO: When implementing persistence, load messages from database here
  return <Chat id={chatId} initialMessages={[]} />;
}
