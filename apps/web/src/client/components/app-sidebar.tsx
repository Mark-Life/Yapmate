import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@yapmate/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@yapmate/components/ui/avatar";
import { Button } from "@yapmate/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@yapmate/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@yapmate/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@yapmate/components/ui/dropdown-menu";
import { Input } from "@yapmate/components/ui/input";
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
} from "@yapmate/components/ui/sidebar";
import { Skeleton } from "@yapmate/components/ui/skeleton";
import { UsageBadge } from "@yapmate/components/ui/usage-badge";
import {
  CreditCardIcon,
  LogOutIcon,
  PencilIcon,
  TrashIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useChatContext } from "../contexts/chat-context";
import { useUser } from "../contexts/user-context";
import { rpcClient } from "../lib/rpc-client";
import { createClient } from "../lib/supabase/client";
import { UpgradeSheet } from "./upgrade-sheet";

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
  const [upgradeSheetOpen, setUpgradeSheetOpen] = useState(false);

  /**
   * Fetch subscription usage data
   */
  const { data: usage } = useQuery({
    queryKey: ["subscription", "usage"],
    queryFn: () => rpcClient.subscription.usage(),
    enabled: !!user,
    staleTime: 60_000, // Cache for 1 minute
  });

  /**
   * Listen for open-upgrade-sheet events (e.g., from rate limit toast)
   */
  useEffect(() => {
    const handleOpenUpgradeSheet = () => setUpgradeSheetOpen(true);
    window.addEventListener("open-upgrade-sheet", handleOpenUpgradeSheet);
    return () => {
      window.removeEventListener("open-upgrade-sheet", handleOpenUpgradeSheet);
    };
  }, []);

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
      await rpcClient.chats.update({ id: chatId, title });
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
      await rpcClient.chats.delete({ id: chatId });
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

  /**
   * Handle manage subscription click
   * If user has Stripe customer ID, open portal in new tab
   * Otherwise, open upgrade sheet
   */
  const handleManageSubscription = useCallback(async () => {
    try {
      const { url } = await rpcClient.subscription.createPortalSession();
      // Open Stripe Customer Portal in new tab
      window.open(url, "_blank");
    } catch {
      // If no customer ID found, open upgrade sheet instead
      setUpgradeSheetOpen(true);
    }
  }, []);

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
                          <div className="w-full select-none">
                            <SidebarMenuButton
                              className="w-full select-none"
                              isActive={chat.id === currentChatId}
                              onClick={() => navigateToChat(chat.id)}
                              onMouseEnter={() => onPrefetch?.(chat.id)}
                              tooltip={chat.id}
                            >
                              <span className="select-none truncate text-sm">
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
        <SidebarFooter className="gap-2 border-sidebar-border border-t">
          {/* Usage badge with upgrade button */}
          {usage ? (
            <UsageBadge
              count={usage.count}
              limit={usage.limit}
              onUpgradeClick={() => setUpgradeSheetOpen(true)}
              resetsAt={usage.resetsAt}
              tier={usage.tier}
            />
          ) : null}

          {/* User dropdown */}
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
              <DropdownMenuItem onClick={handleManageSubscription}>
                <CreditCardIcon className="size-4" />
                Manage Subscription
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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

      {/* Upgrade sheet */}
      <UpgradeSheet
        currentTier={usage?.tier}
        onOpenChange={setUpgradeSheetOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({
            queryKey: ["subscription", "usage"],
          });
        }}
        open={upgradeSheetOpen}
      />
    </Sidebar>
  );
};
