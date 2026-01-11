/**
 * MCP Servers settings section
 * Allows users to manage their MCP server configurations
 */

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
import { Badge } from "@yapmate/components/ui/badge";
import { Button } from "@yapmate/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@yapmate/components/ui/card";
import { Separator } from "@yapmate/components/ui/separator";
import { Switch } from "@yapmate/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@yapmate/components/ui/tooltip";
import {
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  ServerIcon,
  Trash2Icon,
  WrenchIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { rpcClient } from "../../lib/rpc-client";
import { McpServerDialog } from "./mcp-server-dialog";

/**
 * Formats a date to a relative time string (e.g., "2 hours ago")
 */
const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) {
    return "just now";
  }
  if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? "minute" : "minutes"} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
  }
  return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
};

/**
 * MCP Server card component
 */
const McpServerCard = ({
  server,
  onEdit,
  onDelete,
  onToggle,
  onSync,
  isSyncing,
}: {
  server: {
    id: string;
    name: string;
    url: string;
    transportType: "http" | "sse";
    enabled: boolean;
    toolCount?: number;
    lastSyncedAt?: Date | null;
  };
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (enabled: boolean) => void;
  onSync: () => void;
  isSyncing?: boolean;
}) => (
  <Card className={`transition-opacity ${server.enabled ? "" : "opacity-60"}`}>
    <CardHeader className="pb-0">
      <div className="flex items-center justify-start gap-4">
        <Switch checked={server.enabled} onCheckedChange={onToggle} />
        <CardTitle className="truncate text-base">{server.name}</CardTitle>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        {/* <CircleIcon
          className={`size-2.5 shrink-0 fill-current ${
            server.enabled ? "text-emerald-500" : "text-muted-foreground/50"
          }`}
        /> */}
      </div>
      <CardDescription className="truncate font-mono text-xs">
        {server.url}
      </CardDescription>
    </CardHeader>

    <CardContent className="pb-0">
      <div className="flex flex-col items-start gap-2 text-muted-foreground text-xs">
        <div className="flex items-center gap-1">
          <Badge className="font-mono text-[10px]" variant="primaryOutline">
            {server.transportType.toUpperCase()}
          </Badge>
          {server.toolCount !== undefined && (
            <span className="flex items-center gap-1">
              <WrenchIcon className="size-3" />
              {server.toolCount} {server.toolCount === 1 ? "tool" : "tools"}
            </span>
          )}
        </div>
        {server.lastSyncedAt !== null && server.lastSyncedAt !== undefined && (
          <span>synced {formatRelativeTime(server.lastSyncedAt)}</span>
        )}
      </div>
    </CardContent>

    <CardFooter className="flex items-center gap-2 pt-0">
      <Button
        className="flex-1"
        disabled={isSyncing}
        onClick={onSync}
        size="sm"
        variant="outline"
      >
        {isSyncing ? (
          <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
        ) : (
          <RefreshCwIcon className="mr-1.5 size-3.5" />
        )}
        {isSyncing ? "Syncing..." : "Sync Tools"}
      </Button>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button onClick={onEdit} size="icon" variant="ghost">
            <PencilIcon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Edit server</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
            size="icon"
            variant="ghost"
          >
            <Trash2Icon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Delete server</TooltipContent>
      </Tooltip>
    </CardFooter>
  </Card>
);

/**
 * MCP Servers settings section
 */
