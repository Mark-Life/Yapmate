import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOutIcon, PencilIcon, TrashIcon } from "lucide-react";
import { useCallback, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/client/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/client/components/ui/avatar";
import { Button } from "@/client/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/client/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import { Input } from "@/client/components/ui/input";
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
} from "@/client/components/ui/sidebar";
import { Skeleton } from "@/client/components/ui/skeleton";
import { useChatContext } from "@/client/contexts/chat-context";
import { useUser } from "@/client/contexts/user-context";
import { createClient } from "@/client/lib/supabase/client";

type Chat = {
  id: string;
  title: string | null;
  updatedAt: Date | null;
};

type AppSidebarProps = {
  chats: Chat[];
  isLoading?: boolean;
  onPrefetch?: (chatId: string) => void;
};

/**
 * Skeleton loader for chat list items
 */
const ChatListSkeleton = () => {
  const skeletonKeys = ["skeleton-0", "skeleton-1", "skeleton-2", "skeleton-3"];
  return (
    <>
      {skeletonKeys.map((key) => (
        <SidebarMenuItem key={key}>
          <Skeleton className="h-10 w-full" />
        </SidebarMenuItem>
      ))}
    </>
  );
};

/**
 * App sidebar with chat history and new chat button
 */
export const AppSidebar = ({
  chats,
  isLoading,
  onPrefetch,
}: AppSidebarProps) => {
  const queryClient = useQueryClient();
  const { currentChatId, navigateToChat, navigateToNew } = useChatContext();
  const { user } = useUser();
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [chatToRename, setChatToRename] = useState<{
    id: string;
    currentTitle: string;
  } | null>(null);
  const [renameInput, setRenameInput] = useState("");

  /**
   * Handle logout
   */
  const handleLogout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut({ scope: "local" });
    // Use window.location for full page navigation to ensure auth state is cleared
    window.location.href = "/login";
  }, []);

  /**
   * Navigate to new chat
   */
  const openNewChat = useCallback(() => {
    navigateToNew();
  }, [navigateToNew]);

  /**
   * Rename chat mutation
   */
  const renameChatMutation = useMutation({
    mutationFn: async ({
      chatId,
      title,
    }: {
      chatId: string;
      title: string;
    }) => {
      const res = await fetch(`/api/chats?id=${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error ?? "Failed to rename chat");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      setChatToRename(null);
      setRenameInput("");
    },
  });

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
        navigateToNew();
      }
      setChatToDelete(null);
    },
  });

  /**
   * Handle rename dialog open
   */
  const handleRenameClick = useCallback(
    (chatId: string, currentTitle: string | null) => {
      setChatToRename({ id: chatId, currentTitle: currentTitle ?? "" });
      setRenameInput(currentTitle ?? "");
    },
    []
  );

  /**
   * Handle rename confirmation
   */
  const handleRenameConfirm = useCallback(() => {
    if (chatToRename && renameInput.trim()) {
      renameChatMutation.mutate({
        chatId: chatToRename.id,
        title: renameInput.trim(),
      });
    }
  }, [chatToRename, renameInput, renameChatMutation]);

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
              {isLoading ? (
                <ChatListSkeleton />
              ) : (
                <>
                  {chats.map((chat) => (
                    <SidebarMenuItem key={chat.id}>
                      <ContextMenu>
                        <ContextMenuTrigger asChild>
                          <div className="w-full">
                            <SidebarMenuButton
                              className="w-full"
                              isActive={chat.id === currentChatId}
                              onClick={() => navigateToChat(chat.id)}
                              onMouseEnter={() => onPrefetch?.(chat.id)}
                              tooltip={chat.id}
                            >
                              <span className="truncate text-sm">
                                {chat.title ?? "New chat"}
                              </span>
                            </SidebarMenuButton>
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem
                            onClick={() =>
                              handleRenameClick(chat.id, chat.title)
                            }
                          >
                            <PencilIcon className="size-4" />
                            Rename
                          </ContextMenuItem>
                          <ContextMenuItem
                            onClick={() => setChatToDelete(chat.id)}
                            variant="destructive"
                          >
                            <TrashIcon className="size-4" />
                            Delete
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    </SidebarMenuItem>
                  ))}
                  {chats.length === 0 && (
                    <div className="px-2 py-4 text-center text-muted-foreground text-sm">
                      No chats yet
                    </div>
                  )}
                </>
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
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setChatToRename(null);
            setRenameInput("");
          }
        }}
        open={chatToRename !== null}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
            <DialogDescription>
              Enter a new name for this chat.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              autoFocus
              onChange={(e) => setRenameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleRenameConfirm();
                }
                if (e.key === "Escape") {
                  setChatToRename(null);
                  setRenameInput("");
                }
              }}
              placeholder="Chat name"
              value={renameInput}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setChatToRename(null);
                setRenameInput("");
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={
                !renameInput.trim() ||
                renameInput.trim() === chatToRename?.currentTitle ||
                renameChatMutation.isPending
              }
              onClick={handleRenameConfirm}
            >
              {renameChatMutation.isPending ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
