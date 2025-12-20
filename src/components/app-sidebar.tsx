"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

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
  const pathname = usePathname();
  const currentChatId = pathname.startsWith("/chat/")
    ? pathname.split("/chat/")[1]
    : null;

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <Button asChild className="w-full gap-2">
          <Link href="/">
            New Chat
          </Link>
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Chats</SidebarGroupLabel>
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
                      <span className="truncate font-mono text-xs">
                        {chat.id}
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