export const McpServersSection = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<{
    id: string;
    name: string;
    url: string;
    transportType: "http" | "sse";
    authType: "bearer" | "api-key" | "none";
    authHeaderName?: string | null;
  } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingServerId, setDeletingServerId] = useState<string | null>(null);

  /**
   * Fetch MCP servers list
   */
  const { data: servers = [], isLoading } = useQuery({
    queryKey: ["mcp", "servers"],
    queryFn: async () => await rpcClient.mcp.servers.list(),
  });

  /**
   * Fetch tools for each server
   */
  const { data: serverToolsMap = {} } = useQuery({
    queryKey: ["mcp", "tools", "all"],
    queryFn: async () => {
      const map: Record<string, { count: number; lastSyncedAt: Date | null }> =
        {};
      await Promise.all(
        servers.map(async (server) => {
          try {
            const tools = await rpcClient.mcp.tools.list({
              serverId: server.id,
            });
            const lastSyncedAt =
              tools.length > 0
                ? new Date(
                    Math.max(...tools.map((t) => t.lastSyncedAt.getTime()))
                  )
                : null;
            map[server.id] = {
              count: tools.length,
              lastSyncedAt,
            };
          } catch {
            map[server.id] = { count: 0, lastSyncedAt: null };
          }
        })
      );
      return map;
    },
    enabled: servers.length > 0,
  });

  /**
   * Toggle server enabled/disabled
   */
  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) =>
      await rpcClient.mcp.servers.toggle({ id, enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mcp", "servers"] });
      toast.success("Server updated");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update server"
      );
    },
  });

  /**
   * Sync tools from server
   */
  const syncMutation = useMutation({
    mutationFn: async (serverId: string) =>
      await rpcClient.mcp.tools.sync({ serverId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mcp", "tools"] });
      queryClient.invalidateQueries({ queryKey: ["mcp", "servers"] });
      toast.success("Tools synced successfully");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to sync tools"
      );
    },
  });

  /**
   * Delete server
   */
  const deleteMutation = useMutation({
    mutationFn: async (id: string) =>
      await rpcClient.mcp.servers.delete({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mcp", "servers"] });
      queryClient.invalidateQueries({ queryKey: ["mcp", "tools"] });
      setDeleteDialogOpen(false);
      setDeletingServerId(null);
      toast.success("Server deleted");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete server"
      );
    },
  });

  /**
   * Handle add new server
   */
  const handleAddNew = () => {
    setEditingServer(null);
    setDialogOpen(true);
  };

  /**
   * Handle edit server
   */
  const handleEdit = (server: (typeof servers)[0]) => {
    setEditingServer({
      id: server.id,
      name: server.name,
      url: server.url,
      transportType: server.transportType as "http" | "sse",
      authType: server.authType as "bearer" | "api-key" | "none",
      authHeaderName: server.authHeaderName,
    });
    setDialogOpen(true);
  };

  /**
   * Handle delete server
   */
  const handleDelete = (serverId: string) => {
    setDeletingServerId(serverId);
    setDeleteDialogOpen(true);
  };

  /**
   * Handle confirm delete
   */
  const handleConfirmDelete = () => {
    if (deletingServerId) {
      deleteMutation.mutate(deletingServerId);
    }
  };

  /**
   * Handle dialog close
   */
  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingServer(null);
  };

  /**
   * Handle dialog success
   */
  const handleDialogSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["mcp", "servers"] });
    queryClient.invalidateQueries({ queryKey: ["mcp", "tools"] });
    handleDialogClose();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const MCP_SERVER_LIMIT = 5;
  const isAtLimit = servers.length >= MCP_SERVER_LIMIT;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-lg">MCP Servers</h2>
            <span className="text-muted-foreground text-sm">
              ({servers.length} / {MCP_SERVER_LIMIT})
            </span>
          </div>
          <p className="text-muted-foreground text-sm">
            Configure Model Context Protocol servers to extend AI capabilities
            with custom tools
          </p>
        </div>
        <Button disabled={isAtLimit} onClick={handleAddNew} size="sm">
          <PlusIcon className="mr-2 size-4" />
          Add New
        </Button>
      </div>

      <Separator />

      {/* Servers list */}
      {servers.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-12">
          <ServerIcon className="size-12 text-muted-foreground" />
          <div className="flex flex-col gap-1 text-center">
            <p className="font-medium">No MCP servers configured</p>
            <p className="text-muted-foreground text-sm">
              Add your first MCP server to get started
            </p>
          </div>
          <Button disabled={isAtLimit} onClick={handleAddNew} size="sm">
            <PlusIcon className="mr-2 size-4" />
            Add MCP Server
          </Button>
        </div>
      ) : (
        <>
          {isAtLimit ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              <p className="font-medium text-sm">
                Server limit reached ({MCP_SERVER_LIMIT} / {MCP_SERVER_LIMIT})
              </p>
              <p className="text-muted-foreground text-xs">
                Disable or delete an existing server to add a new one
              </p>
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            {servers.map((server) => {
              const toolsInfo = serverToolsMap[server.id];
              return (
                <McpServerCard
                  isSyncing={
                    syncMutation.isPending &&
                    syncMutation.variables === server.id
                  }
                  key={server.id}
                  onDelete={() => handleDelete(server.id)}
                  onEdit={() => handleEdit(server)}
                  onSync={() => syncMutation.mutate(server.id)}
                  onToggle={(enabled) =>
                    toggleMutation.mutate({ id: server.id, enabled })
                  }
                  server={{
                    id: server.id,
                    name: server.name,
                    url: server.url,
                    transportType: server.transportType as "http" | "sse",
                    enabled: server.enabled,
                    toolCount: toolsInfo?.count,
                    lastSyncedAt: toolsInfo?.lastSyncedAt ?? null,
                  }}
                />
              );
            })}
          </div>
        </>
      )}

      {/* Add/Edit Dialog */}
      <McpServerDialog
        editingServer={editingServer}
        onClose={handleDialogClose}
        onSuccess={handleDialogSuccess}
        open={dialogOpen}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete MCP Server</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this MCP server? This will also
              remove all cached tools and chat tool selections associated with
              this server. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={handleConfirmDelete}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
