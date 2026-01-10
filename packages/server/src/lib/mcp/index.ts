/**
 * MCP (Model Context Protocol) service
 * Public exports for MCP server management, tool discovery, and chat integration
 */

// Chat tool selection & runtime
export {
  addChatToolSelection,
  getChatToolSelections,
  removeChatToolSelection,
  resolveChatMcpTools,
  setChatToolSelections,
} from "./chat";
// MCP client operations
export {
  createMcpClientFromConfig,
  fetchMcpTools,
  testMcpConnection,
} from "./client";
// Server CRUD
export {
  addMcpServer,
  deleteMcpServer,
  getMcpServer,
  getUserMcpServers,
  toggleMcpServer,
  updateMcpServer,
} from "./server";

// Tool discovery & caching
export {
  clearCachedTools,
  fetchAndSyncMcpTools,
  getCachedTools,
  syncMcpTools,
} from "./tools";
// Types
export type {
  AddMcpServerInput,
  McpConnectionTestResult,
  McpServerConfig,
  McpServerWithSecrets,
  McpToolMeta,
} from "./types";
