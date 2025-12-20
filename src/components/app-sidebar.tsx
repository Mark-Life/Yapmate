"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOutIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/client";

type Chat = {
  id: string;
  title: string | null;
  updatedAt: Date | null;
};

type AppSidebarProps = {
  chats: Chat[];
};

type User = {
  email: string | undefined;
};

/**
 * App sidebar with chat history and new chat button
 */
export const AppSidebar = ({ chats }: AppSidebarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const currentChatId = pathname.startsWith("/chat/")
    ? pathname.split("/chat/")[1]
    : null;

  /**
   * Fetch current user from Supabase
   */
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (authUser) {
        setUser({ email: authUser.email });
      }
    };
    fetchUser();
  }, []);

  /**
   * Handle logout
   */
  const handleLogout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut({ scope: "local" });
    router.push("/login");
  }, [router]);

  /**
   * Navigate to new chat with unique timestamp to force component remount
   */
  const openNewChat = useCallback(() => {
    router.push("/");
  }, [router]);

  /**
   * Delete chat mutation
   */
  const deleteChatMutation = useMutation({
    mutationFn: async (chatId: string) => {
      const res = await fetch(`/api/chats?id=${chatId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error ?? "Failed to delete chat");
      }
    },
    onSuccess: (_, deletedChatId) => {
      // Invalidate chats query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      // Navigate away if deleted chat was active
      if (deletedChatId === currentChatId) {
        router.push("/");
      }
      setChatToDelete(null);
    },
  });

  /**
   * Handle delete confirmation
   */
  const handleDeleteConfirm = useCallback(() => {
    if (chatToDelete) {
      deleteChatMutation.mutate(chatToDelete);
    }
  }, [chatToDelete, deleteChatMutation]);

  return (
    <Sidebar>
      <SidebarHeader className="border-sidebar-border border-b">
        <Button
          className="w-full gap-2 border border-primary/15 bg-primary/5 text-primary hover:bg-primary/10"
          onClick={openNewChat}
        >
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
                  <div className="relative flex w-full items-center gap-1">
                    <SidebarMenuButton
                      asChild
                      className="flex-1 pr-8"
                      isActive={chat.id === currentChatId}
                      tooltip={chat.id}
                    >
                      <Link href={`/chat/${chat.id}`}>
                        <span className="truncate text-sm">
                          {chat.title ?? "New chat"}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                    <Button
                      className="absolute right-1 size-6 shrink-0 opacity-0 transition-opacity group-hover/menu-item:opacity-100"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setChatToDelete(chat.id);
                      }}
                      size="icon"
                      variant="ghost"
                    >
                      <XIcon className="size-3" />
                      <span className="sr-only">Delete chat</span>
                    </Button>
                  </div>
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
      {user ? (
        <SidebarFooter className="border-sidebar-border border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="w-full justify-start gap-2 px-2"
                variant="ghost"
              >
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {user.email?.[0]?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-sm">{user.email ?? "User"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleLogout}
              >
                <LogOutIcon className="size-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      ) : null}
      <SidebarRail />
      <AlertDialog
        onOpenChange={(open) => !open && setChatToDelete(null)}
        open={chatToDelete !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              chat and all its messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteChatMutation.isPending}
              onClick={handleDeleteConfirm}
            >
              {deleteChatMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
};
