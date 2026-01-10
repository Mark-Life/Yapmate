/**
 * MCP database service - CRUD operations for MCP servers, tools, and chat selections
 * Pure database operations, returns DB types
 */

import { and, eq, inArray } from "drizzle-orm";
import { db } from "../client";
import type {
  AddMcpServerInput,
  ChatToolSelection,
  McpServerInsert,
  McpServerSelect,
  McpToolSelect,
} from "../schema/mcp";
import { chatMcpTools, mcpServers, mcpTools } from "../schema/mcp";
import { deleteMcpSecret, setMcpSecret } from "./vault";

// ─── Server Operations ────────────────────────────────────────────────────────

/**
 * Get all MCP servers for a user
 * @param userId - The user ID
 * @returns Array of MCP server records
 */
export const getUserMcpServers = async (
  userId: string
): Promise<McpServerSelect[]> =>
  db
    .select()
    .from(mcpServers)
    .where(eq(mcpServers.userId, userId))
    .orderBy(mcpServers.createdAt);

/**
 * Get single MCP server by ID (validates ownership)
 * @param userId - The user ID
 * @param serverId - The server ID
 * @returns MCP server record, or null if not found or not owned by user
 */
export const getMcpServer = async (
  userId: string,
  serverId: string
): Promise<McpServerSelect | null> => {
  const result = await db
    .select()
    .from(mcpServers)
    .where(and(eq(mcpServers.id, serverId), eq(mcpServers.userId, userId)))
    .limit(1);

  return result[0] ?? null;
};

/**
 * Add new MCP server (also stores API key in vault if provided)
 * @param userId - The user ID
 * @param input - Server configuration and optional API key
 * @returns Created MCP server record
 */
export const addMcpServer = async (
  userId: string,
  input: AddMcpServerInput
): Promise<McpServerSelect> => {
  const { apiKey, ...serverData } = input;

  // Insert server config
  const [server] = await db
    .insert(mcpServers)
    .values({
      userId,
      name: serverData.name,
      url: serverData.url,
      transportType: serverData.transportType,
      authType: serverData.authType,
      authHeaderName: serverData.authHeaderName ?? null,
      enabled: true,
    })
    .returning();

  // Store API key in vault if provided
  if (apiKey && serverData.authType !== "none") {
    await setMcpSecret(userId, server.id, apiKey);
  }

  return server;
};

/**
 * Build update data object from partial input
 */
const buildUpdateData = (
  serverData: Partial<AddMcpServerInput>
): Partial<McpServerInsert> => {
  const updateData: Partial<McpServerInsert> = {};
  if (serverData.name !== undefined) {
    updateData.name = serverData.name;
  }
  if (serverData.url !== undefined) {
    updateData.url = serverData.url;
  }
  if (serverData.transportType !== undefined) {
    updateData.transportType = serverData.transportType;
  }
  if (serverData.authType !== undefined) {
    updateData.authType = serverData.authType;
  }
  if (serverData.authHeaderName !== undefined) {
    updateData.authHeaderName = serverData.authHeaderName ?? null;
  }
  return updateData;
};

/**
 * Update API key in vault if needed
 */
const updateApiKeyIfNeeded = async (options: {
  userId: string;
  serverId: string;
  apiKey: string | undefined;
  authType: string | undefined;
  existingAuthType: string;
}): Promise<void> => {
  const { userId, serverId, apiKey, authType, existingAuthType } = options;
  if (apiKey === undefined) {
    return;
  }

  const finalAuthType = authType ?? existingAuthType;
  if (apiKey && finalAuthType !== "none") {
    await setMcpSecret(userId, serverId, apiKey);
  } else if (!apiKey) {
    // Empty string means delete the secret
    await deleteMcpSecret(userId, serverId).catch(() => {
      // Ignore if secret doesn't exist
    });
  }
};

/**
 * Update MCP server config
 * @param userId - The user ID
 * @param serverId - The server ID
 * @param input - Partial server configuration and optional API key
 * @returns Updated MCP server record
 */
export const updateMcpServer = async (
  userId: string,
  serverId: string,
  input: Partial<AddMcpServerInput>
): Promise<McpServerSelect> => {
  const { apiKey, ...serverData } = input;

  // Update server config (only provided fields)
  const updateData = buildUpdateData(serverData);

  const [updated] = await db
    .update(mcpServers)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(and(eq(mcpServers.id, serverId), eq(mcpServers.userId, userId)))
    .returning();

  if (!updated) {
    throw new Error(`MCP server not found: ${serverId}`);
  }

  // Update API key in vault if provided
  const existing = await getMcpServer(userId, serverId);
  if (existing) {
    await updateApiKeyIfNeeded({
      userId,
      serverId,
      apiKey,
      authType: input.authType,
      existingAuthType: existing.authType,
    });
  }

  return updated;
};

/**
 * Delete MCP server (cascades to tools, chat selections, vault secret)
 * @param userId - The user ID
 * @param serverId - The server ID
 */
export const deleteMcpServer = async (
  userId: string,
  serverId: string
): Promise<void> => {
  // Verify ownership
  const existing = await getMcpServer(userId, serverId);
  if (!existing) {
    throw new Error(`MCP server not found: ${serverId}`);
  }

  // Delete vault secret first
  await deleteMcpSecret(userId, serverId).catch(() => {
    // Ignore if secret doesn't exist
  });

  // Delete server (cascades to tools and chat selections)
  await db
    .delete(mcpServers)
    .where(and(eq(mcpServers.id, serverId), eq(mcpServers.userId, userId)));
};

