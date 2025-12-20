"use client";

import { useQuery } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

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
 * Header controls - sidebar trigger + new chat button when collapsed
 */
const HeaderControls = () => {
  const { open } = useSidebar();
  const router = useRouter();

  const handleNewChat = () => {
    router.push(`/?new=${Date.now()}`);
  };

  return (
    <div className="absolute top-3 left-3 z-10 flex items-center gap-1">
      <SidebarTrigger />
      {!open && (
        <Button onClick={handleNewChat} size="icon" variant="ghost">
          <PlusIcon className="size-4" />
          <span className="sr-only">New Chat</span>
        </Button>
      )}
    </div>
  );
};

/**
 * Fetches user's chats from API and parses dates
 */
const fetchChats = async (): Promise<Chat[]> => {
  const res = await fetch("/api/chats");
  if (!res.ok) {
    throw new Error("Failed to fetch chats");
  }
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
        <HeaderControls />
        <main className="flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
