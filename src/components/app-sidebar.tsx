"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

type Chat = {
  id: string;
  title: string | null;
  updatedAt: Date | null;
};

type AppSidebarProps = {
  chats: Chat[];
};

/**
 * App sidebar with chat history and new chat button
 */
export const AppSidebar = ({ chats }: AppSidebarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const currentChatId = pathname.startsWith("/chat/")
    ? pathname.split("/chat/")[1]
    : null;

  /**
   * Navigate to new chat with unique timestamp to force component remount
   */
  const handleNewChat = useCallback(() => {
    router.push(`/?new=${Date.now()}`);
  }, [router]);

  return (
    <Sidebar>
      <SidebarHeader className="border-sidebar-border border-b">
        <Button className="w-full gap-2" onClick={handleNewChat}>
          New Chat
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {/* <SidebarGroupLabel>Chats</SidebarGroupLabel> */}
          <SidebarGroupContent>
            <SidebarMenu>
              {chats.map((chat) => (
                <SidebarMenuItem key={chat.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={chat.id === currentChatId}
                    tooltip={chat.id}
                  >
                    <Link href={`/chat/${chat.id}`}>
                      <span className="truncate text-sm">
                        {chat.title ?? "New chat"}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {chats.length === 0 && (
                <div className="px-2 py-4 text-center text-muted-foreground text-sm">
                  No chats yet
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
};