/**
 * Toggle MCP server enabled/disabled
 * @param userId - The user ID
 * @param serverId - The server ID
 * @param enabled - Whether the server should be enabled
 */
export const toggleMcpServer = async (
  userId: string,
  serverId: string,
  enabled: boolean
): Promise<void> => {
  const existing = await getMcpServer(userId, serverId);
  if (!existing) {
    throw new Error(`MCP server not found: ${serverId}`);
  }

  await db
    .update(mcpServers)
    .set({ enabled, updatedAt: new Date() })
    .where(and(eq(mcpServers.id, serverId), eq(mcpServers.userId, userId)));
};

/**
 * Get enabled MCP servers by IDs for a user
 * @param userId - The user ID
 * @param serverIds - Array of server IDs
 * @returns Array of MCP server records
 */
export const getMcpServersByIds = async (
  userId: string,
  serverIds: string[]
): Promise<McpServerSelect[]> => {
  if (serverIds.length === 0) {
    return [];
  }

  return await db
    .select()
    .from(mcpServers)
    .where(
      and(
        eq(mcpServers.userId, userId),
        inArray(mcpServers.id, serverIds),
        eq(mcpServers.enabled, true)
      )
    );
};

// ─── Tool Operations ───────────────────────────────────────────────────────────

/**
 * Get cached tools for an MCP server
 * @param serverId - The MCP server ID
 * @returns Array of cached tool records
 */
export const getCachedTools = async (
  serverId: string
): Promise<McpToolSelect[]> =>
  db
    .select()
    .from(mcpTools)
    .where(eq(mcpTools.mcpServerId, serverId))
    .orderBy(mcpTools.toolName);

/**
 * Sync tools from MCP server (fetch & cache)
 * Replaces existing cached tools with fresh data
 * @param serverId - The MCP server ID
 * @param tools - Array of tool metadata to cache
 * @returns Array of cached tool records
 */
export const syncMcpTools = async (
  serverId: string,
  tools: Array<{
    toolName: string;
    displayName: string;
    description?: string;
    inputSchema: Record<string, unknown>;
  }>
): Promise<McpToolSelect[]> => {
  // Delete existing tools for this server
  await db.delete(mcpTools).where(eq(mcpTools.mcpServerId, serverId));

  // Insert new tools
  if (tools.length > 0) {
    await db.insert(mcpTools).values(
      tools.map((tool) => ({
        mcpServerId: serverId,
        toolName: tool.toolName,
        displayName: tool.displayName,
        description: tool.description ?? null,
        inputSchema: tool.inputSchema,
        lastSyncedAt: new Date(),
      }))
    );
  }

  // Return cached tools
  return getCachedTools(serverId);
};

/**
 * Clear cached tools for a server
 * @param serverId - The MCP server ID
 */
export const clearCachedTools = async (serverId: string): Promise<void> => {
  await db.delete(mcpTools).where(eq(mcpTools.mcpServerId, serverId));
};

// ─── Chat Tool Selection Operations ───────────────────────────────────────────

/**
 * Get tool selections for a chat
 * @param chatId - The chat ID
 * @returns Array of tool selections
 */
export const getChatToolSelections = async (
  chatId: string
): Promise<ChatToolSelection[]> =>
  db
    .select({
      mcpServerId: chatMcpTools.mcpServerId,
      toolName: chatMcpTools.toolName,
      enabled: chatMcpTools.enabled,
    })
    .from(chatMcpTools)
    .where(eq(chatMcpTools.chatId, chatId));

/**
 * Set tool selections for a chat (replaces existing)
 * @param chatId - The chat ID
 * @param selections - Array of tool selections to set
 */
export const setChatToolSelections = async (
  chatId: string,
  selections: ChatToolSelection[]
): Promise<void> => {
  // Delete existing selections
  await db.delete(chatMcpTools).where(eq(chatMcpTools.chatId, chatId));

  // Insert new selections
  if (selections.length > 0) {
    await db.insert(chatMcpTools).values(
      selections.map((selection) => ({
        chatId,
        mcpServerId: selection.mcpServerId,
        toolName: selection.toolName,
        enabled: selection.enabled ?? true,
      }))
    );
  }
};

/**
 * Add tool selection to chat
 * @param chatId - The chat ID
 * @param selection - Tool selection to add
 */
export const addChatToolSelection = async (
  chatId: string,
  selection: Omit<ChatToolSelection, "enabled"> & { enabled?: boolean }
): Promise<void> => {
  // Check if selection already exists
  const existing = await db
    .select()
    .from(chatMcpTools)
    .where(
      and(
        eq(chatMcpTools.chatId, chatId),
        eq(chatMcpTools.mcpServerId, selection.mcpServerId),
        eq(chatMcpTools.toolName, selection.toolName)
      )
    )
    .limit(1);

  if (existing[0]) {
    // Update existing
    await db
      .update(chatMcpTools)
      .set({ enabled: selection.enabled ?? true })
      .where(
        and(
          eq(chatMcpTools.chatId, chatId),
          eq(chatMcpTools.mcpServerId, selection.mcpServerId),
          eq(chatMcpTools.toolName, selection.toolName)
        )
      );
  } else {
    // Insert new
    await db.insert(chatMcpTools).values({
      chatId,
      mcpServerId: selection.mcpServerId,
      toolName: selection.toolName,
      enabled: selection.enabled ?? true,
    });
  }
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
): Promise<void> => {
  await db
    .delete(chatMcpTools)
    .where(
      and(
        eq(chatMcpTools.chatId, chatId),
        eq(chatMcpTools.mcpServerId, mcpServerId),
        eq(chatMcpTools.toolName, toolName)
      )
    );
};
