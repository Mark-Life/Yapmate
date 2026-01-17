/**
 * Hook for fetching MCP servers and tools
 * Uses TanStack Query with aggressive caching
 */
import { useQuery } from "@tanstack/react-query";
import { rpcClient } from "@/lib/rpc-client";

export type McpToolSelection = {
  mcpServerId: string;
  toolName: string;
};

/**
 * Fetches and caches user's MCP servers
 */
export const useMcpServers = () => {
  const { data: servers = [], isLoading } = useQuery({
    queryKey: ["mcpServers"],
    queryFn: () => rpcClient.mcp.servers.list(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  return { servers, isLoading };
};

/**
 * Fetches and caches tools for a specific MCP server
 */
export const useMcpTools = (serverId: string | null) => {
  const { data: tools = [], isLoading } = useQuery({
    queryKey: ["mcpTools", serverId],
    queryFn: () =>
      serverId ? rpcClient.mcp.tools.list({ serverId }) : Promise.resolve([]),
    enabled: !!serverId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  return { tools, isLoading };
};

/**
 * Fetches tools for multiple servers at once
 * Returns a map of serverId -> tools array
 */
export const useMcpToolsForServers = (serverIds: string[]) => {
  const query = useQuery({
    queryKey: ["mcpToolsMulti", ...serverIds],
    queryFn: async () => {
      const map: Record<string, McpTool[]> = {};
      await Promise.all(
        serverIds.map(async (serverId) => {
          try {
            const tools = await rpcClient.mcp.tools.list({ serverId });
            map[serverId] = tools;
          } catch {
            map[serverId] = [];
          }
        })
      );
      return map;
    },
    enabled: serverIds.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Create a Map-like interface from the record
  const toolsRecord = query.data ?? {};
  const toolsMap = {
    get: (serverId: string) => toolsRecord[serverId] ?? [],
  };

  return {
    toolsMap,
    isLoading: query.isLoading,
  };
};

type McpTool = {
  id: string;
  mcpServerId: string;
  toolName: string;
  displayName: string;
  description: string | null;
};
