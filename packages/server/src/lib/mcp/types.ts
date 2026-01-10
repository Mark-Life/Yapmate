/**
 * MCP service type definitions
 * Types derived from DB schema where possible
 */

import type { McpServerSelect, McpToolSelect } from "@yapmate/db/schema";

/** MCP server configuration (without secrets) - derived from DB schema */
export type McpServerConfig = McpServerSelect;

/** MCP server with resolved secrets (for runtime use) */
export type McpServerWithSecrets = McpServerSelect & {
  apiKey: string | null;
};

/** Cached tool metadata - derived from DB schema */
export type McpToolMeta = McpToolSelect;

/** Input for adding new MCP server - re-exported from schema */
export type { AddMcpServerInput } from "@yapmate/db/schema";

/** Result of testing MCP connection */
export type McpConnectionTestResult = {
  success: boolean;
  error?: string;
  toolCount?: number;
  tools?: Array<{ name: string; description?: string }>;
};
