"use client";

import { useQuery } from "@tanstack/react-query";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

type ChatLayoutProps = {
  children: React.ReactNode;
};

type ChatApiResponse = {
  id: string;
  title: string | null;
  updatedAt: string | null;
};

type Chat = {
  id: string;
  title: string | null;
  updatedAt: Date | null;
};

/**
 * Fetches user's chats from API and parses dates
 */
const fetchChats = async (): Promise<Chat[]> => {
  const res = await fetch("/api/chats");
  if (!res.ok) throw new Error("Failed to fetch chats");
  const data: ChatApiResponse[] = await res.json();
  return data.map((chat) => ({
    ...chat,
    updatedAt: chat.updatedAt ? new Date(chat.updatedAt) : null,
  }));
};

/**
 * Layout for chat pages - includes sidebar with chat history
 */
export default function ChatLayout({ children }: ChatLayoutProps) {
  const { data: chats = [] } = useQuery({
    queryKey: ["chats"],
    queryFn: fetchChats,
  });

  return (
    <SidebarProvider>
      <AppSidebar chats={chats} />
      <SidebarInset>
        <main className="flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
