/**
 * Per-chat tool selection and runtime tool resolution
 * Manages tool selections for individual chats and resolves tools at runtime
 */

import type { MCPClient } from "@ai-sdk/mcp";
import type { ChatToolSelection } from "@yapmate/db/schema";
import {
  addChatToolSelection as addChatToolSelectionDb,
  getChatToolSelections as getChatToolSelectionsDb,
  getMcpSecret,
  getMcpServersByIds,
  removeChatToolSelection as removeChatToolSelectionDb,
  setChatToolSelections as setChatToolSelectionsDb,
} from "@yapmate/db/service";
import { createMcpClientFromConfig, fetchMcpTools } from "./client";
import type { McpServerWithSecrets } from "./types";

/**
 * Get tool selections for a chat
 * @param chatId - The chat ID
 * @returns Array of tool selections
 */
export const getChatToolSelections = async (chatId: string) =>
  await getChatToolSelectionsDb(chatId);

/**
 * Set tool selections for a chat (replaces existing)
 * @param chatId - The chat ID
 * @param selections - Array of tool selections to set
 */
export const setChatToolSelections = async (
  chatId: string,
  selections: ChatToolSelection[]
) => {
  await setChatToolSelectionsDb(chatId, selections);
};

/**
 * Add tool selection to chat
 * @param chatId - The chat ID
 * @param selection - Tool selection to add
 */
export const addChatToolSelection = async (
  chatId: string,
  selection: Omit<ChatToolSelection, "enabled"> & { enabled?: boolean }
) => {
  await addChatToolSelectionDb(chatId, selection);
};

/**
 * Remove tool selection from chat
 * @param chatId - The chat ID
 * @param mcpServerId - The MCP server ID
 * @param toolName - The tool name to remove
 */
export const removeChatToolSelection = async (
  chatId: string,
  mcpServerId: string,
  toolName: string
) => {
  await removeChatToolSelectionDb(chatId, mcpServerId, toolName);
};

/**
 * Resolve tools for chat request
 * Creates MCP clients, fetches selected tools, returns merged tools object
 * @param userId - The user ID
 * @param chatId - The chat ID
 * @returns Object with merged tools, client instances, and any errors
 */
export const resolveChatMcpTools = async (userId: string, chatId: string) => {
  const tools: Record<string, unknown> = {};
  const clients: MCPClient[] = [];
  const errors: Array<{ serverId: string; serverName: string; error: string }> =
    [];

  // Get tool selections for this chat
  const selections = await getChatToolSelectionsDb(chatId);
  const enabledSelections = selections.filter((s) => s.enabled);

  if (enabledSelections.length === 0) {
    return { tools, clients, errors };
  }

  // Get unique server IDs
  const serverIds = [...new Set(enabledSelections.map((s) => s.mcpServerId))];

  // Fetch server configs
  const servers = await getMcpServersByIds(userId, serverIds);
  const serverMap = new Map(servers.map((s) => [s.id, s]));

  // Process each server
  for (const serverId of serverIds) {
    const server = serverMap.get(serverId);
    if (!server) {
      errors.push({
        serverId,
        serverName: "Unknown",
        error: "Server not found or not owned by user",
      });
      continue;
    }

    // Get API key from vault
    const apiKey = await getMcpSecret(userId, serverId).catch(() => null);

    const serverWithSecrets: McpServerWithSecrets = {
      ...server,
      apiKey,
    };

    // Get tools selected for this server
    const serverSelections = enabledSelections.filter(
      (s) => s.mcpServerId === serverId
    );
    const toolNames = serverSelections
      .map((s) => s.toolName)
      .filter((name) => name !== "*"); // "*" means all tools

    try {
      // Create client
      const client = await createMcpClientFromConfig(serverWithSecrets);
      clients.push(client);

      // Fetch tools (undefined toolNames means all tools)
      const serverTools = await fetchMcpTools(
        client,
        toolNames.length > 0 ? toolNames : undefined
      );

      // Merge into main tools object
      Object.assign(tools, serverTools);
    } catch (error) {
      errors.push({
        serverId,
        serverName: server.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { tools, clients, errors };
};
