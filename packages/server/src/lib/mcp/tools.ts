/**
 * MCP Tool discovery and caching
 * Wraps DB service with type mapping
 */

import type { MCPClient } from "@ai-sdk/mcp";
import {
  clearCachedTools as clearCachedToolsDb,
  getCachedTools as getCachedToolsDb,
  getMcpSecret,
  getMcpServer,
  syncMcpTools as syncMcpToolsDb,
} from "@yapmate/db/service";
import { createMcpClientFromConfig } from "./client";
import type { McpServerWithSecrets } from "./types";

/**
 * Get cached tools for an MCP server
 * @param serverId - The MCP server ID
 * @returns Array of cached tool metadata
 */
export const getCachedTools = async (serverId: string) =>
  getCachedToolsDb(serverId);

/**
 * Sync tools from MCP server (fetch & cache)
 * Replaces existing cached tools with fresh data from server
 * @param serverId - The MCP server ID
 * @param tools - Array of tool metadata to cache
 * @returns Array of cached tool metadata
 */
export const syncMcpTools = async (
  serverId: string,
  tools: Array<{
    toolName: string;
    displayName: string;
    description?: string;
    inputSchema: Record<string, unknown>;
  }>
) => syncMcpToolsDb(serverId, tools);

/**
 * Fetch tools from MCP server and sync to cache
 * @param userId - The user ID
 * @param serverId - The MCP server ID
 * @returns Array of cached tool metadata
 */
export const fetchAndSyncMcpTools = async (
  userId: string,
  serverId: string
) => {
  // Get server config
  const server = await getMcpServer(userId, serverId);
  if (!server) {
    throw new Error(`MCP server not found: ${serverId}`);
  }

  // Get API key from vault
  const apiKey = await getMcpSecret(userId, serverId).catch(() => null);

  const serverWithSecrets: McpServerWithSecrets = {
    ...server,
    apiKey,
  };

  // Create client and fetch tools
  let client: MCPClient | undefined;
  try {
    client = await createMcpClientFromConfig(serverWithSecrets);
    const tools: Record<
      string,
      { description?: string; parameters?: Record<string, unknown> }
    > = await client.tools();

    // Transform tools to cache format
    const toolEntries = Object.entries(tools);
    const toolsToCache = toolEntries.map(([toolName, tool]) => {
      // Extract schema from tool - MCP tools have parameters property
      const inputSchema = tool.parameters ?? {};

      return {
        toolName,
        displayName: toolName, // Use tool name as display name if not provided
        description: tool.description,
        inputSchema,
      };
    });

    // Sync to cache
    return await syncMcpTools(serverId, toolsToCache);
  } finally {
    await client?.close();
  }
};

/**
 * Clear cached tools for a server
 * @param serverId - The MCP server ID
 */
export const clearCachedTools = async (serverId: string) => {
  await clearCachedToolsDb(serverId);
};
