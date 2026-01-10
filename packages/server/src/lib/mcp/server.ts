/**
 * MCP Server CRUD operations
 * Wraps DB service with type mapping and vault operations
 */

import type { AddMcpServerInput } from "@yapmate/db/schema";
import {
  addMcpServer as addMcpServerDb,
  deleteMcpServer as deleteMcpServerDb,
  getMcpServer as getMcpServerDb,
  getUserMcpServers as getUserMcpServersDb,
  toggleMcpServer as toggleMcpServerDb,
  updateMcpServer as updateMcpServerDb,
} from "@yapmate/db/service";

/**
 * Get all MCP servers for a user
 * @param userId - The user ID
 * @returns Array of MCP server configurations
 */
export const getUserMcpServers = async (userId: string) =>
  getUserMcpServersDb(userId);

/**
 * Get single MCP server by ID (validates ownership)
 * @param userId - The user ID
 * @param serverId - The server ID
 * @returns MCP server configuration, or null if not found or not owned by user
 */
export const getMcpServer = async (userId: string, serverId: string) =>
  getMcpServerDb(userId, serverId);

/**
 * Add new MCP server (also stores API key in vault if provided)
 * @param userId - The user ID
 * @param input - Server configuration and optional API key
 * @returns Created MCP server configuration
 */
export const addMcpServer = async (userId: string, input: AddMcpServerInput) =>
  addMcpServerDb(userId, input);

/**
 * Update MCP server config
 * @param userId - The user ID
 * @param serverId - The server ID
 * @param input - Partial server configuration and optional API key
 * @returns Updated MCP server configuration
 */
export const updateMcpServer = async (
  userId: string,
  serverId: string,
  input: Partial<AddMcpServerInput>
) => updateMcpServerDb(userId, serverId, input);

/**
 * Delete MCP server (cascades to tools, chat selections, vault secret)
 * @param userId - The user ID
 * @param serverId - The server ID
 */
export const deleteMcpServer = async (userId: string, serverId: string) => {
  await deleteMcpServerDb(userId, serverId);
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
) => {
  await toggleMcpServerDb(userId, serverId, enabled);
};
